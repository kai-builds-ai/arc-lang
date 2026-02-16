# =============================================================================
# binary-tree.arc — Binary Search Tree Implementation
# =============================================================================
# Demonstrates: fn, let, mut, match, |>, =>, pub, recursion, closures,
# higher-order functions, pattern matching, string interpolation, collections
# =============================================================================

use collections

# --- Tree Node ---
pub struct TreeNode {
  value: int,
  mut left: TreeNode?,
  mut right: TreeNode?,
}

# --- BST structure ---
pub struct BST {
  mut root: TreeNode?,
  mut size: int,
}

# --- Create empty tree ---
pub fn new_tree() -> BST {
  BST { root: nil, size: 0 }
}

# --- Insert a value ---
pub fn insert(tree: mut BST, value: int) -> BST {
  tree.root = insert_node(tree.root, value)
  tree.size = tree.size + 1
  tree
}

fn insert_node(node: TreeNode?, value: int) -> TreeNode {
  match node {
    nil => TreeNode { value: value, left: nil, right: nil }
    _ => {
      if value < node.value {
        node.left = insert_node(node.left, value)
      } el if value > node.value {
        node.right = insert_node(node.right, value)
      }
      # Duplicate values ignored
      node
    }
  }
}

# --- Find a value ---
pub fn find(tree: BST, value: int) -> bool {
  find_node(tree.root, value)
}

fn find_node(node: TreeNode?, value: int) -> bool {
  match node {
    nil => false
    _ => {
      if value == node.value { true }
      el if value < node.value { find_node(node.left, value) }
      el { find_node(node.right, value) }
    }
  }
}

# --- Minimum value ---
pub fn min(tree: BST) -> int {
  match tree.root {
    nil => panic("Empty tree has no minimum")
    _ => find_min(tree.root).value
  }
}

fn find_min(node: TreeNode) -> TreeNode {
  match node.left {
    nil => node
    _ => find_min(node.left)
  }
}

# --- Maximum value ---
pub fn max(tree: BST) -> int {
  match tree.root {
    nil => panic("Empty tree has no maximum")
    _ => find_max(tree.root).value
  }
}

fn find_max(node: TreeNode) -> TreeNode {
  match node.right {
    nil => node
    _ => find_max(node.right)
  }
}

# --- Delete a value ---
pub fn delete(tree: mut BST, value: int) -> BST {
  let result = delete_node(tree.root, value)
  tree.root = result.node
  if result.deleted {
    tree.size = tree.size - 1
  }
  tree
}

fn delete_node(node: TreeNode?, value: int) -> { node: TreeNode?, deleted: bool } {
  match node {
    nil => { node: nil, deleted: false }
    _ => {
      if value < node.value {
        let result = delete_node(node.left, value)
        node.left = result.node
        { node: node, deleted: result.deleted }
      } el if value > node.value {
        let result = delete_node(node.right, value)
        node.right = result.node
        { node: node, deleted: result.deleted }
      } el {
        # Found the node to delete
        match (node.left, node.right) {
          (nil, nil) => { node: nil, deleted: true }
          (nil, right) => { node: right, deleted: true }
          (left, nil) => { node: left, deleted: true }
          (left, right) => {
            # Two children: replace with inorder successor
            let successor = find_min(right)
            node.value = successor.value
            let result = delete_node(node.right, successor.value)
            node.right = result.node
            { node: node, deleted: true }
          }
        }
      }
    }
  }
}

# --- Height of the tree ---
pub fn height(tree: BST) -> int {
  node_height(tree.root)
}

fn node_height(node: TreeNode?) -> int {
  match node {
    nil => 0
    _ => {
      let left_h = node_height(node.left)
      let right_h = node_height(node.right)
      1 + (if left_h > right_h { left_h } el { right_h })
    }
  }
}

# --- Check if balanced ---
pub fn is_balanced(tree: BST) -> bool {
  check_balanced(tree.root) != -1
}

fn check_balanced(node: TreeNode?) -> int {
  match node {
    nil => 0
    _ => {
      let left_h = check_balanced(node.left)
      if left_h == -1 { ret -1 }

      let right_h = check_balanced(node.right)
      if right_h == -1 { ret -1 }

      let diff = if left_h > right_h { left_h - right_h } el { right_h - left_h }
      if diff > 1 { -1 }
      el { 1 + (if left_h > right_h { left_h } el { right_h }) }
    }
  }
}

# --- In-order traversal ---
pub fn inorder(tree: BST) -> list {
  let mut result = []
  inorder_walk(tree.root, fn(v) {
    result = result |> collections::append(v)
  })
  result
}

fn inorder_walk(node: TreeNode?, visit: fn) {
  match node {
    nil => {}
    _ => {
      inorder_walk(node.left, visit)
      visit(node.value)
      inorder_walk(node.right, visit)
    }
  }
}

# --- Pre-order traversal ---
pub fn preorder(tree: BST) -> list {
  let mut result = []
  preorder_walk(tree.root, fn(v) {
    result = result |> collections::append(v)
  })
  result
}

fn preorder_walk(node: TreeNode?, visit: fn) {
  match node {
    nil => {}
    _ => {
      visit(node.value)
      preorder_walk(node.left, visit)
      preorder_walk(node.right, visit)
    }
  }
}

# --- Post-order traversal ---
pub fn postorder(tree: BST) -> list {
  let mut result = []
  postorder_walk(tree.root, fn(v) {
    result = result |> collections::append(v)
  })
  result
}

fn postorder_walk(node: TreeNode?, visit: fn) {
  match node {
    nil => {}
    _ => {
      postorder_walk(node.left, visit)
      postorder_walk(node.right, visit)
      visit(node.value)
    }
  }
}

