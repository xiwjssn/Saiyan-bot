/**
 * Saiyan V1 — /out — خروج البوت من الغروب
 * Copyright © 2026 magnus
 * Ported from SAIYAN CORE & adapted for Saiyan engine
 */
"use strict";

module.exports = {
  config: {
    name: "out",
    aliases: ["leave", "اخرج", "غادر"],
    version: "2.0",
    author: "magnus",
    countDown: 5,
    role: 3,
    category: "management",
    description: "إخراج البوت من الغروب الحالي",
    guide: { en: "{pn} — خروج من الغروب الحالي" }
  },

  onStart: async function ({ api, event, message }) {
    const botID   = api.getCurrentUserID?.() || global.GoatBot?.botID;
    const tid     = event.threadID;

    await message.reply(
      "⟦ SAIYAN / GROUP EXIT ⟧\nتم استلام طلب المغادرة. سأغادر هذه المجموعة الآن.\n— magnus"
    );

    try {
      await new Promise(r => setTimeout(r, 1500));
      await new Promise((res, rej) =>
        api.removeUserFromGroup(String(botID), tid, (e) => e ? rej(e) : res())
      );
    } catch (e) {
      return message.reply(
        "⟦ GROUP EXIT FAILED ⟧\nلم أتمكن من مغادرة المجموعة. تحقق من صلاحيات Saiyan ثم أعد المحاولة."
      );
    }
  }
};
