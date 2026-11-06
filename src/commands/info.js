/**
 * Saiyan V1 — /info — معلومات عن شخص أو الغروب
 * Copyright © 2026 magnus
 * Ported from WHITE-V3 (boxinfo/user) & adapted for Saiyan engine
 */
"use strict";

module.exports = {
  config: {
    name: "info",
    aliases: ["boxinfo", "threadinfo", "معلومات-الغروب"],
    version: "2.0",
    author: "magnus",
    countDown: 5,
    role: 0,
    category: "utility",
    description: "معلومات عن الغروب أو شخص معين",
    guide: { en: "{pn} — معلومات الغروب\n{pn} @tag — معلومات شخص" }
  },

  onStart: async function ({ api, event, message }) {
    const { threadID, senderID, mentions, messageReply } = event;

    const tagIDs = Object.keys(mentions || {});
    const targetUser = tagIDs[0] || messageReply?.senderID;

    if (targetUser) {
      // معلومات شخص
      return message.reply(
        `⟦ SAIYAN / USER RECORD ⟧\nمعرّف الحساب: ${targetUser}\nمعرّف المحادثة: ${threadID}\n— magnus`
      );
    }

    // معلومات الغروب
    message.react("⏳", event.messageID);

    try {
      const info = await new Promise((res, rej) =>
        api.getThreadInfo(threadID, (e, d) => e ? rej(e) : res(d))
      );

      const name     = info?.threadName || "محادثة خاصة";
      const members  = (info?.participantIDs || []).length;
      const admins   = (info?.adminIDs || []).length;
      const isGroup  = info?.isGroup ? "نعم" : "لا";
      const approval = info?.approvalMode ? "مفعّل" : "معطّل";

      message.react("✅", event.messageID);
      return message.reply(
        `⟦ SAIYAN / CONVERSATION DOSSIER ⟧\n` +
        `اسم المحادثة: ${name.slice(0, 40)}\n` +
        `المعرّف: ${threadID}\n` +
        `عدد الأعضاء: ${members}\n` +
        `عدد المشرفين: ${admins}\n` +
        `موافقة الانضمام: ${approval}\n` +
        `مجموعة: ${isGroup}\n— magnus`
      );
    } catch (e) {
      message.react("❌", event.messageID);
      message.reply(`⟦ DATA RETRIEVAL FAILED ⟧\nتعذر جلب بيانات المحادثة: ${e.message}`);
    }
  }
};
