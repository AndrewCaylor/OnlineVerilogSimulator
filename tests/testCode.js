//code for me to test to parse

export const code1 = `
////////////////////////////////////////////////////////////////////////////////////////////////////
//
// Module:      ssd0
// Author:      Andrew Caylor
// Created:     12/3/2020
// Modified:    12/4/2020
// Version:     1.1
// Description: This module does seven segment decoding for HEX0
//				This file includes the 7 segment decoder used in: ssd1, ssd2, ssd3
//
////////////////////////////////////////////////////////////////////////////////////////////////////


//15 + 15 = 30ps delay
//158 + 254 = 412 transistors
module ssd0(in, out);
	input  [3:0] in;
	output [6:0] out;

	wire [3:0] countOutput;

	count3 c(in, countOutput);

	ssd s(countOutput, out);

endmodule

//26 + 44 + 30 + 58 = 158 transistors
//15ps delay
module count3(present, next);
	input  [3:0] present;
	output [3:0] next;
	
	wire a,b,c,d;
	
	assign a = present[3];	
	assign b = present[2];
	assign c = present[1];
	assign d = present[0];

	//does the incrementing
	assign next = {
		~a & b & ~c & d, // 3*6 + 2*4 = 26
		(b & ~c & ~d) | (~a & ~b & (c | d)), //6*6 + 4*2 = 44
		(~c & ~d) | (~b & c & d), //4*6 + 2*3 = 30
		(~a & ~c & ~d) | (b & c & d) | (~b & c & ~d) //8*6 + 5*2 = 58
	};	
endmodule


//5(3) = 15 ps
//50 + 20 + 50 + 44 + 36 + 16 + 38 = 254 transistors
module ssd(in, out);
	input  [3:0] in;
	output [6:0] out;

	wire a,b,c,d;
	
	//for convienience
	assign a = in[3];	
	assign b = in[2];
	assign c = in[1];
	assign d = in[0];

	assign out[6] = (~a & ~b & c) | (~a & b & ~c) | (c & d); //7*6 + 4*2 = 50
	assign out[5] = a | b | (c & ~d); //3*6 + 2 = 20
	assign out[4] = (~a & ~b & c & ~d) | (~a & b & c & d); //7*6 + 4*2 = 50
	assign out[3] = (c & ~d) | (b & c) | (~a & ~b & ~d); //6*6 + 4*2 = 44
	assign out[2] = (~b & ~c & d) | (b & c & ~d); //5*6 + 3*2 = 36
	assign out[1] = (b & ~d) | (~c & d); //3*6 + 2*2 = 16
	assign out[0] = (~c & ~d) | (~a & b) | (c & ~d); //5*6 + 2*4 = 38

endmodule


`;















