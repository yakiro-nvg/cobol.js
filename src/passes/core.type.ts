import { CompilerPass, Compiler } from '../compiler'
import { ModuleSymbol, ChunkSymbol, ProgramSymbol,
         DisplayTypeSymbol, Comp2TypeSymbol, Comp4TypeSymbol, AnyTypeSymbol } from '../symbols/core'
import { WrongNumArgumentsError, BadArgumentTypeError } from '../errors'
import { zip } from 'lodash'
import * as ast from '../grammars/core.ast'

function nodeTypeTag(
        node: ast.Node,
        numberType: Comp2TypeSymbol | Comp4TypeSymbol,
        displayType: DisplayTypeSymbol): string
{
        if (node instanceof ast.CallUsingLiteral) {
                if (node.literal instanceof ast.NumberLiteral)
                {
                        node.type = numberType
                        return numberType.tag
                }

                if (node.literal instanceof ast.StringLiteral)
                {
                        node.type = displayType
                        return displayType.tag
                }
        }

        if (node instanceof ast.CallUsingId || node instanceof ast.CallReturningId) {
                return node.symbol!.type!.tag
        }

        if (node instanceof ast.Expression) {
                return node.type!.tag
        }

        throw new Error('unexpected')
}

class ResolveExpressionTypeVisitor extends ast.Visitor
{
        private readonly _compiler: Compiler
        private _module?: ModuleSymbol
        private _chunk?: ChunkSymbol
        private _program?: ProgramSymbol

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
        }
}

export class ResolveExpressionTypePass implements CompilerPass
{
        readonly name = 'ResolveExpressionTypePass'
        readonly isDeclare = false
        readonly depends = [ 'ResolveProcedureSymbolPass' ]
        readonly reversed_depends = [ 'StaticTypingPass' ]
        readonly visitors = <ast.Visitor[]> []
        readonly transformers = <ast.Transformer[]> []

        constructor(compiler: Compiler)
        {
                this.visitors.push(new ResolveExpressionTypeVisitor(compiler))
        }
}

class CheckProcedureTypeVisitor extends ast.Visitor
{
        private readonly _compiler: Compiler
        private _module?: ModuleSymbol
        private _chunk?: ChunkSymbol
        private _program?: ProgramSymbol

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
        }

        private checkCallUsings(node: ast.CallStatement | ast.CallExpression): void
        {
                const callee = node.callee!
                const calleeChunk = callee.enclosingScope as ChunkSymbol

                const usings = node
                        .first(ast.CallUsings)
                        ?.children || []

                if (callee.usings.length != usings.length) {
                        throw new WrongNumArgumentsError(
                                this._chunk!.name, calleeChunk.name, node.location, callee.node.location)
                }

                const comp2Type   = this._compiler.globalScope.resolveMember('COMP-2')  as Comp2TypeSymbol
                const comp4Type   = this._compiler.globalScope.resolveMember('COMP-4')  as Comp4TypeSymbol
                const displayType = this._compiler.globalScope.resolveMember('DISPLAY') as DisplayTypeSymbol
                const anyType     = this._compiler.globalScope.resolveMember('ANY')     as AnyTypeSymbol

                zip(callee.usings, usings).forEach(x => {
                        const usage = x[0]!.usage
                        const using = x[1]!
                        switch (usage) {
                        case 'COMP-2': {
                                const found = nodeTypeTag(using, comp2Type, displayType)
                                if (found != 'COMP-2') {
                                        throw new BadArgumentTypeError(
                                                this._chunk!.name, calleeChunk.name,
                                                'COMP-2', found, using.location, x[0]!.node.location)
                                }

                                break }

                        case 'COMP-4': {
                                const found = nodeTypeTag(using, comp4Type, displayType)
                                if (found != 'COMP-4') {
                                        throw new BadArgumentTypeError(
                                                this._chunk!.name, calleeChunk.name,
                                                'COMP-4', found, using.location, x[0]!.node.location)
                                }

                                break }

                        case 'DISPLAY': {
                                const found = nodeTypeTag(using, comp2Type, displayType)
                                if (found != 'DISPLAY') {
                                        throw new BadArgumentTypeError(
                                                this._chunk!.name, calleeChunk.name,
                                                'DISPLAY', found, using.location, x[0]!.node.location)
                                }

                                break }

                        case 'ANY':
                                nodeTypeTag(using, comp2Type, displayType)
                                break
                        }
                })
        }

        visitCallStatement(node: ast.CallStatement): void
        {
                this.checkCallUsings(node)

                const callee = node.callee!
                const calleeChunk = callee.enclosingScope as ChunkSymbol

                const returnings = node
                        .first(ast.CallReturnings)
                        ?.where(ast.CallReturningId) || []

                if (callee.returnings.length < returnings.length) {
                        throw new WrongNumArgumentsError(
                                this._chunk!.name, calleeChunk.name, node.location, callee.node.location)
                }

                zip(callee.returnings, returnings).forEach(x => {
                        const usage = x[0]!.usage
                        const returning = x[1]
                        if (!returning) {
                                return // not passed
                        }

                        switch (usage) {
                        case 'COMP-2': {
                                const found = returning.symbol!.type!.tag
                                if (found != 'COMP-2') {
                                        throw new BadArgumentTypeError(
                                                this._chunk!.name, calleeChunk.name,
                                                'COMP-2', found, returning.location, x[0]!.node.location)
                                }

                                break }

                        case 'COMP-4': {
                                const found = returning.symbol!.type!.tag
                                if (found != 'COMP-4') {
                                        throw new BadArgumentTypeError(
                                                this._chunk!.name, calleeChunk.name,
                                                'COMP-4', found, returning.location, x[0]!.node.location)
                                }

                                break }

                        case 'DISPLAY': {
                                const found = returning.symbol!.type!.tag
                                if (found != 'DISPLAY') {
                                        throw new BadArgumentTypeError(
                                                this._chunk!.name, calleeChunk.name,
                                                'DISPLAY', found, returning.location, x[0]!.node.location)
                                }

                                break }
                        }
                })
        }

        visitCallExpression(node: ast.CallExpression): void
        {
                this.checkCallUsings(node)
        }
}

export class CheckProcedureTypePass implements CompilerPass
{
        readonly name = 'CheckProcedureTypePass'
        readonly isDeclare = false
        readonly depends = [ 'ResolveExpressionTypePass' ]
        readonly reversed_depends = [ 'StaticTypingPass' ]
        readonly visitors = <ast.Visitor[]> []
        readonly transformers = <ast.Transformer[]> []

        constructor(compiler: Compiler)
        {
                this.visitors.push(new CheckProcedureTypeVisitor(compiler))
        }
}

export class StaticTypingPass implements CompilerPass
{
        readonly name = 'StaticTypingPass'
        readonly isDeclare = false
        readonly depends = <string[]> []
        readonly reversed_depends = <string[]> []
        readonly visitors = <ast.Visitor[]> []
        readonly transformers = <ast.Transformer[]> []

        constructor(compiler: Compiler)
        {
                // nop, this is a dependency helper
        }
}
