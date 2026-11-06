/**
 * Saiyan V1 — /ban — حظر مستخدم من استخدام البوت
 * Copyright © 2026 magnus
 * Ported from SAIYAN CORE & adapted for Saiyan engine
 */
"use strict";
const fs   = require("fs-extra");
const path = require("path");

const BAN_FILE = path.join(process.cwd(), "database", "data", "banned.json");

function loadBans() {
  try { if (fs.existsSync(BAN_FILE)) return JSON.parse(fs.readFileSync(BAN_FILE, "utf8")); } catch (_) {}
  return {};
}
function saveBans(data) {
  fs.ensureDirSync(path.dirname(BAN_FILE));
  fs.writeFileSync(BAN_FILE, JSON.stringify(data, null, 2));
}

// تحميل القائمة مرة واحدة عند بدء التشغيل
if (!global._saiyanBans) global._saiyanBans = loadBans();

module.exports = {
  config: {
    name: "ban",
    aliases: ["block", "حظر"],
    version: "2.0",
    author: "magnus",
    countDown: 3,
    role: 3,
    category: "management",
    description: "حظر / رفع حظر مستخدم من استخدام البوت",
    guide: { en: "{pn} @tag [سبب] — حظر\n{pn} unban @tag — رفع الحظر\n{pn} list — القائمة" }
  },

  onStart: async function ({ event, args, message }) {
    const { mentions, messageReply, senderID } = event;
    const sub = (args[0] || "").toLowerCase();

    const bans = global._saiyanBans;

    // ── قائمة المحظورين ────────────────────────────────────────────────
    if (sub === "list" || sub === "قائمة") {
      const entries = Object.entries(bans);
      if (!entries.length) return message.reply("⟦ SAIYAN / BLOCKLIST ⟧\nالسجل فارغ. لا توجد حسابات محظورة حاليًا.");
      const lines = ["⟦ SAIYAN / ACCESS BLOCKLIST ⟧", "سجل الحسابات المقيّدة", "────────────────────────"];
      for (const [uid, data] of entries)
        lines.push(`المعرّف: ${uid}\nالسبب: ${data.reason || "غير محدد"}\n────────────────────────`);
      lines.push("— magnus");
      return message.reply(lines.join("\n"));
    }

    // ── رفع الحظر ────────────────────────────────────────────────────
    if (sub === "unban" || sub === "رفع") {
      const tagIDs = Object.keys(mentions || {});
      const rid    = tagIDs[0] || messageReply?.senderID || args[1];
      if (!rid) return message.reply("⟦ TARGET REQUIRED ⟧\nأشر إلى الحساب المطلوب أو رد على رسالته.");
      if (!bans[String(rid)]) return message.reply(`⟦ NO RESTRICTION FOUND ⟧\nالحساب ${rid} غير موجود في سجل الحظر.`);
      delete bans[String(rid)];
      saveBans(bans);
      return message.reply(`⟦ ACCESS RESTORED ⟧\nتمت إزالة القيد عن الحساب ${rid}.`);
    }

    // ── حظر ───────────────────────────────────────────────────────────
    const tagIDs   = Object.keys(mentions || {});
    const targetID = tagIDs[0] || messageReply?.senderID;
    if (!targetID) {
      return message.reply(
        "⟦ SAIYAN / ACCESS CONTROL ⟧\nلم يتم تحديد الحساب المستهدف.\n\n/ban @عضو [السبب] — تقييد الحساب\n/ban unban @عضو — إعادة الوصول\n/ban list — عرض سجل القيود\n— magnus"
      );
    }
    if (String(targetID) === String(senderID)) return message.reply("⟦ SELF-PROTECTION ⟧\nلا يمكن تطبيق هذا القيد على حسابك.");

    const reason = args.slice(1).join(" ") || "لم يُذكر سبب";
    bans[String(targetID)] = { reason, date: new Date().toLocaleDateString("ar-EG"), by: senderID };
    saveBans(bans);

    return message.reply(
      `⟦ SAIYAN / ACCESS RESTRICTED ⟧\n` +
      `الحساب: ${targetID}\n` +
      `سبب التقييد: ${reason}\n` +
      `الحالة: تم تسجيل القيد\n— magnus`
    );
  }
};
