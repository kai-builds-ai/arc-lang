# ============================================================================
# State Machine Library in Arc
# ============================================================================
# A generic finite state machine with state definitions, transition rules,
# guard conditions, event handling, history tracking, and serialization.
# Includes two demos: a vending machine and a traffic light controller.
# Demonstrates: pattern matching, closures, pipelines, collections, json, mut.
# ============================================================================

use collections
use json
use datetime

# --- State Machine Definition ---

pub fn define_machine(name, config) => {
    {
        name: name,
        states: config.states,
        transitions: config.transitions,
        initial_state: config.initial_state,
        on_enter: config.on_enter or {},
        on_exit: config.on_exit or {}
    }
}

pub fn create_instance(machine, context) => {
    {
        machine: machine,
        current_state: machine.initial_state,
        context: context or {},
        history: [{
            state: machine.initial_state,
            event: "INIT",
            timestamp: datetime.now() |> datetime.to_iso()
        }],
        started_at: datetime.now() |> datetime.to_iso()
    }
}

# --- Transition Logic ---

fn find_transition(machine, current_state, event) => {
    machine.transitions |> collections.find(fn(t) => {
        t.from == current_state and t.event == event
    })
}

pub fn can_handle(instance, event) => {
    let transition = find_transition(instance.machine, instance.current_state, event)
    match transition {
        nil => false,
        _ => match transition.guard {
            nil => true,
            guard => guard(instance.context)
        }
    }
}

pub fn send_event(instance, event, payload) => {
    let transition = find_transition(instance.machine, instance.current_state, event)
    
    match transition {
        nil => {
            print("[${instance.machine.name}] No transition for '${event}' in state '${instance.current_state}'")
            instance
        },
        _ => {
            # Check guard condition
            let guard_ok = match transition.guard {
                nil => true,
                guard => guard(instance.context)
            }
            
            match guard_ok {
                false => {
                    print("[${instance.machine.name}] Guard rejected '${event}' in state '${instance.current_state}'")
                    instance
                },
                true => {
                    let mut inst = instance
                    let from_state = inst.current_state
                    let to_state = transition.to
                    
                    # Execute on_exit callback
                    let exit_fn = collections.get(inst.machine.on_exit, from_state, nil)
                    match exit_fn {
                        nil => {},
                        f => { inst.context = f(inst.context, event) }
                    }
                    
                    # Execute transition action
                    match transition.action {
                        nil => {},
                        action => { inst.context = action(inst.context, payload) }
                    }
                    
                    # Update state
                    inst.current_state = to_state
                    
                    # Execute on_enter callback
                    let enter_fn = collections.get(inst.machine.on_enter, to_state, nil)
                    match enter_fn {
                        nil => {},
                        f => { inst.context = f(inst.context, event) }
                    }
                    
                    # Record history
                    inst.history = inst.history |> collections.append({
                        from: from_state,
                        to: to_state,
                        event: event,
                        payload: payload,
                        timestamp: datetime.now() |> datetime.to_iso()
                    })
                    
                    print("[${inst.machine.name}] ${from_state} --${event}--> ${to_state}")
                    inst
                }
            }
        }
    }
}

# --- Batch Events ---

pub fn send_events(instance, events) => {
    events |> collections.reduce(instance, fn(inst, evt) => {
        match evt {
            { event: e, payload: p } => send_event(inst, e, p),
            e => send_event(inst, e, nil)
        }
    })
}

# --- History & Introspection ---

pub fn get_history(instance) => instance.history

pub fn get_state(instance) => instance.current_state

pub fn get_context(instance) => instance.context

pub fn available_events(instance) => {
    instance.machine.transitions
    |> collections.filter(fn(t) => t.from == instance.current_state)
    |> collections.map(fn(t) => t.event)
    |> collections.unique()
}

pub fn state_duration(instance) => {
    let last_entry = instance.history |> collections.last()
    datetime.diff(datetime.now(), datetime.parse(last_entry.timestamp))
}

# --- Serialization ---

pub fn serialize(instance) => {
    json.encode({
        machine_name: instance.machine.name,
        current_state: instance.current_state,
        context: instance.context,
        history: instance.history,
        started_at: instance.started_at
    }, indent: 2)
}

pub fn visualize(machine) => {
    print("\n=== ${machine.name} State Machine ===")
    print("States: ${machine.states |> collections.join(", ")}")
    print("Initial: ${machine.initial_state}")
    print("\nTransitions:")
    machine.transitions |> collections.each(fn(t) => {
        let guard_str = match t.guard { nil => "", _ => " [guarded]" }
        let action_str = match t.action { nil => "", _ => " {action}" }
        print("  ${t.from} --${t.event}--> ${t.to}${guard_str}${action_str}")
    })
    print("")
}

# ============================================================================
# Demo 1: Vending Machine
# ============================================================================

