import { lex, TokenType } from "./src/lexer.ts";
import { parse } from "./src/parser.ts";

const src = 'let z = "{x + y}"';
const tokens = lex(src);
console.log("=== TOKENS ===");
for (const t of tokens) {
  console.log(`  ${TokenType[t.type].padEnd(20)} | ${JSON.stringify(t.value)}`);
}

console.log("\n=== AST ===");
const ast = parse(tokens);
console.log(JSON.stringify(ast, null, 2));
