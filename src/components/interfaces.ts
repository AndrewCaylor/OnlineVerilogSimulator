export interface Module {
    name: string,
    callSyntax: ParameterSyntax[] //will have I/O
    inputs: ParameterSyntax[]
    outputs: ParameterSyntax[]
    wires: ParameterSyntax[]
    annotatedExpressions: AnnotatedExpression[]
    nodes: Node[]
    IOandWireValues?: BooleanDict
    subModules?: Module[]
    //used for UI displaying
    instanceName?: string
    parentInputs?: ParameterSyntax[]
    parentOutputs?: ParameterSyntax[]
}

//null can be implied to be a wire
//CONST is for numbers
export type IO = "I" | "O" | "CONST" | null;
export interface ParameterSyntax {
    name: string
    beginBit: number
    endBit: number
    type?: IO //Has to do with the PARENT module's IO
    value?: boolean[]
}

export interface AnnotatedExpression {
    expression: string
    type: ExpressionType
}

export interface Node {
    type: ExpressionType
    callSyntax: ParameterSyntax[]
    inputs: ParameterSyntax[]
    outputs: ParameterSyntax[]
    stack?: string[] //.
    moduleName?: string //used for module usage statements
    instanceName?: string //...
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
    data: any
    error: string
}

export interface BooleanDict {
    [name: string]: boolean[]
}

export interface ParameterDict {
    [name: string]: ParameterSyntax
}

export interface ModuleDict {
    [name: string]: Module
}