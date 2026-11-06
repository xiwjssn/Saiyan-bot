/**
 * Saiyan V1 — /kick — طرد عضو من الغروب
 * Copyright © 2026 magnus
 * Ported from SAIYAN CORE & adapted for Saiyan engine
 */
"use strict";

module.exports = {
  config: {
    name: "kick",
    aliases: ["طرد", "remove"],
    version: "2.0",
    author: "magnus",
    countDown: 5,
    role: 2,
    category: "management",
    description: "طرد عضو من الغروب",
    guide: { en: "{pn} @tag — أو رد على رسالة الشخص بالأمر" }
  },

  onStart: async function ({ api, event, message }) {
    const { threadID, mentions, messageReply } = event;

    let targets = Object.keys(mentions || {});
    if (!targets.length && messageReply) targets = [messageReply.senderID];

    if (!targets.length) {
      return message.reply(
        "⟦ SAIYAN / MEMBER CONTROL ⟧\nلم يتم تحديد أي عضو.\nأشر إلى العضو باستخدام @mention أو قم بالرد على رسالته ثم أرسل /kick."
      );
    }

    const botID = String(api.getCurrentUserID?.() || global.GoatBot?.botID || "");
    const botAdmin = String(event.senderID);

    let done = 0, fail = 0;
    for (const uid of targets) {
      if (String(uid) === botID) { fail++; continue; }
      if (String(uid) === botAdmin) { fail++; continue; }
      try {
        await new Promise((res, rej) =>
          api.removeUserFromGroup(String(uid), threadID, (e) => e ? rej(e) : res())
        );
        done++;
      } catch (_) { fail++; }
    }

    if (done > 0) {
      return message.reply(
        `⟦ SAIYAN / MODERATION REPORT ⟧\nعمليات الإخراج الناجحة: ${done}\n` +
        (fail ? `العمليات التي تعذرت: ${fail} — تحقق من الصلاحيات\n` : "") +
        `الحالة: انتهى التنفيذ\n— magnus`
      );
    } else {
      return message.reply(
        "⟦ MODERATION ACTION FAILED ⟧\nلم يتم إخراج أي عضو. تحقق من صلاحيات Saiyan داخل المجموعة ومن صلاحيات الحساب المستهدف."
      );
    }
  }
};
