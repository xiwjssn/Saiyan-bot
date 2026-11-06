/**
 * Saiyan V1 — /greet — رسالة ترحيبية
 * Copyright © 2026 magnus
 * Ported from SAIYAN CORE & adapted for Saiyan engine
 */
"use strict";

module.exports = {
  config: {
    name: "greet",
    aliases: ["hello", "hi", "مرحبا", "هلا", "سلام"],
    version: "2.0",
    author: "magnus",
    countDown: 5,
    role: 0,
    category: "utility",
    description: "رسالة ترحيبية تعرّف بالبوت وأوامره",
    guide: { en: "{pn}" }
  },

  onStart: async function ({ api, event, message }) {
    const { senderID } = event;
    const prefix = global.GoatBot?.config?.prefix || "/";
    const botName = global.GoatBot?.config?.botName || "Saiyan";

    let name = "صديقي";
    try {
      const info = await new Promise((res, rej) =>
        api.getUserInfo(senderID, (err, d) => err ? rej(err) : res(d))
      );
      name = info[senderID]?.name || name;
    } catch (_) {}

    const LINE = "━━━━━━━━━━━━━━━━━━━━━━━━━━━━";

    return message.reply(
      `${LINE}\n` +
      `⟦ SAIYAN / CONNECTION ESTABLISHED ⟧\nأهلًا ${name}، تم فتح قناة التواصل.\n` +
      `${LINE}\n\n` +
      `أنا ${botName}، مساعد المجموعة لتنفيذ الأدوات والخدمات المتاحة.\n` +
      `اختر أمرًا من الدليل لبدء الاستخدام.\n\n` +
      `${LINE}\n` +
      `⟦ QUICK ACCESS ⟧\n` +
      `  ${prefix}help        — كل الأوامر\n` +
      `  ${prefix}ping        — حالة البوت\n` +
      `  ${prefix}ai [سؤال]  — دردشة AI\n` +
      `  ${prefix}song [اسم] — تحميل موسيقى\n` +
      `  ${prefix}video [بحث]— تحميل فيديو\n` +
      `  ${prefix}weather [مدينة] — الطقس\n` +
      `  ${prefix}balance     — رصيدك\n` +
      `  ${prefix}daily       — مكافأة يومية\n` +
      `  ${prefix}uid         — معرفك\n\n` +
      `${LINE}\n` +
      `بادئة الأوامر: ${prefix}\nالمطوّر: magnus\n` +
      `${LINE}`
    );
  }
};
