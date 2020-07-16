import { CLIError } from '@oclif/errors'

export class ParserError extends CLIError
{
        constructor(message: string, file: string, line: number, column: number)
        {
                const code = 'CBL0001'
                super(`${file}:${line}:${column} - ${message}\n`, { code })
        }
}
