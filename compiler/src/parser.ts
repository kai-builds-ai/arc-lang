// Arc Language Parser - Recursive Descent with Pratt Parsing

import { Token, TokenType } from "./lexer.js";
import * as AST from "./ast.js";

export class ParseError extends Error {
  constructor(msg: string, public loc: AST.Loc) {
    super(`Parse error at line ${loc.line}, col ${loc.col}: ${msg}`);
  }
}

export class Parser {
  private pos = 0;
  private tokens: Token[];

  constructor(tokens: Token[]) {
    // Filter out newlines for simpler parsing (treat as whitespace)
    this.tokens = tokens.filter(t => t.type !== TokenType.Newline);
  }

  private peek(): Token { return this.tokens[this.pos] ?? this.tokens[this.tokens.length - 1]; }
  private at(type: TokenType): boolean { return this.peek().type === type; }
  private loc(): AST.Loc { return { line: this.peek().line, col: this.peek().col }; }

  private advance(): Token {
    const t = this.peek();
    if (this.pos < this.tokens.length - 1) this.pos++;
    return t;
  }

  private expect(type: TokenType, msg?: string): Token {
    if (!this.at(type)) {
      const t = this.peek();
      throw new ParseError(msg ?? `Expected ${TokenType[type]}, got ${TokenType[t.type]} '${t.value}'`, this.loc());
    }
    return this.advance();
  }

  private skipSemicolons(): void {
    while (this.at(TokenType.Semicolon)) this.advance();
  }

  parse(): AST.Program {
    const stmts: AST.Stmt[] = [];
    this.skipSemicolons();
    while (!this.at(TokenType.EOF)) {
      stmts.push(this.parseStmt());
      this.skipSemicolons();
    }
    return { kind: "Program", stmts };
  }

  private parseStmt(): AST.Stmt {
    this.skipSemicolons();
    const t = this.peek();
    switch (t.type) {
      case TokenType.Let: return this.parseLet();
      case TokenType.Pub: return this.parsePub();
      case TokenType.Fn: return this.parseFn(false);
      case TokenType.Async: return this.parseAsync();
      case TokenType.For: return this.parseFor();
      case TokenType.Do: return this.parseDo();
      case TokenType.Use: return this.parseUse();
      case TokenType.Type: return this.parseType();
      default: {
        const exprLoc = this.loc();
        const expr = this.parseExpr();
        // Check for assignment: expr = value
        if (this.at(TokenType.Assign)) {
          this.advance();
          const value = this.parseExpr();
          if (expr.kind === "Identifier") {
            return { kind: "AssignStmt", target: expr.name, value, loc: exprLoc } as AST.AssignStmt;
          }
          if (expr.kind === "MemberExpr") {
            return { kind: "MemberAssignStmt", object: expr.object, property: expr.property, value, loc: exprLoc } as AST.MemberAssignStmt;
          }
          if (expr.kind === "IndexExpr") {
            return { kind: "IndexAssignStmt", object: expr.object, index: expr.index, value, loc: exprLoc } as AST.IndexAssignStmt;
          }
          throw new ParseError("Invalid assignment target", exprLoc);
        }
        return { kind: "ExprStmt", expr, loc: this.loc() };
      }
    }
  }

  private parsePub(): AST.Stmt {
    const loc = this.loc();
    this.advance(); // consume 'pub'
    if (this.at(TokenType.Fn)) return this.parseFn(false, undefined, true);
    if (this.at(TokenType.Let)) return this.parseLet(true);
    if (this.at(TokenType.Type)) return this.parseType(true);
    if (this.at(TokenType.Async)) {
      this.advance();
      return this.parseFn(true, loc, true);
    }
    throw new ParseError("Expected fn, let, or type after pub", loc);
  }

