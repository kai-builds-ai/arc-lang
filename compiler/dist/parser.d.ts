import { Token } from "./lexer.js";
import * as AST from "./ast.js";
export declare class ParseError extends Error {
    loc: AST.Loc;
    constructor(msg: string, loc: AST.Loc);
}
export declare class Parser {
    private pos;
    private tokens;
    constructor(tokens: Token[]);
    private peek;
    private at;
    private loc;
    private advance;
    private expect;
    private skipSemicolons;
    parse(): AST.Program;
    private parseStmt;
    private parsePub;
    private parseLet;
    private parseAsync;
    private parseFn;
    private parseFor;
    private parseWhile;
    private parseTryCatch;
    private parseTryStmtOrExpr;
    private parseDo;
    private parseUse;
    private parseType;
    private parseRet;
    private parseTypeExpr;
    private parseTypeAtom;
    private parseBlock;
    private parseExpr;
    private infixPrec;
    private binaryOp;
    private parsePrefix;
    private parseStringInterp;
    private parseListOrComprehension;
    private isMapStart;
    private parseMapEntry;
    private parseMapOrBlock;
    private parseIf;
    private parseMatch;
    private parsePattern;
    private parsePatternAtom;
    private parseToolCall;
}
export declare function parse(tokens: Token[]): AST.Program;
