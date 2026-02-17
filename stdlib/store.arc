# Arc Standard Library: store module
# Persistent key-value storage backed by JSON files
#
# Usage:
#   use store
#   let s = store_open("my_data.json")
#   store_set(s, "key", "value")
#   let v = store_get(s, "key")

pub fn store_open(path) {
  __native("store.open", path)
}

pub fn store_get(store, key) {
  __native("store.get", store, key)
}

pub fn store_set(store, key, value) {
  __native("store.set", store, key, value)
}

pub fn store_delete(store, key) {
  __native("store.delete", store, key)
}

pub fn store_has(store, key) {
  __native("store.has", store, key)
}

pub fn store_keys(store) {
  __native("store.keys", store)
}

pub fn store_values(store) {
  __native("store.values", store)
}

pub fn store_entries(store) {
  __native("store.entries", store)
}

pub fn store_clear(store) {
  __native("store.clear", store)
}

pub fn store_size(store) {
  __native("store.size", store)
}

pub fn store_merge(store, map) {
  __native("store.merge", store, map)
}

pub fn store_get_or_set(store, key, default_fn) {
  let existing = store_get(store, key)
  if existing != nil { existing }
  el {
    let val = default_fn()
    store_set(store, key, val)
    val
  }
}
