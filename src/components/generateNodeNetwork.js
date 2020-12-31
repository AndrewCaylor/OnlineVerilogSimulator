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

}



export function generateBaseModuleObj(annotatedExpressions) {

    /**
    structure:

    let obj = {
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
      dependencies:[
          {name: <string>, callSyntax: [
              variable: <string>, bitLength: <int>
          ]}
      ]
    }
     */

    let obj = {
        name: null,
        callSyntax: [],
        inputs: [],
        outputs: [],
        wires: [],
        annotatedExpressions: []
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
            case "moduleUsage":

                //TODO: add dependency info to base module obj
                let dependencyObj = {
                    name: "",
                    usedModulename: ""
                }

                let words = temp.match(/((?=\s*)\w+((\[\d+\])|(\[\d+:\d+\]))*)/g);
                let usedModuleName = words[0];
                let name = words[1];
                //sometime i might use this
                // let moduleIO = words.slice(2);

                // moduleIO.forEach(element => {
                //     let bits;
                //     if(element.match("[")){
                //         let range = element.match(/\d/g);
                //         bits = range[0] - range[1];
                //     }
                //     else{

                //     }
                // });

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
 * 
 * @param {module object created using generateBaseModuleObj} obj 
 * @param {all the modules declared in the project} allModules 
 */
export function elaborateModuleObj(obj, allModules) {

    let otherModules = [];

    allModules.forEach(module => {
        if (module.name != obj.name) otherModules.push(module);
    });

    let annotatedExpressions = obj.annotatedExpressions; //shorthand

    //for each expression find the modules/assign statements
    for (let i = 1; i < annotatedExpressions.length; i++) {
        let expression = annotatedExpressions[i].expression;

        //each node describes inputs, output, and JSON operation tree
        let nodes = [];

        switch (annotatedExpressions[i].type) {
            case "assign":
                nodes.push(getAssignExprObj(expression));

                break;
            case "moduleUsage":

                //TODO: probably insert child module JSON represntation into parent module

                // let matchTemp = expression.match(/\w+/);
                // let moduleUsed = matchTemp[0]; //syntax wil be correct so i can index without checking if not null
                // let name = matchTemp[1];

                // otherModules.forEach(module => {
                //     if (module.name == moduleUsed) {

                //     }
                // });
                break;
            default:
                break;
        }

    }
}

//BEGIN CODE FROM STACK OVERFLOW
//https://stackoverflow.com/questions/23325832/parse-arithmetic-expression-with-javascript

//creates token array
let lexer = new Lexer;
lexer.addRule(/\s+/, function() {
    /* skip whitespace */
});
lexer.addRule(/[a-z]+/, function(lexeme) {
    return lexeme; // symbols
});
//TODO: also capture: 1234'h1234
//b: binary d: decimal o: ocatal h: hex
//ex: 5'hFFF => represents bit array 5 bits wide
lexer.addRule(/('b[01])|(\d+)/, function(lexeme) {
    return lexeme; //gets numbers and "bits"
});
//TODO: add support for correct operators
lexer.addRule(/(~?[\^\&\|])|[\,\(\)\{\}]|(<<)|(>>)/, function(lexeme) {
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
    "~": getParserObj(0),
    "&": getParserObj(1),
    "|": getParserObj(2),
    "~&": getParserObj(3),
    "~|": getParserObj(4),
    "^": getParserObj(5),
    "~^": getParserObj(6),
    "<<": getParserObj(7),
    ">>": getParserObj(8),
    ",": getParserObj(9)
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
                console.log(stack)
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

let parsedText = parse("{2{b}} & a");
console.log("stack", parsedText)

let evaluatedStack = evaluateStack({
    a: BitwiseLib.binaryToBitArray("0100"),
    b: BitwiseLib.binaryToBitArray("01"),

}, parsedText);

console.log("evaluated stack", evaluatedStack)

console.log(BitwiseLib.bitArrayToString(evaluatedStack))