  private parseLet(pub = false): AST.LetStmt {
    const loc = this.loc();
    this.expect(TokenType.Let);
    let mutable = false;
    if (this.at(TokenType.Mut)) { this.advance(); mutable = true; }

    let name: string | AST.DestructureTarget;
    if (this.at(TokenType.LBrace)) {
      // Object destructuring
      this.advance();
      const names: string[] = [];
      while (!this.at(TokenType.RBrace)) {
        names.push(this.expect(TokenType.Ident).value);
        if (this.at(TokenType.Comma)) this.advance();
      }
      this.expect(TokenType.RBrace);
      name = { kind: "DestructureTarget", type: "object", names };
    } else if (this.at(TokenType.LBracket)) {
      this.advance();
      const names: string[] = [];
      while (!this.at(TokenType.RBracket)) {
        names.push(this.expect(TokenType.Ident).value);
        if (this.at(TokenType.Comma)) this.advance();
      }
      this.expect(TokenType.RBracket);
      name = { kind: "DestructureTarget", type: "array", names };
    } else {
      name = this.expect(TokenType.Ident).value;
    }

    this.expect(TokenType.Assign);
    const value = this.parseExpr();
    return { kind: "LetStmt", name, mutable, pub, value, loc };
  }

  private parseAsync(): AST.Stmt {
    const loc = this.loc();
    this.expect(TokenType.Async);
    if (this.at(TokenType.Fn)) {
      return this.parseFn(true, loc);
    }
    // async { body } as expression statement
    const body = this.parseBlock();
    const expr: AST.AsyncExpr = { kind: "AsyncExpr", body, loc };
    // Check for assignment context — but since we came from parseStmt default would handle it
    // Just wrap as ExprStmt
    return { kind: "ExprStmt", expr, loc };
  }

  private parseFn(isAsync = false, asyncLoc?: AST.Loc, pub = false): AST.FnStmt {
    const loc = asyncLoc ?? this.loc();
    this.expect(TokenType.Fn);
    const name = this.expect(TokenType.Ident).value;
    this.expect(TokenType.LParen);
    const params: string[] = [];
    while (!this.at(TokenType.RParen)) {
      params.push(this.expect(TokenType.Ident).value);
      if (this.at(TokenType.Comma)) this.advance();
    }
    this.expect(TokenType.RParen);

    let body: AST.Expr;
    if (this.at(TokenType.FatArrow)) {
      this.advance();
      body = this.parseExpr();
    } else {
      body = this.parseBlock();
    }
    return { kind: "FnStmt", name, params, body, isAsync, pub, loc };
  }

  private parseFor(): AST.ForStmt {
    const loc = this.loc();
    this.expect(TokenType.For);
    const variable = this.expect(TokenType.Ident).value;
    this.expect(TokenType.In);
    const iterable = this.parseExpr();
    const body = this.parseBlock();
    return { kind: "ForStmt", variable, iterable, body, loc };
  }

  private parseDo(): AST.DoStmt {
    const loc = this.loc();
    this.expect(TokenType.Do);
    const body = this.parseBlock();
    const isWhile = this.at(TokenType.While);
    if (!isWhile) this.expect(TokenType.Until);
    else this.advance();
    const condition = this.parseExpr();
    return { kind: "DoStmt", body, condition, isWhile, loc };
  }

  private parseUse(): AST.UseStmt {
    const loc = this.loc();
    this.expect(TokenType.Use);
    const path = [this.expect(TokenType.Ident).value];
    while (this.at(TokenType.Slash)) { this.advance(); path.push(this.expect(TokenType.Ident).value); }
    // Also support legacy dot separator
    while (this.at(TokenType.Dot)) { this.advance(); path.push(this.expect(TokenType.Ident).value); }

    let imports: string[] | undefined;
    let wildcard: boolean | undefined;

    if (this.at(TokenType.Colon)) {
      this.advance();
      if (this.at(TokenType.Star)) {
        this.advance();
        wildcard = true;
      } else {
        imports = [this.expect(TokenType.Ident).value];
        while (this.at(TokenType.Comma)) {
          this.advance();
          imports.push(this.expect(TokenType.Ident).value);
        }
      }
    }

    return { kind: "UseStmt", path, imports, wildcard, loc };
  }

