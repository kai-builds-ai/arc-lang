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

pub fn version(c, v) => {
  name: c.name, version: v, description: c.description,
  _flags: c._flags, _args: c._args, _commands: c._commands, _action: c._action
}

pub fn description(c, d) => {
  name: c.name, version: c.version, description: d,
  _flags: c._flags, _args: c._args, _commands: c._commands, _action: c._action
}

pub fn flag(c, long, short, desc, default_val) {
  let f = {long: long, short: short, desc: desc, default_val: if default_val { default_val } el { false }, flag_type: "bool"}
  {
    name: c.name, version: c.version, description: c.description,
    _flags: c._flags ++ [f], _args: c._args, _commands: c._commands, _action: c._action
  }
}

pub fn option(c, long, short, desc, default_val) {
  let f = {long: long, short: short, desc: desc, default_val: if default_val { default_val } el { nil }, flag_type: "value"}
  {
    name: c.name, version: c.version, description: c.description,
    _flags: c._flags ++ [f], _args: c._args, _commands: c._commands, _action: c._action
  }
}

pub fn arg(c, name, desc, required) {
  let a = {name: name, desc: desc, required: if required { required } el { false }}
  {
    name: c.name, version: c.version, description: c.description,
    _flags: c._flags, _args: c._args ++ [a], _commands: c._commands, _action: c._action
  }
}

pub fn command(c, name, desc, handler) {
  let cmd = {name: name, desc: desc, handler: handler, _flags: [], _args: []}
  {
    name: c.name, version: c.version, description: c.description,
    _flags: c._flags, _args: c._args, _commands: c._commands ++ [cmd], _action: c._action
  }
}

pub fn action(c, handler) => {
  name: c.name, version: c.version, description: c.description,
  _flags: c._flags, _args: c._args, _commands: c._commands, _action: handler
}

# --- Parsing ---

pub fn parse(c, argv) {
  let mut flags = {}
  let mut args = []
  let mut cmd = nil
  let mut i = 0

  # Set defaults
  for f in c._flags {
    flags[f.long] = f.default_val
  }

  do {
    let token = argv[i]

    if starts(token, "--") {
      let name = slice(token, 2, len(token))
      let flag_def = c._flags |> find(f => f.long == name)
      if flag_def != nil and flag_def.flag_type == "value" {
        i = i + 1
        flags[name] = argv[i]
      } el {
        flags[name] = true
      }
    } el if starts(token, "-") and len(token) == 2 {
      let short = slice(token, 1, 2)
      let flag_def = c._flags |> find(f => f.short == short)
      if flag_def != nil and flag_def.flag_type == "value" {
        i = i + 1
        flags[flag_def.long] = argv[i]
      } el if flag_def != nil {
        flags[flag_def.long] = true
      } el {
        flags[short] = true
      }
    } el {
      # Check if it's a subcommand
      let sub = c._commands |> find(cmd => cmd.name == token)
      if sub != nil {
        cmd = sub
      } el {
        args = args ++ [token]
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

  if len(errors) > 0 { {ok: false, errors: errors} } el { {ok: true, value: parsed} }
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
      let default_str = if f.default_val != nil and f.default_val != false { " (default: {f.default_val})" } el { "" }
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
    let result = validate(c, parsed)
    if result.ok {
      let p = result.value
      if p.command != nil and p.command.handler != nil {
        p.command.handler(p)
      } el if c._action != nil {
        c._action(p)
      } el {
        p
      }
    } el {
      for e in result.errors { print("Error: {e}") }
      print("")
      print(help(c))
      {ok: false, errors: result.errors}
    }
  }
}
