# ============================================================================
# Blockchain Implementation in Arc
# ============================================================================
# A simple blockchain with proof-of-work mining, chain validation, and
# transaction support. Demonstrates: structs, pattern matching, pipelines,
# closures, string interpolation, import, pub, fn, let, mut, match, |>, =>
# ============================================================================

use crypto
use datetime
use json
use collections

# --- Block Structure ---

pub fn create_block(index, data, prev_hash, difficulty) => {
    let timestamp = datetime.now() |> datetime.to_iso()
    let mut nonce = 0
    let target = "0".repeat(difficulty)
    
    # Proof-of-work mining loop
    let mut hash = ""
    loop {
        let raw = "${index}${timestamp}${json.encode(data)}${prev_hash}${nonce}"
        hash = crypto.sha256(raw)
        match hash.starts_with(target) {
            true => break,
            false => nonce = nonce + 1
        }
    }
    
    {
        index: index,
        timestamp: timestamp,
        data: data,
        prev_hash: prev_hash,
        hash: hash,
        nonce: nonce,
        difficulty: difficulty
    }
}

pub fn genesis_block(difficulty) => {
    create_block(0, { message: "Genesis Block", transactions: [] }, "0", difficulty)
}

# --- Transaction Management ---

pub fn create_transaction(sender, recipient, amount) => {
    let id = crypto.sha256("${sender}${recipient}${amount}${datetime.now()}")
    {
        id: id,
        sender: sender,
        recipient: recipient,
        amount: amount,
        timestamp: datetime.now() |> datetime.to_iso()
    }
}

pub fn validate_transaction(tx) => {
    match tx {
        { sender: s, recipient: r, amount: a } if a > 0 and s != r => true,
        _ => false
    }
}

# --- Blockchain ---

pub fn create_chain(difficulty) => {
    let genesis = genesis_block(difficulty)
    {
        blocks: [genesis],
        difficulty: difficulty,
        pending_transactions: [],
        mining_reward: 50.0
    }
}

pub fn add_transaction(chain, transaction) => {
    match validate_transaction(transaction) {
        true => {
            let mut c = chain
            c.pending_transactions = c.pending_transactions |> collections.append(transaction)
            c
        },
        false => {
            print("Invalid transaction rejected: ${json.encode(transaction)}")
            chain
        }
    }
}

pub fn mine_pending(chain, miner_address) => {
    let reward_tx = create_transaction("NETWORK", miner_address, chain.mining_reward)
    let all_tx = chain.pending_transactions |> collections.append(reward_tx)
    
    let last_block = chain.blocks |> collections.last()
    let new_block = create_block(
        last_block.index + 1,
        { transactions: all_tx, tx_count: collections.length(all_tx) },
        last_block.hash,
        chain.difficulty
    )
    
    let mut c = chain
    c.blocks = c.blocks |> collections.append(new_block)
    c.pending_transactions = []
    c
}

# --- Validation ---

pub fn validate_block(block, prev_block) => {
    let checks = [
        block.prev_hash == prev_block.hash,
        block.index == prev_block.index + 1,
        verify_hash(block),
        block.hash |> starts_with("0".repeat(block.difficulty))
    ]
    checks |> collections.all(fn(c) => c)
}

fn verify_hash(block) => {
    let raw = "${block.index}${block.timestamp}${json.encode(block.data)}${block.prev_hash}${block.nonce}"
    crypto.sha256(raw) == block.hash
}

pub fn validate_chain(chain) => {
    let blocks = chain.blocks
    match collections.length(blocks) {
        0 => false,
        1 => verify_hash(blocks[0]),
        _ => {
            blocks
            |> collections.windows(2)
            |> collections.all(fn(pair) => validate_block(pair[1], pair[0]))
        }
    }
}

# --- Balance Calculation ---

pub fn get_balance(chain, address) => {
    chain.blocks
    |> collections.flat_map(fn(block) => block.data.transactions or [])
    |> collections.reduce(0.0, fn(balance, tx) => {
        match tx {
            { recipient: r } if r == address => balance + tx.amount,
            { sender: s } if s == address => balance - tx.amount,
            _ => balance
        }
    })
}

# --- Chain Statistics ---

pub fn chain_stats(chain) => {
    let blocks = chain.blocks
    let total_blocks = collections.length(blocks)
    let total_transactions = blocks
        |> collections.flat_map(fn(b) => b.data.transactions or [])
        |> collections.length()
    let avg_nonce = blocks
        |> collections.map(fn(b) => b.nonce)
        |> collections.reduce(0, fn(a, b) => a + b)
        |> fn(sum) => sum / total_blocks
    
    {
        total_blocks: total_blocks,
        total_transactions: total_transactions,
        difficulty: chain.difficulty,
        average_mining_nonce: avg_nonce,
        is_valid: validate_chain(chain)
    }
}

# --- Serialization ---

pub fn to_json(chain) => json.encode(chain, indent: 2)

pub fn from_json(data) => {
    let parsed = json.decode(data)
    match validate_chain(parsed) {
        true => { ok: parsed },
        false => { error: "Invalid chain data" }
    }
}

# --- Main Demo ---

fn main() => {
    print("=== Arc Blockchain Demo ===\n")
    
    let mut chain = create_chain(2)
    print("Genesis block created with difficulty 2")
    
    # Add transactions
    let tx1 = create_transaction("Alice", "Bob", 10.0)
    let tx2 = create_transaction("Bob", "Charlie", 5.0)
    let tx3 = create_transaction("Alice", "Charlie", 3.0)
    
    chain = chain
        |> add_transaction(tx1)
        |> add_transaction(tx2)
        |> add_transaction(tx3)
    
    print("Added 3 pending transactions")
    
    # Mine block
    chain = chain |> mine_pending("Miner1")
    print("Block mined by Miner1!")
    
    # More transactions and mining
    let tx4 = create_transaction("Charlie", "Alice", 2.0)
    let tx5 = create_transaction("Miner1", "Bob", 25.0)
    
    chain = chain
        |> add_transaction(tx4)
        |> add_transaction(tx5)
        |> mine_pending("Miner1")
    
    print("Second block mined!\n")
    
    # Check balances
    let addresses = ["Alice", "Bob", "Charlie", "Miner1"]
    addresses |> collections.each(fn(addr) => {
        let bal = get_balance(chain, addr)
        print("${addr}'s balance: ${bal}")
    })
    
    # Chain stats
    print("\n--- Chain Statistics ---")
    let stats = chain_stats(chain)
    print("Total blocks: ${stats.total_blocks}")
    print("Total transactions: ${stats.total_transactions}")
    print("Difficulty: ${stats.difficulty}")
    print("Chain valid: ${stats.is_valid}")
    
    # Serialization round-trip
    let serialized = to_json(chain)
    print("\nChain serialized to ${collections.length(serialized)} bytes of JSON")
}

main()
