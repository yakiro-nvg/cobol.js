import { Node, Visitor, Transformer } from './grammars/core.ast'
import { CoreCompilerComponent } from './passes/core'
import { CompilerPassDependencyError } from './errors'
import { array as toposortArray } from 'toposort'
import { GlobalScope } from './symbols/core'
import { join } from 'path'
import * as _ from 'lodash'
import * as glob from 'glob'
import { Parser } from './parser'

export interface CompilerPass
{
        readonly name: string
        readonly isDeclare: boolean
        readonly depends: string[]
        readonly reversed_depends: string[]
        readonly visitors: Visitor[]
        readonly transformers: Transformer[]
}

export interface CompilerComponent
{
        passes: CompilerPass[]
}

export class Compiler
{
        public readonly globalScope = new GlobalScope()

        private readonly _parser: Parser
        private readonly _components: CompilerComponent[]
        private _sorted_passes?: CompilerPass[]
        private _chunkName?: string
        private _outputPath?: string

        get chunkName(): string
        {
                return this._chunkName!
        }

        get outputPath(): string
        {
                return this._outputPath!
        }

        constructor(freeFormat: boolean)
        {
                this._parser = new Parser(freeFormat)
                this._components = [ new CoreCompilerComponent(this) ]
        }

        addComponent(component: CompilerComponent): void
        {
                this._components.push(component)
                this._sorted_passes = undefined
        }

        private prepareComponents(): void
        {
                if (!this._sorted_passes) {
                        const passes = _.flatMap(this._components, x => x.passes)
                        passes.forEach(x => {
                                x.depends.forEach(y => {
                                        if (!passes.find(z => z.name === y)) {
                                                throw new CompilerPassDependencyError(
                                                        `unresolved dependency: ${x.name} -> ${y}`)
                                        }
                                })

                                x.reversed_depends.forEach(y => {
                                        if (!passes.find(z => z.name === y)) {
                                                throw new CompilerPassDependencyError(
                                                        `unresolved reversed-dependency: ${x.name} -> ${y}`)
                                        }
                                })
                        })

                        const edges = <Array<[string, string | undefined]>> _.flatMap(passes,
                                x => x.depends.map(y => [y, x.name]).concat(
                                        x.reversed_depends.map(y => [x.name, y])))
                        const nodes = passes.map(x => x.name)
                        try {
                                this._sorted_passes = toposortArray(nodes, edges)
                                        .map(x => passes.find(y => x == y.name)!)
                        } catch (e) {
                                const err = e as Error
                                throw new CompilerPassDependencyError(err.message)
                        }
                }
        }

        private compileDeclare(inputPath: string): void
        {
                this._chunkName = inputPath
                const root = <Node> this._parser.parse(inputPath)
                this._sorted_passes!
                        .filter(x => x.isDeclare)
                        .forEach(x => {
                                x.visitors.forEach(y => y.visit(root))
                                x.transformers.reduce((acc, y) => y.transform(acc)!, root)
                        })
        }

        private compileSystemDeclares(): void
        {
                const sysPattern = join(__dirname, '../types/**/*.d.cbl')
                const files = glob.sync(sysPattern)
                files.forEach(x => this.compileDeclare(x))
        }

        compile(inputPath: string, outputPath: string): void
        {
                this.prepareComponents()
                this.compileSystemDeclares()

                this._chunkName  = inputPath
                this._outputPath = outputPath
                const root = <Node> this._parser.parse(inputPath)
                this._sorted_passes!.forEach(x => {
                        x.visitors.forEach(y => y.visit(root))
                        x.transformers.reduce((acc, y) => y.transform(acc)!, root)
                })
        }
}
