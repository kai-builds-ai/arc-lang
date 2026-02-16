// =============================================================================
// event-emitter.arc — Full Event System
// =============================================================================
// Demonstrates: fn, let, mut, match, |>, =>, pub, async/await, closures,
// higher-order functions, collections, regex, string interpolation, map
// =============================================================================

import collections
import regex
import datetime

// --- Listener wrapper ---
pub struct Listener {
  id: int,
  callback: fn,
  once: bool,
  priority: int,
  created_at: datetime,
}

// --- Event record for history ---
pub struct EventRecord {
  name: str,
  data: any,
  timestamp: datetime,
  listener_count: int,
}

// --- The EventEmitter ---
pub struct EventEmitter {
  mut listeners: map,
  mut history: list,
  mut next_id: int,
  mut max_history: int,
  mut wildcard_listeners: list,
  mut parent: EventEmitter?,
}

pub fn new_emitter() -> EventEmitter {
  EventEmitter {
    listeners: {},
    history: [],
    next_id: 1,
    max_history: 100,
    wildcard_listeners: [],
    parent: null,
  }
}

// --- Register a listener ---
pub fn on(emitter: mut EventEmitter, event: str, callback: fn) -> int {
  on_with_options(emitter, event, callback, false, 0)
}

pub fn on_with_options(emitter: mut EventEmitter, event: str, callback: fn, once: bool, priority: int) -> int {
  let id = emitter.next_id
  emitter.next_id = id + 1

  let listener = Listener {
    id: id,
    callback: callback,
    once: once,
    priority: priority,
    created_at: datetime::now(),
  }

  // Check if this is a wildcard pattern
  let is_wildcard = regex::matches(event, ".*[\\*\\?].*")

  if is_wildcard {
    emitter.wildcard_listeners = emitter.wildcard_listeners |> append({
      "pattern": event,
      "listener": listener,
    })
  } else {
    let existing = emitter.listeners[event] ?? []
    let updated = existing
      |> append(listener)
      |> collections::sort_by(fn(a, b) => b.priority - a.priority)
    emitter.listeners = emitter.listeners |> map::set(event, updated)
  }

  id
}

// --- Register a one-time listener ---
pub fn once(emitter: mut EventEmitter, event: str, callback: fn) -> int {
  on_with_options(emitter, event, callback, true, 0)
}

// --- Remove a listener by ID ---
pub fn off(emitter: mut EventEmitter, event: str, listener_id: int) -> bool {
  let existing = emitter.listeners[event] ?? []
  let filtered = existing |> filter(fn(l) => l.id != listener_id)

  if len(filtered) < len(existing) {
    emitter.listeners = emitter.listeners |> map::set(event, filtered)
    true
  } else {
    // Check wildcard listeners
    let wl_before = len(emitter.wildcard_listeners)
    emitter.wildcard_listeners = emitter.wildcard_listeners
      |> filter(fn(wl) => wl["listener"].id != listener_id)
    len(emitter.wildcard_listeners) < wl_before
  }
}

// --- Remove all listeners for an event ---
pub fn remove_all(emitter: mut EventEmitter, event: str) {
  emitter.listeners = emitter.listeners |> map::remove(event)
}

// --- Check if wildcard pattern matches event name ---
fn wildcard_matches(pattern: str, event_name: str) -> bool {
  let regex_pattern = pattern
    |> str::replace(".", "\\.")
    |> str::replace("*", ".*")
    |> str::replace("?", ".")
  regex::matches(event_name, "^{regex_pattern}$")
}

