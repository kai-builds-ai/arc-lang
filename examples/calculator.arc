// ============================================================================
// Expression Calculator in Arc
// ============================================================================
// A full expression parser and evaluator with tokenizer, recursive descent
// parser, AST construction, and pattern-matching evaluation. Supports
// arithmetic, exponentiation, parentheses, variables, and functions.
// Demonstrates: regex, pattern matching, closures, pipelines, recursion, mut.
// ============================================================================

import regex
import collections
import math

// --- Token Types ---

let TOKEN_NUMBER   = "NUMBER"
let TOKEN_IDENT    = "IDENT"
let TOKEN_PLUS     = "PLUS"
let TOKEN_MINUS    = "MINUS"
let TOKEN_STAR     = "STAR"
let TOKEN_SLASH    = "SLASH"
let TOKEN_CARET    = "CARET"
let TOKEN_LPAREN   = "LPAREN"
let TOKEN_RPAREN   = "RPAREN"
let TOKEN_COMMA    = "COMMA"
let TOKEN_EQUALS   = "EQUALS"
let TOKEN_EOF      = "EOF"

fn token(type, value) => { type: type, value: value }

// --- Tokenizer ---

let TOKEN_PATTERNS = [
    { pattern: regex.compile(r"^\s+"), type: nil },                    // whitespace (skip)
    { pattern: regex.compile(r"^[0-9]+\.?[0-9]*"), type: TOKEN_NUMBER },
    { pattern: regex.compile(r"^[a-zA-Z_][a-zA-Z0-9_]*"), type: TOKEN_IDENT },
    { pattern: regex.compile(r"^\+"), type: TOKEN_PLUS },
    { pattern: regex.compile(r"^-"), type: TOKEN_MINUS },
    { pattern: regex.compile(r"^\*"), type: TOKEN_STAR },
    { pattern: regex.compile(r"^/"), type: TOKEN_SLASH },
    { pattern: regex.compile(r"^\^"), type: TOKEN_CARET },
    { pattern: regex.compile(r"^\("), type: TOKEN_LPAREN },
    { pattern: regex.compile(r"^\)"), type: TOKEN_RPAREN },
    { pattern: regex.compile(r"^,"), type: TOKEN_COMMA },
    { pattern: regex.compile(r"^="), type: TOKEN_EQUALS }
]

pub fn tokenize(input) => {
    let mut tokens = []
    let mut pos = 0
    let mut remaining = input
    
    loop {
        match remaining == "" {
            true => break,
            false => {
                let mut matched = false
                TOKEN_PATTERNS |> collections.each(fn(tp) => {
                    match matched {
                        true => {},
                        false => {
                            let m = regex.match(tp.pattern, remaining)
                            match m {
                                nil => {},
                                _ => {
                                    matched = true
                                    let len = collections.length(m[0])
                                    match tp.type {
                                        nil => {},  // skip whitespace
                                        _ => tokens = tokens |> collections.append(token(tp.type, m[0]))
                                    }
                                    remaining = remaining |> collections.slice(len)
                                    pos = pos + len
                                }
                            }
                        }
                    }
                })
                match matched {
                    false => {
                        print("Unexpected character at position ${pos}: '${remaining[0]}'")
                        break
                    },
                    true => {}
                }
            }
        }
    }
    
    tokens |> collections.append(token(TOKEN_EOF, ""))
}

// --- AST Node Types ---

fn num_node(value) => { type: "number", value: value }
fn var_node(name) => { type: "variable", name: name }
fn binop_node(op, left, right) => { type: "binop", op: op, left: left, right: right }
fn unary_node(op, operand) => { type: "unary", op: op, operand: operand }
fn call_node(name, args) => { type: "call", name: name, args: args }
fn assign_node(name, expr) => { type: "assign", name: name, expr: expr }

// --- Parser (Recursive Descent) ---

