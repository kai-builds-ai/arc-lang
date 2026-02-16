// ============================================================================
// Virtual Filesystem in Arc
// ============================================================================
// A complete in-memory virtual filesystem with tree-structured directories,
// file CRUD, path resolution, permissions, search, and disk usage stats.
// Demonstrates: pattern matching, recursion, closures, pipelines, regex,
// collections, datetime, string interpolation, mut, pub.
// ============================================================================

import collections
import regex
import datetime
import json

// --- Node Types ---

let NODE_FILE = "file"
let NODE_DIR  = "directory"
let NODE_LINK = "symlink"

// --- Permission Bits ---

let PERM_READ    = 4
let PERM_WRITE   = 2
let PERM_EXECUTE = 1

pub fn permission_string(perms) => {
    let owner = format_rwx(perms.owner or 7)
    let group = format_rwx(perms.group or 5)
    let other = format_rwx(perms.other or 5)
    "${owner}${group}${other}"
}

fn format_rwx(bits) => {
    let r = match bits >= 4 { true => "r", false => "-" }
    let w = match (bits % 4) >= 2 { true => "w", false => "-" }
    let x = match (bits % 2) >= 1 { true => "x", false => "-" }
    "${r}${w}${x}"
}

// --- Node Creation ---

pub fn create_file(name, content, owner) => {
    let now = datetime.now() |> datetime.to_iso()
    {
        type: NODE_FILE,
        name: name,
        content: content or "",
        size: collections.length(content or ""),
        owner: owner or "root",
        group: owner or "root",
        permissions: { owner: 6, group: 4, other: 4 },
        created_at: now,
        modified_at: now,
        accessed_at: now
    }
}

pub fn create_dir(name, owner) => {
    let now = datetime.now() |> datetime.to_iso()
    {
        type: NODE_DIR,
        name: name,
        children: {},
        owner: owner or "root",
        group: owner or "root",
        permissions: { owner: 7, group: 5, other: 5 },
        created_at: now,
        modified_at: now,
        accessed_at: now
    }
}

pub fn create_symlink(name, target, owner) => {
    {
        type: NODE_LINK,
        name: name,
        target: target,
        owner: owner or "root",
        group: owner or "root",
        permissions: { owner: 7, group: 7, other: 7 },
        created_at: datetime.now() |> datetime.to_iso()
    }
}

// --- Filesystem ---

pub fn create_fs() => {
    {
        root: create_dir("/", "root"),
        cwd: "/"
    }
}

// --- Path Utilities ---

fn normalize_path(path) => {
    let parts = path |> split("/") |> collections.filter(fn(p) => p != "")
    let resolved = parts |> collections.reduce([], fn(stack, part) => {
        match part {
            "." => stack,
            ".." => match collections.length(stack) > 0 { true => stack |> collections.drop_last(1), false => stack },
            _ => stack |> collections.append(part)
        }
    })
    "/" + (resolved |> collections.join("/"))
}

fn resolve_path(fs, path) => {
    match path |> starts_with("/") {
        true => normalize_path(path),
        false => normalize_path("${fs.cwd}/${path}")
    }
}

fn path_parts(path) => {
    path |> split("/") |> collections.filter(fn(p) => p != "")
}

fn parent_path(path) => {
    let parts = path_parts(path)
    match collections.length(parts) <= 1 {
        true => "/",
        false => "/" + (parts |> collections.drop_last(1) |> collections.join("/"))
    }
}

fn basename(path) => {
    let parts = path_parts(path)
    match collections.length(parts) == 0 { true => "/", false => parts |> collections.last() }
}

// --- Navigation ---

fn get_node(fs, path) => {
    let full_path = resolve_path(fs, path)
    let parts = path_parts(full_path)
    
    parts |> collections.reduce(fs.root, fn(node, part) => {
        match node {
            nil => nil,
            { type: NODE_DIR, children: ch } => collections.get(ch, part, nil),
            { type: NODE_LINK, target: t } => get_node(fs, t),
            _ => nil
        }
    })
}

fn set_node(fs, path, new_node) => {
    let full_path = resolve_path(fs, path)
    let parts = path_parts(full_path)
    
    match collections.length(parts) == 0 {
        true => { let mut f = fs; f.root = new_node; f },
        false => {
            let parent = parent_path(full_path)
            let name = basename(full_path)
            let parent_node = get_node(fs, parent)
            
            match parent_node {
                nil => fs,
                { type: NODE_DIR } => {
                    let mut p = parent_node
                    p.children = collections.set(p.children, name, new_node)
                    p.modified_at = datetime.now() |> datetime.to_iso()
                    set_node(fs, parent, p)
                },
                _ => fs
            }
        }
    }
}

