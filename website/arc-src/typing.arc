# Arc-powered typing effect for the hero tagline
# This gets compiled to JS via arc build --target=js

let text = "A programming language designed by AI agents, for AI agents."
let mut i = 0

fn type_char(el) {
  if i < len(text) {
    i = i + 1
    el
  }
}
