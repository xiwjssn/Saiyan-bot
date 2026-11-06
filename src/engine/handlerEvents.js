/**
 * SAIYAN — Unified Event Handler
 * Copyright © 2026 magnus
 */
"use strict";

const rateLimit = require("../protection/rateLimit");
const { brandApi } = require("../utils/identity");

// ─── Anti-Duplicate Guard ─────────────────────────────────────────────────────
const _processed = new Map();
const DEDUP_TTL = 60 * 1000;
setInterval(() => {
  const now = Date.now();
  for (const [key, ts] of _processed) {
    if (now - ts > DEDUP_TTL) _processed.delete(key);
  }
}, 30 * 1000);

function isDuplicate(msgID) {
  if (!msgID) return false;
  if (_processed.has(msgID)) return true;
  _processed.set(msgID, Date.now());
  return false;
}

function getRole(senderID) {
  const cfg = global.GoatBot?.config || {};
  const sid = String(senderID);
  const supers = [...(cfg.superAdminBot || []), cfg.ownerID].filter(Boolean).map(String);
  const admins = (cfg.adminBot || []).map(String);
  if (supers.includes(sid)) return 3;
  if (admins.includes(sid)) return 2;
  return 0;
}

function sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }

function buildMessage(api, event) {
  const client = brandApi(api);
  return {
    reply: async (msg, cb) => {
      try {
        const text = typeof msg === "string" ? msg : msg?.body || "";
        const delay = global.utils?.calcHumanTypingDelay?.(text) || 1000;
        await global.utils?.simulateTyping?.(client, event.threadID, delay);
      } catch (_) {}
      return client.sendMessage(msg, event.threadID, cb);
    },
    unsend: (mid, cb) => { try { client.unsendMessage(mid || event.messageID, cb); } catch (_) {} },
    react: (emoji, mid) => { try { client.setMessageReaction(emoji, mid || event.messageID, () => {}, true); } catch (_) {} },
    send: (msg, tid, cb) => client.sendMessage(msg, tid || event.threadID, cb),
  };
}

function checkFlood(tid, sid) {
  const cfg = global.GoatBot?.config?.rateLimit || {};
  const key = `flood:${tid}:${sid}`;
  return rateLimit.check(key, cfg.maxMessagesPerWindow || 8, cfg.windowMs || 6000).exceeded;
}

function checkSpam(sid) {
  return rateLimit.check(`spam:${sid}`, 20, 30000).exceeded;
}

async function handleReply(api, event) {
  const replyMap = global.GoatBot?.onReply;
  if (!replyMap?.size) return false;
  const replyMsgID = event.messageReply?.messageID;
  if (!replyMsgID) return false;

  for (const [key, handler] of replyMap) {
    if (handler.messageID === replyMsgID &&
        (!handler.author || String(handler.author) === String(event.senderID))) {
      replyMap.delete(key);
      try {
        await handler.callback({
          api, event, message: buildMessage(api, event),
          args: (event.body || "").trim().split(/\s+/).filter(Boolean),
        });
      } catch (error) {
        global.log?.error?.("REPLY_CB", error.message);
      }
      return true;
    }
  }
  return false;
}

async function onEventCmds(api, event, commands) {
  if (!event || !api) return;
  api = brandApi(api);
  global.lastMqttActivity = Date.now();

  const { type, senderID, threadID, body = "", messageID } = event;
  if (!threadID) return;
  if (senderID && String(senderID) === String(global.GoatBot?.botID)) return;
  if (messageID && isDuplicate(messageID)) return;

  if ((type === "message" || type === "message_reply") && threadID) {
    if (!global._msgListeners) global._msgListeners = [];
    for (const listener of global._msgListeners) {
      try { listener({ threadID, senderID, messageID, ts: Date.now() }); } catch (_) {}
    }
  }

  try {
    if (senderID && typeof global._bufferMsg === "function") global._bufferMsg({ ...event, ts: Date.now() });
    if (senderID && typeof global._trackMsg === "function") global._trackMsg(threadID, senderID, body);
  } catch (_) {}

  {
    const allCmds = commands || global.GoatBot?.commands;
    if (allCmds) {
      for (const [, cmd] of allCmds) {
        if (typeof cmd.onEvent === "function") {
          try { await cmd.onEvent({ api, event, message: buildMessage(api, event) }); } catch (_) {}
        }
      }
    }
  }

  if (type !== "message" && type !== "message_reply") return;
  if (type === "message_reply" || event.messageReply) {
    if (await handleReply(api, event)) return;
  }
  if (type !== "message" && type !== "message_reply") return;
  if (!body.trim()) return;
  if (global.GoatBot?.dmLocked && !event.isGroup) return;

  const role = getRole(senderID);
  if (role < 2) return;
  if (checkFlood(threadID, senderID) || checkSpam(senderID)) return;

  const prefix = global.GoatBot?.config?.prefix || "/";
  if (!body.trimStart().startsWith(prefix)) return;
  const parts = body.trimStart().slice(prefix.length).trim().split(/\s+/);
  const cmdName = (parts[0] || "").toLowerCase();
  const args = parts.slice(1);
  if (!cmdName) return;

  const allCmds = commands || global.GoatBot?.commands;
  const cmd = allCmds?.get(cmdName);
  if (!cmd) return;

  try {
    const ctrl = require("../utils/cmdControl");
    if (!ctrl.isEnabled(threadID, cmd.config?.name || cmdName)) return;
  } catch (_) {}

  const required = cmd.config?.role ?? 2;
  if (role < required) {
    try { await api.sendMessage("هذا الإجراء يتطلب صلاحية المالك.", threadID); } catch (_) {}
    return;
  }

  const ctx = {
    api, event, args, commandName: cmdName,
    message: buildMessage(api, event),
    prefix, role, senderID, threadID,
  };

  try {
    if (typeof cmd.onStart === "function") await cmd.onStart(ctx);
    else if (typeof cmd.run === "function") await cmd.run(ctx);
  } catch (error) {
    global.log?.error?.("COMMAND", `/${cmdName}: ${error.message}`);
    try { await api.sendMessage(`تعذر إكمال الأمر. التفاصيل: ${error.message}`, threadID); } catch (_) {}
  }
}

module.exports = onEventCmds;
