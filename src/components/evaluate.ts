import * as BitwiseLib from "./bitwiseLib";
import {Module, IO, ParameterSyntax, AnnotatedExpression, Node, ENUM, ExpressionType, Error, Dict} from "./interfaces";

/**
 * 
 * @param node node to evaluate (assumed to be a primitive gate)
 * @param context values for variables
 */
function evaluateModuleForPrimitive(node: Node, context: Dict): boolean[] {
    let bitwiseNotation = BitwiseLib.getBitwiseNotation(node.moduleName);
    if (!bitwiseNotation) {
        return null;
    }
    else {
        //TODO: ensure all ins/outs are same bit length
        //TODO: check that module will not output to an input (syntax checking)
        let operation: Function = BitwiseLib.Operators[bitwiseNotation];
        let in1 = context[node.callSyntax[1].name]
        let value: boolean[];
        if (bitwiseNotation = "~") {
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
 * @param {Object} context in form: {var1: value, var2: value)
 * @param {Array} tokens postfix notation stack
 */
function evaluateStack(context: Dict, tokens: string[]): boolean[] {
    let stack = [];

    for (let i = 0; i < tokens.length; i++) {
        let token = tokens[i];

        let a, b;
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
            //TODO: enable left and right shift by bit arrays
            //converting bit arrays to number
            case ">>":
            case "<<":
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