/*eslint-disable*/

var Lexer = require("lex");

export function hi() {
    alert("hi");
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

    //not doing else if just incase
    if (isInputDeclaration(text)) {
        type = "input";
    } else if (isOutputDeclaration(text)) {
        type = "output";
    } else if (isWireDeclaration(text)) {
        type = "wire";
    } else if (isAssignStatement(text)) {
        type = "assign";
    } else if (isModuleDeclaration(text)) {
        type = "moduleDeclaration";
    }

    //module usage will detect module declaration
    if (!type) {
        if (isModuleUsage(text)) {
            type = "moduleUsage";
        } else if (text == "endmodule") {
            type = "endmodule";
        }
    }

    return type;
}

export function generateNetwork(text) {

    let lines = text.split("\n");

    let decommentedLines = [];
    lines.forEach((line) => {
        let temp = line.match("^([^//])+"); //matches content before comments
        if (temp) {
            temp = temp[0].trim();
            if (temp.length != 0) {
                decommentedLines.push(temp);
            }
        }
    });


    text = decommentedLines.join("");
    let annotatedExpressions = []; //TODO: should also include information about the error
    let expressions = text.replace(/endmodule/g, "endmodule;").split(";"); //make sure there is a ; at every line and the split

    expressions.forEach((expression) => {
        annotatedExpressions.push({
            "expression": expression,
            type: getExpressionType(expression)
        });
    });

    let state = null;
    let moduleContent = [];
    let modules = [];

    let errors = [];

    //TODO: collect info about all line failures and not just return first one

    //state machine for checking validity of program structure/giving data to function to create modules
    for (let i = 0; i < annotatedExpressions.length; i++) {
        switch (annotatedExpressions[i].type) {

            case "moduleDeclaration":
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

            case "endmodule":
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

    // let reg = /(module|endmodule)\s+/g;

    // let modulesText = text.split(reg);
    // let modules = [];
    // // let elaboratedModules = [];

    // modulesText.forEach((ele) => {
    //   if (ele != "module" && ele != "") {
    //     //filtering cuz splitting
    //     modules.push(this.generateBaseModuleObj(ele));
    //   }
    // });

    // for (let i = 0; i < modules.length; i++) {
    //   elaboratedModules[i] = this.elaborateModuleObj(
    //     modulesText[i],
    //     modules[i]
    //   );
    // }
    return modules;
}

/**
 * 
 * @param {object} baseModuleObj 
 * @param {string} variableName asdf or asdf[1:0] or asdf[0]
 */
function getVariableObj(baseModuleObj, variableText) {
    console.log(baseModuleObj, variableText)

    let splitted = variableText.split(/\[|\]/g);

    let parameterObj = {
        name: splitted[0],
        beginBit: null,
        endBit: null,
        type: null
    };

    if (variableText.match(/\[/)) {
        //var1[3:0] => [3,0]
        let numbers = splitted[1].split(/:/g);

        console.log(numbers)

        if (numbers.length == 1) {
            parameterObj.endBit = numbers[0];
            parameterObj.beginBit = numbers[0];
        } else if (numbers.length == 2) {
            parameterObj.endBit = numbers[0];
            parameterObj.beginBit = numbers[1];
        } else {
            return null;
        }
        let variableObj = getObj(baseModuleObj, parameterObj.name);
        parameterObj.type = variableObj.type; //can be undefined
    } else {
        let variableObj = getObj(baseModuleObj, parameterObj.name);

        parameterObj.type = variableObj.type; //can be undefined
        parameterObj.beginBit = 0;
        parameterObj.endBit = variableObj.bits - 1;
    }

    return parameterObj;

    function getObj(baseModuleObj, variableName) {
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
 *  Structure of base module:
    {
      name: <string>,
      callSyntax: [
        {name: <string>, bits: <int>, type: "I" or "O"}, ...
      ],
      inputs: [
        {name: <string>, bits: <int>}, ...
      ],
      outputs: [
        {name: <string>, bits: <int>}, ...
      ],
      wires: [
        {name: <string>, bits: <int>}, ...
      ],
      annotatedExpressions: []
    }
 * @param {Array} annotatedExpressions 
 */
export function generateBaseModuleObj(annotatedExpressions) {

    let obj = {
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

    function getNumBits(expressionText) {
        //get area between brackets (need eslint disable cuz escape chars)
        //eslint-disable-next-line
        let split1 = expressionText.split(/[\[\]]/g);

        //might not be brackets
        if (split1.length == 1) {
            return 1;
        } else {
            return parseInt(split1[1].split(":")[0]) + 1;
        }
    }

    function getVariables(expressionText, len) {
        let right = expressionText.substring(len); //removes the input/output/wire

        right = right.split("]"); //only get after brackets if there are any
        right = right.length > 1 ? right[right.length - 1] : right[0];
        right = right.replace(/\s/g, ""); //remove whitespace

        return right.split(",");
    }

    let length;
    let vars;
    for (let i = 1; i < annotatedExpressions.length; i++) {
        let temp = annotatedExpressions[i].expression;

        switch (annotatedExpressions[i].type) {
            case "input":
                length = getNumBits(temp);
                vars = getVariables(temp, 6);

                vars.forEach((ele) => {
                    obj.inputs.push({
                        name: ele,
                        bits: length
                    });
                });
                break;
            case "output":
                length = getNumBits(temp);
                vars = getVariables(temp, 7);

                vars.forEach((ele) => {
                    obj.outputs.push({
                        name: ele,
                        bits: length
                    });
                });
                break;

            case "wire":
                length = getNumBits(temp);
                vars = getVariables(temp, 5);

                vars.forEach((ele) => {
                    obj.wires.push({
                        name: ele,
                        bits: length,
                    });
                });
                break;
        }
    }

    //Gets the first experssion and only gets stuff between parentheses
    //Then it replaces the whitespace with nothing
    //then it splits over the commas to get the variable names of the inputs and outputs
    let insNouts = annotatedExpressions[0].expression
        .split(/[()]/g)[1]
        .replace(/\s/g, "")
        .split(",");

    //
    insNouts.forEach((element) => {
        for (let i = 0; i < obj.inputs.length; i++) {
            let objElement = obj.inputs[i].name;
            if (objElement == element) {
                //TODO: check for dupes
                obj.callSyntax.push({
                    name: element,
                    bits: obj.inputs[i].bits,
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
                    bits: obj.outputs[i].bits,
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
 * Things added to baseModuleObj:
    nodes:[
        {
            type: "moduleUsage", moduleName: <string>, instanceName: <string>,
            callSyntax: [{ name: <string>, beginBit: <int>, endBit: <int>, type: I/O/null }, ...]
        }, 
        {
            type: "assign", instanceName: <string>, stack: <array>,
            callSyntax: [{ name: <string>, beginBit: <int>, endBit: <int>, type: I/O/null }, ...]
        },...
      ]
 * 
 * @param {object} obj module object created using generateBaseModuleObj
 * @param {array} allModules all the modules declared in the project
 */
function elaborateModuleObj(obj) {

    // let otherModules = [];

    // allModules.forEach(module => {
    //     if (module.name != obj.name) otherModules.push(module);
    // });

    let annotatedExpressions = obj.annotatedExpressions; //shorthand

    //for each expression find the modules/assign statements
    for (let i = 1; i < annotatedExpressions.length; i++) {
        let expression = annotatedExpressions[i].expression;
        let child, words;

        switch (annotatedExpressions[i].type) {
            case "assign":
                child = {
                    type: "assign",
                    instanceName: null,
                    callSyntax: [],
                    stack: {}
                };

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

            case "moduleUsage":
                child = {
                    type: "moduleUsage",
                    moduleName: null,
                    instanceName: null,
                    callSyntax: []
                }

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
 * @param {array} modules Array returned from generateNetwork function
 */
export function elaborateModules(modules) {
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
lexer.addRule(/\s+/, function() {
    /* skip whitespace */
});
lexer.addRule(/((?=\s*)\w+((\[\d+\])|(\[\d+:\d+\]))*)/, function(lexeme) {
    return lexeme; // symbols
});
//TODO: also capture: 1234'h1234
//b: binary d: decimal o: ocatal h: hex
//ex: 5'hFFF => represents bit array 5 bits wide
lexer.addRule(/('b[01])|(\d+)/, function(lexeme) {
    return lexeme; //gets numbers and "bits"
});
//TODO: add support for correct operators
lexer.addRule(/(~?[\^\&\|])|[\,\(\)\{\}]|(<<)|(>>)|~/, function(lexeme) {
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
 * @param { string } input 
 */
function parse(input) {
    lexer.setInput(input);
    let tokens = [],
        token;
    while (token = lexer.lex()) tokens.push(token);
    return parser.parse(tokens);
}

//END CODE FROM STACK OVERFLOW

import * as BitwiseLib from ".//bitwiseLib";

/**
 * 
 * @param {Object} context in form: {var1: value, var2: value)
 * @param {Array} tokens postfix notation stack
 */
function evaluateStack(context, tokens) {
    let stack = [];

    for (let i = 0; i < tokens.length; i++) {
        let token = tokens[i];

        let a, b;
        switch (token) {
            case "~":
                a = stack.pop();
                stack.push(BitwiseLib.doOperation(token, a));
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

//DONT CHANGE VAR TO LET
/**
 * 
 * @param {Array} input array of tokens
 */
Parser.prototype.parse = function(input) {
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

// console.log(BitwiseLib.bitArrayToString(evaluatedStack))