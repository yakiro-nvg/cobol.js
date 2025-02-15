import { Symbol, Type, Scope } from '../symbol'
import * as ast from '../grammars/core.ast'

export abstract class BaseScope implements Scope
{
        readonly enclosingScope?: Scope

        constructor(enclosingScope?: Scope)
        {
                this.enclosingScope = enclosingScope
        }

        abstract define(sym: Symbol): void
        abstract resolveMember(name: string): Symbol | undefined

        resolve(name: string): Symbol | undefined
        {
                const s = this.resolveMember(name)
                if (s) {
                        return s
                } else if (this.enclosingScope) {
                        return this.enclosingScope.resolve(name)
                } else {
                        return undefined
                }
        }
}

export abstract class SymbolTable extends BaseScope
{
        protected readonly _symbols: Map<string, Symbol>

        constructor(enclosingScope?: Scope)
        {
                super(enclosingScope)
                this._symbols = new Map<string, Symbol>()
        }

        define(sym: Symbol): void
        {
                this._symbols.set(sym.name, sym)
        }

        resolveMember(name: string): Symbol | undefined
        {
                return this._symbols.get(name)
        }
}

export abstract class UsageSymbol implements Symbol, Type
{
        abstract readonly tag: string
        abstract readonly name: string
}

export class Comp2TypeSymbol extends UsageSymbol
{
        readonly tag  = 'COMP-2'
        readonly name = 'COMP-2'
}

export class Comp4TypeSymbol extends UsageSymbol
{
        readonly tag  = 'COMP-4'
        readonly name = 'COMP-4'
}

export class DisplayTypeSymbol extends UsageSymbol
{
        readonly tag  = 'DISPLAY'
        readonly name = 'DISPLAY'
}

export class AnyTypeSymbol extends UsageSymbol
{
        readonly tag  = 'ANY'
        readonly name = 'ANY'
}

export class GlobalScope extends SymbolTable
{
        constructor()
        {
                super()

                this.define(new Comp2TypeSymbol())
                this.define(new Comp4TypeSymbol())
                this.define(new DisplayTypeSymbol())
                this.define(new AnyTypeSymbol())
        }
}

export class ModuleSymbol extends SymbolTable implements Symbol
{
        readonly name: string

        constructor(enclosingScope: GlobalScope, name: string)
        {
                super(enclosingScope)
                this.name = name
        }
}

export class ChunkSymbol extends SymbolTable implements Symbol
{
        readonly name: string

        constructor(enclosingScope: ModuleSymbol, name: string)
        {
                super(enclosingScope)
                this.name = name
        }
}

export class DataSectionScope extends SymbolTable
{
        constructor()
        {
                super(undefined)
        }
}

export class ProgramSymbol extends BaseScope implements Symbol
{
        readonly name: string
        readonly node: ast.Program
        readonly usings = <FieldSymbol[]> []
        readonly returnings = <FieldSymbol[]> []

        private readonly _workingStorage = new DataSectionScope()
        private readonly _linkage        = new DataSectionScope()

        constructor(enclosingScope: ChunkSymbol, name: string, node: ast.Program)
        {
                super(enclosingScope)
                this.name = name
                this.node = node
        }

        define(sym: Symbol): void
        {
                const fs = sym as FieldSymbol
                if (fs.isWorking) {
                        this._workingStorage.define(sym)
                } else {
                        this._linkage.define(sym)
                }
        }

        resolveMember(name: string): Symbol | undefined
        {
                return this._workingStorage.resolveMember(name) || this._linkage.resolveMember(name)
        }
}

export class FieldSymbol implements Symbol
{
        readonly name: string
        readonly isWorking: boolean
        readonly pic?: ast.PictureSegment[]
        readonly usage: ast.UsageType
        readonly node: ast.Field
        type?: Type

        constructor(
                name: string, isWorking: boolean, usage: ast.UsageType,
                node: ast.Field, pic?: ast.PictureSegment[])
        {
                this.name      = name
                this.isWorking = isWorking
                this.pic       = pic
                this.usage     = usage
                this.node      = node
        }
}

export class Comp4FieldSymbol extends FieldSymbol
{
        readonly isSigned: boolean
        readonly scale: number
        readonly value?: BigInt

        constructor(name: string, isWorking: boolean,
                node: ast.Field, pic?: ast.PictureSegment[])
        {
                super(name, isWorking, 'COMP-4', node, pic)
                const value = node.first(ast.NumberLiteral)

                if (pic) {
                        this.isSigned = pic[0].char === 'S'
                        const picParts = pic.filter(x => x.char === '9')
                        this.scale = picParts.length === 2 ? picParts[1].size : 0
                        if (!value) {
                                return
                        }

                        const precision = picParts[0].size + this.scale
                        const parts = value.value.split('.')

                        if (this.isSigned && value.value.startsWith('-')) {
                                throw 'bad sig'
                        }

                        if (parts.length === 2) {
                                parts[1] = parts[1].substr(0, this.scale).padEnd(this.scale, '0')
                        }

                        const c4str = parts.join('')
                        const expected_max_len = parts[0][0] === '-' ? precision + 1 : precision
                        if (c4str.length > expected_max_len) {
                                throw 'too big'
                        }

                        const vnodot = parts.join('')
                        this.value = BigInt(vnodot)*BigInt(Math.pow(10, precision - vnodot.length))
                } else {
                        if (!value) {
                                this.isSigned = true
                                this.scale    = 0
                                return
                        }

                        this.isSigned = value.value.startsWith('-')
                        const parts = value.value.split('.')
                        this.scale = parts.length === 2 ? parts[1].length : 0

                        const c4str = parts.join('')
                        if (c4str.length > 18) {
                                throw 'too big'
                        }

                        this.value = BigInt(c4str)
                }
        }
}
