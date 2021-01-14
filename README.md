# Online Verilog Simulator!
It compiles and simulates (some) verilog files!

Verilog Language Refrence:
https://sutherland-hdl.com/pdfs/verilog_2001_ref_guide.pdf

## Scope:
This webapp is meant to provide a simple debugging tool for Computer Engineering students taking a Digital Systems class, 
without all of the complexities of the Quartus Prime software. 
Therefore, the scope if this webapp is limited to the features of the language students use to write their code.
Unfortunatly, this means that code that uses more complex aspects of the verilog language can not be run using this simulator.

### Code Parsing:
- Module declaration
- IO/Wire statements
- Module usage
Built in primitive modules can be used as well as custom modules
Supported primitives: not, and, nand, or, nor, xor, xnor

- Assign statements
Parses bitwise operations: ~, &, ~&, |, ~|, ^, ~^, <<, >>, concatention : {a,b,c,d}, duplication: {8{a}}

- Numbers 
ex: 8h'FF, 4, b'101

- endmodule statements

### Code Parsing Limitations:
- Any kind of if statements
- always, begin, reg, end
- Literally anything not mentioned in the Code Parsing Section

### Simulation Options:
- User can select which module to simulate
- User can type values into the input boxes
- Inputs can be either binary, hex, or decimal


### Simulation Output: 
- Shows IO/Wires inside selected module
- Shows submodules inside selected module
- Submodules can to be expanted to see internal IO/Wires and internal submodules



