# ============================================================================
# Snake Game Logic in Arc
# ============================================================================
# Complete snake game: grid world, snake body as list, direction handling
# with pattern matching, food spawning, collision detection, score tracking,
# and a simulation game loop with ASCII rendering.
# Demonstrates: mutation, pattern matching, closures, pipelines, lists, maps,
# string interpolation, recursion, higher-order functions
# ============================================================================

use collections

# --- Constants ---

let EMPTY = 0
let SNAKE = 1
let FOOD = 2
let WALL = 3

# --- Direction ---

pub fn direction(name) => match name {
    "up"    => {dx: 0, dy: -1},
    "down"  => {dx: 0, dy: 1},
    "left"  => {dx: -1, dy: 0},
    "right" => {dx: 1, dy: 0},
    _ => {dx: 0, dy: 0}
}

pub fn opposite(dir) => match dir {
    {dx: 0, dy: -1} => direction("down"),
    {dx: 0, dy: 1}  => direction("up"),
    {dx: -1, dy: 0} => direction("right"),
    {dx: 1, dy: 0}  => direction("left"),
    _ => dir
}

pub fn is_opposite(d1, d2) => d1.dx == -d2.dx and d1.dy == -d2.dy

# --- Game State ---

pub fn new_game(width, height) {
    let mid_x = width / 2
    let mid_y = height / 2

    let mut state = {
        width: width,
        height: height,
        snake: [
            {x: mid_x, y: mid_y},
            {x: mid_x - 1, y: mid_y},
            {x: mid_x - 2, y: mid_y}
        ],
        direction: direction("right"),
        food: nil,
        score: 0,
        alive: true,
        moves: 0,
        seed: 42,
        grow_pending: 0
    }
    state = spawn_food(state)
    state
}

# --- Pseudo-Random Number Generator ---

fn next_random(state) {
    state.seed = (state.seed * 1103515245 + 12345) % 2147483648
    state.seed
}

fn random_range(state, min_val, max_val) {
    let r = next_random(state)
    min_val + (r % (max_val - min_val))
}

# --- Food Spawning ---

fn spawn_food(state) {
    # Find all empty cells
    let snake_set = state.snake |> map(s => "{s.x},{s.y}")

    let mut attempts = 0
    loop {
        let x = random_range(state, 0, state.width)
        let y = random_range(state, 0, state.height)
        let key = "{x},{y}"

        if not (snake_set |> contains(key)) {
            state.food = {x: x, y: y}
            ret state
        }

        attempts = attempts + 1
        if attempts > 100 { break }
    }
    state
}

fn contains(lst, item) => lst |> filter(x => x == item) |> len() > 0

# --- Movement ---

pub fn change_direction(state, new_dir) {
    # Prevent 180-degree turns
    if is_opposite(state.direction, new_dir) {
        ret state
    }
    state.direction = new_dir
    state
}

pub fn tick(state) {
    if not state.alive { ret state }

    let head = state.snake[0]
    let new_head = {
        x: head.x + state.direction.dx,
        y: head.y + state.direction.dy
    }

    # Check wall collision
    if new_head.x < 0 or new_head.x >= state.width or
       new_head.y < 0 or new_head.y >= state.height {
        state.alive = false
        ret state
    }

    # Check self collision (skip tail if not growing, as it will move)
    let check_body = if state.grow_pending > 0 {
        state.snake
    } el {
        state.snake |> take(len(state.snake) - 1)
    }

    for seg in check_body {
        if seg.x == new_head.x and seg.y == new_head.y {
            state.alive = false
            ret state
        }
    }

    # Move snake
    state.snake = [new_head] ++ state.snake

    # Check food
    if state.food != nil and new_head.x == state.food.x and new_head.y == state.food.y {
        state.score = state.score + 10
        state.grow_pending = state.grow_pending + 1
        state = spawn_food(state)
    }

    # Remove tail unless growing
    if state.grow_pending > 0 {
        state.grow_pending = state.grow_pending - 1
    } el {
        state.snake = state.snake |> take(len(state.snake) - 1)
    }

    state.moves = state.moves + 1
    state
}

# --- AI Snake (simple greedy) ---

