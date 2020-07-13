import { lstatSync, existsSync } from 'fs'
import { dirname, basename, join } from 'path'
import { Command, flags } from '@oclif/command'

function outputFromInput(input: string): string
{
        return join(dirname(input), basename(input, '.cbl') + '.cam')
}

function outputFromOutput(input: string, output: string): string
{
        if (existsSync(output) && lstatSync(output).isDirectory()) {
                return join(output, basename(input, '.cbl') + '.cam')
        } else {
                return output
        }
}

export default class Compile extends Command {
        static description = 'Compile a COBOL source file'

        static examples = [
                '$ cbljs compile main.cbl',
                '$ cbljs compile main.cbl -o main.cbl',
                '$ cbljs compile main.cbl -o bin/',
        ]

        static flags = {
                help: flags.help({ char: 'h' }),
                output: flags.string({
                        char: 'o',
                        description: 'where to place the compiled byte code'
                })
        }

        static args = [
                {
                        name: 'input',
                        required: true,
                        description: 'input COBOL source file'
                }
        ]

        async run(): Promise<void> {
                const { args, flags } = this.parse(Compile)

                const input  = args.input
                if (!existsSync(input) || !lstatSync(input).isFile()) {
                        this.error(`Can't open file: ${input}`)
                }

                const output = flags.output ? outputFromOutput(input, flags.output)
                                            : outputFromInput(input)

                this.log(`compile ${input}`)
                // TODO: compile logic
                this.log(`     -> ${output}`)
        }
}
