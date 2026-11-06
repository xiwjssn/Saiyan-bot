/**
 * Saiyan V1 — /all — تاق لجميع أعضاء الغروب
 * Copyright © 2026 magnus
 * Ported from WHITE-V3 & adapted for Saiyan engine
 */
"use strict";

module.exports = {
  config: {
    name: "all",
    aliases: ["tagall", "everyone", "الكل", "تاق"],
    version: "2.0",
    author: "magnus",
    countDown: 10,
    role: 1,
    category: "management",
    description: "تاق جميع أعضاء الغروب",
    guide: { en: "{pn} [رسالة اختيارية]" }
  },

  onStart: async function ({ api, event, args, message }) {
    const { threadID, participantIDs } = event;

    if (!participantIDs || !participantIDs.length) {
      return message.reply("⟦ MEMBER INDEX UNAVAILABLE ⟧\nلم تصلني قائمة أعضاء المجموعة، لذلك لم أرسل الإشارة الجماعية.");
    }

    const botID     = String(global.GoatBot?.botID || api.getCurrentUserID?.() || "");
    const members   = participantIDs.filter(id => String(id) !== botID);
    const customMsg = args.join(" ").trim();

    // نبني جسم الرسالة: إذا وُجدت رسالة مخصصة نستخدمها، وإلا نكتب @all بعدد الأعضاء
    // نخصص حرفاً واحداً لكل عضو (الأساس كما في WHITE)
    let body    = customMsg || "⟦ SAIYAN / GROUP PING ⟧";
    const mentions = [];

    for (let i = 0; i < members.length; i++) {
      const uid = members[i];
      // نضيف المنشن عند آخر حرف من الجسم + نضيف مسافة
      const fromIndex = body.length;
      body += " @";
      mentions.push({ id: uid, tag: "@", fromIndex });
    }

    try {
      await new Promise((resolve, reject) => {
        api.sendMessage({ body, mentions }, threadID, (err) => err ? reject(err) : resolve());
      });
    } catch (err) {
      message.reply(`⟦ BROADCAST FAILED ⟧\nتعذر إرسال الإشارة إلى أعضاء المجموعة.\nالتفاصيل: ${err.message?.slice(0, 60) || "سبب غير محدد"}`);
    }
  }
};
