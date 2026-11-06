/**
 * Saiyan V1 — /tag — تاق مجموعات مخصصة
 * Copyright © 2026 magnus
 * Ported from WHITE-V3 (grouptag) & adapted for Saiyan engine
 * Simplified version using file-based storage (no threadsData)
 */
"use strict";
const fs   = require("fs-extra");
const path = require("path");

const DATA_FILE = path.join(process.cwd(), "database", "data", "taggroups.json");

function loadData() {
  try { if (fs.existsSync(DATA_FILE)) return JSON.parse(fs.readFileSync(DATA_FILE, "utf8")); } catch (_) {}
  return {};
}
function saveData(d) {
  fs.ensureDirSync(path.dirname(DATA_FILE));
  fs.writeFileSync(DATA_FILE, JSON.stringify(d, null, 2));
}

function getThread(tid) {
  const d = loadData();
  if (!d[tid]) d[tid] = {};
  return d[tid];
}
function saveThread(tid, groups) {
  const d  = loadData();
  d[tid]   = groups;
  saveData(d);
}

module.exports = {
  config: {
    name: "tag",
    aliases: ["grouptag", "grtag", "taggroup"],
    version: "2.0",
    author: "magnus",
    countDown: 5,
    role: 1,
    category: "management",
    description: "إنشاء وإدارة مجموعات تاق مخصصة",
    guide: {
      en: "{pn} add [اسم] @tag1 @tag2 — إضافة مجموعة\n" +
          "{pn} [اسم] — تاق المجموعة\n" +
          "{pn} list — عرض المجموعات\n" +
          "{pn} remove [اسم] — حذف مجموعة\n" +
          "{pn} info [اسم] — معلومات المجموعة"
    }
  },

  onStart: async function ({ api, event, args, message }) {
    const { threadID, mentions } = event;
    const groups = getThread(threadID);
    const sub    = (args[0] || "list").toLowerCase();

    // ── add ───────────────────────────────────────────────────────────────
    if (sub === "add" || sub === "إضافة") {
      const groupName = args[1]?.toUpperCase();
      if (!groupName) return message.reply("⟦ GROUP LABEL REQUIRED ⟧\nأدخل اسمًا للمجموعة ثم أشر إلى الأعضاء المراد ضمهم.\nمثال: /tag add TEAM @عضو1 @عضو2");
      const newIDs = Object.keys(mentions || {});
      if (!newIDs.length) return message.reply("⟦ MEMBERS REQUIRED ⟧\nأشر إلى عضو واحد على الأقل لإضافته إلى هذه المجموعة.");

      if (!groups[groupName]) groups[groupName] = [];
      const added = newIDs.filter(id => !groups[groupName].includes(id));
      groups[groupName] = [...new Set([...groups[groupName], ...newIDs])];
      saveThread(threadID, groups);
      return message.reply(
        `⟦ SAIYAN / TAG GROUP UPDATED ⟧\nالمجموعة: ${groupName}\nالأعضاء الجدد: ${added.length}\nإجمالي الأعضاء: ${groups[groupName].length}\n— magnus`
      );
    }

    // ── list ──────────────────────────────────────────────────────────────
    if (sub === "list" || sub === "all" || sub === "قائمة") {
      const names = Object.keys(groups);
      if (!names.length) return message.reply("⟦ TAG REGISTRY EMPTY ⟧\nلا توجد مجموعات محفوظة. أنشئ مجموعة باستخدام /tag add [اسم] @الأعضاء.");
      const lines = ["⟦ SAIYAN / TAG GROUP REGISTRY ⟧", "المجموعات المسجلة", "────────────────────────"];
      for (const n of names) lines.push(`• ${n} — ${groups[n].length} عضو`);
      lines.push("— magnus");
      return message.reply(lines.join("\n"));
    }

    // ── remove ────────────────────────────────────────────────────────────
    if (sub === "remove" || sub === "حذف" || sub === "delete") {
      const groupName = args[1]?.toUpperCase();
      if (!groupName || !groups[groupName]) return message.reply(`⟦ GROUP NOT FOUND ⟧\nلا توجد مجموعة بالاسم: ${args[1] || "غير محدد"}`);
      delete groups[groupName];
      saveThread(threadID, groups);
      return message.reply(`⟦ TAG GROUP REMOVED ⟧\nتم حذف المجموعة ${groupName} من السجل.`);
    }

    // ── info ──────────────────────────────────────────────────────────────
    if (sub === "info") {
      const groupName = args[1]?.toUpperCase();
      if (!groupName || !groups[groupName]) return message.reply(`⟦ GROUP NOT FOUND ⟧\nلا يوجد سجل بالاسم: ${args[1] || "غير محدد"}`);
      return message.reply(
        `⟦ SAIYAN / TAG GROUP DOSSIER ⟧\nالمجموعة: ${groupName}\nعدد الأعضاء: ${groups[groupName].length}\n` +
        groups[groupName].map(id => `• ${id}`).join("\n") + "\n— magnus"
      );
    }

    // ── tag — استدعاء المجموعة ───────────────────────────────────────────
    const groupName = args[0]?.toUpperCase();
    if (!groups[groupName]) {
      return message.reply(
        `⟦ UNKNOWN TAG GROUP ⟧\nلا يوجد سجل باسم ${args[0] || "غير محدد"}.\nاستخدم /tag list لمراجعة المجموعات المتاحة.`
      );
    }

    const members = groups[groupName];
    if (!members.length) return message.reply(`⟦ EMPTY TAG GROUP ⟧\nالمجموعة ${groupName} لا تحتوي على أعضاء.`);

    let body = `⟦ SAIYAN / GROUP SIGNAL: ${groupName} ⟧`;
    const tagMentions = [];
    for (const uid of members) {
      const fromIndex = body.length;
      body += " @";
      tagMentions.push({ id: uid, tag: "@", fromIndex });
    }

    try {
      await new Promise((res, rej) =>
        api.sendMessage({ body, mentions: tagMentions }, threadID, (err) => err ? rej(err) : res())
      );
    } catch (err) {
      message.reply(`⟦ GROUP SIGNAL FAILED ⟧\nتعذر إرسال الإشارات إلى أعضاء المجموعة: ${err.message?.slice(0, 80) || "سبب غير محدد"}`);
    }
  }
};
