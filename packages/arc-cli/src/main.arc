# arc-cli — CLI argument parser for Arc
# Parse args, flags, subcommands, generate help text

# --- CLI Definition Builder ---

pub fn cli(name) => {
  name: name,
  version: "0.0.0",
  description: "",
  _flags: [],
  _args: [],
  _commands: [],
  _action: nil
}

pub fn version(c, v) => {..c, version: v}
pub fn description(c, d) => {..c, description: d}

pub fn flag(c, long, short, desc, default_val) {
  let f = {long: long, short: short, desc: desc, default: default_val or false, type: "bool"}
  {..c, _flags: c._flags ++ [f]}
}

pub fn option(c, long, short, desc, default_val) {
  let f = {long: long, short: short, desc: desc, default: default_val or nil, type: "value"}
  {..c, _flags: c._flags ++ [f]}
}

pub fn arg(c, name, desc, required) {
  let a = {name: name, desc: desc, required: required or false}
  {..c, _args: c._args ++ [a]}
}

pub fn command(c, name, desc, handler) {
  let cmd = {name: name, desc: desc, handler: handler, _flags: [], _args: []}
  {..c, _commands: c._commands ++ [cmd]}
}

pub fn action(c, handler) => {..c, _action: handler}

# --- Parsing ---

pub fn parse(c, argv) {
  let mut flags = {}
  let mut args = []
  let mut cmd = nil
  let mut i = 0

  # Set defaults
  for f in c._flags {
    flags[f.long] = f.default
  }

  do {
    if i >= len(argv) { break }
    let token = argv[i]

    match token {
      t if starts(t, "--") => {
        let name = slice(t, 2, len(t))
        let flag_def = c._flags |> find(f => f.long == name)
        match flag_def {
          {type: "bool"} => flags[name] = true,
          {type: "value"} => {
            i = i + 1
            flags[name] = argv[i]
          },
          nil => flags[name] = true
        }
      },
      t if starts(t, "-") and len(t) == 2 => {
        let short = slice(t, 1, 2)
        let flag_def = c._flags |> find(f => f.short == short)
        match flag_def {
          {type: "bool", long} => flags[long] = true,
          {type: "value", long} => {
            i = i + 1
            flags[long] = argv[i]
          },
          nil => flags[short] = true
        }
      },
      t => {
        # Check if it's a subcommand
        let sub = c._commands |> find(cmd => cmd.name == t)
        if sub != nil {
          cmd = sub
        } el {
          args = args ++ [t]
        }
      }
    }

    i = i + 1
  } until i >= len(argv)

  {flags: flags, args: args, command: cmd}
}

# --- Validation ---

pub fn validate(c, parsed) {
  let mut errors = []

  # Check required args
  let required_args = c._args |> filter(a => a.required)
  if len(parsed.args) < len(required_args) {
    let missing = required_args |> drop(len(parsed.args)) |> map(a => a.name)
    errors = errors ++ ["Missing required arguments: {join(missing, ", ")}"]
  }

  # Check required options
  for f in c._flags {
    if f.type == "value" and f.default == nil and parsed.flags[f.long] == nil {
      # Optional — only error if explicitly marked required
    }
  }

  if len(errors) > 0 { Err(errors) } el { Ok(parsed) }
}

# --- Help Text Generation ---

pub fn help(c) {
  let mut lines = []
  lines = lines ++ ["{c.name} v{c.version}"]

  if c.description != "" {
    lines = lines ++ [c.description, ""]
  }

  lines = lines ++ ["USAGE:"]
  let args_str = c._args |> map(a => if a.required { "<{a.name}>" } el { "[{a.name}]" }) |> join(" ")
  let cmd_str = if len(c._commands) > 0 { " [COMMAND]" } el { "" }
  lines = lines ++ ["  {c.name}{cmd_str} [OPTIONS] {args_str}", ""]

  if len(c._flags) > 0 {
    lines = lines ++ ["OPTIONS:"]
    for f in c._flags {
      let short_str = if f.short != nil { "-{f.short}, " } el { "    " }
      let default_str = if f.default != nil and f.default != false { " (default: {f.default})" } el { "" }
      lines = lines ++ ["  {short_str}--{f.long}    {f.desc}{default_str}"]
    }
    lines = lines ++ [""]
  }

  if len(c._commands) > 0 {
    lines = lines ++ ["COMMANDS:"]
    for cmd in c._commands {
      lines = lines ++ ["  {cmd.name}    {cmd.desc}"]
    }
    lines = lines ++ [""]
  }

  lines |> join("\n")
}

# --- Run ---

pub fn run(c, argv) {
  let parsed = parse(c, argv)

  # Check for --help
  if parsed.flags["help"] == true {
    print(help(c))
    nil
  } el {
    match validate(c, parsed) {
      Ok(p) => {
        if p.command != nil and p.command.handler != nil {
          p.command.handler(p)
        } el if c._action != nil {
          c._action(p)
        } el {
          p
        }
      },
      Err(errors) => {
        for e in errors { print("Error: {e}") }
        print("")
        print(help(c))
        Err(errors)
      }
    }
  }
}
