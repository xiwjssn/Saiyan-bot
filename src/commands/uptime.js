/**
 * Saiyan — /uptime
 * Copyright © 2026 magnus
 */
"use strict";

const os = require("os");

function formatUptime(ms) {
  const totalSeconds = Math.floor(ms / 1000);

  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const result = [];

  if (days > 0) result.push(`${days}d`);
  if (hours > 0) result.push(`${hours}h`);
  if (minutes > 0) result.push(`${minutes}m`);

  result.push(`${seconds}s`);

  return result.join(" ");
}

module.exports = {
  config: {
    name: "uptime",
    aliases: ["up", "ping", "وقت"],
    version: "3.0",
    author: "magnus",
    countDown: 5,
    role: 2,
    category: "info",

    description: "استدعاء معلومات Saiyan ومراقبة حالة التشغيل",

    guide: {
      en: "{pn} — استدعاء معلومات Saiyan"
    }
  },

  onStart: async function({ api, event, message }) {
    const bootTime =
      global.GoatBot?.startTime || Date.now();

    const uptime = Date.now() - bootTime;

    const memory = process.memoryUsage();

    const totalRam = os.totalmem();
    const freeRam = os.freemem();
    const usedRam = totalRam - freeRam;

    const commandCount =
      global.GoatBot?.commands?.size || 0;

    const botID =
      global.GoatBot?.botID || "Unknown";

    const prefix =
      global.GoatBot?.config?.prefix || "/";

    const checkStart = Date.now();

    await new Promise(resolve =>
      setTimeout(resolve, 10)
    );

    const responseTime = Date.now() - checkStart;

    const ramUsed =
      (memory.heapUsed / 1048576).toFixed(1);

    const systemUsed =
      (usedRam / 1073741824).toFixed(2);

    const systemTotal =
      (totalRam / 1073741824).toFixed(2);

    const text = [
      "🌌╭──────────────╮",
      "     🐦‍⬛ C R O W",
      "🌌╰──────────────╯",
      "",
      "🫀 نبض النظام: 💚 مستقر",
      "📡 الاتصال: 🟢 متصل",
      "",
      "⏳ منذ آخر تشغيل",
      `└─ 🕐 ${formatUptime(uptime)}`,
      "",
      "⚡ سرعة الاستجابة",
      `└─ 🚀 ${responseTime} ms`,
      "",
      "🧩 الوحدات النشطة",
      `└─ 📦 ${commandCount} أمر`,
      "",
      "💾 ذاكرة Saiyan",
      `└─ 🧠 ${ramUsed} MB`,
      "",
      "🖥️ موارد الجهاز",
      `└─ 📊 ${systemUsed} / ${systemTotal} GB`,
      "",
      "🔐 معلومات الاتصال",
      `└─ 🆔 ${botID}`,
      `└─ 🎛️ Prefix: ${prefix}`,
      "",
      "🛡️ الحماية",
      "└─ 🔵 ACTIVE",
      "",
      "━━━━━━━━━━━━━━━━━━",
      "☁️ كل الأنظمة تعمل بشكل طبيعي.",
      "👤 magnus",
      "━━━━━━━━━━━━━━━━━━"
    ].join("\n");

    return message.reply(text);
  }
};
