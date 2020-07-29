module System

*> Convert a value to string
program-id. To-String export
        data division
                linkage section
                *> A value
                01 Val Any
                *> Converted string
                01 Str Display

        procedure division using     Val
                           returning Str
end-program To-String

*> Prints a string to output terminal.
program-id. Console-Write export
        data division
                linkage section
                *> A string to print-out
                01 Msg Display

        procedure division using Msg
end-program Console-Write