export const code2 = `

//4(1*6) + 4(8*6) + 4(1*2) + 3(8*6) = 368 transistors 
//5(1+2+2+2) = 35ps
module mux2to1_8bit(select, in0, in1, out);
   input select;
   input [7:0] in0, in1;
   output [7:0] out;
	//select is assumed to be active high
	
	assign out = 	({8{~select}} & in0) |
					({8{select}} & in1);

endmodule

//4(1*6) + 4(8*6) + 4(1*2) + 3(8*6) = 368 transistors 
//5(1+2+2+2) = 35ps
module mux4to1_8bit(select, in0, in1, in2, in3, out);
   input  [1:0] select;
   input  [7:0] in0, in1, in2, in3;
   output [7:0] out;
	//select is assumed to be active high

	assign out = 	({8{~select[1] & ~select[0]}} & in0) |
					({8{~select[1] &  select[0]}} & in1) |
					({8{ select[1] & ~select[0]}} & in2) |
					({8{ select[1] &  select[0]}} & in3);

endmodule

//8(1*6) + 4(1*2) + 3(1*6) = 74 transistors 
//5(1+2+2+2) = 35ps
module mux4to1_1bit(select, in0, in1, in2, in3, out);
   input  [1:0] select;
   input in0, in1, in2, in3;
   output out;
	//select is assumed to be active high

   	assign out = 	((~select[1] & ~select[0]) & in0) |
					((~select[1] &  select[0]) & in1) |
					(( select[1] & ~select[0]) & in2) |
					(( select[1] &  select[0]) & in3);
endmodule 

//8(1*6)+4(1*2)=56 transistors 
module decoder1to4(switches, enable, out);
	// switches are assumed to be active low

	input [1:0] switches;
	output [3:0] out;

	input enable;

	wire [3:0] enables;

	assign out = {		 switches[1] &  switches[0] & enable, 
						 switches[1] & ~switches[0] & enable,
						~switches[1] &  switches[0] & enable, 
						~switches[1] & ~switches[0] & enable};

	// 00 -> 1000
	// 01 -> 0100
	// 10 -> 0010
	// 11 -> 0001

endmodule

//
// 00XX: negate a or negate b
// 01XX: add something to A
// 10XX: etc
// 11XX: or, xor, nor, xnor logic
//Does the calculating

//272 + 924 + 432 + 240 + 368 + 2(74) + 16 = 2400
module arith(select, in0, in1, out, overflow, carry, negative, zero);
	input [3:0] select;
   	input  [7:0] in0, in1;
   	output [7:0] out;
	output overflow, carry, negative, zero;

	wire [7:0] block0OUT, block1OUT, block2OUT, block3OUT;
	wire block0overflow, block1overflow, block2overflow, block3overflow;
	wire block0carry, block1carry, block2carry, block3carry;


	block0 b0(select[1:0], in0, in1, block0OUT, block0overflow, block0carry);
	block1 b1(select[1:0], in0, in1, block1OUT, block1overflow, block1carry);
	block2 b2(select[1:0], in0, in1, block2OUT, block2overflow, block2carry);
	block3 b3(select[1:0], in0, in1, block3OUT, block3overflow, block3carry);

	//selects the output of the desired block
	mux4to1_8bit blockOUTSelect(select[3:2], block0OUT, block1OUT, block2OUT, block3OUT, out);

	//selects flags of the desired blocks
	mux4to1_1bit blockOverflowSelect(select[3:2], block0overflow, block1overflow, block2overflow, block3overflow, overflow);
	mux4to1_1bit blockCarrySelect(select[3:2], block0carry, block1carry, block2carry, block3carry, carry);

	assign negative = out[7];

	nor zeroOut(zero, out[0], out[1], out[2], out[3], out[4], out[5], out[6], out[7]);
endmodule


//Negate a or b
// X0: -A
// X1: -B

// 144 + 2*8 + 112 = 272 transistors
// 25 + 5*2 + 240 = 275ps
module block0(select, A, B, out, overflow, carry);
	input [1:0] select;
   	input  [7:0] A, B;
   	output [7:0] out;
	output overflow, carry;

	wire [7:0] toNegate, notToNegate;
	wire carryOut;

	mux2to1_8bit m(select[0], A, B, toNegate);
	assign notToNegate = ~toNegate;
	increment i(notToNegate, out, carryOut);

	// no overflow doing 2sc
	assign overflow = 0;
	assign carry = carryOut;

endmodule

//A + num
// 00: A + B
// 01: A - B
// 10: A + 0
// 11: A - 3

//2*8 + 112 + 368 + 252 + 8(8 + 6 + 8) = 924 transistors
//5*1 + 240 + 35 + 520 + 5(2+4) = 830ps
module block1(select, A, B, out, overflow, carry);
	input [1:0] select;
   	input  [7:0] A, B;
   	output [7:0] out;
	output overflow, carry;

	wire [7:0] notB, twosB, toAdd, NOTUSED;
	wire carryOut;

	assign notB = ~B;
	increment i(notB, twosB, NOTUSED);

	//determining which value to add to A
	mux4to1_8bit m(select, B, twosB, 8'b00000000, 8'b11111101, toAdd);

	//adding whatever value
	adder8bit add(out, A, toAdd, carryOut);

// Adding two positive numbers must give a positive result
// Adding two negative numbers must give a negative result
// If numbers of oppisite signs are added, there will be no overflow

						//enable for overflow (both signs must be same), 	sign of result must be sign of carry
	assign overflow = 	(toAdd[7] ~^ A[7])									& (carryOut ^ out[7]);
	assign carry = carryOut;
endmodule

// 00: div16
// 01: mult4
// 10: A and B
// 11: not A (ones complement)

//6*8 + 2*8 + 368 = 432 transistors
//5*2 + 35 = 45ps
module block2(select, A, B, out, overflow, carry);
	input [1:0] select;
   	input  [7:0] A, B;
   	output [7:0] out;
	output overflow, carry;

	wire [7:0] div16OUT, mult4OUT, andOUT, notAOUT;

	//4 most significant bits of div16 are overwritten with most significant bit of B
	assign div16OUT = { {4{B[7]}}, B[7:4]};

	assign mult4OUT = B << 2;
	assign andOUT = A & B;
	assign notAOUT = ~A;

	mux4to1_8bit m(select, div16OUT, mult4OUT, andOUT, notAOUT, out);

	assign overflow = 0; 
	assign carry = 0;
endmodule


// 00: A xor B
// 01: A or B
// 10: !(A xor B)
// 11: !(A or B)
// all 4 not required, but the design causes all 4

//3(8*6) + 8*4 + 8*8 = 240 transistors
//5(2 + (2+2+2) + 4) = 60ps
module block3(select, A, B, out, overflow, carry);
	input [1:0] select;
   	input  [7:0] A, B;
   	output [7:0] out;
	output overflow, carry;

	wire [7:0] orOUT, xorOUT;


	assign orOUT = A | B;

	//change to xor if select[0] off
	assign xorOUT = orOUT & (~(A & B) | {8{select[0]}});
	
	//invert if select[1] on
	assign out = xorOUT ^ {8{select[1]}};

	assign overflow = 0; 
	assign carry = 0;
endmodule



//Adders

//8+6=14 transistors
//5((2+2) + 2) = 30ps
module halfAdder(out, carryOut, x, y);
    input x, y;
    output out, carryOut;

    xor xor1(out, x, y);
    and and1(carryOut, x, y);
endmodule

//14+14+6=34 transistors
//30 + 30 + 2*5 = 70ps
module fullAdder(out, carryOut, x, y, carryIn);
    input x, y, carryIn;
    output out, carryOut;

    wire h1Out, h2CarryOut, h1CarryOut;

    halfAdder h1(h1Out, h1CarryOut, x, y);
    halfAdder h2(out, h2CarryOut, h1Out, carryIn);

    or or1(carryOut, h1CarryOut, h2CarryOut);    
endmodule

//14+7*34=252 transistors
//30 + 7(70) = 520ps
module adder8bit(result, OpA, OpB, carryOut);
    input [7:0] OpA, OpB;
    output [7:0] result;

	output carryOut;

    wire a0CarryOut, a1CarryOut, a2CarryOut, a3CarryOut, a4CarryOut, a5CarryOut, a6CarryOut;

    halfAdder add0(result[0], a0CarryOut, OpA[0], OpB[0]);
    fullAdder add1(result[1], a1CarryOut, OpA[1], OpB[1], a0CarryOut);
    fullAdder add2(result[2], a2CarryOut, OpA[2], OpB[2], a1CarryOut);
    fullAdder add3(result[3], a3CarryOut, OpA[3], OpB[3], a2CarryOut);
    fullAdder add4(result[4], a4CarryOut, OpA[4], OpB[4], a3CarryOut);
    fullAdder add5(result[5], a5CarryOut, OpA[5], OpB[5], a4CarryOut);
    fullAdder add6(result[6], a6CarryOut, OpA[6], OpB[6], a5CarryOut);
    fullAdder add7(result[7], carryOut, OpA[7], OpB[7], a6CarryOut);
endmodule


//8*14=112
//8*30=240ps
module increment(in, result, carryOut);

	input [7:0] in;
	output [7:0] result;
	output carryOut;

    wire a0CarryOut, a1CarryOut, a2CarryOut, a3CarryOut, a4CarryOut, a5CarryOut, a6CarryOut;

	halfAdder add0(result[0], a0CarryOut, in[0], 1'b1);
    halfAdder add1(result[1], a1CarryOut, in[1], a0CarryOut);
    halfAdder add2(result[2], a2CarryOut, in[2], a1CarryOut);
    halfAdder add3(result[3], a3CarryOut, in[3], a2CarryOut);
    halfAdder add4(result[4], a4CarryOut, in[4], a3CarryOut);
    halfAdder add5(result[5], a5CarryOut, in[5], a4CarryOut);
    halfAdder add6(result[6], a6CarryOut, in[6], a5CarryOut);
    halfAdder add7(result[7], carryOut  , in[7], a6CarryOut);

endmodule
`


//bit transfer testing
export const code3 = `
module pls(in, out);
	input  [3:0] in;
    output [3:0] out;
    	
	assign out[3] = in[3];	
	assign out[2] = in[2];
	assign out[1:0] = in[1:0];
endmodule
`



export const assignCode1 = [
    "(~a & ~b & c) | (~a & b & ~c) | (c & d)",
    "a | b | (c & ~d)",
    "(~a & ~b & c & ~d) | (~a & b & c & d)",
    "(c & ~d) | (b & c) | (~a & ~b & ~d)",
    "(~b & ~c & d) | (b & c & ~d)",
    "(b & ~d) | (~c & d)",
    "(~c & ~d) | (~a & b) | (c & ~d)"
].reverse(); //did this the wrong order

export const assignCode1Expected = [
    "1001000",
    "0110000",
    "1001111",
    "0000001",
    "1100011",
    "1100011",
    "1111010",
    "1001111",
    "1000010"
];


//01234
//43210

//0011 3
//\/
//1100 3
//0123