// ============================================================================
// IRC-like Chat Protocol in Arc
// ============================================================================
// A chat protocol implementation with message parsing, command handling,
// user/channel management, message routing, and protocol state machines.
// Demonstrates: regex, pattern matching, closures, pipelines, async/await,
// collections, datetime, net, string interpolation, pub.
// ============================================================================

import regex
import collections
import datetime
import json
import net

// --- Message Types ---

let MSG_JOIN     = "JOIN"
let MSG_PART     = "PART"
let MSG_PRIVMSG  = "PRIVMSG"
let MSG_NOTICE   = "NOTICE"
let MSG_NICK     = "NICK"
let MSG_QUIT     = "QUIT"
let MSG_KICK     = "KICK"
let MSG_MODE     = "MODE"
let MSG_TOPIC    = "TOPIC"
let MSG_PING     = "PING"
let MSG_PONG     = "PONG"
let MSG_LIST     = "LIST"
let MSG_WHO      = "WHO"
let MSG_WHOIS    = "WHOIS"
let MSG_NAMES    = "NAMES"
let MSG_ERROR    = "ERROR"

// --- Message Parsing ---

let IRC_PATTERN = regex.compile(r"^(?::(\S+)\s)?(\S+)\s(.+)$")
let PREFIX_PATTERN = regex.compile(r"^([^!]+)(?:!([^@]+))?(?:@(.+))?$")

pub fn parse_message(raw) => {
    let cleaned = raw |> trim() |> regex.replace(r"\r?\n$", "")
    let m = regex.match(IRC_PATTERN, cleaned)
    
    match m {
        nil => { error: "Malformed message: ${raw}" },
        _ => {
            let prefix = match m[1] {
                nil => nil,
                p => parse_prefix(p)
            }
            let command = m[2] |> uppercase()
            let params = parse_params(m[3])
            
            {
                prefix: prefix,
                command: command,
                params: params,
                raw: raw,
                timestamp: datetime.now() |> datetime.to_iso()
            }
        }
    }
}

fn parse_prefix(prefix_str) => {
    let m = regex.match(PREFIX_PATTERN, prefix_str)
    match m {
        nil => { nick: prefix_str },
        _ => { nick: m[1], user: m[2], host: m[3] }
    }
}

fn parse_params(params_str) => {
    let mut params = []
    let mut remaining = params_str
    
    loop {
        match remaining == "" {
            true => break,
            false => match remaining |> starts_with(":") {
                true => {
                    params = params |> collections.append(remaining |> collections.slice(1))
                    break
                },
                false => {
                    let space_idx = remaining |> index_of(" ")
                    match space_idx {
                        -1 => {
                            params = params |> collections.append(remaining)
                            break
                        },
                        _ => {
                            params = params |> collections.append(remaining |> collections.slice(0, space_idx))
                            remaining = remaining |> collections.slice(space_idx + 1) |> trim()
                        }
                    }
                }
            }
        }
    }
    
    params
}

pub fn format_message(prefix, command, params) => {
    let prefix_str = match prefix {
        nil => "",
        _ => ":${prefix} "
    }
    let params_str = match collections.length(params) {
        0 => "",
        _ => {
            let last = params |> collections.last()
            let rest = params |> collections.drop_last(1)
            let rest_str = rest |> collections.join(" ")
            let trailing = match last |> contains(" ") or last |> starts_with(":") {
                true => " :${last}",
                false => " ${last}"
            }
            match rest_str == "" {
                true => trailing |> trim(),
                false => "${rest_str}${trailing}"
            }
        }
    }
    "${prefix_str}${command} ${params_str}"
}

// --- User Management ---

pub fn create_user(nick, username, hostname) => {
    {
        nick: nick,
        username: username or nick,
        hostname: hostname or "localhost",
        channels: [],
        modes: [],
        connected_at: datetime.now() |> datetime.to_iso(),
        last_activity: datetime.now() |> datetime.to_iso(),
        away_message: nil
    }
}

