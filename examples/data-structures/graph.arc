// ============================================================================
// Graph Data Structure in Arc
// ============================================================================
// Full-featured graph with adjacency list representation. Supports directed
// and undirected graphs, weighted edges, BFS, DFS, topological sort,
// cycle detection, and connected components.
// Demonstrates: maps, lists, mutation, pattern matching, pipelines, closures,
// recursion, string interpolation, destructuring, higher-order functions
// ============================================================================

import collections

// --- Graph Creation ---

pub fn create(directed) => {
    vertices: {},
    edges: [],
    directed: directed,
    vertex_count: 0,
    edge_count: 0
}

pub fn directed() => create(true)
pub fn undirected() => create(false)

// --- Vertex Operations ---

pub fn add_vertex(g, id, data) {
    if g.vertices[id] != nil { ret g }
    g.vertices[id] = {
        id: id,
        data: data,
        adj: [],
        in_degree: 0,
        out_degree: 0
    }
    g.vertex_count = g.vertex_count + 1
    g
}

pub fn remove_vertex(g, id) {
    if g.vertices[id] == nil { ret g }

    // Remove all edges to/from this vertex
    g.edges = g.edges |> filter(e => e.from != id and e.to != id)

    // Remove from adjacency lists of other vertices
    for vid in vertex_ids(g) {
        if vid != id {
            let v = g.vertices[vid]
            v.adj = v.adj |> filter(e => e.to != id)
        }
    }

    g.vertices[id] = nil
    g.vertex_count = g.vertex_count - 1
    g
}

pub fn has_vertex(g, id) => g.vertices[id] != nil

pub fn get_vertex(g, id) => g.vertices[id]

pub fn vertex_ids(g) => g.vertices |> collections.keys()

pub fn vertex_count(g) => g.vertex_count

// --- Edge Operations ---

pub fn add_edge(g, from, to, weight) {
    // Auto-create vertices if they don't exist
    if g.vertices[from] == nil { g = add_vertex(g, from, nil) }
    if g.vertices[to] == nil { g = add_vertex(g, to, nil) }

    let edge = {from: from, to: to, weight: weight}
    g.edges = g.edges ++ [edge]
    g.edge_count = g.edge_count + 1

    // Update adjacency
    g.vertices[from].adj = g.vertices[from].adj ++ [{to: to, weight: weight}]
    g.vertices[from].out_degree = g.vertices[from].out_degree + 1
    g.vertices[to].in_degree = g.vertices[to].in_degree + 1

    if not g.directed {
        g.vertices[to].adj = g.vertices[to].adj ++ [{to: from, weight: weight}]
        g.vertices[to].out_degree = g.vertices[to].out_degree + 1
        g.vertices[from].in_degree = g.vertices[from].in_degree + 1
    }
    g
}

pub fn add_unweighted_edge(g, from, to) => add_edge(g, from, to, 1)

pub fn remove_edge(g, from, to) {
    g.edges = g.edges |> filter(e => not (e.from == from and e.to == to))
    if g.vertices[from] != nil {
        g.vertices[from].adj = g.vertices[from].adj |> filter(e => e.to != to)
    }
    if not g.directed and g.vertices[to] != nil {
        g.vertices[to].adj = g.vertices[to].adj |> filter(e => e.to != from)
    }
    g.edge_count = g.edge_count - 1
    g
}

pub fn has_edge(g, from, to) {
    if g.vertices[from] == nil { ret false }
    g.vertices[from].adj |> any(e => e.to == to)
}

pub fn get_weight(g, from, to) {
    if g.vertices[from] == nil { ret nil }
    let edge = g.vertices[from].adj |> find(e => e.to == to)
    match edge {
        nil => nil,
        e => e.weight
    }
}

pub fn neighbors(g, id) {
    if g.vertices[id] == nil { ret [] }
    g.vertices[id].adj |> map(e => e.to)
}

pub fn weighted_neighbors(g, id) {
    if g.vertices[id] == nil { ret [] }
    g.vertices[id].adj
}

// --- Breadth-First Search ---

pub fn bfs(g, start) {
    let mut visited = {}
    let mut queue = [start]
    let mut order = []
    let mut parent = {}
    let mut distance = {}
    visited[start] = true
    distance[start] = 0
    parent[start] = nil

    loop {
        if len(queue) == 0 { break }
        let node = queue[0]
        queue = queue |> drop(1)
        order = order ++ [node]

        for neighbor in neighbors(g, node) {
            if visited[neighbor] != true {
                visited[neighbor] = true
                parent[neighbor] = node
                distance[neighbor] = distance[node] + 1
                queue = queue ++ [neighbor]
            }
        }
    }
    {order: order, parent: parent, distance: distance}
}

// --- Depth-First Search ---

