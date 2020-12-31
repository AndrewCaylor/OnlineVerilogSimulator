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
export function binaryToBitArray(text) {
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
 * ex: 5'hFFF => converts hex to binary and makes array 5 bits wide
 * b: binary d: decimal o: ocatal h: hex
 * @param {string} text 
 */
export function stringToBitArray(text) {
    //TODO: check if numbers are valid
    //TODO: implement things

    let type = text.match(/(?<=\d+')[bdoh]/);
    if (type) {
        switch (type[0]) {
            case "b":

                break;


            default:
                break;
        }
    } else {
        return null;
    }
}

//TODO: implement bitArrayTo: decimal, hex, and octal
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

const operators = {
    "~": function(a) { return !a; },
    "~&": function(a, b) { return !(a && b); },
    "&": function(a, b) { return a && b; },
    "|": function(a, b) { return a || b; },
    "~|": function(a, b) { return !(a || b); },
    "^": function(a, b) { return (a || b) && !(a && b); },
    "~^": function(a, b) { return !((a || b) && !(a && b)); },
    ",": function(a, b) { return b.concat(a); },
    /**
     * Left shift b a times
     * @param {Number} a 
     * @param {Array} b 
     */
    "<<": function(a, b) {
        while (a > 0) {
            b.shift();
            b.push(false);
            a--;
        }
        return b;
    },
    /**
     * Right shift b a times
     * @param {Number} a 
     * @param {Array} b 
     */
    ">>": function(a, b) {
        while (a > 0) {
            b.pop();
            b.unshift(false)
            a--;
        }
        return b;
    },
    "DUPLICATE": function(a, b) {
        let out = [];
        while (b > 0) {
            out = out.concat(a);
            b--;
        }
        return out;
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
        case ">>":
        case "<<":
            return operation(a, b);

        default:
            return null;
    }
}