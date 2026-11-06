/**
 * Saiyan V1 — /adduser — إضافة عضو للغروب
 * Copyright © 2026 magnus
 * Ported from WHITE-V3 & adapted for Saiyan engine
 */
"use strict";

module.exports = {
  config: {
    name: "adduser",
    aliases: ["add", "إضافة", "اضافة"],
    version: "2.0",
    author: "magnus",
    countDown: 5,
    role: 2,
    category: "management",
    description: "إضافة عضو للغروب عبر ID أو رابط فيسبوك",
    guide: {
      en: "{pn} [ID]\n{pn} [facebook.com/profile.php?id=123456789]\n{pn} [ID1] [ID2] — إضافة متعددة"
    }
  },

  onStart: async function ({ api, event, args, message }) {
    const { threadID } = event;

    if (!args.length) {
      return message.reply(
        "⟦ SAIYAN / MEMBER DEPLOYMENT ⟧\nأرسل معرّفًا رقميًا أو رابط ملف فيسبوك.\nيمكن تمرير أكثر من معرّف في الأمر نفسه.\n\nمثال:\n/adduser 100012345678\n/adduser 100012345678 100098765432\n— magnus"
      );
    }

    function extractID(text) {
      const m1 = text.match(/profile\.php\?id=(\d+)/i);
      if (m1) return m1[1];
      const m2 = text.match(/(?:facebook|fb)\.com\/(\d+)/i);
      if (m2) return m2[1];
      if (/^\d{5,20}$/.test(text.trim())) return text.trim();
      return null;
    }

    const ids = args.map(a => extractID(a)).filter(Boolean);
    if (!ids.length) return message.reply("⟦ INVALID IDENTIFIER ⟧\nلم أتعرف على أي معرّف صالح. استخدم ID رقميًا أو رابط ملف فيسبوك مباشر.");

    message.react("⏳", event.messageID);
    let done = [], fail = [];

    for (const uid of ids) {
      try {
        await new Promise((res, rej) =>
          api.addUserToGroup(uid, threadID, (e) => e ? rej(e) : res())
        );
        done.push(uid);
      } catch (e) {
        fail.push({ uid, reason: e.message?.slice(0, 40) || "خطأ غير معروف" });
      }
    }

    message.react(done.length ? "✅" : "❌", event.messageID);

    const lines = ["⟦ SAIYAN / GROUP INVITATION REPORT ⟧", "────────────────────────"];
    if (done.length) {
      lines.push(`✓ اكتملت الإضافة: ${done.length} عضو`);
      for (const uid of done) lines.push(`  + ${uid}`);
    }
    if (fail.length) {
      lines.push(`✕ تعذرت إضافة: ${fail.length} عضو`);
      for (const f of fail) lines.push(`  - ${f.uid}: ${f.reason}`);
    }
    lines.push("────────────────────────\n— magnus");
    return message.reply(lines.join("\n"));
  }
};