pub fn ai_direction(state) {
    let head = state.snake[0]
    let food = state.food
    if food == nil { ret state.direction }

    # Prioritize moves toward food
    let mut candidates = []

    if food.x > head.x { candidates = candidates ++ [direction("right")] }
    if food.x < head.x { candidates = candidates ++ [direction("left")] }
    if food.y > head.y { candidates = candidates ++ [direction("down")] }
    if food.y < head.y { candidates = candidates ++ [direction("up")] }

    # Filter out moves that would kill us
    let safe = candidates |> filter(d => {
        let nx = head.x + d.dx
        let ny = head.y + d.dy
        is_safe(state, nx, ny) and not is_opposite(d, state.direction)
    })

    match len(safe) {
        0 => {
            # Try any safe direction
            let all_dirs = ["up", "down", "left", "right"] |> map(direction)
            let any_safe = all_dirs |> filter(d => {
                let nx = head.x + d.dx
                let ny = head.y + d.dy
                is_safe(state, nx, ny) and not is_opposite(d, state.direction)
            })
            match len(any_safe) {
                0 => state.direction,
                _ => any_safe[0]
            }
        },
        _ => safe[0]
    }
}

fn is_safe(state, x, y) {
    if x < 0 or x >= state.width or y < 0 or y >= state.height { ret false }
    for seg in state.snake {
        if seg.x == x and seg.y == y { ret false }
    }
    true
}

# --- ASCII Rendering ---

pub fn render(state) {
    let mut grid = []
    for y in 0..state.height {
        let mut row = []
        for x in 0..state.width {
            row = row ++ ["."]
        }
        grid = grid ++ [row]
    }

    # Draw food
    if state.food != nil {
        grid[state.food.y][state.food.x] = "★"
    }

    # Draw snake body
    for i in 1..len(state.snake) {
        let seg = state.snake[i]
        grid[seg.y][seg.x] = "○"
    }

    # Draw snake head
    let head = state.snake[0]
    let head_char = match state.direction {
        {dx: 1}  => "▶",
        {dx: -1} => "◀",
        {dy: -1} => "▲",
        {dy: 1}  => "▼",
        _ => "●"
    }
    if head.x >= 0 and head.x < state.width and head.y >= 0 and head.y < state.height {
        grid[head.y][head.x] = head_char
    }

    # Print border and grid
    let border = "+" ++ "-".repeat(state.width * 2 + 1) ++ "+"
    print(border)
    for row in grid {
        let line = row |> join(" ")
        print("| {line} |")
    }
    print(border)
    print("Score: {state.score} | Length: {len(state.snake)} | Moves: {state.moves} | Alive: {state.alive}")
}

fn join(lst, sep) => match lst {
    [] => "",
    [x] => "{x}",
    [x, ..rest] => "{x}{sep}{join(rest, sep)}"
}

# --- Game Simulation ---

pub fn simulate(width, height, max_ticks) {
    let mut state = new_game(width, height)

    print("=== Snake Game Simulation ===")
    print("Grid: {width}x{height}, Max ticks: {max_ticks}\n")
    render(state)

    let mut tick_count = 0
    loop {
        if not state.alive or tick_count >= max_ticks { break }

        # AI chooses direction
        let new_dir = ai_direction(state)
        state = change_direction(state, new_dir)
        state = tick(state)

        # Render every 5 ticks
        if tick_count % 5 == 0 {
            print("\n--- Tick {tick_count} ---")
            render(state)
        }

        tick_count = tick_count + 1
    }

    print("\n=== Game Over ===")
    render(state)

    match state.alive {
        false => print("💀 Snake died after {state.moves} moves!"),
        true => print("⏰ Time limit reached after {state.moves} moves!")
    }

    {
        score: state.score,
        length: len(state.snake),
        moves: state.moves,
        alive: state.alive
    }
}

# --- Multiple Runs ---

pub fn run_multiple(n, width, height, max_ticks) {
    let mut results = []
    for i in 0..n {
        print("\n{'='.repeat(40)}")
        print("Run {i + 1}/{n}")
        let r = simulate(width, height, max_ticks)
        results = results ++ [r]
    }

    let avg_score = results |> map(r => r.score) |> sum() / n
    let avg_length = results |> map(r => r.length) |> sum() / n
    let max_score = results |> map(r => r.score) |> reduce(0, max)
    let max_length = results |> map(r => r.length) |> reduce(0, max)

    print("\n=== Summary ({n} runs) ===")
    print("Avg score:  {avg_score}")
    print("Avg length: {avg_length}")
    print("Max score:  {max_score}")
    print("Max length: {max_length}")
}

fn sum(lst) => lst |> reduce(0, (a, b) => a + b)
fn max(a, b) => if a > b { a } el { b }

# --- Run ---

simulate(12, 8, 50)
