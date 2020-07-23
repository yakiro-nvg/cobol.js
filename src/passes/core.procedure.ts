import { Compiler, CompilerPass } from '../compiler'
import { ModuleSymbol, ChunkSymbol, ProgramSymbol, FieldSymbol } from '../symbols/core'
import { UndefinedError, MutableArgumentRedefinitionError,
         ExpressionReturnNothingError } from '../errors'
import { toPairs, groupBy } from 'lodash'
import * as ast from '../grammars/core.ast'

class ResolveProcedureSymbolVisitor extends ast.Visitor
{
        private readonly _compiler: Compiler
        private _module?: ModuleSymbol
        private _chunk?: ChunkSymbol
        private _program?: ProgramSymbol

        constructor(compiler: Compiler)
        {
                super()

                this._compiler = compiler
        }

        visitModule(node: ast.Module): void
        {
                const name = node.first(ast.Identifier)!.name
                this._module = this._compiler.globalScope.resolveMember(name) as ModuleSymbol
                this._chunk = this._module!.resolveMember(this._compiler.chunkName) as ChunkSymbol
        }

        visitProgram(node: ast.Program): void
        {
                const name = node.first(ast.Identifier)!.name
                this._program = this._chunk!.resolve(name) as ProgramSymbol
        }

        private checkMutableArgumentRedefinition(node: ast.CallStatement | ast.CallExpression): void
        {
                const usings = node
                        .first(ast.CallUsings)
                        ?.where(ast.CallUsingId)
                        .filter(x => !x.isByContent)
                        .map(x => ({ name: x.name, location: x.location })) || []

                const returnings = node
                        .first(ast.CallReturnings)
                        ?.where(ast.CallReturningId)
                        .map(x => ({ name: x.name, location: x.location })) || []

                toPairs(groupBy(usings.concat(returnings), x => x.name)).forEach(x => {
                        if (x[1].length > 1) {
                                throw new MutableArgumentRedefinitionError(
                                        this._chunk!.name, x[0], x[1][1].location, x[1][0].location)
                        }
                })
        }

        private resolveCallee(node: ast.CallStatement | ast.CallExpression): void
        {
                const callId = node.first(ast.CallId)!
                const callIdProgram = callId.first(ast.CallIdProgram)!
                const callIdModule = callId.first(ast.CallIdModule)

                if (callIdModule) {
                        const calleeModSym = this._compiler.globalScope.resolveMember(callIdModule.name) as ModuleSymbol
                        if (!calleeModSym) {
                                throw new UndefinedError(
                                        this._chunk!.name, callIdModule.name, callIdModule.location)
                        }

                        node.callee = calleeModSym.resolveMember(callIdProgram.name) as ProgramSymbol
                        if (!node.callee) {
                                throw new UndefinedError(
                                        this._chunk!.name, callIdProgram.name, callIdProgram.location)
                        }
                } else {
                        node.callee = this._chunk!.resolveMember(callIdProgram.name) as ProgramSymbol
                        if (!node.callee) {
                                throw new UndefinedError(
                                        this._chunk!.name, callIdProgram.name, callIdProgram.location)
                        }
                }

                this.checkMutableArgumentRedefinition(node)
        }

        visitCallStatement(node: ast.CallStatement): void
        {
                this.resolveCallee(node)
        }

        visitCallExpression(node: ast.CallExpression): void
        {
                this.resolveCallee(node)
                const callee = node.callee!
                if (callee.returnings.length > 0) {
                        node.type = callee.returnings[0].type
                } else {
                        const prog = node.first(ast.CallId)!.first(ast.CallIdProgram)!
                        throw new ExpressionReturnNothingError(
                                this._chunk!.name, prog.name, prog.location)
                }
        }

        visitCallUsings(node: ast.CallUsings): void
        {
                node.where(ast.CallUsingId).forEach(x => {
                        x.symbol = this._program!.resolveMember(x.name) as FieldSymbol
                        if (!x.symbol) {
                                throw new UndefinedError(this._chunk!.name, x.name, x.location)
                        }
                })
        }

        visitCallReturnings(node: ast.CallReturnings): void
        {
                node.where(ast.CallReturningId).forEach(x => {
                        x.symbol = this._program!.resolveMember(x.name) as FieldSymbol
                        if (!x.symbol) {
                                throw new UndefinedError(this._chunk!.name, x.name, x.location)
                        }
                })
        }
}

export class ResolveProcedureSymbolPass implements CompilerPass
{
        readonly name = 'ResolveProcedureSymbolPass'
        readonly isDeclare = false
        readonly depends = [ 'ResolveDeclarationSymbolPass' ]
        readonly reversed_depends = [ 'StaticTypingPass' ]
        readonly visitors = <ast.Visitor[]> []
        readonly transformers = <ast.Transformer[]> []

        constructor(compiler: Compiler)
        {
                this.visitors.push(new ResolveProcedureSymbolVisitor(compiler))
        }
}