pub fn parser(tokens) => {
    let mut pos = 0
    
    fn peek() => tokens[pos]
    fn advance() => {
        let t = tokens[pos]
        pos = pos + 1
        t
    }
    fn expect(type) => {
        let t = advance()
        match t.type == type {
            true => t,
            false => { print("Expected ${type}, got ${t.type}"); nil }
        }
    }
    
    // statement = IDENT '=' expression | expression
    fn parse_statement() => {
        match peek().type == TOKEN_IDENT {
            true => {
                match tokens[pos + 1].type == TOKEN_EQUALS {
                    true => {
                        let name = advance().value
                        advance()  // consume '='
                        let expr = parse_expression()
                        assign_node(name, expr)
                    },
                    false => parse_expression()
                }
            },
            false => parse_expression()
        }
    }
    
    // expression = term (('+' | '-') term)*
    fn parse_expression() => {
        let mut left = parse_term()
        loop {
            match peek().type {
                TOKEN_PLUS => {
                    advance()
                    left = binop_node("+", left, parse_term())
                },
                TOKEN_MINUS => {
                    advance()
                    left = binop_node("-", left, parse_term())
                },
                _ => break
            }
        }
        left
    }
    
    // term = power (('*' | '/') power)*
    fn parse_term() => {
        let mut left = parse_power()
        loop {
            match peek().type {
                TOKEN_STAR => {
                    advance()
                    left = binop_node("*", left, parse_power())
                },
                TOKEN_SLASH => {
                    advance()
                    left = binop_node("/", left, parse_power())
                },
                _ => break
            }
        }
        left
    }
    
    // power = unary ('^' power)?   (right-associative)
    fn parse_power() => {
        let base = parse_unary()
        match peek().type {
            TOKEN_CARET => {
                advance()
                binop_node("^", base, parse_power())
            },
            _ => base
        }
    }
    
    // unary = ('-' | '+') unary | primary
    fn parse_unary() => {
        match peek().type {
            TOKEN_MINUS => {
                advance()
                unary_node("-", parse_unary())
            },
            TOKEN_PLUS => {
                advance()
                parse_unary()
            },
            _ => parse_primary()
        }
    }
    
    // primary = NUMBER | IDENT '(' args ')' | IDENT | '(' expression ')'
    fn parse_primary() => {
        match peek().type {
            TOKEN_NUMBER => {
                let t = advance()
                num_node(parse_float(t.value))
            },
            TOKEN_IDENT => {
                let t = advance()
                match peek().type {
                    TOKEN_LPAREN => {
                        advance()  // consume '('
                        let args = parse_args()
                        expect(TOKEN_RPAREN)
                        call_node(t.value, args)
                    },
                    _ => var_node(t.value)
                }
            },
            TOKEN_LPAREN => {
                advance()
                let expr = parse_expression()
                expect(TOKEN_RPAREN)
                expr
            },
            _ => {
                print("Unexpected token: ${peek().type}")
                num_node(0)
            }
        }
    }
    
    fn parse_args() => {
        let mut args = []
        match peek().type == TOKEN_RPAREN {
            true => args,
            false => {
                args = [parse_expression()]
                loop {
                    match peek().type {
                        TOKEN_COMMA => {
                            advance()
                            args = args |> collections.append(parse_expression())
                        },
                        _ => break
                    }
                }
                args
            }
        }
    }
    
    fn parse_float(s) => {
        // Convert string to number
        s |> to_number()
    }
    
    parse_statement()
}

// --- Evaluator ---

let BUILTIN_FUNCTIONS = {
    "sin": fn(args) => math.sin(args[0]),
    "cos": fn(args) => math.cos(args[0]),
    "tan": fn(args) => math.tan(args[0]),
    "sqrt": fn(args) => math.sqrt(args[0]),
    "abs": fn(args) => math.abs(args[0]),
    "log": fn(args) => math.log(args[0]),
    "ln": fn(args) => math.ln(args[0]),
    "floor": fn(args) => math.floor(args[0]),
    "ceil": fn(args) => math.ceil(args[0]),
    "round": fn(args) => math.round(args[0]),
    "min": fn(args) => math.min(args[0], args[1]),
    "max": fn(args) => math.max(args[0], args[1]),
    "pow": fn(args) => math.pow(args[0], args[1])
}

let BUILTIN_CONSTANTS = {
    "pi": math.PI,
    "e": math.E,
    "tau": math.PI * 2,
    "phi": 1.6180339887
}