# --- Breadth-first search (level order) ---
pub fn bfs(tree: BST) -> list {
  match tree.root {
    nil => []
    _ => {
      let mut result = []
      let mut queue = [tree.root]

      while len(queue) > 0 {
        let current = queue[0]
        queue = queue |> collections::slice(1, len(queue))

        result = result |> collections::append(current.value)

        if current.left != nil {
          queue = queue |> collections::append(current.left)
        }
        if current.right != nil {
          queue = queue |> collections::append(current.right)
        }
      }
      result
    }
  }
}

# --- Level-order with levels ---
pub fn levels(tree: BST) -> list {
  match tree.root {
    nil => []
    _ => {
      let mut result = []
      let mut queue = [{ "node": tree.root, "level": 0 }]

      while len(queue) > 0 {
        let item = queue[0]
        queue = queue |> collections::slice(1, len(queue))
        let node = item["node"]
        let level = item["level"]

        # Extend result if needed
        while len(result) <= level {
          result = result |> collections::append([])
        }

        result[level] = result[level] |> collections::append(node.value)

        if node.left != nil {
          queue = queue |> collections::append({ "node": node.left, "level": level + 1 })
        }
        if node.right != nil {
          queue = queue |> collections::append({ "node": node.right, "level": level + 1 })
        }
      }
      result
    }
  }
}

# --- Count nodes ---
pub fn count(tree: BST) -> int {
  tree.size
}

# --- Count leaves ---
pub fn count_leaves(tree: BST) -> int {
  count_leaves_node(tree.root)
}

fn count_leaves_node(node: TreeNode?) -> int {
  match node {
    nil => 0
    _ => {
      if node.left == nil && node.right == nil { 1 }
      el { count_leaves_node(node.left) + count_leaves_node(node.right) }
    }
  }
}

# --- Path from root to value ---
pub fn path_to(tree: BST, value: int) -> list {
  let mut path = []
  find_path(tree.root, value, path)
  path
}

fn find_path(node: TreeNode?, value: int, path: mut list) -> bool {
  match node {
    nil => false
    _ => {
      path = path |> collections::append(node.value)
      if node.value == value { ret true }
      if value < node.value {
        find_path(node.left, value, path)
      } el {
        find_path(node.right, value, path)
      }
    }
  }
}

# --- Tree visualization ---
pub fn visualize(tree: BST) -> str {
  match tree.root {
    nil => "(empty tree)"
    _ => visualize_node(tree.root, "", true)
  }
}

fn visualize_node(node: TreeNode?, prefix: str, is_last: bool) -> str {
  match node {
    nil => ""
    _ => {
      let connector = if is_last { "└── " } el { "├── " }
      let extension = if is_last { "    " } el { "│   " }

      let mut result = "{prefix}{connector}{node.value}\n"

      let children = []
      if node.left != nil { children = children |> collections::append(node.left) }
      if node.right != nil { children = children |> collections::append(node.right) }

      let new_prefix = "{prefix}{extension}"

      if node.left != nil {
        let is_left_last = node.right == nil
        result = result + visualize_node(node.left, new_prefix, is_left_last)
      }
      if node.right != nil {
        result = result + visualize_node(node.right, new_prefix, true)
      }

      result
    }
  }
}

# --- Validate BST property ---
pub fn is_valid_bst(tree: BST) -> bool {
  validate_bst(tree.root, nil, nil)
}

fn validate_bst(node: TreeNode?, min_val: int?, max_val: int?) -> bool {
  match node {
    nil => true
    _ => {
      if min_val != nil && node.value <= min_val { ret false }
      if max_val != nil && node.value >= max_val { ret false }
      validate_bst(node.left, min_val, node.value) &&
        validate_bst(node.right, node.value, max_val)
    }
  }
}

# --- Lowest common ancestor ---
pub fn lca(tree: BST, a: int, b: int) -> int {
  lca_node(tree.root, a, b)
}

fn lca_node(node: TreeNode?, a: int, b: int) -> int {
  match node {
    nil => panic("Values not found in tree")
    _ => {
      if a < node.value && b < node.value {
        lca_node(node.left, a, b)
      } el if a > node.value && b > node.value {
        lca_node(node.right, a, b)
      } el {
        node.value
      }
    }
  }
}

# --- Demo ---
fn main() {
  let mut tree = new_tree()

  # Insert values
  [50, 30, 70, 20, 40, 60, 80, 10, 25, 35, 45]
    |> each(fn(v) { insert(tree, v) })

  print("=== Binary Search Tree ===\n")
  print(visualize(tree))

  print("Size: {count(tree)}")
  print("Height: {height(tree)}")
  print("Balanced: {is_balanced(tree)}")
  print("Valid BST: {is_valid_bst(tree)}")
  print("Min: {min(tree)}, Max: {max(tree)}")
  print("Leaves: {count_leaves(tree)}")

  print("\n=== Traversals ===")
  print("In-order:   {inorder(tree)}")
  print("Pre-order:  {preorder(tree)}")
  print("Post-order: {postorder(tree)}")
  print("BFS:        {bfs(tree)}")

  print("\n=== Levels ===")
  levels(tree) |> each_with_index(fn(level, i) {
    print("Level {i}: {level}")
  })

  print("\n=== Operations ===")
  print("Find 40: {find(tree, 40)}")
  print("Find 99: {find(tree, 99)}")
  print("Path to 35: {path_to(tree, 35)}")
  print("LCA(20, 40): {lca(tree, 20, 40)}")
  print("LCA(20, 60): {lca(tree, 20, 60)}")

  # Delete
  delete(tree, 30)
  print("\nAfter deleting 30:")
  print("In-order: {inorder(tree)}")
  print(visualize(tree))
}
