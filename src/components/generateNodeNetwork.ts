/*eslint-disable*/
var Lexer = require("lex");

//easier debug
function log(message: string, stuff: any) {
    let debug = false;
    if (debug) {
        stuff = JSON.parse(JSON.stringify(stuff));
        console.log(message, stuff)
    }
}

//importing interfaces
import { Module, ParameterSyntax, AnnotatedExpression, Node, ENUM, ModuleDictReturn, ModuleDict, constructCompileError, ModuleReturn, ErrorCode } from "./interfaces";

import * as BitwiseLib from ".//bitwiseLib"

function isAssignStatement(text) {
    return (text.match(/assign\s+\w+((\[\d+\])|(\[\d+:\d+\]))?\s+=.+/g) || []).length == 1; //does noit check for correct syntax inside the statement
}

/*
TODO?: allow this: (multiple instantiations of and without writing and multiple times)
and G5 (x[3], a[3], b[3]), 
    G6 (x[2], a[2], b[2]),
    G7 (x[1], a[1], b[1]),
    G8 (x[0], a[0], b[0]);
*/
//may the lord have mercy on my soul (191 characters of regex)
function isModuleUsage(text) {
    return (text.match(/^\w+\s+\w+\s*\((\s*(([A-z]\w*((\[\d+\])|(\[\d+:\d+\]))?)|(\d*'((b[01]+)|(d[0-9]+)|(h[0-9A-F]+))))\s*)(,\s*(([A-z]\w*((\[\d+\])|(\[\d+:\d+\]))?)|(\d*'((b[01]+)|(d[0-9]+)|(h[0-9A-F]+))))\s*)+\)$/g) || []).length == 1;
}
function isModuleDeclaration(text) {
    return (
        (text.match(/module\s+\w+\((\s*\w+\s*,)*(\s*\w+\s*\))/g) || [])
            .length == 1
    );
}
function isWireDeclaration(text) {
    return (
        (text.match(/wire\s+(\[\d+:\d+\])*(\s*\w+\s*,)*(\s*\w+)$/g) || [])
            .length == 1
    );
}
function isInputDeclaration(text) {
    return (
        (text.match(/input\s+(\[\d+:\d+\])*(\s*\w+\s*,)*(\s*\w+)$/g) || [])
            .length == 1
    );
}
function isOutputDeclaration(text) {
    return (
        (text.match(/output\s+(\[\d+:\d+\])*(\s*\w+\s*,)*(\s*\w+)$/g) || [])
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
 * TODO: do something with errors
 * @param text all the code the user wants to compile
 */
export function getBaseModules(text: string): ModuleDictReturn {

    let returnVal: ModuleDictReturn = {
        failed: null,
        error: null,
        data: {}
    }

    //removes single line comments
    text = text.replace(/(\/\/).*/g, "");
    //removes multiline line comments
    text = text.replace(/(\/\*)(.|\n)*(\*\/)/g, (match) => {
        return "\n".repeat(match.match(/\n/g).length);
    });

    let textArray: string[] = text.split("\n");
    let annotatedExpressions: AnnotatedExpression[] = []; //TODO: should also include information about the error

    //fills the annotaed expressions array
    let expressionText = "";
    let lineNumber;
    textArray.forEach((expression, i) => {
        let removedWhiteSpace = expression.replace(/\s+/g, "");
        expression = expression.trim();
        if (removedWhiteSpace) {
            if (expression[expression.length - 1] == ";") {
                //do not include semicolon
                expressionText += expression.substr(0, expression.length - 1);
                if (!lineNumber) lineNumber = i;
                annotatedExpressions.push({
                    "expression": expressionText,
                    type: getExpressionType(expressionText),
                    "lineNumber": lineNumber + 1
                });
                expressionText = "";
                lineNumber = null;
            }
            else if (expression == "endmodule") {
                annotatedExpressions.push({
                    "expression": expression,
                    type: ENUM.Endmodule,
                    "lineNumber": i + 1
                });
                lineNumber = null;
            }
            else {
                expressionText += expression.substr(0, expression.length);
                if (!lineNumber) lineNumber = i;
            }
        }
    });

    log("annotated expressions", annotatedExpressions)

    let state = null;
    let moduleContent: AnnotatedExpression[] = [];
    //will edit parent obj
    let moduleDict: ModuleDict = returnVal.data;

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
                    returnVal.failed = true;
                    returnVal.error = constructCompileError("Previous module not closed with endmodule",
                        annotatedExpressions[i].lineNumber,
                        ErrorCode.noEndModule, annotatedExpressions[i])
                    return returnVal;
                }
                break;

            case ENUM.Endmodule:
                //generate new module using the previous lines
                if (state == "parsingModule") {
                    let moduleObj = generateBaseModuleObj(moduleContent);
                    moduleDict[moduleObj.name] = moduleObj;
                    moduleContent = [];
                    state = null;
                } else {
                    returnVal.failed = true;
                    returnVal.error = constructCompileError("Extra endmodule statement",
                        annotatedExpressions[i].lineNumber,
                        ErrorCode.extraEndmodule,
                        annotatedExpressions[i]);
                    return returnVal;
                }
                break;

            case null:
                //will be null if there was a syntax error in that line
                returnVal.failed = true;
                returnVal.error = constructCompileError("Unknown or invalid syntax",
                    annotatedExpressions[i].lineNumber,
                    ErrorCode.invalidSyntax,
                    annotatedExpressions[i]);
                return returnVal;

            default:
                if(state === null){
                    log("found", null)
                    returnVal.failed = true;
                    returnVal.error = constructCompileError("Code between endmodule and next module declaration",
                        annotatedExpressions[i].lineNumber,
                        ErrorCode.invalidSyntax,
                        annotatedExpressions[i]);
                    return returnVal;
                }
                else{
                    moduleContent.push(annotatedExpressions[i]);
                }

                break;
        }
    }

    if (state == "parsingModule") {
        returnVal.failed = true;
        returnVal.error = constructCompileError("No endmodule statement at end of file",
            annotatedExpressions[annotatedExpressions.length - 1].lineNumber,
            ErrorCode.noEndModule,
            annotatedExpressions[annotatedExpressions.length - 1]);
        return returnVal;
    }

    log("base modules", moduleDict)
    return returnVal;
}


