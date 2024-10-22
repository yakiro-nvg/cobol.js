import { ProgramSymbol, FieldSymbol } from '../symbols/core'
import { Type } from '../symbol'

export interface NodeLocationPos
{
        offset: number
        line: number
        column: number
}

export interface NodeLocation
{
        start: NodeLocationPos
        end: NodeLocationPos
}

export abstract class Node
{
        readonly kind: string
        readonly location: NodeLocation
        children = <Node[]> []

        constructor(kind: string, location: NodeLocation)
        {
                this.kind     = kind
                this.location = location
        }

        first<T extends Node>(type: { new (...args: any[]): T }): T | undefined
        {
                return <T> this.children.find(x => x instanceof type)
        }

        where<T extends Node>(type: { new (...args: any[]): T }): T[]
        {
                return this.children.reduce((acc, x) => {
                        if (x instanceof type) { acc.push(<T> x) }
                        return acc
                }, <T[]> [])
        }
}

export abstract class Visitor
{
        visit(node: Node): void
        {
                // call visit function
                const v: any = this
                const f = v['visit' + node.kind]
                if (f) {
                        f.bind(this)(node)
                } else {
                        this.genericVisit(node)
                }

                // recursive for each child
                node.children.forEach(x => this.visit(x))

                // call visit post-order function
                const p = v['visitPost' + node.kind]
                if (p) {
                        p.bind(this)(node)
                } else {
                        this.genericVisitPost(node)
                }
        }

        genericVisit(node: Node): void
        {
                // nop
        }

        genericVisitPost(node: Node): void
        {
                // nop
        }
}

export abstract class Transformer
{
        transform(node: Node): Node | Node[] | undefined
        {
                let ret: Node | Node[] | undefined = node

                // call transform function
                const v: any = this
                const f = v['transform' + node.kind]
                if (f) {
                        ret = f.bind(this)(node)
                } else {
                        ret = this.genericTransform(node)
                }

                // recursive for each child
                if (ret instanceof Node) {
                        ret.children = ret.children
                                .map(x => this.transform(x))
                                .reduce<Node[]>((acc, x) => {
                                        if (x instanceof Node) {
                                                acc.push(x)
                                        } else if (Array.isArray(x)) {
                                                x.forEach(y => acc.push(y))
                                        }

                                        return acc
                                }, [])
                }

                return ret
        }

        genericTransform(node: Node): Node | Node[] | undefined
        {
                return node
        }
}

export class Identifier extends Node
{
        name: string

        constructor(location: NodeLocation, name: string)
        {
                super('Identifier', location)
                this.name = name
        }
}

export class Module extends Node
{
        constructor(location: NodeLocation)
        {
                super('Module', location)
        }
}

export class Export extends Node
{
        constructor(location: NodeLocation)
        {
                super('Export', location)
        }
}

export class Program extends Node
{
        constructor(location: NodeLocation)
        {
                super('Program', location)
        }
}

export class WorkingStorageSection extends Node
{
        constructor(location: NodeLocation)
        {
                super('WorkingStorageSection', location)
        }
}

export class LinkageSection extends Node
{
        constructor(location: NodeLocation)
        {
                super('LinkageSection', location)
        }
}

export class ValueLiteral extends Node
{
        constructor(kind: string, location: NodeLocation)
        {
                super(kind, location)
        }
}

export class NumberLiteral extends ValueLiteral
{
        value: string

        constructor(location: NodeLocation, value: string)
        {
                super('NumberLiteral', location)
                this.value = value
        }
}

export class StringLiteral extends ValueLiteral
{
        value: string

        constructor(location: NodeLocation, value: string)
        {
                super('StringLiteral', location)
                this.value = value
        }
}

export class Level extends Node
{
        level: number

        constructor(location: NodeLocation, level: number)
        {
                super('Level', location)
                this.level = level
        }
}

export type UsageType = 'COMP-2' | 'COMP-4' | 'DISPLAY' | 'ANY'

export class Usage extends Node
{
        usage: UsageType

        constructor(location: NodeLocation, usage: UsageType)
        {
                super('Usage', location)
                this.usage = usage
        }
}

export class Field extends Node
{
        constructor(location: NodeLocation)
        {
                super('Field', location)
        }
}

export class Picture extends Node
{
        segments: PictureSegment[]

        constructor(location: NodeLocation, segments: PictureSegment[])
        {
                super('Picture', location)
                this.segments = segments
        }
}

export type PictureChar = 'S' | 'X' | 'A' | '9' | 'V'

export interface PictureSegment
{
        char: PictureChar
        size: number
}

export class ProcedureUsings extends Node
{
        constructor(location: NodeLocation)
        {
                super('ProcedureUsings', location)
        }
}

export class ProcedureReturnings extends Node
{
        constructor(location: NodeLocation)
        {
                super('ProcedureReturnings', location)
        }
}

export class ProcedureDivision extends Node
{
        constructor(location: NodeLocation)
        {
                super('ProcedureDivision', location)
        }
}

export class Expression extends Node
{
        type?: Type

        constructor(kind: string, location: NodeLocation)
        {
                super(kind, location)
        }
}

export class Statement extends Node
{
        constructor(kind: string, location: NodeLocation)
        {
                super(kind, location)
        }
}

export class ParagraphStatement extends Statement
{
        name: string

        constructor(location: NodeLocation, name: string)
        {
                super('ParagraphStatement', location)
                this.name = name
        }
}

export class CallIdModule extends Node
{
        name: string

        constructor(location: NodeLocation, name: string)
        {
                super('CallIdModule', location)
                this.name = name
        }
}

export class CallIdProgram extends Node
{
        name: string

        constructor(location: NodeLocation, name: string)
        {
                super('CallIdProgram', location)
                this.name = name
        }
}

export class CallId extends Node
{
        constructor(location: NodeLocation)
        {
                super('CallId', location)
        }
}

export class CallUsings extends Node
{
        constructor(location: NodeLocation)
        {
                super('CallUsings', location)
        }
}

export class CallUsingId extends Node
{
        name: string
        isByContent: boolean
        symbol?: FieldSymbol

        constructor(location: NodeLocation, name: string, isByContent: boolean)
        {
                super('CallUsingId', location)
                this.name        = name
                this.isByContent = isByContent
        }
}

export class CallUsingLiteral extends Node
{
        type?: Type
        literal: ValueLiteral

        constructor(location: NodeLocation, literal: ValueLiteral)
        {
                super('CallUsingLiteral', location)
                this.literal = literal
        }
}

export class CallReturnings extends Node
{
        constructor(location: NodeLocation)
        {
                super('CallReturnings', location)
        }
}

export class CallReturningId extends Node
{
        name: string
        symbol?: FieldSymbol

        constructor(location: NodeLocation, name: string)
        {
                super('CallReturningId', location)
                this.name = name
        }
}

export class CallStatement extends Statement
{
        callee?: ProgramSymbol

        constructor(location: NodeLocation)
        {
                super('CallStatement', location)
        }
}

export class CallExpression extends Expression
{
        callee?: ProgramSymbol
        usingTypes?: Type[]

        constructor(location: NodeLocation)
        {
                super('CallExpression', location)
        }
}

export class DisplayStatement extends Statement
{
        constructor(location: NodeLocation)
        {
                super('DisplayStatement', location)
        }
}

export class GobackStatement extends Statement
{
        constructor(location: NodeLocation)
        {
                super('GobackStatement', location)
        }
}
