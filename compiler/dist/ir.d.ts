import * as AST from "./ast.js";
export type IRInstr = {
    op: "const";
    dest: string;
    value: number | string | boolean | null;
} | {
    op: "load";
    dest: string;
    name: string;
} | {
    op: "store";
    name: string;
    src: string;
} | {
    op: "binop";
    dest: string;
    operator: string;
    left: string;
    right: string;
} | {
    op: "unop";
    dest: string;
    operator: string;
    operand: string;
} | {
    op: "call";
    dest: string;
    fn: string;
    args: string[];
} | {
    op: "toolcall";
    dest: string;
    method: string;
    url: string;
    body?: string;
} | {
    op: "field";
    dest: string;
    obj: string;
    prop: string;
} | {
    op: "index";
    dest: string;
    obj: string;
    idx: string;
} | {
    op: "setfield";
    obj: string;
    prop: string;
    src: string;
} | {
    op: "setindex";
    obj: string;
    idx: string;
    src: string;
} | {
    op: "jump";
    target: string;
} | {
    op: "branch";
    cond: string;
    ifTrue: string;
    ifFalse: string;
} | {
    op: "phi";
    dest: string;
    sources: {
        block: string;
        value: string;
    }[];
} | {
    op: "ret";
    value?: string;
} | {
    op: "list";
    dest: string;
    elements: string[];
} | {
    op: "map";
    dest: string;
    keys: string[];
    values: string[];
} | {
    op: "label";
    name: string;
} | {
    op: "print";
    value: string;
} | {
    op: "range";
    dest: string;
    start: string;
    end: string;
} | {
    op: "nop";
};
export interface IRBlock {
    label: string;
    instrs: IRInstr[];
}
export interface IRFunction {
    name: string;
    params: string[];
    blocks: IRBlock[];
}
export interface IRModule {
    functions: IRFunction[];
    main: IRBlock[];
}
export declare class IRGenerator {
    private tempCount;
    private labelCount;
    private functions;
    private currentInstrs;
    private temp;
    private label;
    private emit;
    generateIR(program: AST.Program): IRModule;
    private lowerStmt;
    private lowerExpr;
    private lowerPattern;
    private bindPattern;
}
export declare function printIR(module: IRModule): string;
export declare function generateIR(program: AST.Program): IRModule;
export declare function generateIRFromSource(source: string): IRModule;