/**
 *  
 * @param annotatedExpressions 
 */
function generateBaseModuleObj(annotatedExpressions: AnnotatedExpression[]) {

    let obj: Module = {
        name: null,
        callSyntax: [],
        inputs: [],
        outputs: [],
        wires: [],
        annotatedExpressions: [],
        nodes: [], //used later
        subModules: [] //used later
    };

    obj.annotatedExpressions = annotatedExpressions;
    obj.name = annotatedExpressions[0].expression.match(/\w+/g)[1]; //get second word

    let IOs = annotatedExpressions[0].expression.match(/\w+/)

    //TODO: probally combine this function with the other getbits functions I wrote in to one
    function getBits(expressionText: string): number[] {
        //get area between brackets
        let split1 = expressionText.split(/[\[\]]/g);

        //might not be brackets
        if (split1.length == 1) {
            return [0, 0];
        } else {
            let splitted = split1[1].split(":");
            return [parseInt(splitted[1]), parseInt(splitted[0])];
        }
    }

    function getVariables(expression: string): string[] {
        //only get after brackets if there are any
        //removes the input/output/wire
        let right = expression.replace(/((input)|(output)|(wire))\s+/, "").split("]");

        let rightStr = right[right.length - 1];
        rightStr = rightStr.replace(/\s/g, ""); //remove whitespace

        return rightStr.split(",");
    }

    let bits: number[];
    let vars: string[];
    for (let i = 1; i < annotatedExpressions.length; i++) {
        let temp = annotatedExpressions[i].expression;
        bits = getBits(temp);
        vars = getVariables(temp);

        let tempArr: ParameterSyntax[] = [];
        vars.forEach((ele) => {
            tempArr.push({
                name: ele,
                beginBit: bits[0],
                endBit: bits[1]
            });
        });

        switch (annotatedExpressions[i].type) {
            case ENUM.Input:
                tempArr.map(input => { input.type = "I"; return input; })
                obj.inputs = obj.inputs.concat(tempArr);
                break;

            case ENUM.Output:
                tempArr.map(output => { output.type = "O"; return output; })
                obj.outputs = obj.outputs.concat(tempArr);
                break;

            case ENUM.Wire:
                obj.wires = obj.wires.concat(tempArr);
                break;
        }
    }

    //Gets the first experssion and only gets stuff between parentheses
    //Then it replaces the whitespace with nothing
    //then it splits over the commas to get the variable names of the inputs and outputs
    let insNouts: string[] = annotatedExpressions[0].expression
        .split(/[()]/g)[1]
        .replace(/\s/g, "")
        .split(",");

    insNouts.forEach(inOrOut => {
        let parameter: ParameterSyntax;
        parameter = obj.inputs.find(input => input.name == inOrOut);
        if (!parameter) {
            parameter = obj.outputs.find(output => output.name == inOrOut);
        }
        if (!parameter) {
            console.log("IO Variable not declared in module body", inOrOut);
            return null;
        }
        obj.callSyntax.push(parameter);
    });

    let allIO = obj.inputs.concat(obj.outputs);
    allIO.forEach(inOrOut => {
        if (!obj.callSyntax.find(parameter => parameter.name == inOrOut.name)) {
            console.log("IO Variable not declared in module declaration", inOrOut);
            return null;
        }
    });

    return obj;
}