pub fn user_prefix(user) => "${user.nick}!${user.username}@${user.hostname}"

pub fn user_is_op(user, channel_name) => {
    user.modes |> collections.any(fn(m) => m.channel == channel_name and m.mode == "o")
}

// --- Channel Management ---

pub fn create_channel(name, topic) => {
    {
        name: name,
        topic: topic or "",
        topic_set_by: nil,
        topic_set_at: nil,
        users: [],
        operators: [],
        modes: [],
        created_at: datetime.now() |> datetime.to_iso(),
        message_history: [],
        max_history: 100
    }
}

pub fn channel_add_user(channel, nick) => {
    let mut c = channel
    match collections.contains(c.users, nick) {
        true => c,
        false => {
            c.users = c.users |> collections.append(nick)
            c
        }
    }
}

pub fn channel_remove_user(channel, nick) => {
    let mut c = channel
    c.users = c.users |> collections.filter(fn(u) => u != nick)
    c.operators = c.operators |> collections.filter(fn(o) => o != nick)
    c
}

pub fn channel_add_message(channel, from, text) => {
    let mut c = channel
    let msg = {
        from: from,
        text: text,
        timestamp: datetime.now() |> datetime.to_iso()
    }
    c.message_history = c.message_history
        |> collections.append(msg)
        |> collections.take_last(c.max_history)
    c
}

// --- Server State ---

pub fn create_server(name) => {
    {
        name: name,
        users: {},
        channels: {},
        motd: "Welcome to ${name}! Powered by Arc.",
        created_at: datetime.now() |> datetime.to_iso(),
        stats: {
            connections: 0,
            messages: 0,
            commands_processed: 0
        }
    }
}

// --- Command Handlers ---

pub fn handle_message(server, msg, sender_nick) => {
    let mut s = server
    s.stats.commands_processed = s.stats.commands_processed + 1
    s.stats.messages = s.stats.messages + 1
    
    match msg.command {
        MSG_JOIN => handle_join(s, sender_nick, msg.params),
        MSG_PART => handle_part(s, sender_nick, msg.params),
        MSG_PRIVMSG => handle_privmsg(s, sender_nick, msg.params),
        MSG_NICK => handle_nick(s, sender_nick, msg.params),
        MSG_QUIT => handle_quit(s, sender_nick, msg.params),
        MSG_TOPIC => handle_topic(s, sender_nick, msg.params),
        MSG_KICK => handle_kick(s, sender_nick, msg.params),
        MSG_NAMES => handle_names(s, sender_nick, msg.params),
        MSG_LIST => handle_list(s, sender_nick),
        MSG_WHO => handle_who(s, sender_nick, msg.params),
        MSG_PING => handle_ping(s, sender_nick, msg.params),
        MSG_MODE => handle_mode(s, sender_nick, msg.params),
        _ => {
            let reply = format_message(s.name, "421", [sender_nick, msg.command, "Unknown command"])
            { server: s, replies: [{ to: sender_nick, message: reply }] }
        }
    }
}

fn handle_join(server, nick, params) => {
    let channel_name = params[0]
    let mut s = server
    
    // Create channel if it doesn't exist
    let channel = collections.get(s.channels, channel_name, nil)
    let mut ch = match channel {
        nil => create_channel(channel_name, nil),
        _ => channel
    }
    
    ch = channel_add_user(ch, nick)
    
    // First user becomes operator
    match collections.length(ch.users) == 1 {
        true => ch.operators = [nick],
        false => {}
    }
    
    s.channels = collections.set(s.channels, channel_name, ch)
    
    // Update user
    let user = collections.get(s.users, nick)
    match user {
        nil => {},
        _ => {
            let mut u = user
            u.channels = u.channels |> collections.append(channel_name) |> collections.unique()
            s.users = collections.set(s.users, nick, u)
        }
    }
    
    // Broadcast join to channel
    let join_msg = format_message(nick, MSG_JOIN, [channel_name])
    let replies = ch.users |> collections.map(fn(u) => { to: u, message: join_msg })
    
    // Send topic and names
    let topic_reply = match ch.topic != "" {
        true => [{ to: nick, message: format_message(s.name, "332", [nick, channel_name, ch.topic]) }],
        false => []
    }
    
    let names = ch.users |> collections.map(fn(u) => {
        match collections.contains(ch.operators, u) { true => "@${u}", false => u }
    }) |> collections.join(" ")
    let names_reply = { to: nick, message: format_message(s.name, "353", [nick, "=", channel_name, names]) }
    
    { server: s, replies: replies |> collections.concat(topic_reply) |> collections.append(names_reply) }
}

