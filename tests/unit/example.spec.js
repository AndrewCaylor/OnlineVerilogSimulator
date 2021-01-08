// import { shallowMount } from '@vue/test-utils'
import { Evaluator } from "../../src/components/evaluate"
import * as BitwiseLib from "../../src/components/bitwiseLib"

import * as Generator from "../../src/components/generateNodeNetwork"
import * as testCode from "../testCode"

//TODO: cycle through each 
test("ssd0", () => {

    let baseModules = Generator.getBaseModules(testCode.code1);
    let elaboratedModules = Generator.elaborateModuleDict(baseModules);

    let boolArrArr = [];
    boolArrArr.push(BitwiseLib.binaryToBitArray("0000"))

    let evaluator = new Evaluator(elaboratedModules);

    let valArr = evaluator.evaluateModule(elaboratedModules["ssd0"], boolArrArr);

    expect("1000000").toEqual(BitwiseLib.bitArrayToString(valArr[0])); //in my documentation for LEE3 values are reversed
});

test("pls", () => {

    let baseModules = Generator.getBaseModules(testCode.code3);
    let elaboratedModules = Generator.elaborateModuleDict(baseModules);

    let boolArrArr = [];
    boolArrArr.push(BitwiseLib.binaryToBitArray("1100"))

    let evaluator = new Evaluator(elaboratedModules);

    let valArr = evaluator.evaluateModule(elaboratedModules["pls"], boolArrArr);

    expect("1100").toEqual(BitwiseLib.bitArrayToString(valArr[0]))
});

test("arith", () => {
    let baseModules = Generator.getBaseModules(testCode.code2);

    let elaboratedModules = Generator.elaborateModuleDict(baseModules);
    let evaluator = new Evaluator(elaboratedModules);
    let opcode = BitwiseLib.binaryToBitArray("0100");
    let A = BitwiseLib.binaryToBitArray("00001010");

    // for (let i = 0; i < 50; i++) {
    let j = BitwiseLib.binaryToBitArray("00001001")
    let result = add(A, j);
    expect(result).toEqual(A + 15);
    // }


    function add(a, b) {
        let inputs = [opcode, a, b];

        let valArr = evaluator.evaluateModule(elaboratedModules["arith"], inputs);
        let sum = BitwiseLib.bitArrayToString(valArr[0]);
        return parseInt(sum, 2);
    }
});

// test("assign", () => {
//     let stacks = testCode.assignCode1;
//     let evaluator = new Evaluator({});
//     let context = {
//         a: [false],
//         b: [false],
//         c: [true],
//         d: [true]
//     }
//     let arr = [];

//     stacks.forEach(stack => {
//         arr.push(evaluator.evaluateStack(context, Generator.parse(stack))[0]);
//     });

//     expect(arr).toEqual(BitwiseLib.binaryToBitArray(testCode.assignCode1Expected[3]))
// });

//TODO: fix
// test("assign", () => {
//     let stacks = testCode.assignCode1;
//     let evaluator = new Evaluator({});

//     testCode.assignCode1Expected.forEach((value, index) => {
//         let bits = BitwiseLib.decimalToBitArray(index.toString());
//         let context = {
//             a: [bits[0]],
//             b: [bits[1]],
//             c: [bits[2]],
//             d: [bits[3]]
//         }
//         let val = BitwiseLib.binaryToBitArray(value);
//         let arr = [];
//         for (let i = stacks.length - 1; i >= 0; i--) {
//             arr.push(evaluator.evaluateStack(context, Generator.parse(stacks[i]))[0]);
//         }
//         expect(val).toEqual(arr);
//     })
// });