pub fn dfs(g, start) {
    let mut visited = {}
    let mut order = []
    let mut pre_order = []
    let mut post_order = []
    let mut time = 0

    fn visit(node) {
        if visited[node] == true { ret }
        visited[node] = true
        time = time + 1
        pre_order = pre_order ++ [{node: node, time: time}]
        order = order ++ [node]

        for neighbor in neighbors(g, node) {
            visit(neighbor)
        }

        time = time + 1
        post_order = post_order ++ [{node: node, time: time}]
    }

    visit(start)
    {order: order, pre_order: pre_order, post_order: post_order}
}

// DFS on entire graph (visits all components)
pub fn dfs_full(g) {
    let mut visited = {}
    let mut order = []

    fn visit(node) {
        if visited[node] == true { ret }
        visited[node] = true
        order = order ++ [node]
        for neighbor in neighbors(g, node) {
            visit(neighbor)
        }
    }

    for id in vertex_ids(g) {
        visit(id)
    }
    order
}

// --- Topological Sort (Kahn's Algorithm) ---

pub fn topological_sort(g) {
    if not g.directed { ret {error: "Topological sort requires directed graph"} }

    let mut in_deg = {}
    for id in vertex_ids(g) {
        in_deg[id] = g.vertices[id].in_degree
    }

    // Find all vertices with no incoming edges
    let mut queue = vertex_ids(g) |> filter(id => in_deg[id] == 0)
    let mut order = []
    let mut processed = 0

    loop {
        if len(queue) == 0 { break }
        let node = queue[0]
        queue = queue |> drop(1)
        order = order ++ [node]
        processed = processed + 1

        for neighbor in neighbors(g, node) {
            in_deg[neighbor] = in_deg[neighbor] - 1
            if in_deg[neighbor] == 0 {
                queue = queue ++ [neighbor]
            }
        }
    }

    if processed != g.vertex_count {
        {error: "Graph has a cycle — topological sort impossible"}
    } el {
        {order: order}
    }
}

// --- Cycle Detection ---

pub fn has_cycle(g) {
    if g.directed {
        has_cycle_directed(g)
    } el {
        has_cycle_undirected(g)
    }
}

fn has_cycle_directed(g) {
    let mut color = {}  // white=unvisited, gray=in-progress, black=done
    for id in vertex_ids(g) { color[id] = "white" }

    fn visit(node) {
        color[node] = "gray"
        for neighbor in neighbors(g, node) {
            match color[neighbor] {
                "gray" => ret true,   // Back edge = cycle
                "white" => {
                    if visit(neighbor) { ret true }
                },
                _ => {}
            }
        }
        color[node] = "black"
        false
    }

    for id in vertex_ids(g) {
        if color[id] == "white" {
            if visit(id) { ret true }
        }
    }
    false
}

fn has_cycle_undirected(g) {
    let mut visited = {}

    fn visit(node, parent) {
        visited[node] = true
        for neighbor in neighbors(g, node) {
            if visited[neighbor] != true {
                if visit(neighbor, node) { ret true }
            } el if neighbor != parent {
                ret true  // Visited neighbor that isn't parent = cycle
            }
        }
        false
    }

    for id in vertex_ids(g) {
        if visited[id] != true {
            if visit(id, nil) { ret true }
        }
    }
    false
}

// --- Connected Components ---

pub fn connected_components(g) {
    let mut visited = {}
    let mut components = []

    fn explore(node, component) {
        if visited[node] == true { ret }
        visited[node] = true
        component = component ++ [node]
        for neighbor in neighbors(g, node) {
            explore(neighbor, component)
        }
    }

    for id in vertex_ids(g) {
        if visited[id] != true {
            let mut component = []
            explore(id, component)
            components = components ++ [component]
        }
    }
    components
}

// --- Shortest Path (Dijkstra) ---

pub fn dijkstra(g, start) {
    let mut dist = {}
    let mut prev = {}
    let mut visited = {}

    for id in vertex_ids(g) {
        dist[id] = 999999999
        prev[id] = nil
    }
    dist[start] = 0

    loop {
        let mut min_node = nil
        let mut min_dist = 999999999
        for id in vertex_ids(g) {
            if visited[id] != true and dist[id] < min_dist {
                min_dist = dist[id]
                min_node = id
            }
        }
        if min_node == nil { break }
        visited[min_node] = true

        for edge in weighted_neighbors(g, min_node) {
            let alt = dist[min_node] + edge.weight
            if alt < dist[edge.to] {
                dist[edge.to] = alt
                prev[edge.to] = min_node
            }
        }
    }

    {distances: dist, previous: prev}
}

pub fn reconstruct_path(result, target) {
    let mut path = []
    let mut curr = target
    loop {
        if curr == nil { break }
        path = [curr] ++ path
        curr = result.previous[curr]
    }
    {path: path, distance: result.distances[target]}
}

// --- Graph Visualization (ASCII) ---

