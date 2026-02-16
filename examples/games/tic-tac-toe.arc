// ============================================================================
// Tic-Tac-Toe with Minimax AI in Arc
// ============================================================================
// Complete game with board state, move validation, win detection via pattern
// matching, minimax AI with alpha-beta pruning, and ASCII rendering.
// Demonstrates: pattern matching, recursion, closures, pipelines, mutation,
// maps, lists, string interpolation, higher-order functions
// ============================================================================

import collections

// --- Board ---
// Board is a flat list of 9 cells: nil (empty), "X", or "O"

pub fn new_board() => [nil, nil, nil, nil, nil, nil, nil, nil, nil]

pub fn cell_str(cell) => match cell {
    "X" => "X",
    "O" => "O",
    nil => " "
}

pub fn render(board) {
    let c = board |> map(cell_str)
    print("")
    print(" {c[0]} | {c[1]} | {c[2]}")
    print("---+---+---")
    print(" {c[3]} | {c[4]} | {c[5]}")
    print("---+---+---")
    print(" {c[6]} | {c[7]} | {c[8]}")
    print("")
}

pub fn render_with_numbers(board) {
    let c = board |> map_indexed((cell, i) => match cell {
        nil => "{i}",
        _ => cell_str(cell)
    })
    print("")
    print(" {c[0]} | {c[1]} | {c[2]}")
    print("---+---+---")
    print(" {c[3]} | {c[4]} | {c[5]}")
    print("---+---+---")
    print(" {c[6]} | {c[7]} | {c[8]}")
    print("")
}

// --- Move Validation ---

pub fn is_valid_move(board, pos) => match true {
    _ if pos < 0 or pos > 8 => false,
    _ => board[pos] == nil
}

pub fn make_move(board, pos, player) {
    if not is_valid_move(board, pos) { ret nil }
    let mut new_board = board |> collections.to_list()
    new_board[pos] = player
    new_board
}

pub fn available_moves(board) {
    [i for i in 0..9 if board[i] == nil]
}

// --- Win Detection ---
// Check all winning patterns via pattern matching

let WIN_PATTERNS = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8],  // rows
    [0, 3, 6], [1, 4, 7], [2, 5, 8],  // columns
    [0, 4, 8], [2, 4, 6]              // diagonals
]

pub fn check_winner(board) {
    for pattern in WIN_PATTERNS {
        let a = board[pattern[0]]
        let b = board[pattern[1]]
        let c = board[pattern[2]]
        match [a, b, c] {
            ["X", "X", "X"] => ret {winner: "X", pattern: pattern},
            ["O", "O", "O"] => ret {winner: "O", pattern: pattern},
            _ => {}
        }
    }
    nil
}

pub fn is_draw(board) {
    check_winner(board) == nil and len(available_moves(board)) == 0
}

pub fn is_game_over(board) {
    check_winner(board) != nil or len(available_moves(board)) == 0
}

pub fn game_status(board) => match check_winner(board) {
    {winner: w} => {status: "win", winner: w},
    nil => match len(available_moves(board)) {
        0 => {status: "draw", winner: nil},
        _ => {status: "playing", winner: nil}
    }
}

// --- Minimax AI with Alpha-Beta Pruning ---

let SCORES = {"X": -10, "O": 10, "draw": 0}

fn minimax(board, depth, is_maximizing, alpha, beta) {
    let result = check_winner(board)
    if result != nil { ret SCORES[result.winner] - depth * (if result.winner == "O" { 1 } el { -1 }) }
    if len(available_moves(board)) == 0 { ret 0 }

    if is_maximizing {
        // AI plays O, maximize
        let mut best = -999
        let mut a = alpha
        for move in available_moves(board) {
            let new_board = make_move(board, move, "O")
            let score = minimax(new_board, depth + 1, false, a, beta)
            best = max(best, score)
            a = max(a, score)
            if beta <= a { break }  // Beta cutoff
        }
        best
    } el {
        // Human plays X, minimize
        let mut best = 999
        let mut b = beta
        for move in available_moves(board) {
            let new_board = make_move(board, move, "X")
            let score = minimax(new_board, depth + 1, true, alpha, b)
            best = min(best, score)
            b = min(b, score)
            if b <= alpha { break }  // Alpha cutoff
        }
        best
    }
}

pub fn ai_move(board) {
    let moves = available_moves(board)
    if len(moves) == 0 { ret nil }

    // Center opening is optimal
    if len(moves) == 9 { ret 4 }

    let mut best_score = -999
    let mut best_move = moves[0]

    for move in moves {
        let new_board = make_move(board, move, "O")
        let score = minimax(new_board, 0, false, -999, 999)
        if score > best_score {
            best_score = score
            best_move = move
        }
    }
    best_move
}

