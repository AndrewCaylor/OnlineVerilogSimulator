/*eslint-disable*/
import { clone, parse } from ".//generateNodeNetwork"


/**
 * 
 * @param {number} length length to initialize the array
 */
export function initializeBitArray(length) {
    return new Array(length).fill(null);
}

/**
 * 
 * @param text 0s and 1s
 */
export function binaryToBitArray(text: string) {
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
    return out.reverse();
}

export function isVerilogNumber(text): boolean {
    return !!text.match(/\d*'((b[01]+)|(d[0-9]+)|(h[0-9A-F]+))/)
}

/**
 * ex: 5'hFFF => converts hex to binary and makes array 5 bits wide
 * b: binary d: decimal h: hex NO OCTAL: FUCK OCTAL ALL MY HOMIES USE HEX
 * @param text 
 */
export function stringToBitArray(text: string): boolean[] {
    let type: string[] = text.match(/(?<=\d*')[bdh]/);
    let splitted: string[] = text.split(/'[bdh]/);

    if (splitted.length == 1) {
        let temp = parseInt(splitted[0], 10).toString(2);
        return binaryToBitArray(temp);
    }

    let right = splitted[1];
    let bitArrayLength = parseInt(splitted[0]);

    let binaryString: string = right;
    switch (type[0]) {
        case "h":
            binaryString = parseInt(right, 16).toString(2);
            break;
        case "d":
            binaryString = parseInt(right, 10).toString(2);
            break;
    }
    let bitArray = binaryToBitArray(binaryString);

    if (bitArrayLength) {
        if (bitArray.length > bitArrayLength) {
            bitArray = bitArray.slice(0, bitArrayLength);
        }
        else if (bitArray.length < bitArrayLength) {
            while (bitArray.length != bitArrayLength) bitArray.push(false);
        }

    }
    return bitArray;
}

/**
 * 
 * @param text 
 */
export function isValidBitString(text: string) {
    return !!text.match(/\d*'((b[01]+)|(d[0-9]+)|(h[0-9A-F]+))/);
}

/**
 * Have to reverse because verilog does indexing differently
 * @param array boolean array
 * @param radix 
 */
export function bitArrayToString(array: boolean[], radix: number) {
    let out = "";
    clone(array).reverse().forEach(bit => {
        out += bit ? "1" : "0";
    });
    let multiplier = Math.log2(radix);
    let string = parseInt(out, 2).toString(radix);
    if (radix != 10) {
        while (string.length < (array.length / multiplier)) string = "0" + string;
    }
    return string.toUpperCase();
}


const operators = {
    "~": function (a) { return !a; },
    "~&": function (a, b) { return !(a && b); },
    "&": function (a, b) { return a && b; },
    "|": function (a, b) { return a || b; },
    "~|": function (a, b) { return !(a || b); },
    "^": function (a, b) { return (a || b) && !(a && b); },
    "~^": function (a, b) { return !((a || b) && !(a && b)); },
    ",": function (a, b) { return a.concat(b); },
    /**
     * Left shift b a times
     * @param {Number} a 
     * @param {Array} b 
     */
    "<<": function (a, b) {
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
    ">>": function (a, b) {
        while (a > 0) {
            b.pop();
            b.unshift(false)
            a--;
        }
        return b;
    },
    "DUPLICATE": function (a, b) {
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
                out.push(operation(a[i], null));
            }
            break;
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
            break;
        case ",":
        case ">>":
        case "<<":
            return operation(a, b);

        default:
            return null;
    }
    return out;
}

/**
 * Gets what bitwise operator the module name represents
 * @param {string} textNotation 
 */
export function getBitwiseNotation(textNotation) {
    switch (textNotation) {
        case "not":
            return "~";
        case "and":
            return "&";
        case "nand":
            return "~&";
        case "or":
            return "|";
        case "nor":
            return "~|";
        case "xor":
            return "^";
        case "xnor":
            return "~^";
        default:
            //will return null if the name is not a primitive module
            return null;
    }
}