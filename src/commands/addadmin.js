/**
 * Saiyan V1 — /addadmin — إضافة أدمن للبوت
 * Copyright © 2026 magnus
 * Ported from SAIYAN CORE & adapted for Saiyan engine
 */
"use strict";
const fs   = require("fs-extra");
const path = require("path");

const LEVELS_FILE  = path.join(process.cwd(), "database", "data", "adminLevels.json");
const CONFIG_FILE  = path.join(process.cwd(), "config.json");

function loadLevels() {
  try {
    if (fs.existsSync(LEVELS_FILE)) return JSON.parse(fs.readFileSync(LEVELS_FILE, "utf8"));
  } catch (_) {}
  return {};
}

function saveLevels(data) {
  fs.ensureDirSync(path.dirname(LEVELS_FILE));
  fs.writeFileSync(LEVELS_FILE, JSON.stringify(data, null, 2));
}

function isTopAdmin(id) {
  const sid    = String(id);
  const levels = loadLevels();
  if (levels[sid] !== undefined) return levels[sid] === 3;
  const cfg    = global.GoatBot?.config || {};
  const supers = [cfg.ownerID, ...(cfg.superAdminBot || [])].filter(Boolean).map(String);
  return supers.includes(sid);
}

function extractID(text) {
  const m1 = text.match(/(?:facebook\.com|fb\.com)\/profile\.php\?id=(\d+)/i);
  if (m1) return m1[1];
  const m2 = text.match(/(?:facebook\.com|fb\.com)\/(\d+)/i);
  if (m2) return m2[1];
  if (/^\d{5,20}$/.test(text.trim())) return text.trim();
  return null;
}