  private parseType(pub = false): AST.TypeStmt {
    const loc = this.loc();
    this.expect(TokenType.Type);
    const name = this.expect(TokenType.Ident).value;
    this.expect(TokenType.Assign);
    const def = this.parseTypeExpr();
    return { kind: "TypeStmt", name, pub, def, loc };
  }

  private parseTypeExpr(): AST.TypeExpr {
    let typeExpr = this.parseTypeAtom();

    // Check for enum/union: Type | Type
    if (this.at(TokenType.Bar)) {
      const variants: AST.TypeExpr[] = [typeExpr];
      while (this.at(TokenType.Bar)) {
        this.advance();
        variants.push(this.parseTypeAtom());
      }
      // Check if all are NamedType — treat as enum if they look like variants
      const allNamed = variants.every(v => v.kind === "NamedType");
      if (allNamed) {
        return { kind: "UnionType", variants };
      }
      return { kind: "UnionType", variants };
    }

    // Check for constraints: where / matching
    if (this.at(TokenType.Where)) {
      this.advance();
      const predicate = this.parseExpr();
      return { kind: "ConstrainedType", base: typeExpr, constraint: "where", predicate };
    }
    if (this.at(TokenType.Matching)) {
      this.advance();
      // Expect regex token or string
      let predicate: AST.Expr;
      if (this.at(TokenType.Regex)) {
        const regexVal = this.advance().value;
        predicate = { kind: "StringLiteral", value: regexVal, loc: this.loc() } as AST.StringLiteral;
      } else if (this.at(TokenType.String)) {
        predicate = { kind: "StringLiteral", value: this.advance().value, loc: this.loc() } as AST.StringLiteral;
      } else {
        throw new ParseError("Expected regex or string after 'matching'", this.loc());
      }
      return { kind: "ConstrainedType", base: typeExpr, constraint: "matching", predicate };
    }

    return typeExpr;
  }

  private parseTypeAtom(): AST.TypeExpr {
    // Record type: { name: Type, ... }
    if (this.at(TokenType.LBrace)) {
      this.advance();
      const fields: { name: string; type: AST.TypeExpr }[] = [];
      while (!this.at(TokenType.RBrace) && !this.at(TokenType.EOF)) {
        const fieldName = this.expect(TokenType.Ident).value;
        this.expect(TokenType.Colon);
        const fieldType = this.parseTypeExpr();
        fields.push({ name: fieldName, type: fieldType });
        if (this.at(TokenType.Comma)) this.advance();
      }
      this.expect(TokenType.RBrace);
      return { kind: "RecordType", fields };
    }

    // Function type: (Type, ...) -> Type
    if (this.at(TokenType.LParen)) {
      const saved = this.pos;
      try {
        this.advance();
        const params: AST.TypeExpr[] = [];
        while (!this.at(TokenType.RParen) && !this.at(TokenType.EOF)) {
          params.push(this.parseTypeExpr());
          if (this.at(TokenType.Comma)) this.advance();
        }
        this.expect(TokenType.RParen);
        if (this.at(TokenType.Arrow)) {
          this.advance();
          const ret = this.parseTypeExpr();
          return { kind: "FunctionType", params, ret };
        }
        // Not a function type, restore
        this.pos = saved;
      } catch {
        this.pos = saved;
      }
    }

    // Named type (possibly with enum variant params or generics)
    if (this.at(TokenType.Ident)) {
      const name = this.advance().value;

      // Generic: Name<Type, ...>
      if (this.at(TokenType.Lt)) {
        this.advance();
        const params: AST.TypeExpr[] = [];
        while (!this.at(TokenType.Gt) && !this.at(TokenType.EOF)) {
          params.push(this.parseTypeExpr());
          if (this.at(TokenType.Comma)) this.advance();
        }
        this.expect(TokenType.Gt);
        return { kind: "GenericType", name, params };
      }

      // Enum variant with params: Name(Type, ...)
      if (this.at(TokenType.LParen)) {
        // This is part of enum parsing — but at atom level just return named
        // Enum variants are handled at the union level
        // Actually let's peek if this is in a union context
        // For now, parse variant params
        this.advance();
        const params: AST.TypeExpr[] = [];
        while (!this.at(TokenType.RParen) && !this.at(TokenType.EOF)) {
          params.push(this.parseTypeExpr());
          if (this.at(TokenType.Comma)) this.advance();
        }
        this.expect(TokenType.RParen);
        return { kind: "EnumType", variants: [{ name, params }] };
      }

      return { kind: "NamedType", name };
    }

    throw new ParseError(`Expected type expression, got ${TokenType[this.peek().type]}`, this.loc());
  }

