import { Compiler, CompilerPass } from '../compiler'
import { ModuleSymbol, ChunkSymbol, ProgramSymbol,
         FieldSymbol, Comp4FieldSymbol } from '../symbols/core'
import { Assembler, Comp4, Opcode } from 'cam-js'
import { assert } from 'console'
import { differenceBy } from 'lodash'
import * as ast from '../grammars/core.ast'

class Comp2Value
{
        readonly kind = 'Comp2Value'
        literal: string

        constructor(literal: string)
        {
                this.literal = literal
        }
}

class Comp4Value
{
        readonly kind = 'Comp4Value'
        value: Comp4

        constructor(value: Comp4)
        {
                this.value = value
        }
}

class DisplayValue
{
        readonly kind = 'DisplayValue'
        literal: string

        constructor(literal: string)
        {
                this.literal = literal
        }
}

type ConstantValue = Comp2Value | Comp4Value | DisplayValue

class Constant
{
        index?: number
        readonly value: ConstantValue

        constructor(value: ConstantValue)
        {
                this.value = value
        }
}

class ConstantPool
{
        readonly constants = <Constant[]> []

        getComp2(literal?: ast.NumberLiteral): Constant
        {
                const lit = literal ? literal.value : '0'
                let c = this.constants.find(
                        x => x.value instanceof Comp2Value && x.value.literal == lit)
                if (c) {
                        return c
                } else {
                        c = new Constant(new Comp2Value(lit))
                        this.constants.push(c)
                        return c
                }
        }

        getComp4(value: Comp4): Constant
        {
                let c = this.constants.find(
                        x => x.value instanceof Comp4Value &&
                        x.value.value.value == value.value &&
                        x.value.value.precision == value.precision &&
                        x.value.value.scale == value.scale)
                if (c) {
                        return c
                } else {
                        c = new Constant(new Comp4Value(value))
                        this.constants.push(c)
                        return c
                }
        }

        getDisplay(literal?: ast.StringLiteral): Constant
        {
                const lit = literal ? literal.value : ''
                let c = this.constants.find(
                        x => x.value instanceof DisplayValue && x.value.literal == lit)
                if (c) {
                        return c
                } else {
                        c = new Constant(new DisplayValue(lit))
                        this.constants.push(c)
                        return c
                }
        }
}

class WorkingStorageField
{
        readonly symbol: FieldSymbol
        readonly index: number

        constructor(symbol: FieldSymbol, index: number)
        {
                this.symbol = symbol
                this.index  = index
        }
}

class LinkageField
{
        readonly name: string
        readonly value: Constant
        index?: number

        constructor(name: string, value: Constant)
        {
                this.name  = name
                this.value = value
        }
}

class ByteCodeGenerationVisitor extends ast.Visitor
{
        private readonly _compiler: Compiler
        private _asm?: Assembler
        private _cpool?: ConstantPool
        private _module?: ModuleSymbol
        private _chunk?: ChunkSymbol
        private _program?: ProgramSymbol
        private _workingStorageFields?: WorkingStorageField[]
        private _linkageFields?: LinkageField[]

        constructor(compiler: Compiler)
        {
                super()

                this._compiler = compiler
        }

        visitModule(node: ast.Module): void
        {
                const name = node.first(ast.Identifier)!.name
                this._asm = new Assembler(name)
                this._cpool = new ConstantPool()
                this._module = this._compiler.globalScope.resolveMember(name) as ModuleSymbol
                this._chunk = this._module!.resolveMember(this._compiler.chunkName) as ChunkSymbol
        }

        visitProgram(node: ast.Program): void
        {
                const name = node.first(ast.Identifier)!.name

                if (this._program) {
                        this._asm!.prototypePop()
                }

                this._asm!.prototypePush(name)

                this._program = this._chunk!.resolve(name) as ProgramSymbol

                this._workingStorageFields = []
                this._linkageFields = []
        }

