export interface Node
{
        readonly type: string

        children: Node[]
}

export abstract class Visitor
{
        genericVisit(node: Node): void
        {
                // nop
        }
}

export function visit(node: Node, visitor: Visitor)
{
        // call visit function
        const v: any = visitor
        const visit = v['visit' + node.type]
        if (visit) {
                visit(node)
        } else {
                visitor.genericVisit(node)
        }

        // recursive for each child
        node.children.forEach(x => visit(x, visitor))
}

export interface Module extends Node
{
        readonly type: 'Module'

        name: string
}

export interface Program extends Node
{
        readonly type: 'Program'

        name: string
        isExported: boolean
}

export interface ProgramPattern extends Node
{
        readonly type: 'ProgramPattern'

        usings: string[]
        returnings: string[]
}

export interface WorkingStorageSection extends Node
{
        readonly type: 'WorkingStorageSection'

        fields: Field[]
}

export interface LinkageSection extends Node
{
        readonly type: 'LinkageSection'

        fields: Field[]
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

export type FieldUsage = 'COMP-2' | 'COMP-4' | 'DISPLAY'

export interface Field extends Node
{
        readonly type: 'Field'

        level: number
        name: string
        usage: FieldUsage
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

export interface Statement extends Node
{
        // pass
}

export interface ParagraphStatement extends Node
{
        readonly type: 'ParagraphStatement'

        name: string
}

export interface CallId extends Node
{
        readonly type: 'CallId'

        module?: string
        program: string
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

export interface CallReturningId extends Node
{
        readonly type: 'CallReturningId'

        name: string
}

export interface CallStatement extends Node
{
        readonly type: 'CallStatement'
}

export interface GobackStatement extends Node
{
        readonly type: 'GobackStatement'
}
