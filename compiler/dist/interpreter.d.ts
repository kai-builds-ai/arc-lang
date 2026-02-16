import * as AST from "./ast.js";
type Value = number | string | boolean | null | Value[] | MapValue | FnValue | AsyncValue;
interface AsyncValue {
    __async: true;
    thunk: () => Value;
}
interface MapValue {
    __map: true;
    entries: Map<string, Value>;
}
interface FnValue {
    __fn: true;
    name: string;
    params: string[];
    richParams?: AST.Param[];
    body: AST.Expr;
    closure: Env;
}
declare class Env {
    parent?: Env | undefined;
    private vars;
    private _depth;
    constructor(parent?: Env | undefined);
    get(name: string): Value;
    getEntry(name: string): {
        value: Value;
        mutable: boolean;
    } | undefined;
    set(name: string, value: Value, mutable?: boolean): void;
    assign(name: string, value: Value): void;
    has(name: string): boolean;
}
declare function toStr(v: Value): string;
export declare function createEnv(): Env;
export declare function runStmt(stmt: AST.Stmt, env: Env): Value;
export declare function runExpr(expr: AST.Expr, env: Env): Value;
export type UseHandler = (stmt: AST.UseStmt, env: Env) => void;
export declare function interpret(program: AST.Program, onUse?: UseHandler): void;
export declare function interpretWithEnv(program: AST.Program, env: Env, onUse?: UseHandler): Value;
export { Env, Value, toStr };
