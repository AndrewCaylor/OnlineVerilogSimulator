export interface Module {
    name: string,
    callSyntax: ParameterSyntax[],
    inputs: ParameterSyntax[],
    outputs: ParameterSyntax[],
    wires: ParameterSyntax[],
    annotatedExpressions: AnnotatedExpression[],
    nodes: Node[]
}

export type IO = "I" | "O" | null;
export interface ParameterSyntax {
    name: string,
    beginBit: number,
    endBit: number
    type?: IO
}

export interface AnnotatedExpression {
    expression: string,
    type: ExpressionType
}

export interface Node {
    type: ExpressionType;
    instanceName: string,
    callSyntax: ParameterSyntax[],
    beginBit?: number, //used for assign statements (what bits is the node assigning to)?
    endBit?: number, //used for assign statements
    stack?: string[], //used for assign statements
    moduleName?: string //used for module usage statements
}

export enum ENUM {
    ModuleDeclaration,
    ModuleUsage,
    Input,
    Output,
    Wire,
    Assign,
    Endmodule
}

//probably a better way to do this
export type ExpressionType = ENUM.ModuleDeclaration | ENUM.ModuleUsage | ENUM.Input | ENUM.Output | ENUM.Wire | ENUM.Assign | ENUM.Endmodule | null;

export interface Error {
    data: any,
    error: string
}

export interface Dict {
    [name: string]: number
}