/**
 * 
 * @param {number} length length to initialize the array
 */
export function initializeBitArray(length) {
    return new Array(length).fill(null);
}

/**
 * 
 * @param {string} text 0s and 1s
 */
export function stringToBitArray(text) {
    let out = [];
    text.forEach(char => {
        if (char === "0") {
            out.push(false);
        } else if (char === "1") {
            out.push(true);
        } else {
            return null;
        }
    });
    return out;
}

//TODO: test
const operators = {
    "~": function(a) { return !a; },
    "~&": function(a, b) { return !(a && b); },
    "&": function(a, b) { return a && b; },
    "|": function(a, b) { return a || b; },
    "~|": function(a, b) { return !(a || b); },
    "^": function(a, b) { return (a || b) && !(a && b); },
    "~^": function(a, b) { return !((a || b) && !(a && b)); },
    "}": function(arr) {
        let out = [];
        arr.forEach(subArr => {
            out.concat(subArr);
        });
        return out;
    },
    "<<": function(a, b) {
        while (b > 0) {
            a.shift();
            a.push(false);
            b--;
        }
        return a;
    },
    ">>": function(a, b) {
        while (b > 0) {
            a.pop();
            a = a.concat(false, a);
            b--;
        }
        return a;
    }
};

export const Operators = operators;

//a&b,b&c
//ab&bc&}

/**
 * 
 * @param {string} operator string describing the operator to preform
 * @param {Array} operands array of boolean arrays
 */
export function doOperation(operator, operands) {

    let operation = operators[operator];

    switch (operator) {
        case "~":
            if (operands.length != 1) {
                return null;
            }
            return operation(operands[0]);
        case "&":
        case "~&":
        case "|":
        case "~|":
        case "^":
        case "~^":
            if (operands.length != 2) {
                return null;
            }
            a = operands[0];
            b = operands[1];
            if (a.length != b.length) {
                return null;
            }

            let out = [];
            for (let i = 0; i < array.length; i++) {
                out.push(operation(a[i], b[i]));
            }
            return out;

        case "}":
            return operation(operands);
            //TODO: check that I do not need to implement arithmetic and circular shifting
        case ">>":
        case "<<":
            if (operands.length != 2) {
                return null;
            }
            a = operands[0];
            b = operands[1];

            return operation(a, b);
    }
    return out;
}