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
    text.split("").forEach(char => {
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

/**
 * 
 * @param {Array} array boolean array
 */
export function bitArrayToString(array) {
    let out = "";
    array.forEach(bit => {
        out += bit ? "1" : "0";
    });
    return out;
}

//TODO: test these functs
const operators = {
    "~": function(a) { return !a; },
    "~&": function(a, b) { return !(a && b); },
    "&": function(a, b) { return a && b; },
    "|": function(a, b) { return a || b; },
    "~|": function(a, b) { return !(a || b); },
    "^": function(a, b) { return (a || b) && !(a && b); },
    "~^": function(a, b) { return !((a || b) && !(a && b)); },
    ",": function(arr) { //concatenate operation
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

/**
 * 
 * @param {string} operator string describing the operator to preform
 * @param {Array} a array of booleans
 * @param {Array} b array of booleans (optional)
 */
export function doOperation(operator, a, b) {

    let operation = operators[operator];
    let out;

    switch (operator) {
        case "~":
            out = [];
            for (let i = 0; i < a.length; i++) {
                out.push(operation(a[i]));
            }
            return out;

        case "&":
        case "~&":
        case "|":
        case "~|":
        case "^":
        case "~^":
            if (a.length != b.length) {
                return null;
            }

            out = [];
            for (let i = 0; i < a.length; i++) {
                out.push(operation(a[i], b[i]));
            }
            return out;

        case ",":
        case ">>": //TODO: check that I do not need to implement arithmetic and circular shifting
        case "<<":
            return operation(a, b);

        default:
            return null;
    }
}