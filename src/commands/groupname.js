/**
 * Saiyan V1 — /groupname — تغيير اسم الغروب
 * Copyright © 2026 magnus
 * Ported from SAIYAN CORE & adapted for Saiyan engine
 */
"use strict";

module.exports = {
  config: {
    name: "groupname",
    aliases: ["setname", "اسم-الغروب", "اسم"],
    version: "2.0",
    author: "magnus",
    countDown: 5,
    role: 2,
    category: "management",
    description: "تغيير اسم الغروب",
    guide: { en: "{pn} [الاسم الجديد]" }
  },

  onStart: async function ({ api, event, args, message }) {
    const { threadID } = event;
    const newName = args.join(" ").trim();

    if (!newName) {
      return message.reply(
        "⟦ SAIYAN / GROUP IDENTITY ⟧\nلم يتم تحديد الاسم الجديد.\nاستخدم: /groupname [الاسم المطلوب]"
      );
    }

    message.react("⏳", event.messageID);

    try {
      await new Promise((res, rej) =>
        api.setTitle(newName, threadID, (e) => e ? rej(e) : res())
      );
      message.react("✅", event.messageID);
      return message.reply(
        `⟦ GROUP IDENTITY UPDATED ⟧\nالاسم المعتمد الآن: ${newName}\nالحالة: تم تطبيق التغيير\n— magnus`
      );
    } catch (e) {
      message.react("❌", event.messageID);
      return message.reply(
        "⟦ GROUP IDENTITY UPDATE FAILED ⟧\nلم أتمكن من تعديل اسم المجموعة. تحقق من صلاحيات Saiyan وحاول مجددًا."
      );
    }
  }
};