        visitField(node: ast.Field): void
        {
                const name = node.first(ast.Identifier)!.name
                const sym = this._program!.resolveMember(name) as FieldSymbol
                const value = node.first(ast.ValueLiteral)
                if (!sym.isWorking) {
                        let f: LinkageField

                        switch(sym.usage) {
                        case 'COMP-2':
                                f = new LinkageField(
                                        name, this._cpool!.getComp2(
                                                value ? (value as ast.NumberLiteral) : undefined))
                                break

                        case 'COMP-4': {
                                const c4v = (sym as Comp4FieldSymbol).value || new Comp4(BigInt(0), 1, 0)
                                f = new LinkageField(name, this._cpool!.getComp4(c4v))
                                break }

                        case 'DISPLAY':
                                f = new LinkageField(
                                        name, this._cpool!.getDisplay(
                                                value ? (value as ast.StringLiteral) : undefined))
                                break
                        }

                        this._linkageFields!.push(f)
                }
        }

        private genWorkingStorageFields(): void
        {
                this._workingStorageFields = this._program!.node
                        .first(ast.WorkingStorageSection)!
                        .where(ast.Field)
                        .map(x => x.first(ast.Identifier)!.name)
                        .map(x => this._program!.resolve(x) as FieldSymbol)
                        .map(x => {
                                let index: number

                                switch (x.usage) {
                                case 'COMP-2': {
                                        const value = x.node.first(ast.NumberLiteral)!
                                        index = this._asm!.wfieldComp2(parseFloat(value.value))
                                        break }

                                case 'COMP-4': {
                                        const value = (x as Comp4FieldSymbol).value || new Comp4(BigInt(0), 1, 0)
                                        index = this._asm!.wfieldComp4(value.precision, value.scale, value.value.toString())
                                        break }

                                case 'DISPLAY': {
                                        const value = x.node.first(ast.StringLiteral)!
                                        index = this._asm!.wfieldDisplay(value.value)
                                        break }
                                }

                                return new WorkingStorageField(x, index)
                        })
        }

        private genWorkingStorageConstants(): void
        {
                this._cpool!.constants.forEach(x => {
                        switch (x.value.kind) {
                        case 'Comp2Value':
                                x.index = this._asm!.wfieldComp2(parseFloat(x.value.literal))
                                break

                        case 'Comp4Value': {
                                const c4v = x.value.value
                                x.index = this._asm!.wfieldComp4(c4v.precision, c4v.scale, c4v.value.toString())
                                break }

                        case 'DisplayValue':
                                x.index = this._asm!.wfieldDisplay(x.value.literal)
                                break
                        }
                })
        }

        private genLinkageFields(): void
        {
                const usings = this._program!.usings
                        .map(x => this._linkageFields!.find(y => y.name === x.name)!)

                const returnings = this._program!.returnings
                        .map(x => this._linkageFields!.find(y => y.name === x.name)!)

                const locals = differenceBy(this._linkageFields!, usings.concat(returnings), x => x.name)

                let usingIdx = 0
                usings.forEach(x => x.index = --usingIdx)

                let localIdx = 0
                returnings.concat(locals).forEach(x => {
                        x.index = localIdx++
                        this._asm!.emitB(Opcode.Load, x.value.index!)
                })
        }

        visitProcedureDivision(node: ast.ProcedureDivision)
        {
                this.genWorkingStorageFields()
                this.genWorkingStorageConstants()
                this.genLinkageFields()
        }

        cleanup(): void
        {
                this._asm!.serialize(this._compiler.outputPath)
        }
}

export class ByteCodeGenerationPass implements CompilerPass
{
        readonly name = 'ByteCodeGenerationPass'
        readonly isDeclare = false
        readonly depends = [ 'StaticTypingPass' ]
        readonly reversed_depends = <string[]> []
        readonly visitors = <ast.Visitor[]> []
        readonly transformers = <ast.Transformer[]> []

        constructor(compiler: Compiler)
        {
                this.visitors.push(new ByteCodeGenerationVisitor(compiler))
        }
}