  private parseBlock(): AST.BlockExpr {
    const loc = this.loc();
    this.expect(TokenType.LBrace);
    const stmts: AST.Stmt[] = [];
    this.skipSemicolons();
    while (!this.at(TokenType.RBrace) && !this.at(TokenType.EOF)) {
      stmts.push(this.parseStmt());
      this.skipSemicolons();
    }
    this.expect(TokenType.RBrace);
    return { kind: "BlockExpr", stmts, loc };
  }

  // ---- Pratt Expression Parsing ----

  private parseExpr(minPrec = 0): AST.Expr {
    let left = this.parsePrefix();

    while (true) {
      const prec = this.infixPrec();
      if (prec < minPrec) break;

      const t = this.peek();

      if (t.type === TokenType.Pipe) {
        this.advance();
        const right = this.parseExpr(prec + 1);
        left = { kind: "PipelineExpr", left, right, loc: left.loc } as AST.PipelineExpr;
        continue;
      }

      if (t.type === TokenType.Range) {
        this.advance();
        const right = this.parseExpr(prec + 1);
        left = { kind: "RangeExpr", start: left, end: right, loc: left.loc } as AST.RangeExpr;
        continue;
      }

      // Postfix: function call
      if (t.type === TokenType.LParen) {
        this.advance();
        const args: AST.Expr[] = [];
        while (!this.at(TokenType.RParen)) {
          args.push(this.parseExpr());
          if (this.at(TokenType.Comma)) this.advance();
        }
        this.expect(TokenType.RParen);
        left = { kind: "CallExpr", callee: left, args, loc: left.loc } as AST.CallExpr;
        continue;
      }

      // Postfix: index
      if (t.type === TokenType.LBracket) {
        this.advance();
        const index = this.parseExpr();
        this.expect(TokenType.RBracket);
        left = { kind: "IndexExpr", object: left, index, loc: left.loc } as AST.IndexExpr;
        continue;
      }

      // Postfix: member access
      if (t.type === TokenType.Dot) {
        this.advance();
        const prop = this.expect(TokenType.Ident).value;
        left = { kind: "MemberExpr", object: left, property: prop, loc: left.loc } as AST.MemberExpr;
        continue;
      }

      // Binary operators
      const op = this.binaryOp();
      if (op) {
        this.advance();
        const right = this.parseExpr(prec + 1);
        left = { kind: "BinaryExpr", op, left, right, loc: left.loc } as AST.BinaryExpr;
        continue;
      }

      break;
    }

    return left;
  }

  private infixPrec(): number {
    const t = this.peek().type;
    switch (t) {
      case TokenType.Or: return 1;
      case TokenType.And: return 2;
      case TokenType.Eq: case TokenType.Neq: case TokenType.Lt: case TokenType.Gt:
      case TokenType.Lte: case TokenType.Gte: return 3;
      case TokenType.Concat: return 4;
      case TokenType.Plus: case TokenType.Minus: return 5;
      case TokenType.Star: case TokenType.Slash: case TokenType.Percent: return 6;
      case TokenType.Power: return 7;
      case TokenType.Range: return 8;
      case TokenType.Dot: case TokenType.LBracket: case TokenType.LParen: return 10;
      case TokenType.Pipe: return 0; // lowest
      default: return -1;
    }
  }

