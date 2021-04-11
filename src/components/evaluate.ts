/* eslint-disable no-case-declarations */
import { TimePlugin } from "bootstrap-vue";
import * as BitwiseLib from "./bitwiseLib";
import { clone, compileVerilog } from "./generateNodeNetwork";

// import { elaborateModules } from "./generateNodeNetwork";
import { Module, IO, ParameterSyntax, AnnotatedExpression, Node, ENUM, BoolArrReturn, CompileError, ExpressionType, ErrorCode, EvalReturn, BooleanDict, ModuleDict, constructCompileError, ModuleReturn } from "./interfaces";

export class Evaluator {
    moduleDict: ModuleDict;
    mainModule: Module;
    constructor(moduleDict: ModuleDict) {
        this.moduleDict = moduleDict;
    }

    evaluate(moduleName: string, inputValues: boolean[][]): ModuleReturn {
        this.mainModule = clone(this.moduleDict[moduleName]);

        let temp = this.evaluateModule(this.mainModule, inputValues, null);
        let toReturn: ModuleReturn = {
            failed: temp.failed,
            error: temp.error,
            data: null
        }

        if (temp.failed) {
            console.log("evaluation failed")
            return toReturn;
        }
        this.elaborateSubModules(this.mainModule);
        toReturn.data = this.mainModule;

        return toReturn;
    }

    /**
     * Recursively adds info on the the submodules about the variables fed into them from the parent
     * @param parent 
     */
    private elaborateSubModules(parent: Module) {
        let subModuleInd = 0;
        if (parent.subModules.length == 0) return;

        for (let i = 0; i < parent.nodes.length; i++) {
            const node = parent.nodes[i];
            if (node.type == 1) {
                let isPrimitive = !!BitwiseLib.getBitwiseNotation(node.moduleName);
                if (!isPrimitive) {
                    parent.subModules[subModuleInd].instanceName = node.instanceName;
                    parent.subModules[subModuleInd].parentInputs = node.inputs;
                    parent.subModules[subModuleInd].parentOutputs = node.outputs;

                    this.elaborateSubModules(parent.subModules[subModuleInd]);
                    subModuleInd++;

                    if (parent.subModules.length < subModuleInd) {
                        break;
                    }
                }
            }
        }
    }

