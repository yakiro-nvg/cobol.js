import { Compiler, CompilerPass } from '../compiler'
import { ModuleSymbol, ChunkSymbol, ProgramSymbol,
        ProgramPatternSymbol, Comp4FieldSymbol, FieldSymbol, UsageSymbol } from '../symbols/core'
import { RedefinitionError, UndefinedError, BadLevelError, BadSignPictureError,
        ManyVirtualDecimalPointError, BadDefaultValueError, IncompatibleComp4PictureError,
        Comp2WithPictureError, NotInLinkageSectionError, ExceedComp4PrecisionError } from '../errors'
import { tail, sumBy } from 'lodash'
import * as ast from '../grammars/core.ast'

class DefineDeclareSymbolVisitor extends ast.Visitor
{
        private readonly _compiler: Compiler
        private _module?: ModuleSymbol
        private _chunk?: ChunkSymbol
        private _program?: ProgramSymbol
        private _pattern?: ProgramPatternSymbol
        private _isWorking?: boolean

        constructor(compiler: Compiler)
        {
                super()

                this._compiler = compiler
        }

        visitModule(node: ast.Module): void
        {
                const name = node.first(ast.Identifier)!.name
                this._module = this._compiler.globalScope.resolveMember(name) as ModuleSymbol

                if (!this._module) {
                        this._module = new ModuleSymbol(this._compiler.globalScope, name)
                        this._compiler.globalScope.define(this._module)
                }

                this._chunk = new ChunkSymbol(this._module, this._compiler.chunkName)
                this._module.define(this._chunk)
        }

        visitProgram(node: ast.Program): void
        {
                const name = node.first(ast.Identifier)!.name
                const isExported = node.first(ast.Export)
                this._program = new ProgramSymbol(name, node)
                if (isExported) {
                        this._module!.define(this._program)
                } else {
                        this._chunk!.define(this._program)
                }
        }

        visitProgramPattern(node: ast.ProgramPattern): void
        {
                this._pattern = new ProgramPatternSymbol(this._chunk!, node)
                this._program!.patterns.push(this._pattern)
        }

        visitWorkingStorageSection(node: ast.WorkingStorageSection): void
        {
                this._isWorking = true
        }

        visitLinkageSection(node: ast.LinkageSection): void
        {
                this._isWorking = false
        }

        visitField(node: ast.Field): void
        {
                const level = node.first(ast.Level)!
                const name = node.first(ast.Identifier)!.name
                const pic = node.first(ast.Picture)
                const usage = node.first(ast.Usage)?.usage || 'DISPLAY'
                const value = node.first(ast.ValueLiteral)

                if (level?.level < 1 || level?.level > 77) {
                        throw new BadLevelError(this._compiler.chunkName, level.location)
                }

                if (pic) { // optimize segments (group nearby)
                        pic.segments = pic.segments.reduce((acc, x) => {
                                if (acc.length > 0 && acc[acc.length - 1].char == x.char) {
                                        acc[acc.length - 1].size += x.size
                                } else {
                                        acc.push(x)
                                }

                                return acc
                        }, <ast.PictureSegment[]> [])
                }

                switch (usage) {
                case 'COMP-2': {
                        if (pic) {
                                throw new Comp2WithPictureError(
                                        this._compiler.chunkName, pic.location)
                        }

                        if (value && !(value instanceof ast.NumberLiteral)) {
                                throw new BadDefaultValueError(
                                        this._compiler.chunkName, value.location)
                        }

                        break }

                case 'COMP-4': {
                        if (pic) {
                                if (sumBy(tail(pic!.segments), x => x.char === 'S' ? x.size : 0) > 0) {
                                        throw new BadSignPictureError(
                                                this._compiler.chunkName, pic!.location)
                                }

                                if (sumBy(pic!.segments, x => x.char === 'V' ? x.size : 0) > 1) {
                                        throw new ManyVirtualDecimalPointError(
                                                this._compiler.chunkName, pic!.location)
                                }

                                if (sumBy(pic!.segments, x => x.char === 'X' || x.char === 'A' ? x.size : 0) > 1) {
                                        throw new IncompatibleComp4PictureError(
                                                this._compiler.chunkName, pic!.location)
                                }

                                if (sumBy(pic!.segments, x => x.char === '9' ? x.size : 0) > 18) {
                                        throw new ExceedComp4PrecisionError(
                                                this._compiler.chunkName, pic!.location)
                                }
                        }

                        if (value) {
                                if (value instanceof ast.NumberLiteral) {
                                        try {
                                                BigInt(value.value.split('.').join(''))
                                        } catch {
                                                throw new BadDefaultValueError(
                                                        this._compiler.chunkName, value.location)
                                        }
                                } else {
                                        throw new BadDefaultValueError(
                                                this._compiler.chunkName, value.location)
                                }
                        }

                        break }

                case 'DISPLAY': {
                        if (value && !(value instanceof ast.StringLiteral)) {
                                throw new BadDefaultValueError(
                                        this._compiler.chunkName, value.location)
                        }

                        break }
                }

                const previous = this._pattern!.resolveMember(name) as FieldSymbol
                if (previous) {
                        throw new RedefinitionError(
                                this._compiler.chunkName, this._compiler.chunkName,
                                name, node.location, previous.node.location)
                } else {
                        try {
                                const field = usage === 'COMP-4'
                                        ? new Comp4FieldSymbol(name, this._isWorking!, node, pic?.segments)
                                        : new FieldSymbol(name, this._isWorking!, usage, node, pic?.segments)
                                this._pattern!.define(field)
                        } catch(e) {
                                if (e === 'too big') {
                                        throw new BadDefaultValueError(
                                                this._compiler.chunkName, value!.location)
                                } else {
                                        throw e
                                }
                        }
                }
        }