// --- File Operations ---

pub fn mkdir(fs, path, owner) => {
    let full_path = resolve_path(fs, path)
    let name = basename(full_path)
    let existing = get_node(fs, full_path)
    
    match existing {
        nil => {
            let dir = create_dir(name, owner)
            set_node(fs, full_path, dir)
        },
        _ => { print("mkdir: '${full_path}' already exists"); fs }
    }
}

pub fn mkdir_p(fs, path, owner) => {
    let parts = path_parts(resolve_path(fs, path))
    let mut current_fs = fs
    let mut current_path = ""
    
    parts |> collections.each(fn(part) => {
        current_path = "${current_path}/${part}"
        let node = get_node(current_fs, current_path)
        match node {
            nil => current_fs = mkdir(current_fs, current_path, owner),
            _ => {}
        }
    })
    
    current_fs
}

pub fn touch(fs, path, content, owner) => {
    let full_path = resolve_path(fs, path)
    let name = basename(full_path)
    let existing = get_node(fs, full_path)
    
    match existing {
        nil => {
            let file = create_file(name, content or "", owner)
            set_node(fs, full_path, file)
        },
        { type: NODE_FILE } => {
            let mut f = existing
            f.modified_at = datetime.now() |> datetime.to_iso()
            match content { nil => {}, _ => { f.content = content; f.size = collections.length(content) } }
            set_node(fs, full_path, f)
        },
        _ => { print("touch: '${full_path}' is not a file"); fs }
    }
}

pub fn write_file(fs, path, content, owner) => {
    touch(fs, path, content, owner)
}

pub fn read_file(fs, path) => {
    let node = get_node(fs, resolve_path(fs, path))
    match node {
        nil => { error: "File not found: ${path}" },
        { type: NODE_FILE, content: c } => { ok: c },
        { type: NODE_LINK, target: t } => read_file(fs, t),
        _ => { error: "Not a file: ${path}" }
    }
}

pub fn append_file(fs, path, content) => {
    let node = get_node(fs, resolve_path(fs, path))
    match node {
        { type: NODE_FILE } => {
            let new_content = node.content + content
            let mut f = node
            f.content = new_content
            f.size = collections.length(new_content)
            f.modified_at = datetime.now() |> datetime.to_iso()
            set_node(fs, resolve_path(fs, path), f)
        },
        _ => { print("append: not a file"); fs }
    }
}

pub fn rm(fs, path) => {
    let full_path = resolve_path(fs, path)
    let parent = parent_path(full_path)
    let name = basename(full_path)
    let parent_node = get_node(fs, parent)
    
    match parent_node {
        { type: NODE_DIR } => {
            let mut p = parent_node
            p.children = collections.remove(p.children, name)
            p.modified_at = datetime.now() |> datetime.to_iso()
            set_node(fs, parent, p)
        },
        _ => fs
    }
}

pub fn rm_rf(fs, path) => rm(fs, path)  // Simplified: rm works recursively on dirs

pub fn cp(fs, src, dst, owner) => {
    let node = get_node(fs, resolve_path(fs, src))
    match node {
        nil => { print("cp: '${src}' not found"); fs },
        { type: NODE_FILE } => {
            let mut f = node
            f.name = basename(resolve_path(fs, dst))
            set_node(fs, resolve_path(fs, dst), f)
        },
        _ => { print("cp: directories not yet supported"); fs }
    }
}

pub fn mv(fs, src, dst) => {
    let node = get_node(fs, resolve_path(fs, src))
    match node {
        nil => { print("mv: '${src}' not found"); fs },
        _ => {
            let mut f = node
            f.name = basename(resolve_path(fs, dst))
            fs |> rm(src) |> fn(fs2) => set_node(fs2, resolve_path(fs, dst), f)
        }
    }
}

pub fn ln_s(fs, target, link_path, owner) => {
    let full_path = resolve_path(fs, link_path)
    let name = basename(full_path)
    let link = create_symlink(name, target, owner)
    set_node(fs, full_path, link)
}

// --- Directory Listing ---

