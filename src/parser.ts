import { CoreParserComponent } from './grammars/core'
import { readFileSync } from 'fs'
import { resolve } from 'path'
import { ParserError } from './errors'
import * as _ from 'lodash'
import * as ast from './grammars/core.ast'
import * as pegjs from 'pegjs'

// remove comment and line numbers
function preprocess(content: string, freeFormat: boolean): string
{
        var lines = content.split(/\r?\n/)

        // replace 1-6 columns by whitespace
        if (!freeFormat) {
                lines = lines.map(x => '      ' + x.substr(6))
        }

        return lines.map(x => {
                if (freeFormat) {
                        return x.startsWith('*') ? '' : x
                } else {
                        return x.substr(6).startsWith('*') ? '' : x
                }
        }).join('\n')
}

export interface ParserComponent
{
        readonly name: string
        readonly grammar: string
        readonly keywords: string
        readonly statements: string
        readonly expressions: string
        readonly ast: any
}

export class Parser
{
        private readonly _components: ParserComponent[]
        private readonly _freeFormat: boolean
        private _parser?: pegjs.Parser
        private _ast: any

        constructor(freeFormat: boolean)
        {
                this._components = [ new CoreParserComponent() ]
                this._freeFormat = freeFormat
        }

        addComponent(component: ParserComponent): void
        {
                this._components.push(component)
                this._parser = undefined
        }

        parseBuffer(buf: Buffer, name: string): ast.Module
        {
                if (!this._parser) {
                        const grammar    = this._components.map(x => x.grammar).join('\n')
                        const keywords   = this._components.map(x => x.keywords).join('\n')
                        const statements = this._components.map(x => x.statements).join('\n')
                        const expressions = this._components.map(x => x.expressions).join('\n')
                        this._parser = pegjs.generate(`
                                ${grammar}
                                Keyword ${keywords}
                                Statement 'statement' ${statements}
                                Expression 'expression' ${expressions}
                        `)
                        this._ast = _.zipObject(
                                this._components.map(x => x.name),
                                this._components.map(x => x.ast))
                }

                const content = preprocess(buf.toString('utf8'), this._freeFormat)

                try {
                        const root = this._parser.parse(
                                content, { startRule:'Root', ast: this._ast })
                        return root as ast.Module
                } catch(e) {
                        const pe = e as pegjs.PegjsError
                        throw new ParserError(pe.message, name, pe.location)
                }
        }

        parse(path: string): ast.Module
        {
                const buf = readFileSync(path)
                return this.parseBuffer(buf, resolve(path))
        }
}
