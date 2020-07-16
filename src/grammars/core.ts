import { ParserComponent } from '../parser'
import { readFileSync } from 'fs'
import { join } from 'path'
import * as ast from './core.ast'

function readGrammar(name: string): string
{
        const grammarPath = join(__dirname, name)
        return readFileSync(grammarPath).toString()
}

export class CoreComponent implements ParserComponent
{
        name       = 'core'
        grammar    = readGrammar('gcore.pegjs')
        keywords   = readGrammar('gcore.keywords.pegjs')
        statements = readGrammar('gcore.statements.pegjs')
        ast        = ast
}
