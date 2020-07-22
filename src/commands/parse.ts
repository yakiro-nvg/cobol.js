import { lstatSync, existsSync } from 'fs'
import { Command, flags } from '@oclif/command'
import { Parser } from '../parser'
import { render } from 'prettyjson'
import { CLIError } from '@oclif/errors'

export default class Parse extends Command {
        static description = 'generate Abstract Syntax Tree'

        static examples = [
                '$ cbljs parse main.cbl'
        ]

        static flags = {
                help: flags.help({ char: 'h' }),
                freeFormat: flags.boolean({
                        char: 'f',
                        description: 'free format COBOL?',
                        default: true
                }),
                pretty: flags.boolean({
                        char: 'p',
                        description: 'pretty print output?',
                        default: false
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
                const { args, flags } = this.parse(Parse)

                const input  = args.input
                if (!existsSync(input) || !lstatSync(input).isFile()) {
                        this.error(`Can't open file: ${input}`)
                }

                try {
                        const parser = new Parser(flags.freeFormat)
                        const module = parser.parse(input)
                        if (flags.pretty) {
                                console.log(render(module))
                        } else {
                                console.log(JSON.stringify(module))
                        }
                } catch(e) {
                        if (!(e instanceof CLIError)) {
                                console.log(e)
                        }

                        throw e
                }
        }
}