// --- Emit an event ---
pub fn emit(emitter: mut EventEmitter, event: str, data: any) -> int {
  let mut count = 0
  let mut to_remove = []

  // Direct listeners
  let direct = emitter.listeners[event] ?? []
  direct |> each(fn(listener) {
    listener.callback(data)
    count = count + 1
    if listener.once {
      to_remove = to_remove |> append(listener.id)
    }
  })

  // Clean up once listeners
  if len(to_remove) > 0 {
    let remaining = direct |> filter(fn(l) => !(to_remove |> contains(l.id)))
    emitter.listeners = emitter.listeners |> map::set(event, remaining)
  }

  // Wildcard listeners
  let mut wl_to_remove = []
  emitter.wildcard_listeners |> each(fn(wl) {
    if wildcard_matches(wl["pattern"], event) {
      wl["listener"].callback(data)
      count = count + 1
      if wl["listener"].once {
        wl_to_remove = wl_to_remove |> append(wl["listener"].id)
      }
    }
  })

  if len(wl_to_remove) > 0 {
    emitter.wildcard_listeners = emitter.wildcard_listeners
      |> filter(fn(wl) => !(wl_to_remove |> contains(wl["listener"].id)))
  }

  // Event bubbling to parent
  if emitter.parent != null {
    emit(emitter.parent, event, data)
  }

  // Record history
  let record = EventRecord {
    name: event,
    data: data,
    timestamp: datetime::now(),
    listener_count: count,
  }
  emitter.history = emitter.history |> append(record)
  if len(emitter.history) > emitter.max_history {
    emitter.history = emitter.history |> collections::slice(1, len(emitter.history))
  }

  count
}

// --- Async emit ---
pub async fn emit_async(emitter: mut EventEmitter, event: str, data: any) -> int {
  let direct = emitter.listeners[event] ?? []
  let mut count = 0

  let tasks = direct |> map(fn(listener) => async {
    await listener.callback(data)
    1
  })

  let results = await async::all(tasks)
  count = results |> reduce(0, fn(acc, r) => acc + r)

  // Record in history
  emitter.history = emitter.history |> append(EventRecord {
    name: event,
    data: data,
    timestamp: datetime::now(),
    listener_count: count,
  })

  count
}

// --- Set parent for event bubbling ---
pub fn set_parent(child: mut EventEmitter, parent: mut EventEmitter) {
  child.parent = parent
}

// --- Get event history ---
pub fn get_history(emitter: EventEmitter) -> list {
  emitter.history
}

pub fn get_history_for(emitter: EventEmitter, event: str) -> list {
  emitter.history |> filter(fn(r) => r.name == event)
}

// --- Listener count ---
pub fn listener_count(emitter: EventEmitter, event: str) -> int {
  let direct = emitter.listeners[event] ?? []
  let wildcard = emitter.wildcard_listeners
    |> filter(fn(wl) => wildcard_matches(wl["pattern"], event))
  len(direct) + len(wildcard)
}

// --- List all registered events ---
pub fn event_names(emitter: EventEmitter) -> list {
  emitter.listeners |> map::keys()
}

// --- Pipe: create a forwarding listener ---
pub fn pipe(source: mut EventEmitter, target: mut EventEmitter, event: str) -> int {
  on(source, event, fn(data) {
    emit(target, event, data)
  })
}

// --- Wait for an event (returns a promise) ---
pub async fn wait_for(emitter: mut EventEmitter, event: str) -> any {
  await async::new(fn(resolve) {
    once(emitter, event, fn(data) {
      resolve(data)
    })
  })
}

// --- Demo ---
fn main() {
  let mut emitter = new_emitter()

  // Basic event handling
  let id1 = on(emitter, "message", fn(data) {
    print("Received message: {data}")
  })

  let id2 = on(emitter, "message", fn(data) {
    print("Logger: message event with {data}")
  })

  // Once listener
  once(emitter, "init", fn(data) {
    print("Initialization complete: {data}")
  })

  // Wildcard listener
  on(emitter, "user.*", fn(data) {
    print("User event detected: {data}")
  })

  // Emit events
  print("--- Emitting messages ---")
  let count = emit(emitter, "message", "Hello World")
  print("Notified {count} listeners")

  emit(emitter, "init", "System ready")
  emit(emitter, "init", "Should not trigger once listener again")

  emit(emitter, "user.login", { "name": "Alice" })
  emit(emitter, "user.logout", { "name": "Bob" })

  // Remove listener
  off(emitter, "message", id1)
  print("\n--- After removing first listener ---")
  emit(emitter, "message", "After removal")

  // Event bubbling
  let mut child = new_emitter()
  let mut parent = new_emitter()
  set_parent(child, parent)

  on(parent, "bubbled", fn(data) {
    print("Parent received bubbled event: {data}")
  })

  emit(child, "bubbled", "from child")

  // History
  print("\n--- Event History ---")
  let history = get_history(emitter)
  history |> each(fn(record) {
    print("  [{record.timestamp}] {record.name} -> {record.listener_count} listeners")
  })

  print("\nTotal events: {event_names(emitter)}")
  print("Message listeners: {listener_count(emitter, "message")}")
}
