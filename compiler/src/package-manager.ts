// Arc Package Manager

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { resolve, dirname } from "path";

export interface ArcToml {
  package: {
    name: string;
    version: string;
    description: string;
    author: string;
    license: string;
  };
  dependencies: Record<string, string>;
  "dev-dependencies": Record<string, string>;
}

export function parseArcToml(content: string): ArcToml {
  const result: ArcToml = {
    package: { name: "", version: "0.1.0", description: "", author: "", license: "MIT" },
    dependencies: {},
    "dev-dependencies": {},
  };

  let currentSection = "";
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const sectionMatch = trimmed.match(/^\[(.+)\]$/);
    if (sectionMatch) {
      currentSection = sectionMatch[1];
      continue;
    }

    const kvMatch = trimmed.match(/^(\S+)\s*=\s*"(.*)"\s*$/);
    if (kvMatch) {
      const [, key, value] = kvMatch;
      if (currentSection === "package") {
        (result.package as any)[key] = value;
      } else if (currentSection === "dependencies") {
        result.dependencies[key] = value;
      } else if (currentSection === "dev-dependencies") {
        result["dev-dependencies"][key] = value;
      }
    }
  }
  return result;
}

export function serializeArcToml(toml: ArcToml): string {
  let out = "[package]\n";
  for (const [k, v] of Object.entries(toml.package)) {
    out += `${k} = "${v}"\n`;
  }
  out += "\n[dependencies]\n";
  if (Object.keys(toml.dependencies).length === 0) {
    out += "# name = \"version\"\n";
  } else {
    for (const [k, v] of Object.entries(toml.dependencies)) {
      out += `${k} = "${v}"\n`;
    }
  }
  out += "\n[dev-dependencies]\n";
  if (Object.keys(toml["dev-dependencies"]).length === 0) {
    out += "# test-utils = \"0.2.0\"\n";
  } else {
    for (const [k, v] of Object.entries(toml["dev-dependencies"])) {
      out += `${k} = "${v}"\n`;
    }
  }
  return out;
}

export function findArcToml(startDir?: string): string {
  const dir = startDir || process.cwd();
  const p = resolve(dir, "arc.toml");
  if (existsSync(p)) return p;
  throw new Error("No arc.toml found in current directory");
}

export function readToml(dir?: string): ArcToml {
  const p = findArcToml(dir);
  return parseArcToml(readFileSync(p, "utf-8"));
}

export function writeToml(toml: ArcToml, dir?: string): void {
  const d = dir || process.cwd();
  writeFileSync(resolve(d, "arc.toml"), serializeArcToml(toml));
}

export interface LockEntry {
  name: string;
  version: string;
  source: string;
  integrity: string;
}

export function generateLockFile(toml: ArcToml): string {
  let out = "# arc.lock - Auto-generated. Do not edit.\n\n";
  const allDeps = { ...toml.dependencies, ...toml["dev-dependencies"] };
  for (const [name, version] of Object.entries(allDeps)) {
    out += `[[package]]\n`;
    out += `name = "${name}"\n`;
    out += `version = "${version}"\n`;
    out += `source = "${version.startsWith("github:") ? version : "registry"}"\n`;
    out += `\n`;
  }
  return out;
}

export function pkgInit(dir?: string): void {
  const d = dir || process.cwd();
  const tomlPath = resolve(d, "arc.toml");
  if (existsSync(tomlPath)) {
    console.log("arc.toml already exists");
    return;
  }
  const name = d.split(/[\\/]/).pop() || "my-project";
  const toml: ArcToml = {
    package: { name, version: "0.1.0", description: "", author: "", license: "MIT" },
    dependencies: {},
    "dev-dependencies": {},
  };
  writeFileSync(tomlPath, serializeArcToml(toml));
  console.log("Created arc.toml");
}

export function pkgAdd(name: string, options: { dev?: boolean; dir?: string } = {}): void {
  const toml = readToml(options.dir);
  const section = options.dev ? "dev-dependencies" : "dependencies";

  // Support github:user/repo format
  let version = "latest";
  if (name.startsWith("github:")) {
    version = name;
    name = name.replace("github:", "").split("/").pop() || name;
  }

  toml[section][name] = version;
  writeToml(toml, options.dir);
  console.log(`Added ${name} to [${section}]`);
}

export function pkgRemove(name: string, dir?: string): void {
  const toml = readToml(dir);
  let found = false;
  if (name in toml.dependencies) {
    delete toml.dependencies[name];
    found = true;
  }
  if (name in toml["dev-dependencies"]) {
    delete toml["dev-dependencies"][name];
    found = true;
  }
  if (!found) {
    console.log(`Package '${name}' not found in dependencies`);
    return;
  }
  writeToml(toml, dir);
  console.log(`Removed ${name}`);
}

export function pkgList(dir?: string): void {
  const toml = readToml(dir);
  const deps = Object.entries(toml.dependencies);
  const devDeps = Object.entries(toml["dev-dependencies"]);

  if (deps.length === 0 && devDeps.length === 0) {
    console.log("No dependencies");
    return;
  }

  if (deps.length > 0) {
    console.log("Dependencies:");
    for (const [k, v] of deps) console.log(`  ${k}: ${v}`);
  }
  if (devDeps.length > 0) {
    console.log("Dev Dependencies:");
    for (const [k, v] of devDeps) console.log(`  ${k}: ${v}`);
  }
}

export function pkgInstall(dir?: string): void {
  const d = dir || process.cwd();
  const toml = readToml(d);
  const modulesDir = resolve(d, "arc_modules");
  if (!existsSync(modulesDir)) {
    mkdirSync(modulesDir, { recursive: true });
  }

  // Generate lock file
  const lockContent = generateLockFile(toml);
  writeFileSync(resolve(d, "arc.lock"), lockContent);

  const allDeps = { ...toml.dependencies, ...toml["dev-dependencies"] };
  const count = Object.keys(allDeps).length;

  if (count === 0) {
    console.log("No dependencies to install");
  } else {
    // For now, create placeholder directories for each dependency
    for (const [name] of Object.entries(allDeps)) {
      const pkgDir = resolve(modulesDir, name);
      if (!existsSync(pkgDir)) {
        mkdirSync(pkgDir, { recursive: true });
      }
    }
    console.log(`Installed ${count} package(s)`);
  }
  console.log("Generated arc.lock");
}