/**
 * 
 * @param baseModuleObj 
 * @param variableText asdf or asdf[1:0] or asdf[0]
 */
function getVariableObj(baseModuleObj: Module, variableText: string) {

    return clone(getObj(baseModuleObj, variableText));

    function getObj(baseModuleObj: Module, variableName: string): ParameterSyntax { //type is ParameterSyntax | IOSyntax
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
 * TODO: simplify
 * @param obj module object created using generateBaseModuleObj
 */
function elaborateModuleObj(obj: Module, moduleDict: ModuleDict): ModuleReturn {

    let returnVal: ModuleReturn = {
        failed: null,
        error: null,
        data: clone(obj)
    }

    let annotatedExpressions = obj.annotatedExpressions; //shorthand

    //for each expression find the modules/assign statements
    for (let i = 1; i < annotatedExpressions.length; i++) {
        const expression = annotatedExpressions[i].expression;

        let node: Node = {
            "expression": expression,
            type: annotatedExpressions[i].type,
            lineNumber: annotatedExpressions[i].lineNumber,
            callSyntax: [],
            inputs: [],
            outputs: []
        }
        let words;

        /*
        Finds the name, beginBit, endBit, I/O (if needed)
        of each of the parameters used in the node. 
        I/O denotes whether the parameters is an I/O if the MODULE not the NODE
        */
        switch (annotatedExpressions[i].type) {
            case ENUM.Assign:

                let splitted = expression.split('=');
                let right = splitted[1];

                let outputName = splitted[0].match(/(?<=(assign\s+))(\w+)/)[0];
                //dont match numbers
                words = right.match(/(?<!(\d*'\w*))[A-Za-z][\w]*/g);

                var uniqueWords: string[] = Array.from(new Set(words));

                for (let wordInd = 0; wordInd < uniqueWords.length; wordInd++) {
                    let varObj = getVariableObj(obj, uniqueWords[wordInd])
                    //ERROR CHECK
                    if (!varObj) {
                        log("Variable name used in assign statement not found: ", uniqueWords[wordInd])
                        returnVal.failed = true;
                        returnVal.error = constructCompileError("Variable name used in assign statement not found: " + uniqueWords[wordInd],
                            annotatedExpressions[i].lineNumber,
                            ErrorCode.variableNameNotFound,
                            annotatedExpressions[i]);
                        return returnVal;
                    }
                    node.callSyntax.push(varObj);
                }

                let output: ParameterSyntax = getVariableObj(obj, outputName);

                //ERROR CHECK
                if (!output) {
                    log("Variable name assigned to not found: ", outputName)
                    returnVal.failed = true;
                    returnVal.error = constructCompileError("Variable name assigned to not found: " + outputName,
                        annotatedExpressions[i].lineNumber,
                        ErrorCode.variableNameNotFound,
                        annotatedExpressions[i]);
                    return returnVal;
                }
                let bits = getAssignBits(expression);
                if (bits) {
                    output.beginBit = bits[0];
                    output.endBit = bits[1];
                }
                node.outputs.push(output);
                node.inputs = node.callSyntax;
                node.stack = parse(right);
                obj.nodes.push(node);
                break;

            case ENUM.ModuleUsage:
                words = expression.match(/((?=\s*)\w+((\[\d+\])|(\[\d+:\d+\])|\d*'((b[01]+)|(d[0-9]+)|(h[0-9A-F]+)))*)/g);
                node.moduleName = words[0]; //cant check for module name yet
                node.instanceName = words[1];

                let moduleIO: string[] = words.slice(2);
                for (let i = 0; i < moduleIO.length; i++) {
                    const parameter = moduleIO[i];

                    //then the parameter is a number
                    if (BitwiseLib.isValidBitString(parameter)) {
                        let value = BitwiseLib.stringToBitArray(parameter);
                        node.callSyntax.push({
                            name: parameter,
                            beginBit: 0,
                            endBit: value.length - 1,
                            type: "CONST",
                            "value": value
                        });
                    }
                    //parameter is a regular variable
                    else {
                        let bits = getModuleUsageBits(parameter);
                        let parameterName = parameter.match(/\w+/)[0];
                        let parameterObj = getVariableObj(obj, parameterName);
                        //ERROR CHECK
                        if (!parameterObj) {
                            log("Variable used in module not found: ", parameterName);
                            returnVal.failed = true;
                            returnVal.error = constructCompileError("IO Variable not declared in module declaration: " + parameterName,
                                annotatedExpressions[i].lineNumber,
                                ErrorCode.variableNameNotFound,
                                annotatedExpressions[i]);
                            return returnVal;
                        }
                        if (bits) {
                            parameterObj.beginBit = bits[0];
                            parameterObj.endBit = bits[1];
                        }
                        node.callSyntax.push(parameterObj); //pushing
                    }
                }

                if (moduleDict[node.moduleName]) {
                    //denoting which parameters are outputs
                    let subModuleParameters = moduleDict[node.moduleName].callSyntax;

                    for (let i = 0; i < subModuleParameters.length; i++) {
                        const subModuleParameter = subModuleParameters[i];
                        if (subModuleParameter.type == "O") {
                            node.outputs.push(node.callSyntax[i]);
                        }
                        else {
                            node.inputs.push(node.callSyntax[i]);
                        }
                    }
                }
                else {
                    //implicitly allowes user to overwrite built in modules. TODO?: allow them to not
                    if (BitwiseLib.getBitwiseNotation(node.moduleName)) {
                        node.outputs = [node.callSyntax[0]];
                        node.inputs = node.callSyntax.slice(1);
                    }
                    else {
                        log("Module name not found: ", node.moduleName)
                        returnVal.failed = true;
                        returnVal.error = constructCompileError("Module name not found: " + node.moduleName,
                            annotatedExpressions[i].lineNumber,
                            ErrorCode.moduleNameNotFound,
                            annotatedExpressions[i]);
                        return returnVal;
                    }
                }

                obj.nodes.push(node);
                break;
        }
    }

    /**
     * Gets begin and endbit of assign asdf = asdf[1], asdf[1:2], asdf
     * @param text 
     */
    function getAssignBits(text: string): number[] | null {
        //gets the area between the brackets for the variable being assigned to
        let match = text.match(/(?<=(assign\s+\w+\s*\[))((\d+(:\d+)?))/);

        //might not be brackets
        if (!match) {
            return null;
        }
        else if (match[0].match(":")) {
            let splitted = match[0].split(":"); //TODO: .sort???
            return [parseInt(splitted[1]), parseInt(splitted[0])];
        }
        else {
            let num = parseInt(match[0]);
            return [num, num]
        }
    }

    /**
     * uses asdf[1] or asdf[1:2] or asdf
     * @param text 
     */
    function getModuleUsageBits(text: string): number[] {
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

    log("elaborated module obj", obj)
    return {
        failed: false,
        error: null,
        data: obj
    };
}

/**
 * 
 * @param modules Array returned from generateNetwork function
 */
export function elaborateModuleDict(moduleDict: ModuleDict): ModuleDictReturn {
    let elaboratedModules: ModuleDictReturn = {
        failed: null,
        error: null,
        data: {}
    };

    Object.keys(moduleDict).forEach(key => {
        let result = elaborateModuleObj(moduleDict[key], moduleDict);
        if (!result.failed) {
            elaboratedModules.data[key] = result.data;
        }
        else {
            elaboratedModules.error = result.error;
            elaboratedModules.failed = true;
            return elaboratedModules;
        }
    });

    log("elaborated modules", elaboratedModules);

    return elaboratedModules;
}

/**
 * 
 * @param text 
 */
export function compileVerilog(text: string): ModuleDictReturn {
    let baseModules = getBaseModules(text);
    if (baseModules.error) {
        //there is an error in baseModules
        return baseModules;
    }
    let elaborated = elaborateModuleDict(baseModules.data);
    return elaborated;
}

//BEGIN CODE FROM STACK OVERFLOW
//https://stackoverflow.com/questions/23325832/parse-arithmetic-expression-with-javascript

//creates token array
let lexer = new Lexer;
lexer.addRule(/\s+/, function () {
    /* skip whitespace */
});

lexer.addRule(/((?=\s*)\w+((\[\d+\])|(\[\d+:\d+\])|\d*'((b[01]+)|(d[0-9]+)|(h[0-9A-F]+)))*)/, function (lexeme) {
    return lexeme; // symbols
});
//TODO: also capture: 1234'h1234
//b: binary d: decimal o: ocatal h: hex
//ex: 5'hFFF => represents bit array 5 bits wide
// lexer.addRule(/('b[01])|(\d+)/, function (lexeme) {
//     return lexeme; //gets numbers and "bits"
// });
lexer.addRule(/(~?[\^\&\|])|[\,\(\)\{\}]|(<<)|(>>)|~/, function (lexeme) {
    return lexeme; // punctuation (i.e. "(", "&", "|", "}")
});

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
export function parse(input: string): string[] {
    lexer.setInput(input);
    let tokens = [],
        token;
    while (token = lexer.lex()) tokens.push(token);
    return parser.parse(tokens);
}

//END CODE FROM STACK OVERFLOW

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
                    else if (+token && (input[index] == "{")) {
                        //if <number>{  , then the number is being used as the DUPLICATE operator
                        //the token needs to be altered to show that it is being used as an operator, not a numbetr
                        stack.unshift(token + "DUPLICATE")
                    }
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



export function clone(obj) {
    var copy;

    // Handle the 3 simple types, and null or undefined
    if (null == obj || "object" != typeof obj) return obj;

    // Handle Date
    if (obj instanceof Date) {
        copy = new Date();
        copy.setTime(obj.getTime());
        return copy;
    }

    // Handle Array
    if (obj instanceof Array) {
        copy = [];
        for (var i = 0, len = obj.length; i < len; i++) {
            copy[i] = clone(obj[i]);
        }
        return copy;
    }

    // Handle Object
    if (obj instanceof Object) {
        copy = {};
        for (var attr in obj) {
            if (obj.hasOwnProperty(attr)) copy[attr] = clone(obj[attr]);
        }
        return copy;
    }

    throw new Error("Unable to copy obj! Its type isn't supported.");
}