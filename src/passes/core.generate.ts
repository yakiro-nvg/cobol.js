import { Compiler, CompilerPass } from '../compiler'
import { ModuleSymbol, ChunkSymbol, ProgramSymbol,
         FieldSymbol, Comp4FieldSymbol, Comp2TypeSymbol } from '../symbols/core'
import { Assembler, Comp4, Opcode } from 'cam-js'
import { differenceBy, zip } from 'lodash'
import * as ast from '../grammars/core.ast'
import { ExceedComp4PrecisionError } from '../errors'

function comp4FromLiteral(literal: ast.NumberLiteral): Comp4
{
        const parts = literal.value.split('.')
        const scale = parts.length === 2 ? parts[1].length : 0
        const precision = parts[0].length - (parts[0][0] === '-' ? 1 : 0) + scale

        const c4str = parts.join('')
        if (c4str.length > 18) {
                throw 'too big'
        }

        return new Comp4(BigInt(c4str), precision, scale)
}

class Comp2Value
{
        readonly literal: string

        constructor(literal: string)
        {
                this.literal = literal
        }
}

class Comp4Value
{
        readonly value: Comp4

        constructor(value: Comp4)
        {
                this.value = value
        }
}

class DisplayValue
{
        readonly literal: string

        constructor(literal: string)
        {
                this.literal = literal
        }
}

type ConstantValue = Comp2Value | Comp4Value | DisplayValue

class Constant
{
        readonly index: number
        readonly value: ConstantValue

        constructor(index: number, value: ConstantValue)
        {
                this.index = index
                this.value = value
        }
}

class ConstantPool
{
        private readonly _constants = <Constant[]> []
        private readonly _asm: Assembler

        constructor(asm: Assembler)
        {
                this._asm = asm
        }

        getComp2(literal?: ast.NumberLiteral): Constant
        {
                const lit = literal ? literal.value : '0'
                let c = this._constants.find(
                        x => x.value instanceof Comp2Value && x.value.literal == lit)

                if (c) {
                        return c
                } else {
                        const idx = this._asm.wfieldComp2(parseFloat(lit))
                        c = new Constant(idx, new Comp2Value(lit))
                        this._constants.push(c)
                        return c
                }
        }

        getComp4(value: Comp4): Constant
        {
                let c = this._constants.find(
                        x => x.value instanceof Comp4Value &&
                        x.value.value.value == value.value &&
                        x.value.value.precision == value.precision &&
                        x.value.value.scale == value.scale)

                if (c) {
                        return c
                } else {
                        const idx = this._asm.wfieldComp4(
                                value.precision, value.scale, value.value.toString())
                        c = new Constant(idx, new Comp4Value(value))
                        this._constants.push(c)
                        return c
                }
        }

        getDisplay(literal?: ast.StringLiteral): Constant
        {
                const lit = literal ? literal.value : ''
                let c = this._constants.find(
                        x => x.value instanceof DisplayValue && x.value.literal == lit)

                if (c) {
                        return c
                } else {
                        const idx = this._asm.wfieldDisplay(lit)
                        c = new Constant(idx, new DisplayValue(lit))
                        this._constants.push(c)
                        return c
                }
        }
}

class WorkingStorageField
{
        readonly index: number
        readonly symbol: FieldSymbol

