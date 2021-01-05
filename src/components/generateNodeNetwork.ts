/*eslint-disable*/
var Lexer = require("lex");

interface Module {
    name: string,
    callSyntax: IOSyntax[],
    inputs: ParameterSyntax[],
    outputs: ParameterSyntax[],
    wires: ParameterSyntax[],
    annotatedExpressions: AnnotatedExpression[],
    nodes: Node[]
}

interface ParameterSyntax {
    name: string,
    beginBit: number,
    endBit: number
}

type IO = "I" | "O" | null;
interface IOSyntax extends ParameterSyntax {
    type: IO
}

interface AnnotatedExpression {
    expression: string,
    type: ExpressionType
}

interface Node {
    type: ExpressionType;
    instanceName: string,
    callSyntax: IOSyntax[],
    stack?: string[],
    moduleName?: string
}

enum ENUM {
    ModuleDeclaration,
    ModuleUsage,
    Input,
    Output,
    Wire,
    Assign,
    Endmodule
}

//probably a better way to do this
type ExpressionType = ENUM.ModuleDeclaration | ENUM.ModuleUsage | ENUM.Input | ENUM.Output | ENUM.Wire | ENUM.Assign | ENUM.Endmodule | null;

interface Error {
    data: any,
    error: string
}

interface Dict {
    [name: string]: number
}

export function isAssignStatement(text) {
    return (text.match(/assign\s+\w+((\[\d+\])|(\[\d+:\d+\]))*\s+=.+/g) || []).length == 1; //does noit check for correct syntax inside the statement
}

export function isModuleUsage(text) {
    return (text.match(/\w+\s+\w+\((\s*\w+((\[\d+\])|(\[\d+:\d+\]))*)(,\s*\w+((\[\d+\])|(\[\d+:\d+\]))*)*\)/g) || []).length == 1;
}
export function isModuleDeclaration(text) {
    return (
        (text.match(/module\s+\w+\((\s*\w+\s*,)*(\s*\w+\s*\))/g) || [])
            .length == 1
    );
}
export function isWireDeclaration(text) {
    return (
        (text.match(/wire\s+(\[\d+:\d+\])*(\s*\w+\s*,)*(\s*\w+$)/g) || [])
            .length == 1
    );
}
export function isInputDeclaration(text) {
    return (
        (text.match(/input\s+(\[\d+:\d+\])*(\s*\w+\s*,)*(\s*\w+$)/g) || [])
            .length == 1
    );
}
export function isOutputDeclaration(text) {
    return (
        (text.match(/output\s+(\[\d+:\d+\])*(\s*\w+\s*,)*(\s*\w+$)/g) || [])
            .length == 1
    );
}
export function getExpressionType(text) {
    let type = null;

    if (isInputDeclaration(text)) {
        type = ENUM.Input;
    }
    else if (isOutputDeclaration(text)) {
        type = ENUM.Output;
    }
    else if (isWireDeclaration(text)) {
        type = ENUM.Wire;
    }
    else if (isAssignStatement(text)) {
        type = ENUM.Assign;
    }
    else if (isModuleDeclaration(text)) {
        type = ENUM.ModuleDeclaration;
    }
    else if (isModuleUsage(text)) {
        type = ENUM.ModuleUsage;
    }
    else if (text == "endmodule") {
        type = ENUM.Endmodule;
    }

    return type;
}

/**
 * 
 * @param text all the code the user wants to compile
 */
