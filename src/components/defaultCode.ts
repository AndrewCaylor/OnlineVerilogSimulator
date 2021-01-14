export const defaultCode = `
module adder8bit(result, OpA, OpB, carryOut);
  input [7:0] OpA, OpB;
  output [7:0] result;
  wire [6:0] carryOuts;
  output carryOut;
    
  oneBitHalfAdder add0(result[0], carryOuts[0], OpA[0], OpB[0]);
  oneBitFullAdder add1(result[1], carryOuts[1], OpA[1], OpB[1], carryOuts[0]);
  oneBitFullAdder add2(result[2], carryOuts[2], OpA[2], OpB[2], carryOuts[1]);
  oneBitFullAdder add3(result[3], carryOuts[3], OpA[3], OpB[3], carryOuts[2]);
  oneBitFullAdder add4(result[4], carryOuts[4], OpA[4], OpB[4], carryOuts[3]);
  oneBitFullAdder add5(result[5], carryOuts[5], OpA[5], OpB[5], carryOuts[4]);
  oneBitFullAdder add6(result[6], carryOuts[6], OpA[6], OpB[6], carryOuts[5]);
  oneBitFullAdder add7(result[7], carryOut, OpA[7], OpB[7], carryOuts[6]);
endmodule

module oneBitHalfAdder(out, carryOut, x, y);
  input x, y;
  output out, carryOut;
    
  xor xor1(out, x, y);
  and and1(carryOut, x, y);
endmodule

module oneBitFullAdder(out, carryOut, x, y, carryIn);
  input x, y, carryIn;
  output out, carryOut;

  wire h1Out, h2CarryOut, h1CarryOut;

  oneBitHalfAdder h1(h1Out, h1CarryOut, x, y);
  oneBitHalfAdder h2(out, h2CarryOut, h1Out, carryIn);

  or or1(carryOut, h1CarryOut, h2CarryOut);    
endmodule

`;