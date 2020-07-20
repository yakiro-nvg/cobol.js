export interface Type
{
        readonly tag: string
}

export interface Symbol
{
        readonly name: string
        type?: Type
}

export interface Scope
{
        readonly enclosingScope?: Scope

        define(sym: Symbol): void

        /// Resolves in current scope only
        resolveMember(name: string): Symbol | undefined

        /// Recursive scan toward the root
        resolve(name: string): Symbol | undefined
}
