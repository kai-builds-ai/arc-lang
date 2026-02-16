// ============================================================================
// Roguelike Dungeon Generator in Arc
// ============================================================================
// Procedural dungeon generation with room placement, corridor carving,
// player/enemy entities, turn-based combat with pattern matching, inventory
// management, and ASCII map rendering.
// Demonstrates: mutation, pattern matching, closures, pipelines, maps, lists,
// string interpolation, recursion, higher-order functions, destructuring
// ============================================================================

import collections

// --- Tile Types ---

let WALL = "#"
let FLOOR = "."
let DOOR = "+"
let CORRIDOR = "·"
let STAIRS_DOWN = ">"
let STAIRS_UP = "<"

// --- Random ---

let mut rng_seed = 12345

fn rand() {
    rng_seed = (rng_seed * 1103515245 + 12345) % 2147483648
    rng_seed
}

fn rand_range(lo, hi) => lo + (rand() % (hi - lo))
fn rand_bool() => rand() % 2 == 0

// --- Dungeon Map ---

pub fn create_map(width, height) {
    let mut grid = []
    for y in 0..height {
        let mut row = []
        for x in 0..width { row = row ++ [WALL] }
        grid = grid ++ [row]
    }
    {grid: grid, width: width, height: height, rooms: []}
}

fn set_tile(dungeon, x, y, tile) {
    if x >= 0 and x < dungeon.width and y >= 0 and y < dungeon.height {
        dungeon.grid[y][x] = tile
    }
}

fn get_tile(dungeon, x, y) {
    if x < 0 or x >= dungeon.width or y < 0 or y >= dungeon.height { ret WALL }
    dungeon.grid[y][x]
}

fn is_walkable(dungeon, x, y) {
    let tile = get_tile(dungeon, x, y)
    tile == FLOOR or tile == CORRIDOR or tile == DOOR or tile == STAIRS_DOWN or tile == STAIRS_UP
}

// --- Room Generation ---

fn create_room(x, y, w, h) => {x: x, y: y, w: w, h: h}

fn room_center(room) => {
    x: room.x + room.w / 2,
    y: room.y + room.h / 2
}

fn rooms_overlap(a, b, padding) {
    not (a.x + a.w + padding <= b.x or b.x + b.w + padding <= a.x or
         a.y + a.h + padding <= b.y or b.y + b.h + padding <= a.y)
}

fn carve_room(dungeon, room) {
    for y in room.y..(room.y + room.h) {
        for x in room.x..(room.x + room.w) {
            set_tile(dungeon, x, y, FLOOR)
        }
    }
    dungeon.rooms = dungeon.rooms ++ [room]
}

// --- Corridor Generation ---

fn carve_h_corridor(dungeon, x1, x2, y) {
    let start = min(x1, x2)
    let end = max(x1, x2)
    for x in start..(end + 1) {
        if get_tile(dungeon, x, y) == WALL {
            set_tile(dungeon, x, y, CORRIDOR)
        }
    }
}

fn carve_v_corridor(dungeon, y1, y2, x) {
    let start = min(y1, y2)
    let end = max(y1, y2)
    for y in start..(end + 1) {
        if get_tile(dungeon, x, y) == WALL {
            set_tile(dungeon, x, y, CORRIDOR)
        }
    }
}

fn connect_rooms(dungeon, room_a, room_b) {
    let a = room_center(room_a)
    let b = room_center(room_b)

    if rand_bool() {
        carve_h_corridor(dungeon, a.x, b.x, a.y)
        carve_v_corridor(dungeon, a.y, b.y, b.x)
    } el {
        carve_v_corridor(dungeon, a.y, b.y, a.x)
        carve_h_corridor(dungeon, a.x, b.x, b.y)
    }
}

// --- Dungeon Generator ---