fn vending_machine_demo() => {
    print("\n" + "=".repeat(60))
    print("VENDING MACHINE DEMO")
    print("=".repeat(60))
    
    let machine = define_machine("VendingMachine", {
        states: ["idle", "selecting", "payment", "dispensing", "error"],
        initial_state: "idle",
        transitions: [
            { from: "idle", event: "INSERT_COIN", to: "selecting",
              action: fn(ctx, payload) => collections.set(ctx, "balance", (ctx.balance or 0) + payload.amount) },
            { from: "selecting", event: "INSERT_COIN", to: "selecting",
              action: fn(ctx, payload) => collections.set(ctx, "balance", ctx.balance + payload.amount) },
            { from: "selecting", event: "SELECT_ITEM", to: "payment",
              action: fn(ctx, payload) => collections.set(ctx, "selected_item", payload.item),
              guard: fn(ctx) => ctx.balance > 0 },
            { from: "payment", event: "CONFIRM", to: "dispensing",
              guard: fn(ctx) => ctx.balance >= get_item_price(ctx.selected_item),
              action: fn(ctx, _) => {
                  let price = get_item_price(ctx.selected_item)
                  ctx |> collections.set("balance", ctx.balance - price)
                     |> collections.set("dispensed", (ctx.dispensed or 0) + 1)
              }},
            { from: "payment", event: "CANCEL", to: "idle",
              action: fn(ctx, _) => collections.set(ctx, "balance", 0) },
            { from: "dispensing", event: "ITEM_TAKEN", to: "idle",
              action: fn(ctx, _) => match ctx.balance > 0 {
                  true => { print("  Change returned: $${ctx.balance}"); collections.set(ctx, "balance", 0) },
                  false => ctx
              }},
            { from: "dispensing", event: "JAM", to: "error" },
            { from: "error", event: "RESET", to: "idle",
              action: fn(ctx, _) => { balance: 0, dispensed: ctx.dispensed or 0 } }
        ],
        on_enter: {
            "dispensing": fn(ctx, _) => { print("  Dispensing: ${ctx.selected_item}"); ctx },
            "error": fn(ctx, _) => { print("  ERROR: Machine jammed!"); ctx }
        },
        on_exit: {}
    })
    
    visualize(machine)
    
    let mut vm = create_instance(machine, { balance: 0, dispensed: 0 })
    
    print("--- Buying a soda ---")
    vm = vm
        |> send_event("INSERT_COIN", { amount: 0.50 })
        |> send_event("INSERT_COIN", { amount: 0.50 })
        |> send_event("SELECT_ITEM", { item: "soda" })
        |> send_event("CONFIRM", nil)
        |> send_event("ITEM_TAKEN", nil)
    
    print("\nBalance: $${vm.context.balance}, Items dispensed: ${vm.context.dispensed}")
    print("Available events: ${available_events(vm) |> collections.join(", ")}")
    
    print("\n--- Buying chips with change ---")
    vm = vm
        |> send_event("INSERT_COIN", { amount: 1.00 })
        |> send_event("SELECT_ITEM", { item: "chips" })
        |> send_event("CONFIRM", nil)
        |> send_event("ITEM_TAKEN", nil)
    
    print("Total dispensed: ${vm.context.dispensed}")
}

fn get_item_price(item) => {
    match item {
        "soda" => 1.00,
        "chips" => 0.75,
        "candy" => 0.50,
        "water" => 0.75,
        _ => 999.99
    }
}

# ============================================================================
# Demo 2: Traffic Light Controller
# ============================================================================

fn traffic_light_demo() => {
    print("\n" + "=".repeat(60))
    print("TRAFFIC LIGHT DEMO")
    print("=".repeat(60))
    
    let machine = define_machine("TrafficLight", {
        states: ["green", "yellow", "red", "flashing_red"],
        initial_state: "red",
        transitions: [
            { from: "red", event: "TIMER", to: "green",
              action: fn(ctx, _) => collections.set(ctx, "cycles", (ctx.cycles or 0) + 1) },
            { from: "green", event: "TIMER", to: "yellow" },
            { from: "yellow", event: "TIMER", to: "red" },
            { from: "green", event: "EMERGENCY", to: "red" },
            { from: "yellow", event: "EMERGENCY", to: "red" },
            { from: "red", event: "MALFUNCTION", to: "flashing_red" },
            { from: "green", event: "MALFUNCTION", to: "flashing_red" },
            { from: "yellow", event: "MALFUNCTION", to: "flashing_red" },
            { from: "flashing_red", event: "REPAIR", to: "red" }
        ],
        on_enter: {
            "green": fn(ctx, _) => { print("  🟢 GO"); ctx },
            "yellow": fn(ctx, _) => { print("  🟡 CAUTION"); ctx },
            "red": fn(ctx, _) => { print("  🔴 STOP"); ctx },
            "flashing_red": fn(ctx, _) => { print("  🔴⚠️ FLASHING RED - PROCEED WITH CAUTION"); ctx }
        },
        on_exit: {}
    })
    
    visualize(machine)
    
    let mut light = create_instance(machine, { cycles: 0 })
    
    print("--- Normal cycle ---")
    light = light |> send_events(["TIMER", "TIMER", "TIMER", "TIMER", "TIMER", "TIMER"])
    print("Completed cycles: ${light.context.cycles}")
    
    print("\n--- Emergency override ---")
    light = light
        |> send_event("TIMER", nil) # green
        |> send_event("EMERGENCY", nil) # back to red
    
    print("\n--- Malfunction and repair ---")
    light = light
        |> send_event("MALFUNCTION", nil)
        |> send_event("REPAIR", nil)
    
    print("\nHistory (${collections.length(light.history)} entries):")
    light.history |> collections.take_last(5) |> collections.each(fn(h) => {
        match h.from {
            nil => print("  [INIT] -> ${h.state}"),
            _ => print("  ${h.from} --${h.event}--> ${h.to}")
        }
    })
}

# --- Main ---

fn main() => {
    print("=== Arc State Machine Library Demo ===")
    vending_machine_demo()
    traffic_light_demo()
    print("\nDone!")
}

main()
