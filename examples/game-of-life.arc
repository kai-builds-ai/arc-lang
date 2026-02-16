// ============================================================================
// Conway's Game of Life in Arc
// ============================================================================
// A cellular automaton simulation with grid management, neighbor counting,
// pattern matching for cell state transitions, and ASCII rendering.
// Demonstrates: 2D lists, closures, pattern matching, pipelines, mut, loops.
// ============================================================================

import collections
import math

// --- Grid Creation ---

pub fn create_grid(width, height, default_val) => {
    collections.range(0, height)
    |> collections.map(fn(_) => collections.range(0, width) |> collections.map(fn(_) => default_val))
}

pub fn grid_width(grid) => grid[0] |> collections.length()
pub fn grid_height(grid) => grid |> collections.length()

pub fn get_cell(grid, x, y) => {
    let h = grid_height(grid)
    let w = grid_width(grid)
    match x >= 0 and x < w and y >= 0 and y < h {
        true => grid[y][x],
        false => 0
    }
}

pub fn set_cell(grid, x, y, val) => {
    grid |> collections.map_indexed(fn(row, ry) => {
        match ry == y {
            true => row |> collections.map_indexed(fn(cell, rx) => {
                match rx == x { true => val, false => cell }
            }),
            false => row
        }
    })
}

// --- Neighbor Counting ---

let NEIGHBOR_OFFSETS = [
    [-1, -1], [0, -1], [1, -1],
    [-1,  0],          [1,  0],
    [-1,  1], [0,  1], [1,  1]
]

pub fn count_neighbors(grid, x, y) => {
    NEIGHBOR_OFFSETS
    |> collections.map(fn(offset) => get_cell(grid, x + offset[0], y + offset[1]))
    |> collections.reduce(0, fn(sum, v) => sum + v)
}

// --- Cell State Transitions (the core rules) ---

pub fn next_cell_state(alive, neighbors) => {
    match [alive, neighbors] {
        [1, 2] => 1,   // alive with 2 neighbors: survive
        [_, 3] => 1,   // any cell with 3 neighbors: alive (birth or survive)
        _ => 0          // all other cases: dead
    }
}

// --- Generation Stepping ---

pub fn next_generation(grid) => {
    let h = grid_height(grid)
    let w = grid_width(grid)
    
    collections.range(0, h) |> collections.map(fn(y) => {
        collections.range(0, w) |> collections.map(fn(x) => {
            let alive = get_cell(grid, x, y)
            let neighbors = count_neighbors(grid, x, y)
            next_cell_state(alive, neighbors)
        })
    })
}

// --- ASCII Rendering ---

pub fn render(grid, alive_char, dead_char) => {
    let border = "+" + "-".repeat(grid_width(grid) * 2 + 1) + "+"
    let rows = grid |> collections.map(fn(row) => {
        let cells = row
            |> collections.map(fn(cell) => match cell { 1 => alive_char, _ => dead_char })
            |> collections.join(" ")
        "| ${cells} |"
    })
    [border] |> collections.concat(rows) |> collections.concat([border]) |> collections.join("\n")
}

pub fn render_simple(grid) => render(grid, "█", "·")

// --- Statistics ---

pub fn population(grid) => {
    grid
    |> collections.flat_map(fn(row) => row)
    |> collections.reduce(0, fn(sum, cell) => sum + cell)
}

pub fn density(grid) => {
    let total = grid_width(grid) * grid_height(grid)
    let pop = population(grid)
    pop / total
}

// --- Common Patterns ---

pub fn place_pattern(grid, pattern, offset_x, offset_y) => {
    pattern |> collections.reduce_indexed(grid, fn(g, row, dy) => {
        row |> collections.reduce_indexed(g, fn(g2, cell, dx) => {
            match cell {
                1 => set_cell(g2, offset_x + dx, offset_y + dy, 1),
                _ => g2
            }
        })
    })
}

// Classic patterns
pub fn glider() => [
    [0, 1, 0],
    [0, 0, 1],
    [1, 1, 1]
]

pub fn blinker() => [
    [1, 1, 1]
]