pub fn generate_dungeon(width, height, max_rooms) {
    let mut dungeon = create_map(width, height)

    for _ in 0..max_rooms {
        let w = rand_range(4, 10)
        let h = rand_range(3, 7)
        let x = rand_range(1, width - w - 1)
        let y = rand_range(1, height - h - 1)
        let room = create_room(x, y, w, h)

        // Check overlap with existing rooms
        let overlaps = dungeon.rooms |> any(r => rooms_overlap(r, room, 1))
        if not overlaps {
            carve_room(dungeon, room)

            // Connect to previous room
            if len(dungeon.rooms) > 1 {
                let prev = dungeon.rooms[len(dungeon.rooms) - 2]
                connect_rooms(dungeon, prev, room)
            }
        }
    }

    // Place stairs
    if len(dungeon.rooms) >= 2 {
        let first = room_center(dungeon.rooms[0])
        let last = room_center(dungeon.rooms[len(dungeon.rooms) - 1])
        set_tile(dungeon, first.x, first.y, STAIRS_UP)
        set_tile(dungeon, last.x, last.y, STAIRS_DOWN)
    }

    dungeon
}

// --- Entity System ---

pub fn create_entity(name, x, y, hp, atk, def, symbol) => {
    name: name, x: x, y: y, hp: hp, max_hp: hp,
    atk: atk, def: def, symbol: symbol,
    inventory: [], gold: 0, xp: 0, level: 1
}

pub fn create_player(x, y) => create_entity("Hero", x, y, 100, 15, 8, "@")

fn create_enemy(kind, x, y) => match kind {
    "goblin"   => create_entity("Goblin", x, y, 20, 8, 3, "g"),
    "orc"      => create_entity("Orc", x, y, 35, 12, 5, "o"),
    "skeleton" => create_entity("Skeleton", x, y, 25, 10, 2, "s"),
    "dragon"   => create_entity("Dragon", x, y, 80, 25, 15, "D"),
    "rat"      => create_entity("Rat", x, y, 8, 4, 1, "r"),
    _          => create_entity("Slime", x, y, 15, 5, 2, "~")
}

// --- Items ---

fn create_item(kind) => match kind {
    "health_potion" => {name: "Health Potion", kind: "potion", effect: "heal", value: 25, symbol: "!"},
    "sword"         => {name: "Iron Sword", kind: "weapon", atk_bonus: 5, symbol: "/"},
    "shield"        => {name: "Wooden Shield", kind: "armor", def_bonus: 3, symbol: "]"},
    "gold"          => {name: "Gold", kind: "gold", value: rand_range(5, 25), symbol: "$"},
    "key"           => {name: "Rusty Key", kind: "key", symbol: "k"},
    _               => {name: "Junk", kind: "junk", symbol: "?"}
}

// --- Combat ---

pub fn attack(attacker, defender) {
    let damage = max(1, attacker.atk - defender.def + rand_range(-3, 4))
    defender.hp = defender.hp - damage

    let msg = "{attacker.name} attacks {defender.name} for {damage} damage!"
    let dead = defender.hp <= 0

    match dead {
        true => {
            print("{msg} {defender.name} is defeated!")
            {damage: damage, killed: true, message: msg}
        },
        false => {
            print("{msg} ({defender.name} HP: {defender.hp}/{defender.max_hp})")
            {damage: damage, killed: false, message: msg}
        }
    }
}

// --- Inventory ---

pub fn add_to_inventory(entity, item) {
    match item.kind {
        "gold" => {
            entity.gold = entity.gold + item.value
            print("{entity.name} picks up {item.value} gold!")
        },
        _ => {
            entity.inventory = entity.inventory ++ [item]
            print("{entity.name} picks up {item.name}!")
        }
    }
    entity
}

pub fn use_item(entity, item_idx) {
    if item_idx >= len(entity.inventory) { ret entity }
    let item = entity.inventory[item_idx]

    match item.kind {
        "potion" => match item.effect {
            "heal" => {
                let heal = min(item.value, entity.max_hp - entity.hp)
                entity.hp = entity.hp + heal
                print("{entity.name} drinks {item.name}! Healed {heal} HP.")
            },
            _ => print("Nothing happens.")
        },
        "weapon" => {
            entity.atk = entity.atk + item.atk_bonus
            print("{entity.name} equips {item.name}! ATK +{item.atk_bonus}")
        },
        "armor" => {
            entity.def = entity.def + item.def_bonus
            print("{entity.name} equips {item.name}! DEF +{item.def_bonus}")
        },
        _ => print("Can't use {item.name}.")
    }

    // Remove used item
    entity.inventory = entity.inventory
        |> filter_indexed((_, i) => i != item_idx)
    entity
}

fn filter_indexed(lst, pred) {
    let mut result = []
    for i in 0..len(lst) {
        if pred(lst[i], i) { result = result ++ [lst[i]] }
    }
    result
}

