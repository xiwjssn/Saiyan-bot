/**
 * SAIYAN — Command Loader
 * Copyright © 2026 magnus
 */
"use strict";
const fs = require("fs-extra");
const path = require("path");
const log = require("./logger");

function applyIdentity(command) {
  if (command?.config) command.config.author = "magnus";
  return command;
}

function loadCommands(dir) {
  const commands = new Map();
  const absDir = path.resolve(process.cwd(), dir);
  if (!fs.existsSync(absDir)) {
    log.warn("LOADER", `Command directory not found: ${absDir}`);
    return commands;
  }

  const files = fs.readdirSync(absDir).filter(file => file.endsWith(".js"));
  let loaded = 0, failed = 0;

  console.log();
  console.log(`  ─── SAIYAN — Loading commands (${files.length}) ───`);

  for (const file of files) {
    const absPath = path.resolve(absDir, file);
    try {
      delete require.cache[absPath];
      const cmd = applyIdentity(require(absPath));

      if (cmd?.config?.name) {
        const name = String(cmd.config.name).toLowerCase();
        commands.set(name, cmd);
        if (Array.isArray(cmd.config.aliases)) {
          for (const alias of cmd.config.aliases) {
            if (alias) commands.set(String(alias).toLowerCase(), cmd);
          }
        }
        if (typeof cmd.onChat === "function" && global.GoatBot?.onChat && !global.GoatBot.onChat.includes(name)) {
          global.GoatBot.onChat.push(name);
        }
        console.log(`  ✓ /${name}`);
        loaded++;
      } else if (cmd?.name && typeof cmd.run === "function") {
        const name = String(cmd.name).toLowerCase();
        commands.set(name, {
          config: { name, aliases: cmd.aliases || [], category: cmd.category || "other", role: 2, description: cmd.description || "", author: "magnus" },
          onStart: ctx => cmd.run(ctx)
        });
        console.log(`  ✓ /${name} (legacy)`);
        loaded++;
      } else {
        console.log(`  ! ${file}: config.name missing`);
        failed++;
      }
    } catch (error) {
      console.log(`  ✗ ${file}: ${error.message}`);
      failed++;
    }
  }

  console.log();
  log.ok("SAIYAN", `Loaded ${loaded} command(s)${failed ? ` (${failed} failed)` : ""}`);
  return commands;
}

function hotReloadCommand(absPath) {
  try {
    delete require.cache[absPath];
    const cmd = applyIdentity(require(absPath));
    if (!cmd?.config?.name) return { ok: false, error: "config.name missing" };
    const name = String(cmd.config.name).toLowerCase();
    if (global.GoatBot?.commands) {
      global.GoatBot.commands.set(name, cmd);
      if (cmd.config.aliases) {
        for (const alias of cmd.config.aliases || []) {
          if (alias) global.GoatBot.commands.set(String(alias).toLowerCase(), cmd);
        }
      }
    }
    log.ok("SAIYAN", `/${name} reloaded`);
    return { ok: true, name };
  } catch (error) {
    return { ok: false, error: error.message };
  }
}

module.exports = { loadCommands, hotReloadCommand };
