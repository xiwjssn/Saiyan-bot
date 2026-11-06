/**
 * Saiyan V1 — /warn — نظام التحذيرات
 * Copyright © 2026 magnus
 * Ported from SAIYAN CORE & adapted for Saiyan engine
 */
"use strict";
const fs   = require("fs-extra");
const path = require("path");

const WARN_FILE = path.join(process.cwd(), "database", "data", "warns.json");
const MAX_WARNS = 3;

function loadWarns() {
  try { if (fs.existsSync(WARN_FILE)) return JSON.parse(fs.readFileSync(WARN_FILE, "utf8")); } catch (_) {}
  return {};
}
function saveWarns(data) {
  fs.ensureDirSync(path.dirname(WARN_FILE));
  fs.writeFileSync(WARN_FILE, JSON.stringify(data, null, 2));
}
function getKey(tid, uid) { return `${tid}:${uid}`; }

module.exports = {
  config: {
    name: "warn",
    aliases: ["تحذير", "warning"],
    version: "2.0",
    author: "magnus",
    countDown: 5,
    role: 2,
    category: "management",
    description: `تحذير الأعضاء — عند ${MAX_WARNS} تحذيرات يُطرد تلقائياً`,
    guide: {
      en: "{pn} @tag [سبب] — تحذير\n{pn} list — القائمة\n{pn} reset @tag — إعادة تعيين\n{pn} info @tag — معلومات"
    }
  },

  onStart: async function ({ api, event, args, message }) {
    const { threadID, mentions, messageReply, senderID } = event;
    const sub = (args[0] || "").toLowerCase();

    const warns = loadWarns();

    // ── قائمة التحذيرات ──────────────────────────────────────────────────
    if (sub === "list" || sub === "قائمة") {
      const threadWarns = Object.entries(warns).filter(([k]) => k.startsWith(threadID + ":"));
      if (!threadWarns.length) return message.reply("⟦ SAIYAN / DISCIPLINE LOG ⟧\nلا توجد سجلات تحذير لهذه المجموعة.");
      const lines = ["⟦ SAIYAN / WARNING REGISTER ⟧", "سجل المخالفات المسجلة", "────────────────────────"];
      for (const [key, data] of threadWarns) {
        const uid = key.split(":")[1];
        lines.push(`الحساب ${uid}: ${data.count}/${MAX_WARNS} تحذيرات`);
      }
      lines.push("— magnus");
      return message.reply(lines.join("\n"));
    }

    // ── إعادة تعيين ────────────────────────────────────────────────────────
    if (sub === "reset" || sub === "تعيين") {
      const tagIDs = Object.keys(mentions || {});
      const rid = tagIDs[0] || messageReply?.senderID;
      if (!rid) return message.reply("⟦ TARGET REQUIRED ⟧\nأشر إلى العضو أو قم بالرد على رسالته لتحديد الحساب.");
      const key = getKey(threadID, rid);
      delete warns[key];
      saveWarns(warns);
      return message.reply(`⟦ WARNING HISTORY RESET ⟧\nتم تصفير سجل التحذيرات للحساب ${rid}.`);
    }

    // ── معلومات شخص ────────────────────────────────────────────────────────
    if (sub === "info" || sub === "معلومات") {
      const tagIDs = Object.keys(mentions || {});
      const rid = tagIDs[0] || messageReply?.senderID || senderID;
      const key  = getKey(threadID, rid);
      const data = warns[key];
      if (!data) return message.reply(`⟦ NO DISCIPLINE RECORD ⟧\nلا توجد تحذيرات مسجلة للحساب ${rid}.`);
      const lines = ["⟦ SAIYAN / MEMBER DISCIPLINE ⟧", `الحساب: ${rid}`, "────────────────────────"];
      for (const [i, w] of (data.history || []).entries())
        lines.push(`${i + 1}. ${w.reason} — ${w.date}`);
      lines.push("────────────────────────");
      lines.push(`إجمالي التحذيرات: ${data.count}/${MAX_WARNS}`);
      lines.push("— magnus");
      return message.reply(lines.join("\n"));
    }

    // ── تحذير شخص ─────────────────────────────────────────────────────────
    const tagIDs = Object.keys(mentions || {});
    const targetID = tagIDs[0] || messageReply?.senderID;
    if (!targetID) {
      return message.reply(
        `⟦ SAIYAN / DISCIPLINE CONTROL ⟧\nالحد الأقصى: ${MAX_WARNS} تحذيرات قبل محاولة الإخراج.\n/warn @عضو [السبب] — تسجيل تحذير\n/warn list — عرض السجل\n/warn reset @عضو — تصفير السجل\n/warn info @عضو — تفاصيل الحساب\n— magnus`
      );
    }

    // حذف الاسم المُذكَر من args
    const reason = args.filter(a => !a.startsWith("@")).slice(sub === "warn" ? 1 : 0).join(" ") || "لم يُذكر سبب";

    const key  = getKey(threadID, targetID);
    if (!warns[key]) warns[key] = { count: 0, history: [] };
    warns[key].count++;
    warns[key].history.push({
      reason,
      date: new Date().toLocaleDateString("ar-EG"),
      by: senderID,
    });
    saveWarns(warns);

    const count = warns[key].count;

    if (count >= MAX_WARNS) {
      await message.reply(
        `⟦ SAIYAN / LIMIT REACHED ⟧\nالحساب: ${targetID}\nعدد التحذيرات: ${count}/${MAX_WARNS}\nتم بلوغ الحد؛ جارٍ تنفيذ إجراء الإخراج.\n— magnus`
      );
      try {
        await new Promise((res, rej) =>
          api.removeUserFromGroup(String(targetID), threadID, (e) => e ? rej(e) : res())
        );
        delete warns[key];
        saveWarns(warns);
      } catch (_) {
        message.reply("⟦ AUTOMATED ACTION FAILED ⟧\nتم تسجيل بلوغ الحد، لكن تعذر إخراج العضو. تحقق من صلاحيات Saiyan.");
      }
    } else {
      return message.reply(
        `⟦ SAIYAN / WARNING ${count} OF ${MAX_WARNS} ⟧\nالحساب: ${targetID}\nسبب التسجيل: ${reason}\n` +
        (count >= MAX_WARNS - 1 ? `هذا هو التحذير الأخير قبل إجراء الإخراج.\n` : `المتبقي قبل بلوغ الحد: ${MAX_WARNS - count}\n`) +
        `— magnus`
      );
    }
  }
};