// --- Game State ---

pub fn create_game(width, height) {
    let dungeon = generate_dungeon(width, height, 12)

    // Place player in first room
    let start = room_center(dungeon.rooms[0])
    let mut player = create_player(start.x, start.y)

    // Spawn enemies in rooms
    let enemy_types = ["goblin", "orc", "skeleton", "rat", "slime"]
    let mut enemies = []
    for i in 1..len(dungeon.rooms) {
        let center = room_center(dungeon.rooms[i])
        let kind = enemy_types[rand() % len(enemy_types)]
        let ex = center.x + rand_range(-1, 2)
        let ey = center.y + rand_range(-1, 2)
        enemies = enemies ++ [create_enemy(kind, ex, ey)]

        // Sometimes add a second enemy
        if rand_bool() {
            let kind2 = enemy_types[rand() % len(enemy_types)]
            enemies = enemies ++ [create_enemy(kind2, center.x - 1, center.y)]
        }
    }

    // Scatter items
    let mut items = []
    let item_types = ["health_potion", "gold", "gold", "sword", "shield"]
    for room in dungeon.rooms {
        if rand() % 3 == 0 {
            let kind = item_types[rand() % len(item_types)]
            let ix = room.x + rand_range(1, room.w - 1)
            let iy = room.y + rand_range(1, room.h - 1)
            let item = create_item(kind)
            items = items ++ [{item: item, x: ix, y: iy}]
        }
    }

    {
        dungeon: dungeon,
        player: player,
        enemies: enemies,
        items: items,
        turn: 0,
        messages: ["Welcome to the dungeon! Find the stairs down (>)."],
        game_over: false
    }
}

// --- Rendering ---

pub fn render(game) {
    let d = game.dungeon
    let mut display = []
    for y in 0..d.height {
        let mut row = []
        for x in 0..d.width {
            row = row ++ [d.grid[y][x]]
        }
        display = display ++ [row]
    }

    // Draw items
    for item_pos in game.items {
        display[item_pos.y][item_pos.x] = item_pos.item.symbol
    }

    // Draw enemies
    for e in game.enemies {
        if e.hp > 0 {
            display[e.y][e.x] = e.symbol
        }
    }

    // Draw player
    let p = game.player
    display[p.y][p.x] = p.symbol

    // Print map
    for row in display {
        print(row |> join(""))
    }

    // HUD
    print("HP: {p.hp}/{p.max_hp} | ATK: {p.atk} | DEF: {p.def} | Gold: {p.gold} | Level: {p.level} | Turn: {game.turn}")

    // Messages
    for msg in game.messages |> take_last(3) {
        print("> {msg}")
    }
}

fn join(lst, sep) => match lst {
    [] => "",
    [x] => "{x}",
    [x, ..rest] => "{x}{sep}{join(rest, sep)}"
}

fn take_last(lst, n) {
    let start = max(0, len(lst) - n)
    lst |> drop(start)
}

// --- Game Actions ---

pub fn move_player(game, dx, dy) {
    let p = game.player
    let nx = p.x + dx
    let ny = p.y + dy

    if not is_walkable(game.dungeon, nx, ny) {
        game.messages = game.messages ++ ["You bump into a wall."]
        ret game
    }

    // Check for enemy at target
    for e in game.enemies {
        if e.hp > 0 and e.x == nx and e.y == ny {
            let result = attack(game.player, e)
            if result.killed {
                let xp_gain = e.max_hp
                game.player.xp = game.player.xp + xp_gain
                game.messages = game.messages ++ ["Gained {xp_gain} XP!"]
                check_level_up(game.player)
            }
            game = enemy_turn(game)
            game.turn = game.turn + 1
            ret game
        }
    }

    // Move
    game.player.x = nx
    game.player.y = ny

    // Pick up items
    let mut remaining_items = []
    for item_pos in game.items {
        if item_pos.x == nx and item_pos.y == ny {
            game.player = add_to_inventory(game.player, item_pos.item)
        } el {
            remaining_items = remaining_items ++ [item_pos]
        }
    }
    game.items = remaining_items

    // Check stairs
    if get_tile(game.dungeon, nx, ny) == STAIRS_DOWN {
        game.messages = game.messages ++ ["🎉 You found the stairs! Descending to the next level..."]
        game.game_over = true
    }

    game = enemy_turn(game)
    game.turn = game.turn + 1
    game
}

