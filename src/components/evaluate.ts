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
     * 
     * @param node node to evaluate (assumed to be a primitive gate)
     * @param context values for variables
     */
    evaluateNodeForPrimitive(node: Node, context: BooleanDict): boolean[] {
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
    evaluateStack(context: BooleanDict, tokens: string[]): boolean[] {
        let stack: any[] = [];

        for (let i = 0; i < tokens.length; i++) {
            let token = tokens[i];

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
                        if (context[token] === undefined) {
                            return null;
                        }
                        stack.push(context[token]);
                    }
            }
        }
        return stack.pop();
    }

    /**
     * outputs boolean []s for each of the nodes in the module
     * @param module 
     * @param inputs values must align with callsyntax
     */
    evaluateModule(module: Module, inputValues: boolean[][]): boolean[][] {

        //create dict = dict + wires
        let IOandWires: BooleanDict = {};
        for (let i = 0; i < module.callSyntax.length; i++) {
            const parameter = module.callSyntax[i];
            IOandWires[parameter.name] = inputValues[i];
        }
        module.wires.forEach(wire => {
            IOandWires[wire.name] = BitwiseLib.initializeBitArray(wire.endBit - wire.beginBit);
        });

        let nodesNotEvaluated = module.nodes;

        let initialLength;
        while (nodesNotEvaluated.length > 0) {
            initialLength = nodesNotEvaluated.length
            for (let nodeIndex = 0; nodeIndex < nodesNotEvaluated.length; nodeIndex++) {
                const node = nodesNotEvaluated[nodeIndex];

                let allParametesEvaluated = true;
                //using for loops instead of foreach 
                //for more efficent run time because this is a hella lot of for loops
                //this checks that all of the variables used in teh callsyntax are evaluated
                outer:
                for (let i = 0; i < node.callSyntax.length; i++) {
                    const parameter = node.callSyntax[i];
                    //If the parameter is an output for the module, it does not have to be full
                    // if (!node.outputs.find(outParameter => outParameter.name == parameter.name)) {
                    //removed because the output was filtered out of the callSyntax
                    let valueObj = IOandWires[parameter.name];
                    for (let j = 0; j < valueObj.length; j++) {
                        if (valueObj[j] === null) {
                            allParametesEvaluated = false;
                            break outer;
                        }
                    }
                    // }
                }

                if (allParametesEvaluated) {
                    //atually evaluate node
                    let values: boolean[][];
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

                                for (let i = 0; i < node.callSyntax.length; i++) {
                                    inputValues[i] = IOandWires[node.callSyntax[i].name]
                                }

                                let module = this.moduleDict[node.moduleName]
                                values = this.evaluateModule(this.moduleDict[node.instanceName], inputValues);
                            }
                            values.push(valTemp);
                            break;
                    }

                    //node can have multiple outputs so it needs to loop through each possible output
                    for (let i = 0; i < node.outputs.length; i++) {
                        const output = node.outputs[i];
                        //edit the bits of wire in the values to fill
                        let valueToFill = IOandWires[output.name];
                        for (let bitInd = output.beginBit; bitInd < output.endBit; bitInd++) {
                            let valueToFillBit = valueToFill[bitInd];
                            if (valueToFillBit !== null) {
                                return null; //bit already assigned to
                            }
                            IOandWires[output.name][bitInd] = values[i][bitInd];
                        }
                    }

                    nodesNotEvaluated.splice(nodeIndex, 1);
                }
            }

            if (initialLength == nodesNotEvaluated.length) {
                //no nodes were able to be evaluated so that means that there is an error in syntax
                return null;
            }
        }
        //for each node:
        //  see if callsyntax has only items in dict in it
        //  if so, evaluate it and assingn a value to the wire it outputs to
        //repeat until value for output node is found
        //check each cycle if anything changed
        //if not: ERROR => no value for ___ wires!

        //returns the values of all of the nodes in the module

        return;
    }
}