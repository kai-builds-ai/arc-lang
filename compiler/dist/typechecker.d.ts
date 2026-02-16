import * as AST from "./ast.js";
export interface Diagnostic {
    level: "error" | "warning";
    message: string;
    loc?: AST.Loc;
}
export declare function typecheck(program: AST.Program): Diagnostic[];
