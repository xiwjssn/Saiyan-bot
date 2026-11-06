/**
 * Saiyan V1 — /autoseen — رؤية الرسائل تلقائياً
 * Copyright © 2026 magnus
 * Ported from SAIYAN CORE & adapted for Saiyan engine
 */
"use strict";
const fs   = require("fs-extra");
const path = require("path");

const DATA_FILE = path.join(process.cwd(), "database", "data", "autoseen.json");

function loadData() {
  try { if (fs.existsSync(DATA_FILE)) return JSON.parse(fs.readFileSync(DATA_FILE, "utf8")); } catch (_) {}
  return { enabled: false };
}
function saveData(d) {
  fs.ensureDirSync(path.dirname(DATA_FILE));
  fs.writeFileSync(DATA_FILE, JSON.stringify(d, null, 2));
}

module.exports = {
  config: {
    name: "autoseen",
    aliases: ["seen", "markseen", "شاهد"],
    version: "2.0",
    author: "magnus",
    countDown: 5,
    role: 2,
    category: "system",
    description: "تفعيل رؤية الرسائل تلقائياً في جميع المحادثات",
    guide: { en: "{pn} on|off|status" }
  },

  onStart: async function ({ args, message }) {
    const data = loadData();
    const sub  = (args[0] || "status").toLowerCase();

    if (sub === "on" || sub === "تفعيل") {
      data.enabled = true;
      saveData(data);
      return message.reply("⟦ SAIYAN / READ MODE ⟧\nتم تشغيل الرصد التلقائي للرسائل الواردة.");
    }
    if (sub === "off" || sub === "إيقاف") {
      data.enabled = false;
      saveData(data);
      return message.reply("⟦ SAIYAN / READ MODE ⟧\nتم إيقاف الرصد التلقائي. لن تُعلّم الرسائل كمقروءة عبر هذه الوحدة.");
    }

    return message.reply(
      `⟦ SAIYAN / READ MODE STATUS ⟧\n` +
      `الحالة الحالية: ${data.enabled ? "ACTIVE / يعمل" : "INACTIVE / متوقف"}\n` +
      `التحكم: /autoseen on أو /autoseen off\n` +
      `النطاق: جميع المحادثات\n— magnus`
    );
  },

  // مراقبة الرسائل وتطبيق seen تلقائياً
  onEvent: async function ({ api, event }) {
    try {
      if (event.type !== "message" && event.type !== "message_reply") return;
      const data = loadData();
      if (!data.enabled) return;
      if (String(event.senderID) === String(global.GoatBot?.botID)) return;
      api.markAsRead(event.threadID, () => {});
    } catch (_) {}
  }
};