module.exports = {
  config: {
    name: "addadmin",
    aliases: ["addmod", "إضافة-أدمن", "أدمن"],
    version: "2.0",
    author: "magnus",
    countDown: 5,
    role: 3,
    category: "management",
    description: "إضافة أو تعديل أدمن بوت بمستوى معين (1-3)",
    guide: {
      en: "{pn} [1-3] @tag\n{pn} [1-3] [ID]\n{pn} [1-3] — رد على رسالة\n{pn} list — قائمة الأدمن\n{pn} remove [ID] — إزالة أدمن"
    }
  },

  onStart: async function ({ api, event, args, message }) {
    const { senderID, threadID, mentions, messageReply } = event;

    if (!isTopAdmin(senderID))
      return message.reply("⟦ SAIYAN / ACCESS DENIED ⟧\nهذا الإجراء محجوز لمالك النظام أو الإدارة العليا.");

    const sub = (args[0] || "").toLowerCase();

    // ── قائمة الأدمن ──────────────────────────────────────────────────────
    if (sub === "list" || sub === "قائمة") {
      const levels = loadLevels();
      const cfg    = global.GoatBot?.config || {};
      const supers = [cfg.ownerID, ...(cfg.superAdminBot || [])].filter(Boolean).map(String);
      if (!Object.keys(levels).length && !supers.length)
        return message.reply("⟦ SAIYAN / ADMIN INDEX ⟧\nلا توجد حسابات إدارية إضافية مسجّلة حاليًا.");

      const lines = ["⟦ SAIYAN / ADMIN REGISTRY ⟧", "سجل الصلاحيات الإدارية", "────────────────────────"];
      const emoji = { 3: "🥇", 2: "🥈", 1: "🥉" };
      for (const [id, lvl] of Object.entries(levels))
        lines.push(`${emoji[lvl] || "•"} المستوى ${lvl}  |  ${id}`);
      for (const id of supers)
        if (!levels[id]) lines.push(`♛ مالك النظام  |  ${id}`);
      lines.push("────────────────────────\n— magnus");
      return message.reply(lines.join("\n"));
    }

    // ── إزالة أدمن ────────────────────────────────────────────────────────
    if (sub === "remove" || sub === "إزالة") {
      const rid = args[1] ? extractID(args[1]) : (messageReply?.senderID || Object.keys(mentions || {})[0]);
      if (!rid) return message.reply("⟦ INPUT REQUIRED ⟧\nأرسل معرّف الحساب أو ردّ على رسالة صاحبه.");
      const levels = loadLevels();
      if (!levels[String(rid)]) return message.reply(`⟦ NO MATCH ⟧\nالمعرّف \${rid} غير موجود في سجل الإدارة.`);
      delete levels[String(rid)];
      saveLevels(levels);
      // تحديث config
      try {
        const cfg = JSON.parse(fs.readFileSync(CONFIG_FILE, "utf8"));
        cfg.adminBot = (cfg.adminBot || []).filter(id => String(id) !== String(rid));
        fs.writeFileSync(CONFIG_FILE, JSON.stringify(cfg, null, 2));
        if (global.GoatBot?.config) global.GoatBot.config.adminBot = cfg.adminBot;
      } catch (_) {}
      return message.reply(`⟦ ACCESS REVOKED ⟧\nتم سحب الصلاحية الإدارية من الحساب \${rid}.`);
    }

    // ── إضافة / تعديل ─────────────────────────────────────────────────────
    const level = parseInt(sub);
    if (isNaN(level) || level < 1 || level > 3) {
      return message.reply(
        "⟦ SAIYAN / ADMIN CONTROL ⟧\nصيغة غير مكتملة أو مستوى غير صالح.\n\n/addadmin 1 @عضو — صلاحية أساسية\n/addadmin 2 [ID] — صلاحية متقدمة\n/addadmin 3 — رد على رسالة المالك\n/addadmin list — عرض السجل\n/addadmin remove [ID] — سحب الصلاحية\n\nالمستويات: 1 أساسي · 2 متقدم · 3 إدارة عليا\n— magnus"
      );
    }

    let targetID = null;
    const taggedIDs = Object.keys(mentions || {});
    if (taggedIDs.length) targetID = taggedIDs[0];
    else if (args[1])     targetID = extractID(args[1]);
    else if (messageReply) targetID = messageReply.senderID;

    if (!targetID) return message.reply("⟦ TARGET MISSING ⟧\nحدّد الحساب بالإشارة إليه، أو بالرد على رسالته، أو بإرسال ID.");
    if (String(targetID) === String(senderID))
      return message.reply("⟦ OPERATION BLOCKED ⟧\nلا يمكن منح حسابك صلاحية إدارية عبر هذا الأمر.");

    const levels   = loadLevels();
    const oldLevel = levels[String(targetID)];
    levels[String(targetID)] = level;
    saveLevels(levels);

    // تحديث config.json
    try {
      const cfg = JSON.parse(fs.readFileSync(CONFIG_FILE, "utf8"));
      if (!cfg.adminBot) cfg.adminBot = [];
      if (!cfg.adminBot.map(String).includes(String(targetID))) cfg.adminBot.push(targetID);
      fs.writeFileSync(CONFIG_FILE, JSON.stringify(cfg, null, 2));
      if (global.GoatBot?.config) global.GoatBot.config.adminBot = cfg.adminBot;
    } catch (_) {}

    const emoji  = { 3: "🥇", 2: "🥈", 1: "🥉" };
    const labels = { 3: "أدمن كبير", 2: "أدمن عادي", 1: "جونيور" };

    return message.reply(
      `⟦ SAIYAN / PRIVILEGE UPDATED ⟧\n` +
      `${oldLevel ? "تم تعديل مستوى الحساب" : "تم تسجيل حساب إداري جديد"}\n` +
      `المعرّف: ${targetID}\n` +
      (oldLevel ? `المستوى السابق: ${oldLevel}\nالمستوى الحالي: ${level} ${emoji[level]}\n` : `المستوى الممنوح: ${level} ${emoji[level]} — ${labels[level]}\n`) +
      `الحالة: تم اعتماد التغيير\n— magnus`
    );
  }
};