    /**
     * uses asdf[1] or asdf[1:2] or asdf
     * @param text 
     */
    getBits(text: string): number[] {
        let match = text.match(/(?<=(\[))((\d+(:\d+)?))/);
        if (!match) {
            return null;
        }
        else if (match[0].match(":")) {
            let splitted = match[0].split(":");
            return [parseInt(splitted[1]), parseInt(splitted[0])];
        }
        else {
            let num = parseInt(match[0]);
            return [num, num]
        }
    }

    /**
     * 
     * @param node node to evaluate (assumed to be a primitive gate)
     * @param inputValues values for the inputs
     */
    private evaluateNodeForPrimitive(node: Node, inputValues: boolean[][]): boolean[][] {
        let bitwiseNotation = BitwiseLib.getBitwiseNotation(node.moduleName);
        if (!bitwiseNotation) {
            return null;
        }
        else {
            let operation: Function = BitwiseLib.Operators[bitwiseNotation];
            let in1 = inputValues[0][0];
            let value: boolean;
            if (bitwiseNotation == "~") {
                value = operation(in1);
                return [[value]];
            }
            else {
                let in2 = inputValues[1][0];
                value = operation(in1, in2);
                for (let i = 2; i < node.inputs.length; i++) {
                    value = operation(value, inputValues[i][0]);
                }
                return [[value]];
            }
        }
    }

    /**
     * @param context
     * @param tokens postfix notation stack
     */
    public evaluateStack(context: BooleanDict, tokens: string[]): BoolArrReturn {

        let returnVal = {
            failed: null,
            error: null,
            data: []
        };

        let stack: any[] = [];


        for (let i = 0; i < tokens.length; i++) {
            const token = tokens[i];

            let a: any;
            let b: any;
            let doCheck: boolean = false;
            switch (token) {
                case "~":
                    a = stack.pop();
                    stack.push(BitwiseLib.doOperation(token, a, null));
                    break;

                case "&":
                case "~&":
                case "|":
                case "~|":
                case "^":
                case "~^":
                    doCheck = true;
                //falls through
                case ">>"://TODO: enable left and right shift by bit arrays
                case "<<"://converting bit arrays to number
                case ",":
                    a = stack.pop();
                    b = stack.pop();

                    //this will happen if there is malformed syntax
                    if(b === undefined || a === undefined){
                        returnVal.failed = true;
                        returnVal.error = constructCompileError("Incorrect assign statement syntax!",
                            null, ErrorCode.invalidAssignSyntax, null);
                        return returnVal;
                    }

                    if (doCheck) {
                        if (a.length != b.length) {
                            returnVal.failed = true;
                            returnVal.error = constructCompileError("Attempted to do " + token + " operator on operands of different length",
                                null, ErrorCode.invalidAssignSyntax, [a, b]);
                            return returnVal;
                        }
                        doCheck = false;
                    }

                    stack.push(BitwiseLib.doOperation(token, a, b));
                    break;

                default:
                    //TODO: detect hex, octal and convert to binary
                    //then convert to bit array and push to stack
                    if (token.match(/DUPLICATE/)) {
                        a = stack.pop();
                        let num = token.match(/\d+/)[0];
                        stack.push(BitwiseLib.Operators["DUPLICATE"](a, parseInt(num)));
                    }
                    else if (token.match(/^\d+$/)) {
                        if (tokens[i + 1] == ">>" || tokens[i + 1] == "<<") {
                            stack.push(token);
                        } else {
                            stack.push(BitwiseLib.stringToBitArray(token));
                        }
                    }
                    else if (BitwiseLib.isVerilogNumber(token)) {
                        stack.push(BitwiseLib.stringToBitArray(token));
                    } else {

                        let bitRange = this.getBits(token);
                        let parameterName = token;
                        if (bitRange) {
                            parameterName = token.split("[")[0];
                        }

                        //not sure how you would get to this error message but I am keeping it because i am too scared to remove it
                        let bits = context[parameterName];
                        if (bits === undefined) {
                            returnVal.failed = true;
                            returnVal.error = constructCompileError("Variable " + parameterName + " not defined in module",
                                null, ErrorCode.variableNameNotFound, [a, b]);
                            return returnVal;
                        }

                        //gets the bits within the range
                        if (bitRange) {
                            bits = bits.slice(bitRange[0], bitRange[1] + 1);
                        }
                        stack.push(bits);
                    }
            }
        }

        returnVal.data = stack.pop();
        return returnVal;
    }

    /**
     * Pseudocode: 
    While there are unevaluated nodes:
        for each node:
            see if inputs for the node has only items defined in IOandWires in it
            if so, evaluate it and assingn a value to the wire it outputs to
        repeat until value for output node is found
        check each cycle if anything changed
        if not: ERROR => no value for ___ wires!
    
     * outputs boolean []s for each of the output wires in the module
     * @param module 
     * @param inputs values must align with input syntax
     */
    evaluateModule(module: Module, inputValues: boolean[][], parent: Module): EvalReturn {

        let returnVal: EvalReturn = {
            failed: null,
            error: null,
            data: []
        }

        //create dict = dict + wires
        let IOandWires: BooleanDict = {};
        //inputs first, then outputs, then wires
        module.inputs.forEach((parameter, i) => {
            IOandWires[parameter.name] = inputValues[i];
        });
        module.outputs.forEach(parameter => {
            IOandWires[parameter.name] = BitwiseLib.initializeBitArray((parameter.endBit - parameter.beginBit) + 1);
        });
        module.wires.forEach(wire => {
            IOandWires[wire.name] = BitwiseLib.initializeBitArray((wire.endBit - wire.beginBit) + 1);
        });

        let nodesNotEvaluated = clone(module.nodes);

        let initialLength;
        // mainWhile:
        while (nodesNotEvaluated.length > 0) {
            initialLength = nodesNotEvaluated.length
            for (let nodeIndex = 0; nodeIndex < nodesNotEvaluated.length; nodeIndex++) {
                const node = nodesNotEvaluated[nodeIndex];

                let allParametesEvaluated = true;
                //using for loops instead of foreach 
                //for more efficent run time because this is a hella lot of for loops
                //this checks that all of the values used in the inputs are evaluated
                outer:
                for (let i = 0; i < node.inputs.length; i++) {
                    const parameter = node.inputs[i];
                    //If the parameter is an output for the module, it does not have to be full
                    let valueObj = IOandWires[parameter.name];
                    //if the prameter is a const, then the parameter will be evalueated by definitio
                    if (parameter.type != "CONST") {
                        for (let j = parameter.beginBit; j <= parameter.endBit; j++) {
                            if (valueObj[j] === null) {
                                allParametesEvaluated = false;
                                break outer;
                            }
                        }
                    }
                }

                //atually evaluates a node
                if (allParametesEvaluated) {
                    let values: boolean[][] = [];
                    switch (node.type) {
                        case ENUM.Assign:
                            let answer = this.evaluateStack(IOandWires, node.stack);

                            if (answer.failed) {
                                //evalStack does not give line number
                                answer.error.lineNumber = node.lineNumber;
                                returnVal.error = answer.error;
                                returnVal.failed = true;
                                return returnVal;
                            }
                            else {
                                console.log(answer.data)
                                let expectedBitLength = node.outputs[0].endBit - node.outputs[0].beginBit + 1;
                                if (answer.data.length != expectedBitLength) {
                                    returnVal.error = constructCompileError(
                                        `Assign statement output is ${answer.data.length} bits but it should be ${expectedBitLength}`,
                                        node.lineNumber,
                                        ErrorCode.bitLengthDifference,
                                        [answer.data, expectedBitLength]);
                                    returnVal.failed = true;

                                    return returnVal;
                                }
                                else {
                                    values.push(answer.data);
                                }
                            }
                            break;
                        case ENUM.ModuleUsage:
                            //if it is a primitive it will return a value
                            //otherwise it will return null... then we will need to recurse the submodule
                            let inputValues: boolean[][] = [];
                            let beginBit: number;
                            let endBit: number;

                            for (let i = 0; i < node.inputs.length; i++) {
                                beginBit = node.inputs[i].beginBit;
                                endBit = node.inputs[i].endBit;
                                if (node.inputs[i].type == "CONST") {
                                    inputValues[i] = node.inputs[i].value;
                                }
                                else {
                                    let temp = IOandWires[node.inputs[i].name].slice(beginBit, endBit + 1);
                                    inputValues[i] = temp;
                                }
                            }

                            let valTemp = this.evaluateNodeForPrimitive(node, inputValues);

                            if (valTemp !== null && valTemp !== undefined) {
                                values = valTemp;
                            }
                            else {
                                if (this.moduleDict[node.moduleName] === undefined) {
                                    returnVal.failed = true;
                                    returnVal.error = constructCompileError("Unknown module used", node.lineNumber,
                                        ErrorCode.unknownModule, node);
                                    return returnVal;
                                }
                                else {
                                    //passes in the current module as the parent
                                    //new children are cloned from a refrence from the dict
                                    let child: Module = clone(this.moduleDict[node.moduleName]);
                                    let evalTemp: EvalReturn = this.evaluateModule(child, inputValues, module);
                                    if (evalTemp.failed) {
                                        returnVal.failed = true;
                                        returnVal.error = evalTemp.error;
                                        //will pass errors up to the top module BUT IT DONT FOR SOME REASON
                                        return returnVal;
                                    }
                                    else {
                                        values = evalTemp.data;
                                    }
                                }
                            }
                            break;
                    }

                    //edits the valies for IO and wires stored in the IOandWires BooleanDict
                    //node can have multiple outputs so it needs to loop through each possible output

                    for (let i = 0; i < node.outputs.length; i++) {
                        const output = node.outputs[i];
                        //edit the bits of wire in the values to fill
                        let valueToFill = IOandWires[output.name];
                        let valueBitInd = 0;
                        for (let bitInd = output.beginBit; bitInd <= output.endBit; bitInd++) {
                            let valueToFillBit = valueToFill[bitInd];
                            if (valueToFillBit !== null) {
                                returnVal.failed = true;
                                returnVal.error = constructCompileError("Bit " + bitInd + " of " + output.name + " already has a value",
                                    node.lineNumber,
                                    ErrorCode.doubleAssignment,
                                    node,
                                );

                                return returnVal;
                            }
                            IOandWires[output.name][bitInd] = values[i][valueBitInd];
                            valueBitInd++;
                        }
                    }

                    nodesNotEvaluated.splice(nodeIndex, 1);

                }
            }

            if (initialLength == nodesNotEvaluated.length) {
                returnVal.failed = true;
                returnVal.error = constructCompileError("Your wires are disconnected!",
                    nodesNotEvaluated[0].lineNumber,
                    ErrorCode.disconnectedWires,
                    IOandWires);

                return returnVal;
            }
        }

        let output: boolean[][] = [];

        module.outputs.forEach(parameter => {
            output.push(IOandWires[parameter.name]);
        });
        module.IOandWireValues = clone(IOandWires);
        //allows submodule to add itself to parent when done
        if (parent) {
            parent.subModules.push(module);
        }

        returnVal.data = output;
        return returnVal;
    }
}

/**
 * 
 * Runs the code
 * 
 * @param text text to be compiles
 */
export function getError(text: string): CompileError {
    let modules = compileVerilog(text);
    if (!modules.failed) {
        let evaluator = new Evaluator(modules.data)

        //have to have for loop here because not able to do a return from inside a callback
        let vals = Object.values(modules.data);
        for (let i = 0; i < vals.length; i++) {
            const module = vals[i];
            
            let testInput: boolean[][] = [];

            module.inputs.forEach(input => {
                let arr = BitwiseLib.initializeBitArray(input.endBit - input.beginBit + 1).fill(false, 0);
                testInput.push(arr);
            });

            let result: ModuleReturn = evaluator.evaluate(module.name, testInput);

            if (result.failed) {
                return result.error;
            }
        }
    }
    else {
        return modules.error;
    }
    //if no errors are caught
    return null;
}