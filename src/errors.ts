import { CLIError } from '@oclif/errors'
import * as ast from './grammars/core.ast'

export class ParserError extends CLIError
{
        constructor(message: string, chunkName: string, location: ast.NodeLocation)
        {
                const code = 'CBL0001'
                const loc = location.start
                super(`${chunkName}:${loc.line}:${loc.column} - ${message}\n`, { code })
        }
}

export class CompilerPassDependencyError extends CLIError
{
        constructor(message: string)
        {
                const code = 'CBL0002'
                super(message, { code })
        }
}

export class RedefinitionError extends CLIError
{
        constructor(
                nodeChunkName: string, prevChunkName: string, name: string,
                nodeLocation: ast.NodeLocation, prevLocation: ast.NodeLocation)
        {
                const code = 'CBL0003'
                super(`${nodeChunkName}:${nodeLocation.start.line}:${nodeLocation.start.column} - redefinition of '${name}'
${prevChunkName}:${prevLocation.start.line}:${prevLocation.start.column} - previous definition is here
                `, { code })
        }
}

export class UndefinedError extends CLIError
{
        constructor(chunkName: string, name: string, location: ast.NodeLocation)
        {
                const code = 'CBL0004'
                const loc = location.start
                super(`${chunkName}:${loc.line}:${loc.column} - undefined '${name}'`, { code })
        }
}

export class BadLevelError extends CLIError
{
        constructor(chunkName: string, location: ast.NodeLocation)
        {
                const code = 'CBL0005'
                const loc = location.start
                super(`${chunkName}:${loc.line}:${loc.column} - bad level`, { code })
        }
}

export class UnexpectedPictureError extends CLIError
{
        constructor(chunkName: string, tag: string, location: ast.NodeLocation)
        {
                const code = 'CBL0006'
                const loc = location.start
                super(`${chunkName}:${loc.line}:${loc.column} - '${tag}' can't have PIC clause`, { code })
        }
}

export class BadDefaultValueError extends CLIError
{
        constructor(chunkName: string, location: ast.NodeLocation)
        {
                const code = 'CBL0007'
                const loc = location.start
                super(`${chunkName}:${loc.line}:${loc.column} - bad default value`, { code })
        }
}

export class ManyVirtualDecimalPointError extends CLIError
{
        constructor(chunkName: string, location: ast.NodeLocation)
        {
                const code = 'CBL0008'
                const loc = location.start
                super(`${chunkName}:${loc.line}:${loc.column} - V may only occur once in PIC`, { code })
        }
}

export class IncompatibleComp4PictureError extends CLIError
{
        constructor(chunkName: string, location: ast.NodeLocation)
        {
                const code = 'CBL0009'
                const loc = location.start
                super(`${chunkName}:${loc.line}:${loc.column} - incompatible COMP-4 PIC`, { code })
        }
}

export class BadSignPictureError extends CLIError
{
        constructor(chunkName: string, location: ast.NodeLocation)
        {
                const code = 'CBL0010'
                const loc = location.start
                super(`${chunkName}:${loc.line}:${loc.column} - bad 'S' in PIC`, { code })
        }
}

export class NotInLinkageSectionError extends CLIError
{
        constructor(chunkName: string, name: string, location: ast.NodeLocation)
        {
                const code = 'CBL0011'
                const loc = location.start
                super(`${chunkName}:${loc.line}:${loc.column} - '${name}' isn't in linkage section`, { code })
        }
}

export class ExceedComp4PrecisionError extends CLIError
{
        constructor(chunkName: string, location: ast.NodeLocation)
        {
                const code = 'CBL0012'
                const loc = location.start
                super(`${chunkName}:${loc.line}:${loc.column} - max COMP-4 precision is 18`, { code })
        }
}

export class MutableArgumentRedefinitionError extends CLIError
{
        constructor(chunkName: string, name: string, nodeLocation: ast.NodeLocation, prevLocation: ast.NodeLocation)
        {
                const code = 'CBL0013'
                super(`${chunkName}:${nodeLocation.start.line}:${nodeLocation.start.column} - redefinition of mutable argument '${name}'
${chunkName}:${prevLocation.start.line}:${prevLocation.start.column} - previous definition is here
                `, { code })
        }
}

export class WrongNumArgumentsError extends CLIError
{
        constructor(
                nodeChunkName: string, calleeChunkName: string,
                nodeLocation: ast.NodeLocation, calleeLocation: ast.NodeLocation)
        {
                const code = 'CBL0014'
                super(`${nodeChunkName}:${nodeLocation.start.line}:${nodeLocation.start.column} - wrong number of arguments
${calleeChunkName}:${calleeLocation.start.line}:${calleeLocation.start.column} - callee definition is here
                `, { code })
        }
}

export class BadArgumentTypeError extends CLIError
{
        constructor(
                nodeChunkName: string, calleeChunkName: string, expected: string, found: string,
                nodeLocation: ast.NodeLocation, calleeLocation: ast.NodeLocation)
        {
                const code = 'CBL0015'
                super(`${nodeChunkName}:${nodeLocation.start.line}:${nodeLocation.start.column} - expected '${expected}', found '${found}'
${calleeChunkName}:${calleeLocation.start.line}:${calleeLocation.start.column} - argument definition is here
                `, { code })
        }
}

export class ExpressionReturnNothingError extends CLIError
{
        constructor(chunkName: string, name: string, location: ast.NodeLocation)
        {
                const code = 'CBL0016'
                const loc = location.start
                super(`${chunkName}:${loc.line}:${loc.column} - '${name}' returns nothing, hence it isn't an expression`, { code })
        }
}

export class UsingWithDefaultValueError extends CLIError
{
        constructor(chunkName: string, name: string, location: ast.NodeLocation)
        {
                const code = 'CBL0017'
                const loc = location.start
                super(`${chunkName}:${loc.line}:${loc.column} - using '${name}' can't have default value`, { code })
        }
}

export class EndNameNotMatchError extends CLIError
{
        constructor(
                chunkName: string, name: string, expected: string, endLocation: ast.NodeLocation, startLocation: ast.NodeLocation)
        {
                const code = 'CBL0018'
                super(`${chunkName}:${endLocation.start.line}:${endLocation.start.column} - END '${name}' not match, expected '${expected}'
${chunkName}:${startLocation.start.line}:${startLocation.start.column} - start definition is here
                `, { code })
        }
}
