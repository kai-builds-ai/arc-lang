import { readFileSync, writeFileSync, readdirSync } from 'fs';
import { join, resolve } from 'path';
import { pathToFileURL } from 'url';

const testDir = resolve(import.meta.dirname);
const compilerDir = resolve(testDir, '../../../compiler/src');

function toURL(p) { return pathToFileURL(resolve(compilerDir, p)).href; }

const { lex } = await import(toURL('lexer.ts'));
const { parse } = await import(toURL('parser.ts'));
const { generateIR } = await import(toURL('ir.ts'));
const { generateJS } = await import(toURL('codegen-js.ts'));
const { interpret } = await import(toURL('interpreter.ts'));

const files = readdirSync(testDir).filter(f => f.startsWith('test') && f.endsWith('.arc')).sort();

let bugs = [];
let passed = 0;

for (const file of files) {
  const arcPath = join(testDir, file);
  const source = readFileSync(arcPath, 'utf-8');
  
  process.stdout.write(`\n=== ${file} ===\n`);
  
  // Interpreter output
  let interpLines = [];
  const origLog = console.log;
  console.log = (...args) => interpLines.push(args.map(a => typeof a === 'string' ? a : JSON.stringify(a)).join(' '));
  
  let interpError = null;
  try {
    const tokens = lex(source);
    const ast = parse(tokens);
    interpret(ast);
  } catch (e) {
    interpError = e.message;
  }
  console.log = origLog;
  const interpOut = interpError ? `ERROR: ${interpError}` : interpLines.join('\n');
  process.stdout.write(`INTERP: ${interpOut}\n`);
  
  // Compile
  let jsCode, compileError = null;
  try {
    const tokens = lex(source);
    const ast = parse(tokens);
    const ir = generateIR(ast);
    jsCode = generateJS(ir);
  } catch (e) {
    compileError = e.message;
  }
  
  if (compileError) {
    process.stdout.write(`COMPILE ERROR: ${compileError}\n`);
    bugs.push({ file, type: 'compile-error', detail: compileError });
    continue;
  }
  
  const jsPath = arcPath.replace('.arc', '.js');
  writeFileSync(jsPath, jsCode);
  
  // Run compiled JS via Function
  let compLines = [];
  let runError = null;
  try {
    const mockConsole = { log: (...args) => compLines.push(args.map(a => typeof a === 'string' ? a : JSON.stringify(a)).join(' ')) };
    // Replace global console temporarily
    const savedConsole = globalThis.console;
    globalThis.console = mockConsole;
    const fn = new Function(jsCode);
    fn();
    globalThis.console = savedConsole;
  } catch (e) {
    runError = e.message || String(e);
  }
  
  const compOut = runError ? `ERROR: ${runError}` : compLines.join('\n');
  process.stdout.write(`COMPIL: ${compOut}\n`);
  
  if (interpOut === compOut) {
    process.stdout.write(`RESULT: MATCH\n`);
    passed++;
  } else {
    process.stdout.write(`RESULT: MISMATCH\n`);
    bugs.push({ file, type: 'mismatch', interp: interpOut, compiled: compOut });
  }
}

process.stdout.write(`\n\n=== SUMMARY ===\n`);
process.stdout.write(`Total: ${files.length}, Passed: ${passed}, Bugs: ${bugs.length}\n`);
for (const b of bugs) {
  process.stdout.write(`  ${b.file}: ${b.type}\n`);
  if (b.interp !== undefined) process.stdout.write(`    interp:   ${b.interp}\n`);
  if (b.compiled !== undefined) process.stdout.write(`    compiled: ${b.compiled}\n`);
  if (b.detail) process.stdout.write(`    detail: ${b.detail}\n`);
}