// --- Game Engine ---

pub fn play_game(human_first) {
    let mut board = new_board()
    let human = "X"
    let ai = "O"
    let mut current = if human_first { human } el { ai }

    print("=== Tic-Tac-Toe ===")
    print("You are X, AI is O")
    print("Positions: 0-8 (left to right, top to bottom)")
    render_with_numbers(board)

    let mut turn = 0
    loop {
        if is_game_over(board) { break }
        turn = turn + 1

        match current {
            "X" => {
                // Simulate human move (use a strategy for demo)
                let move = human_strategy(board, turn)
                print("Human plays X at position {move}")
                board = make_move(board, move, "X")
            },
            "O" => {
                let move = ai_move(board)
                print("AI plays O at position {move}")
                board = make_move(board, move, "O")
            }
        }

        render(board)
        current = if current == "X" { "O" } el { "X" }
    }

    let status = game_status(board)
    match status.status {
        "win" => print("🏆 {status.winner} wins!"),
        "draw" => print("🤝 It's a draw!")
    }
    status
}

// Simple human strategy for demo (plays first available move with some logic)
fn human_strategy(board, turn) {
    let moves = available_moves(board)

    // Try to win
    for m in moves {
        let b = make_move(board, m, "X")
        if check_winner(b) != nil { ret m }
    }

    // Block opponent
    for m in moves {
        let b = make_move(board, m, "O")
        if check_winner(b) != nil { ret m }
    }

    // Take center
    if is_valid_move(board, 4) { ret 4 }

    // Take corner
    let corners = [0, 2, 6, 8]
    for c in corners {
        if is_valid_move(board, c) { ret c }
    }

    // Take any
    moves[0]
}

// --- Tournament ---

pub fn run_tournament(num_games) {
    let mut results = {x_wins: 0, o_wins: 0, draws: 0}

    for i in 0..num_games {
        let human_first = i % 2 == 0
        print("\n--- Game {i + 1} (Human goes {if human_first { "first" } el { "second" }}) ---")
        let status = play_game(human_first)
        match status {
            {winner: "X"} => results.x_wins = results.x_wins + 1,
            {winner: "O"} => results.o_wins = results.o_wins + 1,
            _ => results.draws = results.draws + 1
        }
    }

    print("\n=== Tournament Results ({num_games} games) ===")
    print("X (Human) wins: {results.x_wins}")
    print("O (AI) wins:    {results.o_wins}")
    print("Draws:          {results.draws}")
    results
}

// --- Board Analysis ---

pub fn analyze_position(board) {
    let status = game_status(board)
    print("Status: {status.status}")

    if status.status == "playing" {
        let moves = available_moves(board)
        print("Available moves: {moves}")

        // Score each move for O (AI)
        let scored = moves |> map(m => {
            let b = make_move(board, m, "O")
            let score = minimax(b, 0, false, -999, 999)
            {move: m, score: score}
        })

        let ranked = scored |> sort_by(s => -s.score)
        print("Move rankings (AI perspective):")
        for s in ranked {
            let label = match true {
                _ if s.score > 0 => "winning",
                _ if s.score < 0 => "losing",
                _ => "drawing"
            }
            print("  Position {s.move}: score={s.score} ({label})")
        }
    }
}

fn sort_by(lst, key_fn) {
    // Simple insertion sort by key
    let mut result = []
    for item in lst {
        let k = key_fn(item)
        let mut inserted = false
        let mut new_result = []
        for existing in result {
            if not inserted and k < key_fn(existing) {
                new_result = new_result ++ [item]
                inserted = true
            }
            new_result = new_result ++ [existing]
        }
        if not inserted { new_result = new_result ++ [item] }
        result = new_result
    }
    result
}

// --- Utility ---

fn min(a, b) => if a < b { a } el { b }
fn max(a, b) => if a > b { a } el { b }
fn map_indexed(lst, f) {
    let mut result = []
    for i in 0..len(lst) {
        result = result ++ [f(lst[i], i)]
    }
    result
}

// --- Run ---

print("=== Position Analysis ===")
let board = ["X", nil, nil, nil, "O", nil, nil, nil, "X"]
render(board)
analyze_position(board)

print("\n=== Demo Game ===")
play_game(true)

print("\n=== Mini Tournament ===")
run_tournament(4)
