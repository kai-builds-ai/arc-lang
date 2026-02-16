/**
 * Arc Standard Library Documentation Generator
 *
 * Reads .arc files in stdlib/, extracts `pub fn` declarations and
 * preceding `#` comments, and generates markdown documentation.
 *
 * Usage: npx tsx tools/docgen.ts
 */

import { readdir, readFile, writeFile } from "fs/promises";
import { join } from "path";

interface FnDoc {
  name: string;
  params: string;
  comment: string[];
}

interface ModuleDoc {
  name: string;
  constants: { name: string; value: string; comment: string[] }[];
  functions: FnDoc[];
}

async function parseArcFile(filePath: string): Promise<ModuleDoc> {
  const content = await readFile(filePath, "utf-8");
  const lines = content.split("\n");
  const moduleName = filePath.replace(/.*[/\\]/, "").replace(/\.arc$/, "");

  const functions: FnDoc[] = [];
  const constants: ModuleDoc["constants"] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Extract pub fn declarations
    const fnMatch = line.match(/^pub\s+fn\s+(\w+)\(([^)]*)\)/);
    if (fnMatch) {
      // Collect preceding # comments
      const comment: string[] = [];
      let j = i - 1;
      while (j >= 0 && lines[j].trim().startsWith("#")) {
        comment.unshift(lines[j].trim().replace(/^#\s?/, ""));
        j--;
      }
      functions.push({
        name: fnMatch[1],
        params: fnMatch[2],
        comment,
      });
      continue;
    }

    // Extract pub let constants
    const constMatch = line.match(/^pub\s+let\s+(\w+)\s*=\s*(.+)/);
    if (constMatch) {
      const comment: string[] = [];
      let j = i - 1;
      while (j >= 0 && lines[j].trim().startsWith("#")) {
        comment.unshift(lines[j].trim().replace(/^#\s?/, ""));
        j--;
      }
      constants.push({
        name: constMatch[1],
        value: constMatch[2],
        comment,
      });
    }
  }

  return { name: moduleName, constants, functions };
}

function generateMarkdown(modules: ModuleDoc[]): string {
  const lines: string[] = [
    "# Arc Standard Library — Auto-Generated Reference",
    "",
    `> Generated on ${new Date().toISOString().split("T")[0]} by \`tools/docgen.ts\``,
    "",
    "## Modules",
    "",
  ];

  for (const mod of modules) {
    lines.push(`- [${mod.name}](#${mod.name})`);
  }
  lines.push("");

  for (const mod of modules) {
    lines.push("---", "", `## ${mod.name}`, "");

    if (mod.constants.length > 0) {
      lines.push("### Constants", "");
      for (const c of mod.constants) {
        if (c.comment.length > 0) {
          lines.push(c.comment.map((l) => `> ${l}`).join("\n"));
        }
        lines.push(`- **\`${c.name}\`** = \`${c.value}\``, "");
      }
    }

    if (mod.functions.length > 0) {
      lines.push("### Functions", "");
      for (const fn of mod.functions) {
        lines.push(`#### \`${fn.name}(${fn.params})\``, "");
        if (fn.comment.length > 0) {
          lines.push(fn.comment.join("\n"), "");
        }
      }
    }

    if (mod.constants.length === 0 && mod.functions.length === 0) {
      lines.push("*No public exports found.*", "");
    }
  }

  return lines.join("\n");
}

async function main() {
  const stdlibDir = join(__dirname, "..", "stdlib");
  const files = await readdir(stdlibDir);
  const arcFiles = files.filter((f) => f.endsWith(".arc")).sort();

  if (arcFiles.length === 0) {
    console.log("No .arc files found in stdlib/");
    return;
  }

  console.log(`Found ${arcFiles.length} module(s): ${arcFiles.join(", ")}`);

  const modules: ModuleDoc[] = [];
  for (const file of arcFiles) {
    const mod = await parseArcFile(join(stdlibDir, file));
    modules.push(mod);
    console.log(
      `  ${mod.name}: ${mod.constants.length} constants, ${mod.functions.length} functions`
    );
  }

  const markdown = generateMarkdown(modules);
  const outPath = join(__dirname, "..", "docs", "stdlib-autogen.md");
  await writeFile(outPath, markdown, "utf-8");
  console.log(`\nGenerated: ${outPath}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
