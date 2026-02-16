// AST Node Types for Arc Language

export interface Loc {
  line: number;
  col: number;
}

// ---- Expressions ----

export type Expr =
  | IntLiteral | FloatLiteral | BoolLiteral | NilLiteral | StringLiteral
  | StringInterp | Identifier | BinaryExpr | UnaryExpr | CallExpr
  | MemberExpr | IndexExpr | PipelineExpr | IfExpr | MatchExpr
  | LambdaExpr | ListLiteral | MapLiteral | ListComprehension
  | ToolCallExpr | RangeExpr | BlockExpr
  | AsyncExpr | AwaitExpr | FetchExpr;

export interface IntLiteral { kind: "IntLiteral"; value: number; loc: Loc; }
export interface FloatLiteral { kind: "FloatLiteral"; value: number; loc: Loc; }
export interface BoolLiteral { kind: "BoolLiteral"; value: boolean; loc: Loc; }
export interface NilLiteral { kind: "NilLiteral"; loc: Loc; }
export interface StringLiteral { kind: "StringLiteral"; value: string; loc: Loc; }
export interface StringInterp { kind: "StringInterp"; parts: (string | Expr)[]; loc: Loc; }
export interface Identifier { kind: "Identifier"; name: string; loc: Loc; }

export interface BinaryExpr {
  kind: "BinaryExpr";
  op: string;
  left: Expr;
  right: Expr;
  loc: Loc;
}

export interface UnaryExpr {
  kind: "UnaryExpr";
  op: string;
  operand: Expr;
  loc: Loc;
}

export interface CallExpr {
  kind: "CallExpr";
  callee: Expr;
  args: Expr[];
  loc: Loc;
}

export interface MemberExpr {
  kind: "MemberExpr";
  object: Expr;
  property: string;
  loc: Loc;
}

export interface IndexExpr {
  kind: "IndexExpr";
  object: Expr;
  index: Expr;
  loc: Loc;
}

export interface PipelineExpr {
  kind: "PipelineExpr";
  left: Expr;
  right: Expr;
  loc: Loc;
}

export interface IfExpr {
  kind: "IfExpr";
  condition: Expr;
  then: Expr;
  else_?: Expr;
  loc: Loc;
}

export interface MatchExpr {
  kind: "MatchExpr";
  subject: Expr;
  arms: MatchArm[];
  loc: Loc;
}

export interface MatchArm {
  pattern: Pattern;
  guard?: Expr;
  body: Expr;
}

export interface LambdaExpr {
  kind: "LambdaExpr";
  params: string[];
  body: Expr;
  loc: Loc;
}

export interface ListLiteral {
  kind: "ListLiteral";
  elements: Expr[];
  loc: Loc;
}

export interface MapLiteral {
  kind: "MapLiteral";
  entries: { key: string | Expr; value: Expr }[];
  loc: Loc;
}

export interface ListComprehension {
  kind: "ListComprehension";
  expr: Expr;
  variable: string;
  iterable: Expr;
  filter?: Expr;
  loc: Loc;
}

export interface ToolCallExpr {
  kind: "ToolCallExpr";
  method: string; // GET, POST, etc. or custom tool name
  arg: Expr;
  body?: Expr; // optional body for POST etc
  loc: Loc;
}

export interface RangeExpr {
  kind: "RangeExpr";
  start: Expr;
  end: Expr;
  loc: Loc;
}

export interface BlockExpr {
  kind: "BlockExpr";
  stmts: Stmt[];
  loc: Loc;
}

export interface AsyncExpr {
  kind: "AsyncExpr";
  body: Expr;
  loc: Loc;
}

export interface AwaitExpr {
  kind: "AwaitExpr";
  expr: Expr;
  loc: Loc;
}

export interface FetchExpr {
  kind: "FetchExpr";
  targets: Expr[];
  loc: Loc;
}

// ---- Patterns ----

export type Pattern =
  | WildcardPattern | LiteralPattern | BindingPattern | ArrayPattern | OrPattern;

export interface WildcardPattern { kind: "WildcardPattern"; loc: Loc; }
export interface LiteralPattern { kind: "LiteralPattern"; value: number | string | boolean | null; loc: Loc; }
export interface BindingPattern { kind: "BindingPattern"; name: string; loc: Loc; }
export interface ArrayPattern { kind: "ArrayPattern"; elements: Pattern[]; loc: Loc; }
export interface OrPattern { kind: "OrPattern"; patterns: Pattern[]; loc: Loc; }

// ---- Statements ----

export type Stmt =
  | LetStmt | FnStmt | ForStmt | DoStmt | ExprStmt | UseStmt | TypeStmt
  | AssignStmt | MemberAssignStmt | IndexAssignStmt;

export interface AssignStmt {
  kind: "AssignStmt";
  target: string;
  value: Expr;
  loc: Loc;
}

export interface MemberAssignStmt {
  kind: "MemberAssignStmt";
  object: Expr;
  property: string;
  value: Expr;
  loc: Loc;
}

export interface IndexAssignStmt {
  kind: "IndexAssignStmt";
  object: Expr;
  index: Expr;
  value: Expr;
  loc: Loc;
}

export interface LetStmt {
  kind: "LetStmt";
  name: string | DestructureTarget;
  mutable: boolean;
  pub: boolean;
  value: Expr;
  loc: Loc;
}

export interface DestructureTarget {
  kind: "DestructureTarget";
  type: "object" | "array";
  names: string[];
}

export interface FnStmt {
  kind: "FnStmt";
  name: string;
  params: string[];
  body: Expr;
  isAsync: boolean;
  pub: boolean;
  loc: Loc;
}

export interface ForStmt {
  kind: "ForStmt";
  variable: string;
  iterable: Expr;
  body: Expr;
  loc: Loc;
}

export interface DoStmt {
  kind: "DoStmt";
  body: Expr;
  condition: Expr;
  isWhile: boolean; // true = while, false = until
  loc: Loc;
}

export interface ExprStmt {
  kind: "ExprStmt";
  expr: Expr;
  loc: Loc;
}

export interface UseStmt {
  kind: "UseStmt";
  path: string[];
  imports?: string[];
  wildcard?: boolean;
  loc: Loc;
}

export interface TypeStmt {
  kind: "TypeStmt";
  name: string;
  pub: boolean;
  def: TypeExpr;
  loc: Loc;
}

// ---- Type Expressions ----

export type TypeExpr =
  | NamedType | RecordType | UnionType | FunctionType | ConstrainedType | EnumType | GenericType;

export interface NamedType { kind: "NamedType"; name: string; }
export interface RecordType { kind: "RecordType"; fields: { name: string; type: TypeExpr }[]; }
export interface UnionType { kind: "UnionType"; variants: TypeExpr[]; }
export interface FunctionType { kind: "FunctionType"; params: TypeExpr[]; ret: TypeExpr; }
export interface ConstrainedType {
  kind: "ConstrainedType";
  base: TypeExpr;
  constraint: "where" | "matching";
  predicate: Expr;
}
export interface EnumType {
  kind: "EnumType";
  variants: { name: string; params?: TypeExpr[] }[];
}
export interface GenericType {
  kind: "GenericType";
  name: string;
  params: TypeExpr[];
}

// ---- Program ----

export interface Program {
  kind: "Program";
  stmts: Stmt[];
}