  private binaryOp(): string | null {
    const t = this.peek().type;
    const map: Partial<Record<TokenType, string>> = {
      [TokenType.Plus]: "+", [TokenType.Minus]: "-", [TokenType.Star]: "*",
      [TokenType.Slash]: "/", [TokenType.Percent]: "%", [TokenType.Power]: "**",
      [TokenType.Eq]: "==", [TokenType.Neq]: "!=", [TokenType.Lt]: "<",
      [TokenType.Gt]: ">", [TokenType.Lte]: "<=", [TokenType.Gte]: ">=",
      [TokenType.And]: "and", [TokenType.Or]: "or", [TokenType.Concat]: "++",
    };
    return map[t] ?? null;
  }

  private parsePrefix(): AST.Expr {
    const t = this.peek();
    const loc = this.loc();

    // Unary operators
    if (t.type === TokenType.Minus) {
      this.advance();
      return { kind: "UnaryExpr", op: "-", operand: this.parseExpr(8), loc };
    }
    if (t.type === TokenType.Not) {
      this.advance();
      return { kind: "UnaryExpr", op: "not", operand: this.parseExpr(8), loc };
    }

    // Literals
    if (t.type === TokenType.Int) { this.advance(); return { kind: "IntLiteral", value: parseInt(t.value), loc }; }
    if (t.type === TokenType.Float) { this.advance(); return { kind: "FloatLiteral", value: parseFloat(t.value), loc }; }
    if (t.type === TokenType.True) { this.advance(); return { kind: "BoolLiteral", value: true, loc }; }
    if (t.type === TokenType.False) { this.advance(); return { kind: "BoolLiteral", value: false, loc }; }
    if (t.type === TokenType.NilKw) { this.advance(); return { kind: "NilLiteral", loc }; }
    if (t.type === TokenType.String) { this.advance(); return { kind: "StringLiteral", value: t.value, loc }; }

    // String interpolation
    if (t.type === TokenType.StringInterpStart) {
      return this.parseStringInterp();
    }

    // Identifier (possibly lambda)
    if (t.type === TokenType.Ident) {
      // Check for lambda: ident => expr
      if (this.tokens[this.pos + 1]?.type === TokenType.FatArrow) {
        const param = this.advance().value;
        this.advance(); // =>
        const body = this.parseExpr();
        return { kind: "LambdaExpr", params: [param], body, loc };
      }
      this.advance();
      return { kind: "Identifier", name: t.value, loc };
    }

    // Parenthesized expression or multi-param lambda
    if (t.type === TokenType.LParen) {
      this.advance();
      // Check for lambda: (a, b) => expr
      if (this.at(TokenType.RParen)) {
        this.advance();
        if (this.at(TokenType.FatArrow)) {
          this.advance();
          const body = this.parseExpr();
          return { kind: "LambdaExpr", params: [], body, loc };
        }
        // Empty parens as nil?
        return { kind: "NilLiteral", loc };
      }

      // Try to detect lambda
      const saved = this.pos;
      let isLambda = false;
      try {
        const names: string[] = [];
        if (this.at(TokenType.Ident)) {
          names.push(this.advance().value);
          while (this.at(TokenType.Comma)) {
            this.advance();
            names.push(this.expect(TokenType.Ident).value);
          }
          if (this.at(TokenType.RParen)) {
            this.advance();
            if (this.at(TokenType.FatArrow)) {
              this.advance();
              const body = this.parseExpr();
              return { kind: "LambdaExpr", params: names, body, loc };
            }
          }
        }
      } catch {}
      this.pos = saved;

      const expr = this.parseExpr();
      this.expect(TokenType.RParen);
      return expr;
    }

    // List literal or comprehension
    if (t.type === TokenType.LBracket) {
      return this.parseListOrComprehension();
    }

    // Map literal or block
    if (t.type === TokenType.LBrace) {
      return this.parseMapOrBlock();
    }

    // If expression
    if (t.type === TokenType.If) {
      return this.parseIf();
    }

    // Match expression
    if (t.type === TokenType.Match) {
      return this.parseMatch();
    }

    // Async expression: async { body }
    if (t.type === TokenType.Async) {
      this.advance();
      const body = this.parseBlock();
      return { kind: "AsyncExpr", body, loc } as AST.AsyncExpr;
    }

    // Await expression: await expr
    if (t.type === TokenType.Await) {
      this.advance();
      const expr = this.parseExpr(8); // high precedence
      return { kind: "AwaitExpr", expr, loc } as AST.AwaitExpr;
    }

    // Fetch expression: fetch [expr1, expr2, ...]
    if (t.type === TokenType.Fetch) {
      this.advance();
      this.expect(TokenType.LBracket);
      const targets: AST.Expr[] = [];
      while (!this.at(TokenType.RBracket)) {
        targets.push(this.parseExpr());
        if (this.at(TokenType.Comma)) this.advance();
      }
      this.expect(TokenType.RBracket);
      return { kind: "FetchExpr", targets, loc } as AST.FetchExpr;
    }

    // Tool call: @GET "url" or @ident(args)
    if (t.type === TokenType.At) {
      return this.parseToolCall();
    }

    throw new ParseError(`Unexpected token: ${TokenType[t.type]} '${t.value}'`, loc);
  }