pub fn ls(fs, path) => {
    let node = get_node(fs, resolve_path(fs, path or fs.cwd))
    match node {
        nil => { error: "Not found: ${path}" },
        { type: NODE_DIR, children: ch } => {
            ch |> collections.entries() |> collections.map(fn(e) => {
                let n = e.value
                {
                    name: e.key,
                    type: n.type,
                    size: match n.type { NODE_FILE => n.size, _ => 0 },
                    permissions: permission_string(n.permissions),
                    owner: n.owner,
                    modified: n.modified_at or n.created_at
                }
            }) |> collections.sort_by(fn(a) => a.name)
        },
        _ => { error: "Not a directory: ${path}" }
    }
}

pub fn ls_la(fs, path) => {
    let entries = ls(fs, path)
    match entries {
        { error: e } => print("ls: ${e}"),
        _ => {
            print("total ${collections.length(entries)}")
            entries |> collections.each(fn(e) => {
                let type_char = match e.type { NODE_DIR => "d", NODE_LINK => "l", _ => "-" }
                let size_str = "${e.size}" |> pad_left(8, " ")
                print("${type_char}${e.permissions} ${e.owner} ${size_str} ${e.name}")
            })
        }
    }
}

// --- Search ---

pub fn find(fs, path, predicate) => {
    let start = get_node(fs, resolve_path(fs, path))
    let base_path = resolve_path(fs, path)
    
    fn search_recursive(node, current_path) => {
        match node {
            { type: NODE_DIR, children: ch } => {
                let self_match = match predicate(node, current_path) {
                    true => [current_path],
                    false => []
                }
                let child_matches = ch |> collections.entries() |> collections.flat_map(fn(e) => {
                    let child_path = match current_path == "/" {
                        true => "/${e.key}",
                        false => "${current_path}/${e.key}"
                    }
                    search_recursive(e.value, child_path)
                })
                self_match |> collections.concat(child_matches)
            },
            _ => match predicate(node, current_path) { true => [current_path], false => [] }
        }
    }
    
    search_recursive(start, base_path)
}

pub fn find_by_name(fs, path, pattern) => {
    let re = regex.compile(pattern)
    find(fs, path, fn(node, _) => regex.test(re, node.name))
}

pub fn find_by_type(fs, path, type) => {
    find(fs, path, fn(node, _) => node.type == type)
}

pub fn find_by_size(fs, path, min_size, max_size) => {
    find(fs, path, fn(node, _) => {
        match node.type {
            NODE_FILE => node.size >= min_size and node.size <= max_size,
            _ => false
        }
    })
}

pub fn grep(fs, path, pattern) => {
    let re = regex.compile(pattern)
    let files = find_by_type(fs, path, NODE_FILE)
    files |> collections.flat_map(fn(file_path) => {
        let result = read_file(fs, file_path)
        match result {
            { ok: content } => {
                let lines = content |> split("\n")
                lines |> collections.filter_map_indexed(fn(line, i) => {
                    match regex.test(re, line) {
                        true => { file: file_path, line: i + 1, text: line },
                        false => nil
                    }
                })
            },
            _ => []
        }
    })
}

// --- Disk Usage ---

pub fn du(fs, path) => {
    let node = get_node(fs, resolve_path(fs, path))
    calculate_size(node)
}

fn calculate_size(node) => {
    match node {
        nil => 0,
        { type: NODE_FILE, size: s } => s,
        { type: NODE_DIR, children: ch } => {
            ch |> collections.entries()
              |> collections.reduce(0, fn(total, e) => total + calculate_size(e.value))
        },
        _ => 0
    }
}

pub fn tree(fs, path, prefix) => {
    let node = get_node(fs, resolve_path(fs, path))
    let p = prefix or ""
    
    match node {
        { type: NODE_DIR, children: ch } => {
            let entries = ch |> collections.entries() |> collections.sort_by(fn(e) => e.key)
            entries |> collections.each_indexed(fn(entry, i) => {
                let is_last = i == collections.length(entries) - 1
                let connector = match is_last { true => "└── ", false => "├── " }
                let child_prefix = match is_last { true => "${p}    ", false => "${p}│   " }
                
                let type_indicator = match entry.value.type {
                    NODE_DIR => "/",
                    NODE_LINK => " -> ${entry.value.target}",
                    _ => " (${entry.value.size}b)"
                }
                
                print("${p}${connector}${entry.key}${type_indicator}")
                
                match entry.value.type {
                    NODE_DIR => tree(fs, "${resolve_path(fs, path)}/${entry.key}", child_prefix),
                    _ => {}
                }
            })
        },
        _ => {}
    }
}

// --- Change Directory ---