pub fn evaluate(ast, env) => {
    match ast {
        { type: "number", value: v } => { result: v, env: env },
        
        { type: "variable", name: n } => {
            let val = collections.get(env, n, collections.get(BUILTIN_CONSTANTS, n, nil))
            match val {
                nil => { error: "Undefined variable: ${n}", env: env },
                _ => { result: val, env: env }
            }
        },
        
        { type: "assign", name: n, expr: e } => {
            let res = evaluate(e, env)
            match res {
                { error: _ } => res,
                _ => {
                    let new_env = collections.set(env, n, res.result)
                    { result: res.result, env: new_env }
                }
            }
        },
        
        { type: "unary", op: "-", operand: o } => {
            let res = evaluate(o, env)
            match res {
                { error: _ } => res,
                _ => { result: -res.result, env: env }
            }
        },
        
        { type: "binop", op: op, left: l, right: r } => {
            let lr = evaluate(l, env)
            let rr = evaluate(r, env)
            match [lr, rr] {
                [{ error: _ }, _] => lr,
                [_, { error: _ }] => rr,
                _ => {
                    let result = match op {
                        "+" => lr.result + rr.result,
                        "-" => lr.result - rr.result,
                        "*" => lr.result * rr.result,
                        "/" => match rr.result == 0 {
                            true => { return { error: "Division by zero", env: env } },
                            false => lr.result / rr.result
                        },
                        "^" => math.pow(lr.result, rr.result),
                        _ => { return { error: "Unknown operator: ${op}", env: env } }
                    }
                    { result: result, env: env }
                }
            }
        },
        
        { type: "call", name: n, args: a } => {
            let eval_args = a |> collections.map(fn(arg) => evaluate(arg, env))
            let errors = eval_args |> collections.filter(fn(r) => collections.has(r, "error"))
            match collections.length(errors) > 0 {
                true => errors[0],
                false => {
                    let arg_values = eval_args |> collections.map(fn(r) => r.result)
                    let func = collections.get(BUILTIN_FUNCTIONS, n, nil)
                    match func {
                        nil => { error: "Unknown function: ${n}", env: env },
                        _ => { result: func(arg_values), env: env }
                    }
                }
            }
        },
        
        _ => { error: "Unknown AST node", env: env }
    }
}

// --- AST Pretty Printer ---

pub fn ast_to_string(ast) => {
    match ast {
        { type: "number", value: v } => "${v}",
        { type: "variable", name: n } => n,
        { type: "assign", name: n, expr: e } => "${n} = ${ast_to_string(e)}",
        { type: "unary", op: op, operand: o } => "(${op}${ast_to_string(o)})",
        { type: "binop", op: op, left: l, right: r } => "(${ast_to_string(l)} ${op} ${ast_to_string(r)})",
        { type: "call", name: n, args: a } => {
            let arg_strs = a |> collections.map(ast_to_string) |> collections.join(", ")
            "${n}(${arg_strs})"
        },
        _ => "?"
    }
}

// --- REPL ---

pub fn calc(input, env) => {
    let tokens = tokenize(input)
    let ast = parser(tokens)
    let result = evaluate(ast, env)
    
    match result {
        { error: e } => {
            print("Error: ${e}")
            result
        },
        _ => {
            print("  AST: ${ast_to_string(ast)}")
            print("  = ${result.result}")
            result
        }
    }
}

// --- Main Demo ---

fn main() => {
    print("=== Arc Calculator Demo ===\n")
    
    let mut env = {}
    
    let expressions = [
        "2 + 3 * 4",
        "(2 + 3) * 4",
        "2 ^ 3 ^ 2",
        "-5 + 3",
        "x = 10",
        "y = x * 2 + 5",
        "x + y",
        "sqrt(144)",
        "sin(pi / 2)",
        "max(x, y) + min(3, 7)",
        "log(e ^ 5)",
        "(x + y) * 2 / (x - 3)",
        "r = sqrt(x^2 + y^2)",
        "abs(-42) + floor(3.7) + ceil(2.1)"
    ]
    
    expressions |> collections.each(fn(expr) => {
        print("\n> ${expr}")
        let result = calc(expr, env)
        match result {
            { env: new_env } => env = new_env,
            _ => {}
        }
    })
    
    print("\n\n--- Final Environment ---")
    collections.entries(env) |> collections.each(fn(entry) => {
        print("  ${entry.key} = ${entry.value}")
    })
    
    print("\nDone!")
}

main()