  private parseStringInterp(): AST.StringInterp {
    const loc = this.loc();
    this.advance(); // StringInterpStart
    const parts: (string | AST.Expr)[] = [];

    while (!this.at(TokenType.StringInterpEnd) && !this.at(TokenType.EOF)) {
      if (this.at(TokenType.StringInterpPart)) {
        parts.push(this.advance().value);
      } else if (this.at(TokenType.Ident)) {
        // This is an interpolated expression identifier
        const identToken = this.advance();
        // Try to parse a more complex expression from the token value
        parts.push({ kind: "Identifier", name: identToken.value, loc: { line: identToken.line, col: identToken.col } } as AST.Identifier);
      } else {
        this.advance(); // skip unexpected
      }
    }
    if (this.at(TokenType.StringInterpEnd)) this.advance();
    return { kind: "StringInterp", parts, loc };
  }

  private parseListOrComprehension(): AST.Expr {
    const loc = this.loc();
    this.expect(TokenType.LBracket);

    if (this.at(TokenType.RBracket)) {
      this.advance();
      return { kind: "ListLiteral", elements: [], loc };
    }

    const first = this.parseExpr();

    // Check for list comprehension: [expr for x in iter if cond]
    if (this.at(TokenType.For)) {
      this.advance();
      const variable = this.expect(TokenType.Ident).value;
      this.expect(TokenType.In);
      const iterable = this.parseExpr();
      let filter: AST.Expr | undefined;
      if (this.at(TokenType.If)) {
        this.advance();
        filter = this.parseExpr();
      }
      this.expect(TokenType.RBracket);
      return { kind: "ListComprehension", expr: first, variable, iterable, filter, loc };
    }

    // Regular list
    const elements = [first];
    while (this.at(TokenType.Comma)) {
      this.advance();
      if (this.at(TokenType.RBracket)) break;
      elements.push(this.parseExpr());
    }
    this.expect(TokenType.RBracket);
    return { kind: "ListLiteral", elements, loc };
  }

  private parseMapOrBlock(): AST.Expr {
    const loc = this.loc();
    // Peek ahead to determine if map literal (key: value) or block
    const saved = this.pos;
    this.advance(); // skip {

    // Empty braces = empty map
    if (this.at(TokenType.RBrace)) {
      this.advance();
      return { kind: "MapLiteral", entries: [], loc };
    }

    // Check if it's a map: identifier followed by colon
    if (this.at(TokenType.Ident) && this.tokens[this.pos + 1]?.type === TokenType.Colon) {
      // It's a map literal
      const entries: { key: string | AST.Expr; value: AST.Expr }[] = [];
      while (!this.at(TokenType.RBrace) && !this.at(TokenType.EOF)) {
        const key = this.expect(TokenType.Ident).value;
        this.expect(TokenType.Colon);
        const value = this.parseExpr();
        entries.push({ key, value });
        if (this.at(TokenType.Comma)) this.advance();
      }
      this.expect(TokenType.RBrace);
      return { kind: "MapLiteral", entries, loc };
    }

    // It's a block
    this.pos = saved;
    return this.parseBlock();
  }