fn enemy_turn(game) {
    for e in game.enemies {
        if e.hp <= 0 { continue }

        let p = game.player
        let dist = abs(e.x - p.x) + abs(e.y - p.y)

        if dist <= 1 {
            // Attack player
            attack(e, game.player)
            if game.player.hp <= 0 {
                game.messages = game.messages ++ ["💀 You have been slain!"]
                game.game_over = true
            }
        } el if dist < 6 {
            // Move toward player
            let dx = sign(p.x - e.x)
            let dy = sign(p.y - e.y)

            let nx = e.x + dx
            let ny = e.y + dy
            if is_walkable(game.dungeon, nx, ny) {
                e.x = nx
                e.y = ny
            }
        }
    }
    game
}

fn check_level_up(player) {
    let threshold = player.level * 50
    if player.xp >= threshold {
        player.level = player.level + 1
        player.max_hp = player.max_hp + 10
        player.hp = min(player.hp + 10, player.max_hp)
        player.atk = player.atk + 2
        player.def = player.def + 1
        print("⬆️ Level up! Now level {player.level}!")
    }
}

// --- Simulation ---

pub fn simulate(width, height, max_turns) {
    let mut game = create_game(width, height)

    print("=== Roguelike Dungeon ===\n")
    render(game)

    // AI-controlled exploration
    let directions = [
        {dx: 0, dy: -1, name: "north"},
        {dx: 0, dy: 1, name: "south"},
        {dx: 1, dy: 0, name: "east"},
        {dx: -1, dy: 0, name: "west"}
    ]

    let mut stuck_count = 0
    let mut last_pos = {x: game.player.x, y: game.player.y}

    loop {
        if game.game_over or game.turn >= max_turns { break }

        // Simple AI: move toward unexplored areas or stairs
        let p = game.player
        let d = game.dungeon

        // Find stairs position
        let mut target = nil
        for room in d.rooms {
            let c = room_center(room)
            if get_tile(d, c.x, c.y) == STAIRS_DOWN {
                target = c
            }
        }

        let dir = if target != nil {
            // Move toward target
            let dx = sign(target.x - p.x)
            let dy = sign(target.y - p.y)
            if rand_bool() and dx != 0 { {dx: dx, dy: 0} }
            el if dy != 0 { {dx: 0, dy: dy} }
            el { {dx: dx, dy: 0} }
        } el {
            directions[rand() % 4]
        }

        game = move_player(game, dir.dx, dir.dy)

        // Detect stuck
        if p.x == last_pos.x and p.y == last_pos.y {
            stuck_count = stuck_count + 1
            if stuck_count > 3 {
                // Try random direction
                let rd = directions[rand() % 4]
                game = move_player(game, rd.dx, rd.dy)
                stuck_count = 0
            }
        } el {
            stuck_count = 0
        }
        last_pos = {x: game.player.x, y: game.player.y}

        // Render periodically
        if game.turn % 10 == 0 or game.game_over {
            print("\n--- Turn {game.turn} ---")
            render(game)
        }
    }

    print("\n=== Final State ===")
    render(game)

    let alive_enemies = game.enemies |> filter(e => e.hp > 0) |> len()
    let dead_enemies = game.enemies |> filter(e => e.hp <= 0) |> len()

    print("\n=== Summary ===")
    print("Turns: {game.turn}")
    print("Final HP: {game.player.hp}/{game.player.max_hp}")
    print("Level: {game.player.level} (XP: {game.player.xp})")
    print("Gold: {game.player.gold}")
    print("Enemies defeated: {dead_enemies}/{len(game.enemies)}")
    print("Items in inventory: {len(game.player.inventory)}")
    print("Reached stairs: {game.game_over and game.player.hp > 0}")
}

// --- Utility ---

fn min(a, b) => if a < b { a } el { b }
fn max(a, b) => if a > b { a } el { b }
fn abs(x) => if x < 0 { -x } el { x }
fn sign(x) => match true {
    _ if x > 0 => 1,
    _ if x < 0 => -1,
    _ => 0
}
fn any(lst, pred) => lst |> filter(pred) |> len() > 0

// --- Run ---

simulate(50, 25, 100)
