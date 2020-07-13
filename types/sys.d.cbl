      * Type declarations for system `Sys` module.
       export-module. Sys.

      * Formats primitives value as string.
       program-id. To-String.
      *    Match a Comp-2.
           data division.
               linkage section.
      *        A value to format.
               01 Val Comp-2.
      *        Formatted string.
               01 Str pic X(n).
           procedure division using Val returning Str.

      *    Match a Comp-4.
           data division.
               linkage section.
      *        A value to format.
               01 Val pic S9(n)V9(n) Comp-4.
      *        Formatted string.
               01 Str pic X(n).
           procedure division using Val returning Str.
       end program To-String.

      * Prints a string to output terminal, used by `DISPLAY`.
       program-id. Console-Display.
           data division.
               linkage section.
      *        A string to print-out.
               01 Msg pic X(n).
           procedure division using Msg.
       end program Console-Display.