pub fn cd(fs, path) => {
    let full_path = resolve_path(fs, path)
    let node = get_node(fs, full_path)
    match node {
        { type: NODE_DIR } => { let mut f = fs; f.cwd = full_path; f },
        nil => { print("cd: '${path}' not found"); fs },
        _ => { print("cd: '${path}' is not a directory"); fs }
    }
}

pub fn pwd(fs) => fs.cwd

// --- Filesystem Stats ---

pub fn df(fs) => {
    let total_size = du(fs, "/")
    let file_count = find_by_type(fs, "/", NODE_FILE) |> collections.length()
    let dir_count = find_by_type(fs, "/", NODE_DIR) |> collections.length()
    
    {
        total_size: total_size,
        file_count: file_count,
        directory_count: dir_count,
        total_nodes: file_count + dir_count
    }
}

// --- Main Demo ---

fn main() => {
    print("=== Arc Virtual Filesystem Demo ===\n")
    
    let mut fs = create_fs()
    
    // Build directory structure
    fs = fs
        |> mkdir_p("/home/alice", "alice")
        |> mkdir_p("/home/bob", "bob")
        |> mkdir_p("/home/alice/projects/arc-lang", "alice")
        |> mkdir_p("/home/alice/documents", "alice")
        |> mkdir_p("/etc/config", "root")
        |> mkdir_p("/var/log", "root")
        |> mkdir_p("/tmp", "root")
    
    // Create files
    fs = fs
        |> write_file("/home/alice/hello.txt", "Hello, World!\nThis is Alice's file.", "alice")
        |> write_file("/home/alice/projects/arc-lang/main.arc", "fn main() => print(\"Hello Arc!\")", "alice")
        |> write_file("/home/alice/projects/arc-lang/README.md", "# Arc Lang\nA modern programming language.", "alice")
        |> write_file("/home/bob/notes.txt", "Bob's notes\nTODO: Learn Arc", "bob")
        |> write_file("/etc/config/app.json", "{\"port\": 8080, \"debug\": true}", "root")
        |> write_file("/var/log/app.log", "2025-01-01 INFO: Server started\n2025-01-01 ERROR: Connection failed\n2025-01-02 INFO: Recovered", "root")
    
    // Create a symlink
    fs = fs |> ln_s("/home/alice/projects/arc-lang", "/home/alice/arc", "alice")
    
    print("--- Directory Tree ---")
    print("/")
    tree(fs, "/", "")
    
    // List files
    print("\n--- ls -la /home/alice ---")
    ls_la(fs, "/home/alice")
    
    // Read a file
    print("\n--- cat /home/alice/hello.txt ---")
    match read_file(fs, "/home/alice/hello.txt") {
        { ok: content } => print(content),
        { error: e } => print("Error: ${e}")
    }
    
    // Find files
    print("\n--- find / -name '*.arc' ---")
    let arc_files = find_by_name(fs, "/", r"\.arc$")
    arc_files |> collections.each(fn(f) => print("  ${f}"))
    
    // Grep
    print("\n--- grep 'ERROR' /var/log ---")
    let matches = grep(fs, "/var/log", "ERROR")
    matches |> collections.each(fn(m) => print("  ${m.file}:${m.line}: ${m.text}"))
    
    // Disk usage
    print("\n--- Disk Usage ---")
    let stats = df(fs)
    print("Total size: ${stats.total_size} bytes")
    print("Files: ${stats.file_count}")
    print("Directories: ${stats.directory_count}")
    
    // File operations
    print("\n--- File Operations ---")
    fs = fs |> cp("/home/alice/hello.txt", "/tmp/hello_copy.txt", "alice")
    print("Copied hello.txt to /tmp/")
    
    fs = fs |> append_file("/home/bob/notes.txt", "\nNew note: Arc is awesome!")
    print("Appended to Bob's notes")
    
    fs = fs |> mv("/tmp/hello_copy.txt", "/home/bob/from_alice.txt")
    print("Moved file to Bob's directory")
    
    // Navigate
    fs = fs |> cd("/home/alice/projects")
    print("\nCurrent directory: ${pwd(fs)}")
    
    print("\n--- ls (current dir) ---")
    ls_la(fs, ".")
    
    // Find large files
    print("\n--- Files larger than 20 bytes ---")
    let large_files = find_by_size(fs, "/", 20, 999999)
    large_files |> collections.each(fn(f) => {
        let node = get_node(fs, f)
        print("  ${f} (${node.size} bytes)")
    })
    
    print("\nDone!")
}

main()