        constructor(index: number, symbol: FieldSymbol)
        {
                this.index  = index
                this.symbol = symbol
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

class ReverseCallUsingsTransformer extends ast.Transformer
{
        constructor(compiler: Compiler)
        {
                super()
        }

        transformCallUsings(node: ast.CallUsings): ast.CallUsings
        {
                node.children = node.children.reverse()
                return node
        }
}

export class ReverseCallUsingsPass implements CompilerPass
{
        readonly name = 'ReverseCallUsingsPass'
        readonly isDeclare = false
        readonly depends = [ 'StaticTypingPass' ]
        readonly reversed_depends = [ 'ByteCodeGenerationPass' ]
        readonly visitors = <ast.Visitor[]> []
        readonly transformers = <ast.Transformer[]> []

        constructor(compiler: Compiler)
        {
                this.transformers.push(new ReverseCallUsingsTransformer(compiler))
        }
}

class ByteCodeGenerationVisitor extends ast.Visitor
{
        private readonly _compiler: Compiler
        private _asm?: Assembler
        private _cpool?: ConstantPool
        private _module?: ModuleSymbol
        private _chunk?: ChunkSymbol
        private _programIndices?: Map<string, number>
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
                this._cpool = new ConstantPool(this._asm)
                this._module = this._compiler.globalScope.resolveMember(name) as ModuleSymbol
                this._chunk = this._module!.resolveMember(this._compiler.chunkName) as ChunkSymbol
                this._programIndices = new Map<string, number>()
        }

        visitProgram(node: ast.Program): void
        {
                const name = node.first(ast.Identifier)!.name
                const isExported = node.first(ast.Export)
                const programIdx = this._asm!.prototypePush(isExported ? name : undefined)
                this._programIndices!.set(name, programIdx)
                this._program = this._chunk!.resolve(name) as ProgramSymbol
                this._workingStorageFields = []
                this._linkageFields = []
        }

        visitPostProgram(node: ast.Program): void
        {
                this._asm!.emitA(Opcode.Return)
                this._asm!.prototypePop()
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
                        .first(ast.WorkingStorageSection)
                        ?.where(ast.Field)
                        .map(x => x.first(ast.Identifier)!.name)
                        .map(x => this._program!.resolve(x) as FieldSymbol)
                        .map(x => {
                                let index: number

                                switch (x.usage) {
                                case 'COMP-2': {
                                        const value = x.node.first(ast.NumberLiteral)
                                        index = this._asm!.wfieldComp2(parseFloat(value?.value || '0'))
                                        break }

                                case 'COMP-4': {
                                        const value = (x as Comp4FieldSymbol).value || new Comp4(BigInt(0), 1, 0)
                                        index = this._asm!.wfieldComp4(value.precision, value.scale, value.value.toString())
                                        break }

                                case 'DISPLAY': {
                                        const value = x.node.first(ast.StringLiteral)
                                        index = this._asm!.wfieldDisplay(value?.value)
                                        break }
                                }

                                return new WorkingStorageField(index, x)
                        }) || []
        }

        private genLinkageFields(): void
        {
                const usings = this._program!.usings
                        .map(x => this._linkageFields!.find(y => y.name === x.name)!)

                const returnings = this._program!.returnings
                        .map(x => this._linkageFields!.find(y => y.name === x.name)!)

                const locals = differenceBy(
                        this._linkageFields!, usings.concat(returnings), x => x.name)

                let usingIdx = 0
                usings.forEach(x => x.index = --usingIdx)

                let localIdx = 0
                returnings.concat(locals).forEach(x => {
                        x.index = localIdx++
                        this._asm!.emitB(Opcode.Load, x.value.index!)
                })
        }

        visitProcedureDivision(node: ast.ProcedureDivision): void
        {
                this.genWorkingStorageFields()
                this.genLinkageFields()
        }

        private pushCallable(node: ast.CallStatement | ast.CallExpression): void
        {
                const callId = node.first(ast.CallId)!
                const callIdProgram = callId.first(ast.CallIdProgram)!
                const callIdModule = callId.first(ast.CallIdModule)

                // push callable
                if (callIdModule) {
                        const imp = this._asm!.import(callIdModule.name, callIdProgram.name)
                        this._asm!.emitB(Opcode.Import, imp)
                } else {
                        const idx = this._programIndices!.get(callIdProgram.name)!
                        this._asm!.emitB(Opcode.ChunkValue, idx)
                }
        }

        visitCallStatement(node: ast.CallStatement): void
        {
                this.pushCallable(node)
        }

        visitCallExpression(node: ast.CallExpression): void
        {
                this.pushCallable(node)
        }

        private copyBackReturnings(returnings: ast.CallReturningId[]): void
        {
                returnings.forEach(x => {
                        if (x.symbol!.isWorking) {
                                const f = this._workingStorageFields!.find(y => y.symbol.name == x.name)!
                                this._asm!.emitB(Opcode.Store, f.index)
                        } else {
                                const f = this._linkageFields!.find(y => y.name == x.name)!
                                this._asm!.emitB(Opcode.Replace, f.index!)
                        }
                })
        }

        private copyBackUsings(usings: ast.Node[]): void
        {
                usings.reverse().forEach(x => {
                        if (!(x instanceof ast.CallUsingId) || x.isByContent) {
                                this._asm!.emitB(Opcode.Pop, 1)
                        } else {
                                if (x.symbol!.isWorking) {
                                        const f = this._workingStorageFields!.find(y => y.symbol.name == x.name)!
                                        this._asm!.emitB(Opcode.Store, f.index)
                                } else {
                                        const f = this._linkageFields!.find(y => y.name == x.name)!
                                        this._asm!.emitB(Opcode.Replace, f.index!)
                                }
                        }
                })
        }

        visitPostCallStatement(node: ast.CallStatement): void
        {
                const usings = node.first(ast.CallUsings)?.children || []
                const returnings = node.first(ast.CallReturnings)?.where(ast.CallReturningId) || []

                this._asm!.emitC(Opcode.Call, usings.length, returnings.length)

                this.copyBackReturnings(returnings)
                this.copyBackUsings(usings)

                this._asm!.emitB(Opcode.Pop, 1)
        }

        visitPostCallExpression(node: ast.CallExpression): void
        {
                const usings = node.first(ast.CallUsings)?.children || []

                this._asm!.emitC(Opcode.Call, usings.length, 1)

                // replace callable by returning
                this._asm!.emitB(Opcode.RelativeReplace, usings.length + 1)

                this.copyBackUsings(usings)
        }

        visitCallUsingId(node: ast.CallUsingId): void
        {
                if (node.symbol!.isWorking) {
                        const f = this._workingStorageFields!.find(x => x.symbol.name == node.name)!
                        this._asm!.emitB(Opcode.Load, f.index)
                } else {
                        const f = this._linkageFields!.find(x => x.name == node.name)!
                        this._asm!.emitB(Opcode.Push, f.index!)
                }
        }

        visitCallUsingLiteral(node: ast.CallUsingLiteral): void
        {
                if (node.literal instanceof ast.NumberLiteral) {
                        try {
                                const c = node.type instanceof Comp2TypeSymbol
                                        ? this._cpool!.getComp2(node.literal)
                                        : this._cpool!.getComp4(comp4FromLiteral(node.literal))
                                this._asm!.emitB(Opcode.Load, c.index)
                        } catch(e) {
                                if (e === 'too big') {
                                        throw new ExceedComp4PrecisionError(
                                                this._chunk!.name, node.location)
                                } else {
                                        throw e
                                }
                        }
                } else if (node.literal instanceof ast.StringLiteral) {
                        const c = this._cpool!.getDisplay(node.literal)
                        this._asm!.emitB(Opcode.Load, c.index)
                }
        }

        visitGobackStatement(node: ast.GobackStatement): void
        {
                this._asm!.emitA(Opcode.Return)
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
