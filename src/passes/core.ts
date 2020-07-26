import { CompilerPass, CompilerComponent, Compiler } from '../compiler'
import { DefineDeclareSymbolPass, ResolveDeclarationSymbolPass } from './core.declare'
import { DisplayStatementPass, ResolveProcedureSymbolPass } from './core.procedure'
import { StaticTypingPass, CheckProcedureTypePass, ResolveExpressionTypePass } from './core.type'
import { ReverseCallUsingsPass, ByteCodeGenerationPass } from './core.generate'

export class CoreCompilerComponent implements CompilerComponent
{
        readonly passes = <CompilerPass[]> []

        constructor(compiler: Compiler)
        {
                this.passes.push(new DefineDeclareSymbolPass(compiler))
                this.passes.push(new ResolveDeclarationSymbolPass(compiler))
                this.passes.push(new DisplayStatementPass(compiler))
                this.passes.push(new ResolveProcedureSymbolPass(compiler))
                this.passes.push(new ResolveExpressionTypePass(compiler))
                this.passes.push(new CheckProcedureTypePass(compiler))
                this.passes.push(new StaticTypingPass(compiler))
                this.passes.push(new ReverseCallUsingsPass(compiler))
                this.passes.push(new ByteCodeGenerationPass(compiler))
        }
}
