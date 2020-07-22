module System

*> Formats a COMP-2 value.
program-id Format-Comp-2 export
        data division
                linkage section
                *> A value to format
                01 Val Comp-2
                *> Formatted string
                01 Str Display

        procedure division using     Val
                           returning Str
end

*> Formats a COMP-4 value.
program-id Format-Comp-4 export
        data division
                linkage section
                *> A value to format
                01 Val Comp-4
                *> Format pattern to use
                01 Fmt Display
                *> Formatted string
                01 Str Display

        procedure division using     Val
                                     Fmt
                           returning Str
end

*> Formats a Display value.
program-id Format-Display export
        data division
                linkage section
                *> A value to format
                01 Val Display
                *> Format pattern to use
                01 Fmt Display
                *> Formatted string
                01 Str Display

        procedure division using     Val
                                     Fmt
                           returning Str
end

*> Prints a string to output terminal.
program-id Console-Write export
        data division
                linkage section
                *> A string to print-out
                01 Msg Display

        procedure division using Msg
end
