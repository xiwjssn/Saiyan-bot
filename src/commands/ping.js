/**
 * SAIYAN / SIGNAL — latency and runtime diagnostics
 * Copyright © 2026 magnus
 */
"use strict";

module.exports = {
  config: {
    name: "ping",
    aliases: ["pong", "latency", "استجابة"],
    version: "3.0",
    author: "magnus",
    countDown: 3,
    role: 0,
    category: "utility",
    description: "تشخيص زمن الاتصال وموارد التشغيل",
    guide: { en: "{pn}" }
  },

  onStart: async function ({ message }) {
    const startedAt = Date.now();
    await message.reply("جارٍ فحص قناة الاتصال...");
    const latency = Date.now() - startedAt;

    const uptime = Math.floor(process.uptime());
    const hours = Math.floor(uptime / 3600);
    const minutes = Math.floor((uptime % 3600) / 60);
    const seconds = uptime % 60;
    const memory = Math.round(process.memoryUsage().rss / 1024 / 1024);
    const commands = global.GoatBot?.commands?.size || 0;

    return message.reply(
      "╭─ SAIYAN / SIGNAL ─╮\n" +
      "│ قناة الاتصال: متاحة\n" +
      "│ زمن الذهاب والإياب: " + latency + " ms\n" +
      "│ مدة الجلسة: " + hours + "س " + minutes + "د " + seconds + "ث\n" +
      "│ استهلاك الذاكرة: " + memory + " MB\n" +
      "│ وحدات الأوامر: " + commands + "\n" +
      "╰─ magnus ─╯"
    );
  }
};