        visitProcedureUsings(node: ast.ProcedureUsings): void
        {
                node.where(ast.Identifier).forEach(x => {
                        const name = x.name
                        const field = this._pattern!.resolveMember(name) as FieldSymbol
                        if (field) {
                                if (field.isWorking) {
                                        throw new NotInLinkageSectionError(
                                                this._compiler.chunkName, name, x.location)
                                }

                                this._pattern!.usings.push(field)
                        } else {
                                throw new UndefinedError(
                                        this._compiler.chunkName, name, x.location)
                        }
                })
        }

        visitProcedureReturnings(node: ast.ProcedureReturnings): void
        {
                node.where(ast.Identifier).forEach(x => {
                        const name = x.name
                        const field = this._pattern!.resolveMember(name) as FieldSymbol
                        if (field) {
                                if (field.isWorking) {
                                        throw new NotInLinkageSectionError(
                                                this._compiler.chunkName, name, x.location)
                                }

                                this._pattern!.returnings.push(field)
                        } else {
                                throw new UndefinedError(
                                        this._compiler.chunkName, name, x.location)
                        }
                })
        }
}

export class DefineDeclareSymbolPass implements CompilerPass
{
        readonly name = 'DefineDeclareSymbolPass'
        readonly isDeclare = true
        readonly depends = <string[]> []
        readonly reversed_depends = <string[]> []
        readonly visitors = <ast.Visitor[]> []
        readonly transformers = <ast.Transformer[]> []

        constructor(compiler: Compiler)
        {
                this.visitors.push(new DefineDeclareSymbolVisitor(compiler))
        }
}

class ResolveDeclareSymbolVisitor extends ast.Visitor
{
        private readonly _compiler: Compiler
        private _module?: ModuleSymbol
        private _chunk?: ChunkSymbol
        private _program?: ProgramSymbol
        private _patternIdx?: number
        private _pattern?: ProgramPatternSymbol

        constructor(compiler: Compiler)
        {
                super()

                this._compiler = compiler
        }

        visitModule(node: ast.Module): void
        {
                const name = node.first(ast.Identifier)!.name
                this._module = this._compiler.globalScope.resolveMember(name) as ModuleSymbol
                this._chunk = this._module!.resolveMember(this._compiler.chunkName) as ChunkSymbol
        }

        visitProgram(node: ast.Program): void
        {
                const name = node.first(ast.Identifier)!.name
                this._program = this._chunk!.resolve(name) as ProgramSymbol
                this._patternIdx = 0
        }

        visitProgramPattern(node: ast.ProgramPattern): void
        {
                this._pattern = this._program!.patterns[this._patternIdx!++]
        }

        visitField(node: ast.Field): void
        {
                const name = node.first(ast.Identifier)!.name
                const field = this._pattern!.resolveMember(name) as FieldSymbol
                field.type = this._compiler.globalScope.resolveMember(field.usage) as UsageSymbol
        }
}

export class ResolveDeclarationSymbolPass implements CompilerPass
{
        readonly name = 'ResolveDeclarationSymbolPass'
        readonly isDeclare = true
        readonly depends = [ 'DefineDeclareSymbolPass' ]
        readonly reversed_depends = <string[]> []
        readonly visitors = <ast.Visitor[]> []
        readonly transformers = <ast.Transformer[]> []

        constructor(compiler: Compiler)
        {
                this.visitors.push(new ResolveDeclareSymbolVisitor(compiler))
        }
}
