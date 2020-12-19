/* eslint-disable */

let debug = true;

//test that it works
export function hi() {
    alert("hi");
}

export function isComment(text) {
    return (text.match(/assign\s+\w+\s+=.+/g) || []).length == 1;
}
export function isAssignStatement(text) {
    return (text.match(/assign\s+\w+((\[\d+\])|(\[\d+:\d+\]))*\s+=.+/g) || []).length == 1;
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

    console.log(annotatedExpressions)

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

    console.log(modules)
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

        console.log(temp)

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

export function elaborateModuleObj(obj, allModules) {

    let otherModules = [];

    allModules.forEach(module => {
        if (module.name != obj.name) otherModules.push(module);
    });

    let annotatedExpressions = obj.annotatedExpressions;

    //for each expression find the modules/assign statements
    for (let i = 1; i < annotatedExpressions.length; i++) {
        let expression = annotatedExpressions[i].expression;

        switch (annotatedExpressions[i].type) {
            case "assign":
                //implement  convertBitwiseExprToJSON here

                break;
            case "moduleUsage":

                let moduleUsed = expression.match(/\w+/)[0]; //syntax wil be correct so i can index without checking if not null

                otherModules.forEach(module => {
                    if (module.name == moduleUsed) {

                    }
                });
                break;
            default:
                break;
        }

    }
}

/**
 * 
 * @param {text of bitwise experession} text 
 * NO SPACES
 * converts (~a&~b&c)|(~a&b&~c) to:
    {
        operandA: {
            operandA: {
                operandA: ~a,
                operandB: ~b,
                operator: & 
            },
            operandB: c,
            operator: &
        },
        operandB: {
            operandA: {
                operandA: ~a,
                operandB: b,
                operator: & 
            },
            operandB: ~c,
            operator: &
        },
        operator: "|"
    }
 */
export function convertBitwiseExprToJSON(text) {

    //tests for valid statement
    let seemsValid = text.match(/^~?(\w+|(\([^\(]+\)))([\^\&\|]~?(\w+|(\([^\(]+\))))+$/);

    if (!seemsValid) {
        return null;
    };

    //pulls out things in between parentheses
    let substrings = text.match(/(?<=\().*?(?=\)[\^\&\|]?)/g);
    //replaces the things in betwen prenenheses with nothing
    let textMinusSubstrings = text.replace(/(?<=\().*?(?=\)[\^\&\|]?)/g, "");
    //creates an interable array
    //variables that are negated will be treated as one object
    let textArray = textMinusSubstrings.match(/(~?[\^\&\|])|~?((\w+)|(\(\)))/g);
    let substringNum = 0; //keeps track of the substring to use to recurse

    let orderOfOps = ["&", "|", "~&", "~|", "^", "~^"];

    orderOfOps.forEach(op => {
        for (let i = 0; i < textArray.length; i++) {
            if (textArray[i] == op) {

                let opA = textArray[i - 1];
                let opB = textArray[i + 1];

                if (opA == "()") {
                    opA = convertBitwiseExprToJSON(substrings[substringNum]);
                    if (!opA) return null;
                    //only use next substring if the current one will never be used again
                    substringNum++;
                }
                if (opB == "()") {
                    if (!opB) return null;
                    opB = convertBitwiseExprToJSON(substrings[substringNum]);
                }

                textArray.splice(i - 1, 3, {
                    operandA: opA,
                    operator: textArray[i],
                    operandB: opB
                });

                i--;
            }
        }
    });

    if (textArray.length == 1) return textArray[0];
    return textArray;
}