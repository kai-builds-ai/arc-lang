# Event Emitter
# Demonstrates: maps, closures, higher-order functions, mutation

let mut listeners = {}

fn on(event, handler) {
  let existing = if listeners[event] != nil { listeners[event] } el { [] }
  listeners[event] = push(existing, handler)
}

fn emit(event, data) {
  let handlers = listeners[event]
  if handlers == nil { ret nil }
  for handler in handlers {
    handler(data)
  }
}

fn off(event) {
  listeners[event] = nil
}

fn listener_count(event) {
  let handlers = listeners[event]
  if handlers == nil { 0 } el { len(handlers) }
}

# Usage
print("=== Event Emitter ===")

on("message", msg => print("Handler 1: {msg}"))
on("message", msg => print("Handler 2: {msg}"))
on("error", err => print("ERROR: {err}"))

print("Listeners for 'message': {listener_count("message")}")

print("")
print("Emitting 'message':")
emit("message", "Hello, events!")

print("")
print("Emitting 'error':")
emit("error", "Something went wrong")

print("")
off("message")
print("After off('message'), listeners: {listener_count("message")}")

# Chain events
on("user_login", user => {
  print("User logged in: {user}")
  emit("message", "Welcome back, {user}!")
})

on("message", msg => print("Notification: {msg}"))

print("")
print("Chain event test:")
emit("user_login", "Alice")