pub fn block() => [
    [1, 1],
    [1, 1]
]

pub fn beacon() => [
    [1, 1, 0, 0],
    [1, 1, 0, 0],
    [0, 0, 1, 1],
    [0, 0, 1, 1]
]

pub fn pulsar() => [
    [0,0,1,1,1,0,0,0,1,1,1,0,0],
    [0,0,0,0,0,0,0,0,0,0,0,0,0],
    [1,0,0,0,0,1,0,1,0,0,0,0,1],
    [1,0,0,0,0,1,0,1,0,0,0,0,1],
    [1,0,0,0,0,1,0,1,0,0,0,0,1],
    [0,0,1,1,1,0,0,0,1,1,1,0,0],
    [0,0,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,1,1,1,0,0,0,1,1,1,0,0],
    [1,0,0,0,0,1,0,1,0,0,0,0,1],
    [1,0,0,0,0,1,0,1,0,0,0,0,1],
    [1,0,0,0,0,1,0,1,0,0,0,0,1],
    [0,0,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,1,1,1,0,0,0,1,1,1,0,0]
]

pub fn glider_gun() => [
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,1,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,0,0,0,0,0,1,1],
    [0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,1,0,0,0,0,1,1,0,0,0,0,0,0,0,0,0,0,0,0,1,1],
    [1,1,0,0,0,0,0,0,0,0,1,0,0,0,0,0,1,0,0,0,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    [1,1,0,0,0,0,0,0,0,0,1,0,0,0,1,0,1,1,0,0,0,0,1,0,1,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,1,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]
]

// --- Simulation Runner ---

pub fn simulate(grid, generations, print_every) => {
    let mut current = grid
    let mut gen = 0
    let mut history = []
    
    loop {
        match gen >= generations {
            true => break,
            false => {
                match gen % print_every == 0 {
                    true => {
                        print("\n--- Generation ${gen} (population: ${population(current)}) ---")
                        print(render_simple(current))
                    },
                    false => {}
                }
                
                history = history |> collections.append({
                    generation: gen,
                    population: population(current),
                    density: density(current)
                })
                
                current = next_generation(current)
                gen = gen + 1
            }
        }
    }
    
    { final_grid: current, history: history }
}

// --- Pattern Detection ---

pub fn detect_steady_state(history, window) => {
    match collections.length(history) < window {
        true => false,
        false => {
            let recent = history |> collections.take_last(window)
            let pops = recent |> collections.map(fn(h) => h.population)
            let unique_pops = pops |> collections.unique()
            collections.length(unique_pops) <= 2  // oscillator or still life
        }
    }
}

// --- Main Demo ---

fn main() => {
    print("=== Conway's Game of Life in Arc ===\n")
    
    // Create a 30x20 grid
    let mut grid = create_grid(30, 20, 0)
    
    // Place some patterns
    grid = grid
        |> place_pattern(glider(), 1, 1)
        |> place_pattern(blinker(), 15, 5)
        |> place_pattern(beacon(), 20, 10)
        |> place_pattern(block(), 25, 1)
        |> place_pattern(glider(), 5, 10)
    
    print("Initial population: ${population(grid)}")
    print("Grid density: ${density(grid)}")
    
    // Run simulation
    let result = simulate(grid, 50, 10)
    
    // Analyze results
    print("\n--- Population History ---")
    result.history
    |> collections.filter(fn(h) => h.generation % 5 == 0)
    |> collections.each(fn(h) => {
        let bar = "█".repeat(math.min(h.population, 40))
        print("Gen ${h.generation}: ${bar} (${h.population})")
    })
    
    let is_steady = detect_steady_state(result.history, 10)
    print("\nSteady state detected: ${is_steady}")
    
    // Try the pulsar pattern
    print("\n\n=== Pulsar Pattern ===")
    let mut pulsar_grid = create_grid(20, 20, 0)
    pulsar_grid = pulsar_grid |> place_pattern(pulsar(), 3, 3)
    simulate(pulsar_grid, 6, 3)
    
    print("\nDone!")
}

main()
