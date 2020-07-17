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

export interface Node
{
        readonly type: string
        readonly location: NodeLocation

        children: Node[]
}

export abstract class Visitor
{
        visit(node: Node): void
        {
                // call visit function
                const v: any = this
                const f = v['visit' + node.type]
                if (f) {
                        f(node)
                } else {
                        if (v.genericVisit) {
                                v.genericVisit(node)
                        }
                }

                // recursive for each child
                node.children.forEach(x => this.visit(x))
        }
}

export abstract class Transformer
{
        transform(node: Node): Node | undefined
        {
                // call transform function
                const v: any = this
                const f = v['transform' + node.type]
                if (f) {
                        node = f(node)
                } else {
                        if (v.genericTransform) {
                                node = v.genericTransform(node)
                        }
                }

                // recursive for each child
                if (node) {
                        node.children = node.children
                                .map(x => this.transform(x))
                                .reduce<Node[]>((acc, x) => {
                                        // remove undefined
                                        if (x) { acc.push(x) }
                                        return acc
                                }, [])
                }

                return node
        }
}

export interface Identifier extends Node
{
        readonly type: 'Identifier'

        name: string
}

export interface Module extends Node
{
        readonly type: 'Module'
}

export interface Export extends Node
{
        readonly type: 'Export'
}

export interface Program extends Node
{
        readonly type: 'Program'
}

export interface ProgramPattern extends Node
{
        readonly type: 'ProgramPattern'
}

export interface WorkingStorageSection extends Node
{
        readonly type: 'WorkingStorageSection'
}

export interface LinkageSection extends Node
{
        readonly type: 'LinkageSection'
}

export interface ValueLiteral extends Node
{
        // pass
}

export interface NumberLiteral extends ValueLiteral
{
        readonly type: 'NumberLiteral'

        value: string
}

export interface StringLiteral extends ValueLiteral
{
        readonly type: 'StringLiteral'

        value: string
}

export interface Level extends Node
{
        readonly type: 'Level'

        level: number
}

export interface Usage extends Node
{
        readonly type: 'Usage'

        usage: 'COMP-2' | 'COMP-4' | 'DISPLAY'
}

export interface Field extends Node
{
        readonly type: 'Field'
}

export interface Picture extends Node
{
        readonly type: 'Picture'

        segments: PictureSegment[]
}

export type PictureChar = 'S' | 'X' | '9'

export interface PictureSegment
{
        char: PictureChar
        size: number
}

export interface ProcedureUsings extends Node
{
        readonly type: 'ProcedureUsings'
}

export interface ProcedureReturnings extends Node
{
        readonly type: 'ProcedureReturnings'
}

export interface Statement extends Node
{
        // pass
}

export interface ParagraphStatement extends Node
{
        readonly type: 'ParagraphStatement'

        name: string
}

export interface CallIdModule extends Node
{
        readonly type: 'CallIdModule'

        name: string
}

export interface CallIdProgram extends Node
{
        readonly type: 'CallIdProgram'

        name: string
}

export interface CallId extends Node
{
        readonly type: 'CallId'
}

export interface CallUsings extends Node
{
        readonly type: 'CallUsings'
}

export interface CallUsingId extends Node
{
        readonly type: 'CallUsingId'

        name: string
        isByContent: boolean
}

export interface CallReturnings extends Node
{
        readonly type: 'CallReturnings'
}

export interface CallStatement extends Node
{
        readonly type: 'CallStatement'
}

export interface GobackStatement extends Node
{
        readonly type: 'GobackStatement'
}
