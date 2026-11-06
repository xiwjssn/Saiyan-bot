/**
 * Saiyan V1 — /getstate — الحصول على AppState الحالي
 * Copyright © 2026 magnus
 * Ported from WHITE-V3 (getfbstate) & adapted for Saiyan engine
 */
"use strict";
const fs   = require("fs-extra");
const path = require("path");
const os   = require("os");

const TMP_DIR = path.join(os.tmpdir(), "saiyan_state");

module.exports = {
  config: {
    name: "getstate",
    aliases: ["getfbstate", "getcookie", "appstate", "state"],
    version: "2.0",
    author: "magnus",
    countDown: 10,
    role: 3,
    category: "owner",
    description: "الحصول على AppState الحالي للبوت (للمالك فقط)",
    guide: {
      en: "{pn}             — AppState JSON\n" +
          "{pn} cookie / c  — صيغة cookies\n" +
          "{pn} string / s  — صيغة نصية"
    }
  },

  onStart: async function ({ api, event, args, message }) {
    const { senderID, threadID, messageID } = event;

    fs.ensureDirSync(TMP_DIR);

    let fbstate, fileName;
    const mode = (args[0] || "").toLowerCase();

    try {
      const appState = api.getAppState();

      if (["cookie", "cookies", "c"].includes(mode)) {
        fbstate  = JSON.stringify(appState.map(e => ({ name: e.key, value: e.value })), null, 2);
        fileName = "cookies.json";
      } else if (["string", "str", "s"].includes(mode)) {
        fbstate  = appState.map(e => `${e.key}=${e.value}`).join("; ");
        fileName = "cookiesString.txt";
      } else {
        fbstate  = JSON.stringify(appState, null, 2);
        fileName = "appState.json";
      }
    } catch (err) {
      return message.reply(`⟦ STATE READ FAILURE ⟧\nتعذر استخراج بيانات الجلسة: ${err.message}`);
    }

    const filePath = path.join(TMP_DIR, fileName);
    fs.writeFileSync(filePath, fbstate);

    try {
      // إرسال للمحادثة الخاصة إذا كان الأمر من غروب
      const target = senderID === threadID ? threadID : senderID;

      await new Promise((resolve, reject) => {
        api.sendMessage(
          {
            body: `⟦ SAIYAN / SESSION EXPORT ⟧\nنوع الملف: ${fileName}\nوقت الإنشاء: ${new Date().toLocaleString("ar-DZ")}\nتنبيه: يحتوي الملف على بيانات جلسة حساسة.`,
            attachment: fs.createReadStream(filePath)
          },
          target,
          (err) => {
            try { fs.unlinkSync(filePath); } catch (_) {}
            err ? reject(err) : resolve();
          }
        );
      });

      if (senderID !== threadID) {
        message.reply("⟦ PRIVATE DELIVERY COMPLETE ⟧\nتم إرسال ملف بيانات الجلسة إلى محادثتك الخاصة. حافظ عليه بسرية تامة.");
      }
    } catch (err) {
      try { fs.unlinkSync(filePath); } catch (_) {}
      message.reply(`⟦ DELIVERY FAILURE ⟧\nتعذر تسليم ملف الجلسة: ${err.message}`);
    }
  }
};