export function getBaseModules(text: string) {

    //removes single line comments
    text = text.replace(/(\/\/).*/g, "");
    //removes multiline line comments
    text = text.replace(/(\/\*)(.|\n)*(\*\/)/g, "");
    text = text.replace(/\n/g, " ");

    let annotatedExpressions: AnnotatedExpression[] = []; //TODO: should also include information about the error
    let expressions: string[] = text.replace(/endmodule/g, "endmodule;").split(";"); //make sure there is a ; at every line and the split

    expressions.forEach((expression) => {
        expression = expression.trim();
        annotatedExpressions.push({
            "expression": expression,
            type: getExpressionType(expression)
        });
    });

    let state = null;
    let moduleContent: AnnotatedExpression[] = [];
    let modules: Module[] = [];

    let errors: Error[] = [];

    //TODO: collect info about all line failures and not just return first one (or not?)

    //state machine for checking validity of program structure/giving data to function to create modules
    for (let i = 0; i < annotatedExpressions.length; i++) {
        switch (annotatedExpressions[i].type) {

            case ENUM.ModuleDeclaration:
                //start collecting lines for new module
                if (state == null) {
                    state = "parsingModule";
                    moduleContent.push(annotatedExpressions[i]);
                } else {
                    return {
                        failed: true,
                        data: annotatedExpressions[i],
                        error: "Previous module not closed with endmodule",
                    };
                }
                break;

            case ENUM.Endmodule:
                //generate new module using the previous lines
                if (state == "parsingModule") {
                    modules.push(generateBaseModuleObj(moduleContent));
                    moduleContent = [];
                    state = null;
                } else {
                    return {
                        failed: true,
                        data: annotatedExpressions[i],
                        error: "Extra endmodule statement",
                    };
                }
                break;

            case null:
                //will be null if there was a syntax error in that line
                errors.push({
                    data: annotatedExpressions[i],
                    error: "Syntax Error",
                });

            default:
                moduleContent.push(annotatedExpressions[i]);

                break;
        }
    }

    return modules;
}

/**
 * 
 * @param {object} baseModuleObj 
 * @param {string} variableName asdf or asdf[1:0] or asdf[0]
 */