fn handle_part(server, nick, params) => {
    let channel_name = params[0]
    let reason = match collections.length(params) > 1 { true => params[1], false => "Leaving" }
    let mut s = server
    
    let channel = collections.get(s.channels, channel_name, nil)
    match channel {
        nil => { server: s, replies: [] },
        _ => {
            let part_msg = format_message(nick, MSG_PART, [channel_name, reason])
            let replies = channel.users |> collections.map(fn(u) => { to: u, message: part_msg })
            
            let ch = channel_remove_user(channel, nick)
            s.channels = match collections.length(ch.users) == 0 {
                true => collections.remove(s.channels, channel_name),
                false => collections.set(s.channels, channel_name, ch)
            }
            
            { server: s, replies: replies }
        }
    }
}

fn handle_privmsg(server, nick, params) => {
    let target = params[0]
    let text = params[1]
    let mut s = server
    
    let msg = format_message(nick, MSG_PRIVMSG, [target, text])
    
    match target |> starts_with("#") {
        true => {
            // Channel message
            let channel = collections.get(s.channels, target, nil)
            match channel {
                nil => { server: s, replies: [{ to: nick, message: format_message(s.name, "403", [nick, target, "No such channel"]) }] },
                _ => {
                    let ch = channel_add_message(channel, nick, text)
                    s.channels = collections.set(s.channels, target, ch)
                    let replies = ch.users
                        |> collections.filter(fn(u) => u != nick)
                        |> collections.map(fn(u) => { to: u, message: msg })
                    { server: s, replies: replies }
                }
            }
        },
        false => {
            // Direct message
            let user = collections.get(s.users, target, nil)
            match user {
                nil => { server: s, replies: [{ to: nick, message: format_message(s.name, "401", [nick, target, "No such nick"]) }] },
                _ => { server: s, replies: [{ to: target, message: msg }] }
            }
        }
    }
}

fn handle_nick(server, old_nick, params) => {
    let new_nick = params[0]
    let mut s = server
    
    match collections.get(s.users, new_nick, nil) {
        nil => {},
        _ => ret { server: s, replies: [{ to: old_nick, message: format_message(s.name, "433", [old_nick, new_nick, "Nickname already in use"]) }] }
    }
    
    let user = collections.get(s.users, old_nick, nil)
    match user {
        nil => { server: s, replies: [] },
        _ => {
            let mut u = user
            u.nick = new_nick
            s.users = s.users |> collections.remove(old_nick) |> collections.set(new_nick, u)
            
            // Update channels
            s.channels = s.channels |> collections.map_values(fn(ch) => {
                let mut c = ch
                c.users = c.users |> collections.map(fn(n) => match n == old_nick { true => new_nick, false => n })
                c.operators = c.operators |> collections.map(fn(n) => match n == old_nick { true => new_nick, false => n })
                c
            })
            
            let nick_msg = format_message(old_nick, MSG_NICK, [new_nick])
            { server: s, replies: [{ to: new_nick, message: nick_msg }] }
        }
    }
}

