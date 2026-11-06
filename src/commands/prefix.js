/**
 * Saiyan V1 — /prefix — تغيير بادئة الأوامر
 * Copyright © 2026 magnus
 * Ported from SAIYAN CORE & adapted for Saiyan engine
 */
"use strict";
const fs   = require("fs-extra");
const path = require("path");

const CONFIG_FILE = path.join(process.cwd(), "config.json");

module.exports = {
  config: {
    name: "prefix",
    aliases: ["بادئة", "setprefix"],
    version: "2.0",
    author: "magnus",
    countDown: 5,
    role: 3,
    category: "management",
    description: "تغيير بادئة الأوامر",
    guide: { en: "{pn} [البادئة الجديدة]\nمثال: {pn} !" }
  },

  onStart: async function ({ event, args, message }) {
    const current = global.GoatBot?.config?.prefix || "/";

    if (!args[0]) {
      return message.reply(
        `⟦ SAIYAN / COMMAND ROUTING ⟧\nالبادئة الحالية: "${current}"\nلتحديثها أرسل: /prefix [البادئة الجديدة]\n— magnus`
      );
    }

    const newPrefix = args[0].trim();
    if (newPrefix.length > 3) return message.reply("⟦ INVALID PREFIX ⟧\nيجب أن تتكون البادئة من حرف إلى ثلاثة أحرف كحد أقصى.");

    try {
      const cfg = JSON.parse(fs.readFileSync(CONFIG_FILE, "utf8"));
      cfg.prefix = newPrefix;
      fs.writeFileSync(CONFIG_FILE, JSON.stringify(cfg, null, 2));
      if (global.GoatBot?.config) global.GoatBot.config.prefix = newPrefix;

      return message.reply(
        `⟦ ROUTING CONFIGURATION UPDATED ⟧\nالبادئة السابقة: "${current}"\nالبادئة المعتمدة: "${newPrefix}"\nستُستخدم البادئة الجديدة للأوامر التالية.\n— magnus`
      );
    } catch (e) {
      return message.reply(`⟦ CONFIGURATION FAILURE ⟧\nتعذر حفظ البادئة الجديدة: ${e.message}`);
    }
  }
};