function getVariableObj(baseModuleObj: Module, variableText: string) {

    let splitted = variableText.split(/\[|\]/g);

    let parameterObj: IOSyntax = {
        name: splitted[0],
        beginBit: null,
        endBit: null,
        type: null
    };

    if (variableText.match(/\[/)) {
        //var1[3:0] => [3,0]
        let numbers = splitted[1].split(/:/g);

        if (numbers.length == 1) {
            parameterObj.endBit = parseInt(numbers[0]);
            parameterObj.beginBit = parameterObj.endBit;
        } else if (numbers.length == 2) {
            parameterObj.endBit = parseInt(numbers[0]);
            parameterObj.beginBit = parseInt(numbers[1]);
        } else {
            return null;
        }

        let variableObj = getObj(baseModuleObj, parameterObj.name);
        //if parameter syntax, will be undefined
        parameterObj.type = variableObj;
    } else {
        let variableObj = getObj(baseModuleObj, parameterObj.name);

        //if parameter syntax, will be undefined
        parameterObj.type = variableObj.type;
        parameterObj.beginBit = 0;
        parameterObj.endBit = variableObj.bits - 1;
    }

    return parameterObj;

    function getObj(baseModuleObj: Module, variableName: string): any { //type is ParameterSyntax | IOSyntax
        for (let i = 0; i < baseModuleObj.callSyntax.length; i++) {
            let element = baseModuleObj.callSyntax[i];
            if (element.name == variableName) {
                return element;
            }
        }
        for (let i = 0; i < baseModuleObj.wires.length; i++) {
            let element = baseModuleObj.wires[i];
            if (element.name == variableName) {
                return element;
            }
        }
    }
}

/**
 *  
 * @param annotatedExpressions 
 */
export function generateBaseModuleObj(annotatedExpressions: AnnotatedExpression[]) {

    let obj: Module = {
        name: null,
        callSyntax: [],
        inputs: [],
        outputs: [],
        wires: [],
        annotatedExpressions: [],
        nodes: [] //used later
    };

    obj.annotatedExpressions = annotatedExpressions;
    obj.name = annotatedExpressions[0].expression.match(/\w+/g)[1]; //get second word

    function getBits(expressionText: string): number[] {
        //get area between brackets (need eslint disable cuz escape chars)
        //eslint-disable-next-line
        let split1 = expressionText.split(/[\[\]]/g);

        //might not be brackets
        if (split1.length == 1) {
            return [0, 0];
        } else {
            let splitted = split1[1].split(":");
            return [parseInt(splitted[1]), parseInt(splitted[0])];
        }
    }

    function getVariables(expressionText: string, len: number): string[] {
        //only get after brackets if there are any
        //removes the input/output/wire
        let right = expressionText.substring(len).split("]");

        let rightStr = right.length > 1 ? right[right.length - 1] : right[0];
        rightStr = rightStr.replace(/\s/g, ""); //remove whitespace

        return rightStr.split(",");
    }

    let bits: number[];
    let vars: string[];
    for (let i = 1; i < annotatedExpressions.length; i++) {
        let exprLength: number = null;

        switch (annotatedExpressions[i].type) {
            case ENUM.Input:
                exprLength = 6;
                break;

            case ENUM.Output:
                exprLength = 7;
                break;

            case ENUM.Wire:
                exprLength = 5;
                break;
        }

        let temp = annotatedExpressions[i].expression;
        bits = getBits(temp);
        vars = getVariables(temp, exprLength);

        vars.forEach((ele) => {
            obj.outputs.push({
                name: ele,
                beginBit: bits[0],
                endBit: bits[1]
            });
        });
    }

    //Gets the first experssion and only gets stuff between parentheses
    //Then it replaces the whitespace with nothing
    //then it splits over the commas to get the variable names of the inputs and outputs
    let insNouts: string[] = annotatedExpressions[0].expression
        .split(/[()]/g)[1]
        .replace(/\s/g, "")
        .split(",");

    //
    insNouts.forEach((element) => {
        for (let i = 0; i < obj.inputs.length; i++) {
            let objElement = obj.inputs[i].name;
            if (objElement == element) {
                //TODO: check for duplicate variable names and return an error
                obj.callSyntax.push({
                    name: element,
                    beginBit: obj.inputs[i].beginBit,
                    endBit: obj.inputs[i].endBit,
                    type: "I"
                });
            }
        }

        for (let i = 0; i < obj.outputs.length; i++) {
            let objElement = obj.outputs[i].name;
            if (objElement == element) {
                //TODO: check for dupes
                obj.callSyntax.push({
                    name: element,
                    beginBit: obj.inputs[i].beginBit,
                    endBit: obj.inputs[i].endBit,
                    type: "O"
                });
            }
        }

        //TODO: check that every in/out has been assigned
    });

    //TODO: check that the inputs declared and inputs found match
    //check that there are no dupes

    return obj;
}

/**
 * 
 * @param obj module object created using generateBaseModuleObj
 */
function elaborateModuleObj(obj: Module): Module {

    let annotatedExpressions = obj.annotatedExpressions; //shorthand

    //for each expression find the modules/assign statements
    for (let i = 1; i < annotatedExpressions.length; i++) {
        let expression = annotatedExpressions[i].expression;
        let child: Node = {
            type: annotatedExpressions[i].type,
            instanceName: null,
            callSyntax: []
        }
        let words;

        switch (annotatedExpressions[i].type) {
            case ENUM.Assign:
                let splitted = expression.split('=');
                let right = splitted[1];

                child.instanceName = splitted[0].trim().split(" ")[1];

                words = right.match(/((?=\s*)\w+((\[\d+\])|(\[\d+:\d+\]))*)/g);

                for (let i = 0; i < words.length; i++) {
                    child.callSyntax.push(getVariableObj(obj, words[i]));
                }

                child.stack = parse(right);
                obj.nodes.push(child);
                break;

            case ENUM.ModuleUsage:
                words = expression.match(/((?=\s*)\w+((\[\d+\])|(\[\d+:\d+\]))*)/g);
                child.moduleName = words[0];
                child.instanceName = words[1];

                let moduleIO = words.slice(2);
                for (let i = 0; i < moduleIO.length; i++) {
                    child.callSyntax.push(getVariableObj(obj, moduleIO[i]));
                }

                obj.nodes.push(child);
                break;
        }
    }

    return obj;
}

/**
 * 
 * @param modules Array returned from generateNetwork function
 */
export function elaborateModules(modules: Module[]): Module[] {
    let elaboratedModules = [];
    for (let i = 0; i < modules.length; i++) {
        elaboratedModules.push(elaborateModuleObj(modules[i]));
    }
    return elaboratedModules;
}

//BEGIN CODE FROM STACK OVERFLOW
//https://stackoverflow.com/questions/23325832/parse-arithmetic-expression-with-javascript

//creates token array
let lexer = new Lexer;
lexer.addRule(/\s+/, function () {
    /* skip whitespace */
});
lexer.addRule(/((?=\s*)\w+((\[\d+\])|(\[\d+:\d+\]))*)/, function (lexeme) {
    return lexeme; // symbols
});
//TODO: also capture: 1234'h1234
//b: binary d: decimal o: ocatal h: hex
//ex: 5'hFFF => represents bit array 5 bits wide
lexer.addRule(/('b[01])|(\d+)/, function (lexeme) {
    return lexeme; //gets numbers and "bits"
});
//TODO: add support for correct operators
lexer.addRule(/(~?[\^\&\|])|[\,\(\)\{\}]|(<<)|(>>)|~/, function (lexeme) {
    return lexeme; // punctuation (i.e. "(", "&", "|", "}")
});
//TODO: read more about lexer to figure out wtf this is for

function getParserObj(precedence) {
    return {
        "precedence": precedence,
        "associativity": "left"
    }
}

let parser = new Parser({
    "~": getParserObj(9),
    "&": getParserObj(8),
    "|": getParserObj(7),
    "~&": getParserObj(6),
    "~|": getParserObj(5),
    "^": getParserObj(4),
    "~^": getParserObj(3),
    "<<": getParserObj(2),
    ">>": getParserObj(1),
    ",": getParserObj(0)
});

/**
 * outputs text in postfix "stack" notation
 * @param input 
 */
function parse(input: string): string[] {
    lexer.setInput(input);
    let tokens = [],
        token;
    while (token = lexer.lex()) tokens.push(token);
    return parser.parse(tokens);
}

//END CODE FROM STACK OVERFLOW

import * as BitwiseLib from "./bitwiseLib";

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

/**
 * probably declass this
 * @param {string} table 
 */
function Parser(table) {
    this.table = table;
}

/**
 * DONT CHANGE VAR TO LET
 * DONT TOUCH THIS
 * @param {Array} input array of tokens
 */
Parser.prototype.parse = function (input) {
    var length = input.length,
        table = this.table,
        output = [],
        stack = [],
        index = 0;

    while (index < length) {
        var token = input[index++];

        switch (token) {
            case "(":
            case "{":
                stack.unshift(token);
                break;
            case ")":
                while (stack.length) {
                    var token = stack.shift();
                    if (token === "(") break;
                    else output.push(token);
                }

                if (token !== "(")
                    throw new Error("Mismatched parentheses.");
                break;
            case "}":
                while (stack.length) {
                    var token = stack.shift();
                    if (token === "{") break;
                    else output.push(token);
                }

                if (token !== "{")
                    throw new Error("Mismatched braces.");
                break;
            default:
                //if token is defined as a key in the table, or if the token is a number
                //if casting fails, cast will return NaN and NaN is falsy
                //if it is a number must be greater than 0
                //TODO: Check validity of numbers
                if (table.hasOwnProperty(token) || (+token)) {
                    let lastEntry = stack[stack.length - 1];
                    //if the number is being used as an operand for bit shifting, 
                    //instead of being used as an operator for duplication
                    if (+token && (lastEntry == "<<" || lastEntry == ">>")) output.push(token);
                    else {
                        while (stack.length) {

                            var punctuator = stack[0];
                            if (punctuator === "(" || punctuator === "{") break;
                            var operator;
                            var precedence;

                            if (+token) {
                                operator = token;
                                precedence = 1;
                            } else {
                                operator = table[token];
                                precedence = operator.precedence;
                            }

                            var antecedence = table[punctuator].precedence;

                            if (precedence > antecedence ||
                                precedence === antecedence &&
                                operator.associativity === "right") break;
                            else output.push(stack.shift());
                        }
                        stack.unshift(token);
                    }
                } else output.push(token);
        }
    }

    while (stack.length) {
        var token = stack.shift();
        if (token !== "(") output.push(token);
        else throw new Error("Mismatched parentheses.");
    }

    return output;
};

// let parsedText = parse(`{
//     ~a & b & ~c & d,
//     (b & ~c & ~d) | (~a & ~b & (c | d)),
//     (~c & ~d) | (~b & c & d),
//     (~a & ~c & ~d) | (b & c & d) | (~b & c & ~d)
// }`);
// console.log("stack", parsedText)

// let evaluatedStack = evaluateStack({
//     a: BitwiseLib.binaryToBitArray("0"),
//     b: BitwiseLib.binaryToBitArray("0"),
//     c: BitwiseLib.binaryToBitArray("0"),
//     d: BitwiseLib.binaryToBitArray("0"),
// }, parsedText);

// console.log("evaluated stack", evaluatedStack)
//
// console.log(BitwiseLib.bitArrayToString(evaluatedStack))