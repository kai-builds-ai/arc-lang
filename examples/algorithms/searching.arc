// ============================================================================
// Searching & Graph Algorithms in Arc
// ============================================================================
// Search algorithms: linear, binary, interpolation, jump, exponential.
// Graph algorithms: BFS, DFS, Dijkstra's shortest path.
// Demonstrates: recursion, pattern matching, pipelines, maps, sets, closures,
// list comprehensions, mutation, destructuring, string interpolation
// ============================================================================

import collections
import math

// --- Linear Search ---
// Simple scan through the list. O(n).

pub fn linear_search(lst, target) {
    for i in 0..len(lst) {
        if lst[i] == target { ret {found: true, index: i} }
    }
    {found: false, index: -1}
}

// Linear search with predicate
pub fn find_first(lst, pred) {
    for i in 0..len(lst) {
        if pred(lst[i]) { ret {found: true, index: i, value: lst[i]} }
    }
    {found: false, index: -1, value: nil}
}

// --- Binary Search ---
// Requires sorted input. O(log n).

pub fn binary_search(lst, target) {
    let mut lo = 0
    let mut hi = len(lst) - 1
    loop {
        if lo > hi { ret {found: false, index: -1} }
        let mid = (lo + hi) / 2
        match lst[mid] {
            x if x == target => ret {found: true, index: mid},
            x if x < target => lo = mid + 1,
            _ => hi = mid - 1
        }
    }
}

// Recursive binary search
pub fn binary_search_rec(lst, target, lo, hi) => match true {
    _ if lo > hi => {found: false, index: -1},
    _ => {
        let mid = (lo + hi) / 2
        match lst[mid] {
            x if x == target => {found: true, index: mid},
            x if x < target => binary_search_rec(lst, target, mid + 1, hi),
            _ => binary_search_rec(lst, target, lo, mid - 1)
        }
    }
}

// Find lower bound (first element >= target)
pub fn lower_bound(lst, target) {
    let mut lo = 0
    let mut hi = len(lst)
    loop {
        if lo >= hi { ret lo }
        let mid = (lo + hi) / 2
        if lst[mid] < target { lo = mid + 1 } el { hi = mid }
    }
}

// --- Interpolation Search ---
// Improved binary search for uniformly distributed data. O(log log n) avg.

pub fn interpolation_search(lst, target) {
    let mut lo = 0
    let mut hi = len(lst) - 1
    loop {
        if lo > hi { ret {found: false, index: -1} }
        if lst[lo] == lst[hi] {
            if lst[lo] == target { ret {found: true, index: lo} }
            el { ret {found: false, index: -1} }
        }
        // Estimate position using linear interpolation
        let pos = lo + ((target - lst[lo]) * (hi - lo)) / (lst[hi] - lst[lo])
        if pos < lo or pos > hi { ret {found: false, index: -1} }
        match lst[pos] {
            x if x == target => ret {found: true, index: pos},
            x if x < target => lo = pos + 1,
            _ => hi = pos - 1
        }
    }
}

// --- Jump Search ---
// Block-based search on sorted arrays. O(√n).

pub fn jump_search(lst, target) {
    let n = len(lst)
    if n == 0 { ret {found: false, index: -1} }
    let step = math.sqrt(n) |> math.floor() |> max(1)

    // Find the block where element may be present
    let mut prev = 0
    let mut curr = step
    loop {
        if curr >= n or lst[min(curr, n - 1)] >= target { break }
        prev = curr
        curr = curr + step
    }

    // Linear search within the block
    let mut i = prev
    let end = min(curr + 1, n)
    loop {
        if i >= end { ret {found: false, index: -1} }
        if lst[i] == target { ret {found: true, index: i} }
        if lst[i] > target { ret {found: false, index: -1} }
        i = i + 1
    }
}

// --- Exponential Search ---
// Find range then binary search. Good for unbounded/infinite lists. O(log n).

pub fn exponential_search(lst, target) {
    let n = len(lst)
    if n == 0 { ret {found: false, index: -1} }
    if lst[0] == target { ret {found: true, index: 0} }

    // Find range by doubling
    let mut bound = 1
    loop {
        if bound >= n or lst[bound] > target { break }
        bound = bound * 2
    }

    // Binary search within [bound/2, min(bound, n-1)]
    let lo = bound / 2
    let hi = min(bound, n - 1)
    binary_search_rec(lst, target, lo, hi)
}

// --- Graph Data Structure (Adjacency List) ---

