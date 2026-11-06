/**
 * Saiyan V1 — /tiktok — تنزيل فيديو TikTok بدون علامة مائية
 * Copyright © 2026 magnus
 * Fixed: استخدام video.play مباشرة من نتائج البحث بدل بناء URL يدوياً
 */
"use strict";
const axios = require("axios");
const fs    = require("fs-extra");
const path  = require("path");
const os    = require("os");

const TMP        = path.join(os.tmpdir(), "saiyan_tik");
const SEARCH_API = "https://www.tikwm.com/api/feed/search";
fs.ensureDirSync(TMP);

function fmtViews(n) {
  if (!n) return "0";
  if (n >= 1e9) return (n / 1e9).toFixed(1) + "B";
  if (n >= 1e6) return (n / 1e6).toFixed(1) + "M";
  if (n >= 1e3) return (n / 1e3).toFixed(1) + "K";
  return String(n);
}
function fmtDur(s) { const m = Math.floor(s / 60); return `${m}:${String(s % 60).padStart(2, "0")}`; }

module.exports = {
  config: {
    name: "tiktok", aliases: ["tik", "tt", "تيك"], version: "4.0", author: "magnus",
    countDown: 10, role: 2, category: "media",
    description: "البحث في TikTok وتنزيل الفيديو بدون علامة مائية",
    guide: { en: "{pn} [كلمة بحث]\nأو أرسل رابط TikTok مباشرة" }
  },

  onStart: async function ({ api, event, args, message }) {
    const input = args.join(" ").trim();
    if (!input) return message.reply("⟦ INPUT REQUIRED ⟧\nأرسل عبارة للبحث أو رابط TikTok مباشرًا.\nمثال: /tik gojo");

    message.react("🔍", event.messageID);
    const wait = await message.reply(`⟦ SAIYAN / VIDEO INDEX ⟧\nجارٍ فحص TikTok عن: ${input}…`);

    try {
      // مسار 1: رابط مباشر → تنزيل مباشر
      if (input.includes("tiktok.com") || input.includes("vm.tiktok")) {
        api.unsendMessage(wait.messageID).catch(() => {});
        return await this._downloadDirect(api, event, message, input);
      }

      // مسار 2: بحث
      const res = await axios.get(SEARCH_API, {
        params:  { keywords: input, count: 6, cursor: 0, hd: 1 },
        timeout: 15000,
        headers: { "User-Agent": "Mozilla/5.0" }
      });
      const videos = res.data?.data?.videos;
      if (!videos?.length) {
        api.unsendMessage(wait.messageID).catch(() => {});
        message.react("❌", event.messageID);
        return message.reply(`⟦ NO VIDEO MATCHES ⟧\nلم تظهر نتائج لعبارة البحث: ${input}`);
      }

      let body = `⟦ SAIYAN / TIKTOK SEARCH RESULTS ⟧\nعبارة البحث: ${input}\n────────────────────────\n`;
      videos.slice(0, 5).forEach((v, i) => {
        const title  = (v.title || v.content_desc || "بلا عنوان").slice(0, 55);
        const author = v.author?.nickname || v.author?.unique_id || "";
        body += `${i + 1}️⃣ ${title}\n`;
        body += `   👤 ${author}  ·  👁 ${fmtViews(v.play_count)}  ·  ⏱ ${fmtDur(v.duration || 0)}\n\n`;
      });
      body += `────────────────────────\nأرسل رقم النتيجة من 1 إلى ${Math.min(videos.length, 5)} لبدء تجهيز الفيديو.`;

      api.unsendMessage(wait.messageID).catch(() => {});
      const listMsg = await message.reply(body);
      message.react("✅", event.messageID);

      global.GoatBot.onReply.set(`tik_${listMsg.messageID}`, {
        messageID: listMsg.messageID,
        author:    event.senderID,
        ts:        Date.now(),
        callback:  async ({ api, event: re, message: rm }) => {
          global.GoatBot.onReply.delete(`tik_${listMsg.messageID}`);
          const choice = parseInt(re.body?.trim()) - 1;
          if (isNaN(choice) || choice < 0 || choice >= Math.min(videos.length, 5))
            return rm.reply("⟦ INVALID SELECTION ⟧\nالرقم المرسل لا يطابق أي نتيجة معروضة.");

          const video   = videos[choice];
          const dlWait  = await rm.reply(`⟦ SAIYAN / VIDEO TRANSFER ⟧\nجارٍ تجهيز الفيديو المحدد…`);
          await this._download(api, re, rm, video, dlWait);
        }
      });
    } catch (e) {
      try { api.unsendMessage(wait.messageID); } catch (_) {}
      message.react("❌", event.messageID);
      message.reply("❌ خطأ: " + e.message);
    }
  },

  _download: async function (api, event, message, video, waitMsg) {
    const outPath = path.join(TMP, `tik_${Date.now()}.mp4`);
    try {
      // FIX: استخدام video.play أو video.wmplay مباشرة من نتيجة البحث
      const videoUrl = video.play || video.wmplay || video.hdplay;
      if (!videoUrl) throw new Error("لا يوجد رابط تنزيل للفيديو");

      const res = await axios.get(videoUrl, {
        responseType: "arraybuffer",
        timeout:      120000,
        headers:      { "User-Agent": "Mozilla/5.0", Referer: "https://www.tiktok.com/" }
      });
      fs.writeFileSync(outPath, Buffer.from(res.data));
      if (waitMsg) api.unsendMessage(waitMsg.messageID).catch(() => {});

      const title  = (video.title || video.content_desc || "").slice(0, 100);
      const author = video.author?.nickname || video.author?.unique_id || "";
      await api.sendMessage({
        body:       `⟦ SAIYAN / VIDEO DELIVERED ⟧\nالعنوان: ${title}\nالناشر: ${author}\nالمشاهدات: ${fmtViews(video.play_count)} · المدة: ${fmtDur(video.duration || 0)}\n— magnus`,
        attachment: fs.createReadStream(outPath)
      }, event.threadID);
      fs.removeSync(outPath);
    } catch (e) {
      if (waitMsg) api.unsendMessage(waitMsg.messageID).catch(() => {});
      message.reply("❌ فشل التنزيل: " + e.message);
      if (fs.existsSync(outPath)) fs.removeSync(outPath);
    }
  },

  _downloadDirect: async function (api, event, message, url) {
    const dlWait  = await message.reply("⟦ SAIYAN / DIRECT VIDEO TRANSFER ⟧\nجارٍ تجهيز رابط الفيديو المباشر…");
    const outPath = path.join(TMP, `tik_${Date.now()}.mp4`);
    try {
      const apiRes = await axios.get(`https://www.tikwm.com/api/?url=${encodeURIComponent(url)}`, { timeout: 15000 });
      const data   = apiRes.data?.data;
      if (!data) throw new Error("فشل الحصول على بيانات الفيديو");

      // FIX: استخدام play أو hdplay أو wmplay بالترتيب
      const videoUrl = data.hdplay || data.play || data.wmplay;
      if (!videoUrl) throw new Error("لا يوجد رابط تنزيل");

      const res = await axios.get(videoUrl, {
        responseType: "arraybuffer",
        timeout:      120000,
        headers:      { "User-Agent": "Mozilla/5.0", Referer: "https://www.tiktok.com/" }
      });
      fs.writeFileSync(outPath, Buffer.from(res.data));
      api.unsendMessage(dlWait.messageID).catch(() => {});
      await api.sendMessage({
        body:       `⟦ SAIYAN / VIDEO DELIVERED ⟧\n${(data.title || "فيديو بدون عنوان").slice(0, 100)}\n— magnus`,
        attachment: fs.createReadStream(outPath)
      }, event.threadID);
      fs.removeSync(outPath);
    } catch (e) {
      api.unsendMessage(dlWait.messageID).catch(() => {});
      message.reply("❌ فشل التنزيل: " + e.message);
      if (fs.existsSync(outPath)) fs.removeSync(outPath);
    }
  }
};