fn handle_quit(server, nick, params) => {
    let reason = match collections.length(params) > 0 { true => params[0], false => "Quit" }
    let mut s = server
    
    let quit_msg = format_message(nick, MSG_QUIT, [reason])
    let mut all_recipients = []
    
    // Remove from all channels
    s.channels = s.channels |> collections.map_values(fn(ch) => {
        match collections.contains(ch.users, nick) {
            true => {
                all_recipients = all_recipients |> collections.concat(ch.users)
                channel_remove_user(ch, nick)
            },
            false => ch
        }
    })
    
    s.users = collections.remove(s.users, nick)
    
    let replies = all_recipients
        |> collections.unique()
        |> collections.filter(fn(u) => u != nick)
        |> collections.map(fn(u) => { to: u, message: quit_msg })
    
    { server: s, replies: replies }
}

fn handle_topic(server, nick, params) => {
    let channel_name = params[0]
    let mut s = server
    let channel = collections.get(s.channels, channel_name, nil)
    
    match channel {
        nil => { server: s, replies: [] },
        _ => match collections.length(params) > 1 {
            true => {
                let mut ch = channel
                ch.topic = params[1]
                ch.topic_set_by = nick
                ch.topic_set_at = datetime.now() |> datetime.to_iso()
                s.channels = collections.set(s.channels, channel_name, ch)
                let topic_msg = format_message(nick, MSG_TOPIC, [channel_name, params[1]])
                let replies = ch.users |> collections.map(fn(u) => { to: u, message: topic_msg })
                { server: s, replies: replies }
            },
            false => {
                let reply = format_message(s.name, "332", [nick, channel_name, channel.topic])
                { server: s, replies: [{ to: nick, message: reply }] }
            }
        }
    }
}

fn handle_kick(server, nick, params) => {
    let channel_name = params[0]
    let target = params[1]
    let reason = match collections.length(params) > 2 { true => params[2], false => nick }
    let mut s = server
    
    let channel = collections.get(s.channels, channel_name, nil)
    match channel {
        nil => { server: s, replies: [] },
        _ => match collections.contains(channel.operators, nick) {
            false => {
                let reply = format_message(s.name, "482", [nick, channel_name, "You're not channel operator"])
                { server: s, replies: [{ to: nick, message: reply }] }
            },
            true => {
                let kick_msg = format_message(nick, MSG_KICK, [channel_name, target, reason])
                let replies = channel.users |> collections.map(fn(u) => { to: u, message: kick_msg })
                let ch = channel_remove_user(channel, nick)
                s.channels = collections.set(s.channels, channel_name, ch)
                { server: s, replies: replies }
            }
        }
    }
}

fn handle_names(server, nick, params) => {
    let channel_name = params[0]
    let channel = collections.get(server.channels, channel_name, nil)
    match channel {
        nil => { server: server, replies: [] },
        _ => {
            let names = channel.users |> collections.map(fn(u) => {
                match collections.contains(channel.operators, u) { true => "@${u}", false => u }
            }) |> collections.join(" ")
            let reply = format_message(server.name, "353", [nick, "=", channel_name, names])
            { server: server, replies: [{ to: nick, message: reply }] }
        }
    }
}

fn handle_list(server, nick) => {
    let channels = server.channels |> collections.entries() |> collections.map(fn(e) => {
        format_message(server.name, "322", [nick, e.key, "${collections.length(e.value.users)}", e.value.topic])
    })
    let replies = channels |> collections.map(fn(msg) => { to: nick, message: msg })
    { server: server, replies: replies }
}

fn handle_who(server, nick, params) => {
    let target = params[0]
    let channel = collections.get(server.channels, target, nil)
    match channel {
        nil => { server: server, replies: [] },
        _ => {
            let replies = channel.users |> collections.map(fn(u) => {
                let user = collections.get(server.users, u, { nick: u, username: u, hostname: "unknown" })
                { to: nick, message: format_message(server.name, "352", [nick, target, user.username, user.hostname, server.name, u, "H", "0 ${u}"]) }
            })
            { server: server, replies: replies }
        }
    }
}