pub fn create_graph(directed) => {
    adj: {},
    directed: directed,
    weights: {}
}

pub fn add_edge(graph, from, to, weight) {
    if graph.adj[from] == nil { graph.adj[from] = [] }
    if graph.adj[to] == nil { graph.adj[to] = [] }
    graph.adj[from] = graph.adj[from] ++ [to]
    let key = "{from}->{to}"
    graph.weights[key] = weight
    if not graph.directed {
        graph.adj[to] = graph.adj[to] ++ [from]
        graph.weights["{to}->{from}"] = weight
    }
    graph
}

pub fn neighbors(graph, node) => match graph.adj[node] {
    nil => [],
    lst => lst
}

pub fn edge_weight(graph, from, to) => match graph.weights["{from}->{to}"] {
    nil => 999999999,
    w => w
}

// --- Breadth-First Search ---

pub fn bfs(graph, start) {
    let mut visited = {}
    let mut queue = [start]
    let mut order = []
    visited[start] = true

    loop {
        if len(queue) == 0 { break }
        let node = queue[0]
        queue = queue |> drop(1)
        order = order ++ [node]

        for neighbor in neighbors(graph, node) {
            if visited[neighbor] != true {
                visited[neighbor] = true
                queue = queue ++ [neighbor]
            }
        }
    }
    order
}

// BFS shortest path (unweighted)
pub fn bfs_shortest_path(graph, start, goal) {
    let mut visited = {}
    let mut parent = {}
    let mut queue = [start]
    visited[start] = true
    parent[start] = nil

    loop {
        if len(queue) == 0 { ret nil }
        let node = queue[0]
        queue = queue |> drop(1)

        if node == goal {
            // Reconstruct path
            let mut path = []
            let mut curr = goal
            loop {
                if curr == nil { break }
                path = [curr] ++ path
                curr = parent[curr]
            }
            ret path
        }

        for neighbor in neighbors(graph, node) {
            if visited[neighbor] != true {
                visited[neighbor] = true
                parent[neighbor] = node
                queue = queue ++ [neighbor]
            }
        }
    }
    nil
}

// --- Depth-First Search ---

pub fn dfs(graph, start) {
    let mut visited = {}
    let mut order = []
    dfs_visit(graph, start, visited, order)
    order
}

fn dfs_visit(graph, node, visited, order) {
    if visited[node] == true { ret }
    visited[node] = true
    order = order ++ [node]
    for neighbor in neighbors(graph, node) {
        dfs_visit(graph, neighbor, visited, order)
    }
}

// Iterative DFS using explicit stack
pub fn dfs_iterative(graph, start) {
    let mut visited = {}
    let mut stack = [start]
    let mut order = []

    loop {
        if len(stack) == 0 { break }
        let node = stack[len(stack) - 1]
        stack = stack |> take(len(stack) - 1)

        if visited[node] == true { continue }
        visited[node] = true
        order = order ++ [node]

        // Push neighbors in reverse for consistent ordering
        let nbrs = neighbors(graph, node) |> reverse()
        for neighbor in nbrs {
            if visited[neighbor] != true {
                stack = stack ++ [neighbor]
            }
        }
    }
    order
}

// DFS path finding
pub fn dfs_path(graph, start, goal) {
    let mut visited = {}
    dfs_path_helper(graph, start, goal, visited, [])
}

fn dfs_path_helper(graph, node, goal, visited, path) {
    if visited[node] == true { ret nil }
    visited[node] = true
    let new_path = path ++ [node]

    if node == goal { ret new_path }

    for neighbor in neighbors(graph, node) {
        let result = dfs_path_helper(graph, neighbor, goal, visited, new_path)
        if result != nil { ret result }
    }
    nil
}

// --- Dijkstra's Shortest Path ---

pub fn dijkstra(graph, start) {
    let mut dist = {}
    let mut prev = {}
    let mut visited = {}

    // Initialize all nodes with infinity distance
    for node in keys(graph.adj) {
        dist[node] = 999999999
        prev[node] = nil
    }
    dist[start] = 0

    loop {
        // Find unvisited node with minimum distance
        let mut min_node = nil
        let mut min_dist = 999999999
        for node in keys(graph.adj) {
            if visited[node] != true and dist[node] < min_dist {
                min_dist = dist[node]
                min_node = node
            }
        }

        if min_node == nil { break }
        visited[min_node] = true

        // Update distances for neighbors
        for neighbor in neighbors(graph, min_node) {
            let w = edge_weight(graph, min_node, neighbor)
            let alt = dist[min_node] + w
            if alt < dist[neighbor] {
                dist[neighbor] = alt
                prev[neighbor] = min_node
            }
        }
    }

    {distances: dist, previous: prev}
}

