export class Node
{
        readonly type: string

        constructor(type: string)
        {
                this.type = type
        }
}

export class Module extends Node
{
        name: string
        programs: Program[]

        constructor(name: string, programs: Program[])
        {
                super('Module')
                this.name     = name
                this.programs = programs
        }
}

export class Program extends Node
{
        name: string
        isExported: boolean
        patterns: ProgramPattern[]

        constructor(name: string, isExported: boolean, patterns: ProgramPattern[])
        {
                super('Program')
                this.name       = name
                this.isExported = isExported
                this.patterns   = patterns
        }
}

export class ProgramPattern extends Node
{
        workingStorageFields: Field[]
        linkageFields: Field[]
        usings: string[]
        returnings: string[]
        statements: Statement[]

        constructor(
                workingStorageFields: Field[], linkageFields: Field[],
                usings: string[], returnings: string[], statements: Statement[])
        {
                super('ProgramPattern')
                this.workingStorageFields = workingStorageFields
                this.linkageFields        = linkageFields
                this.usings               = usings
                this.returnings           = returnings
                this.statements           = statements
        }
}

export abstract class ValueLiteral extends Node
{
        // pass
}

export class NumberLiteral extends ValueLiteral
{
        value: string

        constructor(value: string)
        {
                super('NumberLiteral')
                this.value = value
        }
}

export class StringLiteral extends ValueLiteral
{
        value: string

        constructor(value: string)
        {
                super('StringLiteral')
                this.value = value
        }
}

export type FieldUsage = 'COMP-2' | 'COMP-4' | 'DISPLAY'

export class Field extends Node
{
        level: number
        name: string
        pic: PictureSegment[]
        usage: FieldUsage
        value?: ValueLiteral

        constructor(
                level: number, name: string,  pic: PictureSegment[],
                usage: FieldUsage, value?: ValueLiteral)
        {
                super('Field')
                this.level = level
                this.name  = name
                this.pic   = pic
                this.usage = usage
                this.value = value
        }
}

export type PictureChar = 'S' | 'X' | '9'

export class PictureSegment
{
        char: PictureChar
        size: number

        constructor(char: PictureChar, size: number)
        {
                this.char = char
                this.size = size
        }
}

export abstract class Statement extends Node
{
        // pass
}

export class ParagraphStatement extends Node
{
        name: string

        constructor(name: string)
        {
                super('ParagraphStatement')
                this.name = name
        }
}

export class CallId extends Node
{
        module?: string
        program: string

        constructor(program: string, module?: string)
        {
                super('CallId')
                this.module  = module
                this.program = program
        }
}

export type CallUsingWhat = string | StringLiteral | NumberLiteral

export class CallUsing extends Node
{
        what: CallUsingWhat
        isByContent: boolean

        constructor(what: CallUsingWhat, isByContent: boolean)
        {
                super('CallUsing')
                this.what        = what
                this.isByContent = isByContent
        }
}

export class CallStatement extends Node
{
        id: CallId
        usings: CallUsing[]
        returnings: string[]

        constructor(id: CallId, usings: CallUsing[], returnings: string[])
        {
                super('CallStatement')
                this.id         = id
                this.usings     = usings
                this.returnings = returnings
        }
}

export class GobackStatement extends Node
{
        constructor()
        {
                super('GobackStatement')
        }
}