fn handle_ping(server, nick, params) => {
    let reply = format_message(server.name, MSG_PONG, params)
    { server: server, replies: [{ to: nick, message: reply }] }
}

fn handle_mode(server, nick, params) => {
    // Simplified mode handling
    { server: server, replies: [] }
}

// --- Server Statistics ---

pub fn server_stats(server) => {
    let channels = server.channels |> collections.entries()
    {
        name: server.name,
        users_online: server.users |> collections.entries() |> collections.length(),
        channels_active: collections.length(channels),
        total_messages: server.stats.messages,
        commands_processed: server.stats.commands_processed,
        largest_channel: channels
            |> collections.sort(fn(a, b) => collections.length(b.value.users) - collections.length(a.value.users))
            |> collections.first()
            |> fn(ch) => match ch { nil => "none", _ => "${ch.key} (${collections.length(ch.value.users)} users)" }
    }
}

// --- Main Demo ---

fn main() => {
    print("=== Arc Chat Protocol Demo ===\n")
    
    let mut server = create_server("irc.arc-lang.org")
    
    // Register users
    let users = ["Alice", "Bob", "Charlie", "Diana"]
    users |> collections.each(fn(nick) => {
        let user = create_user(nick, nick |> lowercase(), "client.arc-lang.org")
        server.users = collections.set(server.users, nick, user)
        server.stats.connections = server.stats.connections + 1
        print("User connected: ${nick}")
    })
    
    // Simulate chat session
    let messages = [
        "JOIN #general",
        "JOIN #general",
        "JOIN #general",
        "JOIN #arc-lang",
        ":Alice TOPIC #general :Welcome to the general channel!",
        ":Alice PRIVMSG #general :Hey everyone!",
        ":Bob PRIVMSG #general :Hi Alice! How's it going?",
        ":Charlie PRIVMSG #general :Working on some Arc code today",
        ":Alice PRIVMSG Bob :Can you review my PR?",
        ":Bob PRIVMSG Alice :Sure, send me the link",
        ":Diana JOIN #general",
        ":Diana PRIVMSG #general :Hello all! Just joined.",
        ":Charlie NICK Charles",
        ":Alice PRIVMSG #general :Welcome Diana!",
        "LIST",
        "NAMES #general"
    ]
    
    // Process first 3 joins manually (they need sender context)
    let join_users = ["Alice", "Bob", "Charlie"]
    join_users |> collections.each(fn(nick) => {
        let msg = parse_message("JOIN #general")
        let result = handle_message(server, msg, nick)
        server = result.server
        print("\nReplies for ${nick} JOIN:")
        result.replies |> collections.each(fn(r) => print("  -> ${r.to}: ${r.message}"))
    })
    
    // Process remaining messages
    messages |> collections.skip(3) |> collections.each(fn(raw) => {
        let msg = parse_message(raw)
        match msg {
            { error: e } => print("Parse error: ${e}"),
            _ => {
                let sender = match msg.prefix {
                    nil => "Server",
                    { nick: n } => n
                }
                print("\n[${sender}] ${msg.command} ${msg.params |> collections.join(" ")}")
                let result = handle_message(server, msg, sender)
                server = result.server
                result.replies |> collections.take(3) |> collections.each(fn(r) => {
                    print("  -> ${r.to}: ${r.message}")
                })
                match collections.length(result.replies) > 3 {
                    true => print("  ... and ${collections.length(result.replies) - 3} more replies"),
                    false => {}
                }
            }
        }
    })
    
    // Server stats
    print("\n\n--- Server Statistics ---")
    let stats = server_stats(server)
    print("Server: ${stats.name}")
    print("Users online: ${stats.users_online}")
    print("Active channels: ${stats.channels_active}")
    print("Total messages: ${stats.total_messages}")
    print("Commands processed: ${stats.commands_processed}")
    print("Largest channel: ${stats.largest_channel}")
    
    print("\nDone!")
}

main()