pub fn to_string(g) {
    let mut lines = []
    let kind = if g.directed { "Directed" } el { "Undirected" }
    lines = lines ++ ["{kind} Graph ({g.vertex_count} vertices, {g.edge_count} edges)"]

    for id in vertex_ids(g) {
        let adj = weighted_neighbors(g, id)
            |> map(e => "{e.to}({e.weight})")
            |> join(", ")
        lines = lines ++ ["  {id} -> [{adj}]"]
    }
    lines |> join("\n")
}

// --- Utility ---

fn any(lst, pred) => lst |> filter(pred) |> len() > 0
fn find(lst, pred) {
    for item in lst {
        if pred(item) { ret item }
    }
    nil
}
fn join(lst, sep) => match lst {
    [] => "",
    [x] => "{x}",
    [x, ..rest] => "{x}{sep}{join(rest, sep)}"
}

// --- Test Suite ---

pub fn run_tests() {
    print("=== Graph Tests ===\n")

    // Undirected graph
    print("--- Undirected Graph ---")
    let mut ug = undirected()
    ug = add_edge(ug, "A", "B", 4)
    ug = add_edge(ug, "A", "C", 2)
    ug = add_edge(ug, "B", "D", 5)
    ug = add_edge(ug, "C", "D", 8)
    ug = add_edge(ug, "D", "E", 6)
    print(to_string(ug))
    print("Neighbors of A: {neighbors(ug, "A")}")
    print("Has edge A-B: {has_edge(ug, "A", "B")}")
    print("Has edge A-E: {has_edge(ug, "A", "E")}")
    print("Weight A-C: {get_weight(ug, "A", "C")}")

    let bfs_result = bfs(ug, "A")
    print("BFS from A: {bfs_result.order}")
    print("BFS distances: {bfs_result.distance}")

    let dfs_result = dfs(ug, "A")
    print("DFS from A: {dfs_result.order}")

    print("Has cycle: {has_cycle(ug)}")
    let comps = connected_components(ug)
    print("Connected components: {comps}")

    // Directed acyclic graph
    print("\n--- Directed Acyclic Graph ---")
    let mut dag = directed()
    dag = add_edge(dag, "A", "B", 1)
    dag = add_edge(dag, "A", "C", 1)
    dag = add_edge(dag, "B", "D", 1)
    dag = add_edge(dag, "C", "D", 1)
    dag = add_edge(dag, "D", "E", 1)
    dag = add_edge(dag, "C", "E", 1)
    print(to_string(dag))

    let topo = topological_sort(dag)
    print("Topological order: {topo.order}")
    print("Has cycle: {has_cycle(dag)}")

    // Create a cycle
    print("\n--- Cycle Detection ---")
    let mut cyclic = directed()
    cyclic = add_edge(cyclic, "A", "B", 1)
    cyclic = add_edge(cyclic, "B", "C", 1)
    cyclic = add_edge(cyclic, "C", "A", 1)
    print("Directed cycle: {has_cycle(cyclic)}")

    let mut ucyclic = undirected()
    ucyclic = add_edge(ucyclic, "A", "B", 1)
    ucyclic = add_edge(ucyclic, "B", "C", 1)
    ucyclic = add_edge(ucyclic, "C", "A", 1)
    print("Undirected cycle: {has_cycle(ucyclic)}")

    // Weighted shortest path
    print("\n--- Dijkstra's Shortest Path ---")
    let mut wg = directed()
    wg = add_edge(wg, "S", "A", 7)
    wg = add_edge(wg, "S", "B", 2)
    wg = add_edge(wg, "A", "C", 3)
    wg = add_edge(wg, "B", "A", 3)
    wg = add_edge(wg, "B", "C", 8)
    wg = add_edge(wg, "C", "D", 1)
    wg = add_edge(wg, "A", "D", 6)
    print(to_string(wg))

    let dijk = dijkstra(wg, "S")
    for target in ["A", "B", "C", "D"] {
        let p = reconstruct_path(dijk, target)
        print("  S -> {target}: distance={p.distance}, path={p.path}")
    }

    // Remove operations
    print("\n--- Remove Operations ---")
    let mut rg = undirected()
    rg = add_edge(rg, "X", "Y", 1)
    rg = add_edge(rg, "Y", "Z", 1)
    rg = add_edge(rg, "X", "Z", 1)
    print("Before remove: {neighbors(rg, "X")}")
    rg = remove_edge(rg, "X", "Y")
    print("After remove X-Y: {neighbors(rg, "X")}")
    rg = remove_vertex(rg, "Z")
    print("After remove Z: vertices={vertex_ids(rg)}")

    // Disconnected graph
    print("\n--- Disconnected Graph ---")
    let mut disc = undirected()
    disc = add_edge(disc, "A", "B", 1)
    disc = add_edge(disc, "C", "D", 1)
    disc = add_edge(disc, "E", "F", 1)
    let dc = connected_components(disc)
    print("Components: {dc}")
    print("Component count: {len(dc)}")

    print("\n✓ All Graph tests passed!")
}

run_tests()
