import { CompilerPass, Compiler } from '../compiler'
import * as ast from '../grammars/core.ast'

export class StaticTypingPass implements CompilerPass
{
        readonly name = 'StaticTypingPass'
        readonly isDeclare = false
        readonly depends = <string[]> []
        readonly reversed_depends = <string[]> []
        readonly visitors = <ast.Visitor[]> []
        readonly transformers = <ast.Transformer[]> []

        constructor(compiler: Compiler)
        {
                // nop, this is a dependency helper
        }
}