// Reconstruct shortest path from Dijkstra result
pub fn shortest_path(dijkstra_result, target) {
    let mut path = []
    let mut curr = target
    loop {
        if curr == nil { break }
        path = [curr] ++ path
        curr = dijkstra_result.previous[curr]
    }
    match len(path) {
        0 => nil,
        _ => {path: path, distance: dijkstra_result.distances[target]}
    }
}

// --- Utility ---

fn min(a, b) => if a < b { a } el { b }
fn max(a, b) => if a > b { a } el { b }
fn reverse(lst) => lst |> reduce([], (acc, x) => [x] ++ acc)
fn keys(m) => m |> collections.keys()

// --- Test Suite ---

pub fn run_tests() {
    print("=== Search Algorithm Tests ===\n")

    let sorted = [2, 5, 8, 12, 16, 23, 38, 56, 72, 91]

    // Test all search algorithms
    let searches = [
        {name: "Linear", fn: (lst, t) => linear_search(lst, t)},
        {name: "Binary", fn: (lst, t) => binary_search(lst, t)},
        {name: "Interpolation", fn: (lst, t) => interpolation_search(lst, t)},
        {name: "Jump", fn: (lst, t) => jump_search(lst, t)},
        {name: "Exponential", fn: (lst, t) => exponential_search(lst, t)}
    ]

    for algo in searches {
        let r = algo.fn(sorted, 23)
        print("[{algo.name}] Search for 23: index={r.index} found={r.found}")
        let r2 = algo.fn(sorted, 99)
        print("[{algo.name}] Search for 99: found={r2.found}")
    }

    // Find with predicate
    let items = [{name: "a", val: 1}, {name: "b", val: 5}, {name: "c", val: 3}]
    let found = find_first(items, x => x.val > 4)
    print("\nFind first val > 4: {found.value.name} at index {found.index}")

    print("\n=== Graph Algorithm Tests ===\n")

    // Build a graph
    let mut g = create_graph(false)
    g = add_edge(g, "A", "B", 4)
    g = add_edge(g, "A", "C", 2)
    g = add_edge(g, "B", "D", 3)
    g = add_edge(g, "B", "E", 1)
    g = add_edge(g, "C", "D", 5)
    g = add_edge(g, "D", "E", 2)
    g = add_edge(g, "D", "F", 6)
    g = add_edge(g, "E", "F", 3)

    let bfs_order = bfs(g, "A")
    print("BFS from A: {bfs_order}")

    let dfs_order = dfs(g, "A")
    print("DFS from A: {dfs_order}")

    let dfs_it = dfs_iterative(g, "A")
    print("DFS (iterative) from A: {dfs_it}")

    let path = bfs_shortest_path(g, "A", "F")
    print("BFS shortest path A->F: {path}")

    let dpath = dfs_path(g, "A", "F")
    print("DFS path A->F: {dpath}")

    // Dijkstra's on weighted graph
    let mut wg = create_graph(true)
    wg = add_edge(wg, "S", "A", 7)
    wg = add_edge(wg, "S", "B", 2)
    wg = add_edge(wg, "S", "C", 3)
    wg = add_edge(wg, "A", "D", 4)
    wg = add_edge(wg, "A", "B", 3)
    wg = add_edge(wg, "B", "D", 4)
    wg = add_edge(wg, "B", "H", 1)
    wg = add_edge(wg, "C", "L", 2)
    wg = add_edge(wg, "D", "F", 5)
    wg = add_edge(wg, "H", "F", 3)
    wg = add_edge(wg, "H", "G", 2)
    wg = add_edge(wg, "L", "I", 4)
    wg = add_edge(wg, "L", "J", 4)
    wg = add_edge(wg, "I", "J", 6)
    wg = add_edge(wg, "I", "K", 4)
    wg = add_edge(wg, "J", "K", 4)
    wg = add_edge(wg, "G", "E", 2)
    wg = add_edge(wg, "E", "K", 5)

    let result = dijkstra(wg, "S")
    print("\nDijkstra from S:")
    for node in ["A", "B", "C", "D", "E", "F", "G", "H"] {
        let sp = shortest_path(result, node)
        print("  S -> {node}: distance={sp.distance}, path={sp.path}")
    }

    print("\n✓ All tests complete!")
}

run_tests()
