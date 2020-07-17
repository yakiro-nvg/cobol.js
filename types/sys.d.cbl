module Sys

*> Formats a value as string
program-id Format export
    *> Match a Comp-2
    data division
        linkage section
        *> A value to format
        01 Val Comp-2
        *> Format pattern to use
        01 Fmt Display
        *> Formatted string
        01 Str Display
    procedure division using Val, Fmt returning Str;

    *> Match a Comp-4
    data division
        linkage section
        *> A value to format
        01 Val Comp-4
        *> Format pattern to use
        01 Fmt Display
        *> Formatted string
        01 Str Display
    procedure division using Val, Fmt returning Str;

    *> Match a Display
    data division
        linkage section
        *> A value to format
        01 Val Display
        *> Format pattern to use
        01 Fmt Display
        *> Formatted string
        01 Str Display
    procedure division using Val, Fmt returning Str
end

*> Prints a string to terminal, used by `DISPLAY`
program-id Console-Display export
    data division
        linkage section
        *> A string to print-out
        01 Msg Display
    procedure division using Msg
end
