/* eslint-disable no-case-declarations */
import * as BitwiseLib from "./bitwiseLib";
// import { elaborateModules } from "./generateNodeNetwork";
import { Module, IO, ParameterSyntax, AnnotatedExpression, Node, ENUM, ExpressionType, BooleanDict, Error, ModuleDict } from "./interfaces";

export class Evaluator {
    moduleDict: ModuleDict;
    constructor(moduleDict: ModuleDict) {
        this.moduleDict = moduleDict;
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
     * @param context values for variables
     */
    private evaluateNodeForPrimitive(node: Node, context: BooleanDict): boolean[] {
        let bitwiseNotation = BitwiseLib.getBitwiseNotation(node.moduleName);
        if (!bitwiseNotation) {
            return null;
        }
        else {
            //TODO: ensure all ins/outs are same bit length
            //TODO: check that module will not output to an input (syntax checking)
            let operation: Function = BitwiseLib.Operators[bitwiseNotation];
            let in1 = context[node.callSyntax[1].name];
            let value: boolean[];
            if (bitwiseNotation == "~") {
                value = operation(in1);
                return value;
            }
            else {
                let in2 = context[node.callSyntax[2].name]
                value = operation(in1, in2);
                for (let i = 3; i < node.callSyntax.length; i++) {
                    value = operation(value, context[node.callSyntax[i].name])
                }
                return value;
            }
        }
    }

    /**
     * 
     * @param context
     * @param tokens postfix notation stack
     */
    public evaluateStack(context: BooleanDict, tokens: string[]): boolean[] {
        let stack: any[] = [];

        for (let i = 0; i < tokens.length; i++) {
            const token = tokens[i];

            let a: any;
            let b: any;
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
                case ">>"://TODO: enable left and right shift by bit arrays
                case "<<"://converting bit arrays to number
                case ",":
                    a = stack.pop();
                    b = stack.pop();
                    stack.push(BitwiseLib.doOperation(token, a, b));
                    break;

                default:
                    //TODO: detect hex, octal and convert to binary
                    //then convert to bit array and push to stack
                    if (token.match(/^\d+$/)) {
                        if (tokens[i + 1] == ">>" || tokens[i + 1] == "<<") {
                            stack.push(token);
                        } else {
                            a = stack.pop();
                            stack.push(BitwiseLib.Operators["DUPLICATE"](a, token));
                        }
                    } else {

                        let bitRange = this.getBits(token);
                        let parameterName = token;
                        if (bitRange) {
                            parameterName = token.split("[")[0];
                        }

                        let bits = context[parameterName];
                        if (bits === undefined) {
                            return null;
                        }

                        //gets the bits within the range
                        if (bitRange) {
                            bits = bits.slice(bitRange[0], bitRange[1] + 1);
                        }
                        stack.push(bits);
                    }
            }
        }

        return stack.pop();
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
    evaluateModule(module: Module, inputValues: boolean[][]): boolean[][] {

        //create dict = dict + wires
        let IOandWires: BooleanDict = {};
        module.inputs.forEach((parameter, i) => {
            IOandWires[parameter.name] = inputValues[i];
        });
        module.outputs.forEach(parameter => {
            IOandWires[parameter.name] = BitwiseLib.initializeBitArray((parameter.endBit - parameter.beginBit) + 1);
        });
        module.wires.forEach(wire => {
            IOandWires[wire.name] = BitwiseLib.initializeBitArray((wire.endBit - wire.beginBit) + 1);
        });
        console.log(module.name, IOandWires);


        let nodesNotEvaluated = module.nodes;

        let initialLength;
        mainWhile:
        while (nodesNotEvaluated.length > 0) {
            initialLength = nodesNotEvaluated.length
            for (let nodeIndex = 0; nodeIndex < nodesNotEvaluated.length; nodeIndex++) {
                const node = nodesNotEvaluated[nodeIndex];
                // console.log("NODES NOT EVALUATED", nodesNotEvaluated.map(node => { return { "endbit": node.outputs[0].endBit, "stack": node.stack } }))

                let allParametesEvaluated = true;
                //using for loops instead of foreach 
                //for more efficent run time because this is a hella lot of for loops
                //this checks that all of the values used in the inputs are evaluated
                outer:
                for (let i = 0; i < node.inputs.length; i++) {
                    const parameter = node.inputs[i];
                    //If the parameter is an output for the module, it does not have to be full
                    let valueObj = IOandWires[parameter.name];
                    for (let j = 0; j < valueObj.length; j++) {
                        if (valueObj[j] === null) {
                            allParametesEvaluated = false;
                            break outer;
                        }
                    }
                }

                //atually evaluates a node
                if (allParametesEvaluated) {
                    let values: boolean[][] = [];
                    switch (node.type) {
                        case ENUM.Assign:
                            values.push(this.evaluateStack(IOandWires, node.stack));
                            break;
                        case ENUM.ModuleUsage:
                            //if it is a primitive it will return a value
                            //otherwise it will return null... then we will need to recurse the submodule
                            let valTemp = this.evaluateNodeForPrimitive(node, IOandWires);
                            if (!valTemp) {
                                let inputValues: boolean[][] = [];
                                let beginBit: number;
                                let endBit: number;

                                for (let i = 0; i < node.callSyntax.length; i++) {
                                    beginBit = node.callSyntax[i].beginBit;
                                    endBit = node.callSyntax[i].endBit;
                                    inputValues[i] = IOandWires[node.callSyntax[i].name].slice(beginBit, endBit + 1);
                                }

                                values = this.evaluateModule(this.moduleDict[node.moduleName], inputValues);
                            }
                            values.push(valTemp);
                            break;
                    }
                    // console.log(values);

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
                                return null; //bit already assigned to
                            }
                            IOandWires[output.name][bitInd] = values[i][valueBitInd];
                            valueBitInd++;
                        }
                    }

                    // console.log(module.name, IOandWires, node.outputs[0]);

                    nodesNotEvaluated.splice(nodeIndex, 1);

                }
            }

            if (initialLength == nodesNotEvaluated.length) {
                //test if all the outputs are set:

                let allParametersSet = true;
                let parameters = Object.values(IOandWires);
                parentFor:
                for (let i = 0; i < parameters.length; i++) {
                    const parameter = parameters[i];
                    for (let j = 0; j < parameter.length; j++) {
                        const bit = parameter[j];
                        if (bit === null) {
                            allParametersSet = false;
                            break parentFor;
                        }
                    }
                }

                if (allParametersSet) {
                    break mainWhile;
                }
                else {
                    console.log("no nodes were able to be evaluated this loop so that means that there is an error in syntax");
                    return null;
                }
            }
        }

        let output: boolean[][] = [];

        module.outputs.forEach(parameter => {
            output.push(IOandWires[parameter.name]);
        });
        console.log(module.name, " OUTPUTED: ", output)
        console.log(module.name, " wiresnstuff: ", IOandWires)


        return output;
    }
}