  private parseIf(): AST.IfExpr {
    const loc = this.loc();
    this.expect(TokenType.If);
    const condition = this.parseExpr(0);
    const then = this.parseBlock();
    let else_: AST.Expr | undefined;
    if (this.at(TokenType.El)) {
      this.advance();
      if (this.at(TokenType.If)) {
        else_ = this.parseIf();
      } else {
        else_ = this.parseBlock();
      }
    }
    return { kind: "IfExpr", condition, then, else_, loc };
  }

  private parseMatch(): AST.MatchExpr {
    const loc = this.loc();
    this.expect(TokenType.Match);
    const subject = this.parseExpr();
    this.expect(TokenType.LBrace);
    const arms: AST.MatchArm[] = [];

    while (!this.at(TokenType.RBrace) && !this.at(TokenType.EOF)) {
      const pattern = this.parsePattern();
      let guard: AST.Expr | undefined;
      if (this.at(TokenType.If)) {
        this.advance();
        guard = this.parseExpr();
      }
      this.expect(TokenType.FatArrow);
      const body = this.parseExpr();
      arms.push({ pattern, guard, body });
      if (this.at(TokenType.Comma)) this.advance();
    }
    this.expect(TokenType.RBrace);
    return { kind: "MatchExpr", subject, arms, loc };
  }

  private parsePattern(): AST.Pattern {
    const loc = this.loc();
    const t = this.peek();

    if (t.type === TokenType.Ident && t.value === "_") {
      this.advance();
      return { kind: "WildcardPattern", loc };
    }
    if (t.type === TokenType.Int || t.type === TokenType.Float) {
      this.advance();
      return { kind: "LiteralPattern", value: parseFloat(t.value), loc };
    }
    if (t.type === TokenType.String) {
      this.advance();
      return { kind: "LiteralPattern", value: t.value, loc };
    }
    if (t.type === TokenType.True) { this.advance(); return { kind: "LiteralPattern", value: true, loc }; }
    if (t.type === TokenType.False) { this.advance(); return { kind: "LiteralPattern", value: false, loc }; }
    if (t.type === TokenType.NilKw) { this.advance(); return { kind: "LiteralPattern", value: null, loc }; }
    if (t.type === TokenType.Ident) {
      this.advance();
      return { kind: "BindingPattern", name: t.value, loc };
    }

    throw new ParseError(`Expected pattern, got ${TokenType[t.type]}`, loc);
  }

  private parseToolCall(): AST.ToolCallExpr {
    const loc = this.loc();
    this.expect(TokenType.At);

    const method = this.expect(TokenType.Ident).value;

    // @ident(args) - custom tool call
    if (this.at(TokenType.LParen)) {
      this.advance();
      const args: AST.Expr[] = [];
      while (!this.at(TokenType.RParen)) {
        args.push(this.parseExpr());
        if (this.at(TokenType.Comma)) this.advance();
      }
      this.expect(TokenType.RParen);
      const arg: AST.Expr = args.length === 1 ? args[0] :
        { kind: "ListLiteral", elements: args, loc } as AST.ListLiteral;
      return { kind: "ToolCallExpr", method, arg, loc };
    }

    // @METHOD "url" {body?}
    const arg = this.parseExpr(9); // high precedence to grab just the string
    let body: AST.Expr | undefined;
    if (this.at(TokenType.LBrace)) {
      body = this.parseMapOrBlock();
    }
    return { kind: "ToolCallExpr", method, arg, body, loc };
  }
}

export function parse(tokens: Token[]): AST.Program {
  return new Parser(tokens).parse();
}
