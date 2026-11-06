/**
 * Saiyan V1 — /imagegen — توليد صور بالذكاء الاصطناعي
 * Copyright © 2026 magnus
 * Ported from WHITE-V3 (wgen/weigen) & adapted for Saiyan engine
 */
"use strict";
const axios = require("axios");
const fs    = require("fs-extra");
const path  = require("path");
const os    = require("os");

const CACHE_DIR = path.join(os.tmpdir(), "saiyan_imggen");

function cleanFile(f) {
  try { if (f && fs.existsSync(f)) fs.unlinkSync(f); } catch (_) {}
}

module.exports = {
  config: {
    name: "imagegen",
    aliases: ["wgen", "imggen", "generate", "توليد", "صورة-AI"],
    version: "2.0",
    author: "magnus",
    countDown: 15,
    role: 0,
    category: "ai",
    description: "توليد صور بالذكاء الاصطناعي",
    guide: { en: "{pn} [وصف الصورة]\nمثال: {pn} sunset over the ocean, photorealistic" }
  },

  onStart: async function ({ api, event, args, message }) {
    const { threadID, messageID } = event;
    const prompt = args.join(" ").trim();

    if (!prompt) {
      return message.reply(
        "⟦ SAIYAN / IMAGE SYNTHESIS ⟧\nلم تحدد وصف الصورة. أرسل /imagegen متبوعًا بوصف واضح للمشهد والأسلوب المطلوب.\nمثال: /imagegen sunset over the ocean, photorealistic"
      );
    }

    message.react("⏳", messageID);
    message.reply(`⟦ SAIYAN / IMAGE CORE ⟧\nتم استلام الوصف، جارٍ إنشاء الصورة...\nالمشهد: ${prompt}`);

    fs.ensureDirSync(CACHE_DIR);
    const tmpFile = path.join(CACHE_DIR, `imggen_${Date.now()}.png`);

    // APIs متعددة — نجرب واحدة تلو الأخرى
    const apis = [
      `https://www.arch2devs.ct.ws/api/weigen?prompt=${encodeURIComponent(prompt)}`,
      `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=1024&height=1024&nologo=true`,
    ];

    for (const apiUrl of apis) {
      try {
        const res = await axios.get(apiUrl, {
          responseType: "stream",
          timeout: 60000,
          headers: { "User-Agent": "Mozilla/5.0" }
        });

        await new Promise((resolve, reject) => {
          const writer = fs.createWriteStream(tmpFile);
          res.data.pipe(writer);
          writer.on("finish", resolve);
          writer.on("error", reject);
        });

        if (fs.existsSync(tmpFile) && fs.statSync(tmpFile).size > 1000) {
          message.react("✅", messageID);
          await new Promise((res2, rej) => {
            api.sendMessage(
              { body: `⟦ SAIYAN / GENERATED VISUAL ⟧\nالوصف: ${prompt}\n— magnus`, attachment: fs.createReadStream(tmpFile) },
              threadID,
              (err) => { cleanFile(tmpFile); err ? rej(err) : res2(); }
            );
          });
          return;
        }
        cleanFile(tmpFile);
      } catch (_) {
        cleanFile(tmpFile);
      }
    }

    message.react("❌", messageID);
    message.reply("⟦ IMAGE SYNTHESIS FAILED ⟧\nتعذر إنشاء الصورة من الوصف الحالي. جرّب صياغة أخرى أو أعد المحاولة لاحقًا.");
  }
};
