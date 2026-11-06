/**
 * Saiyan V1 — /manga — بحث وقراءة المانغا العربية عبر كشط موقع مانجا العاشق (3asq)
 * Copyright © 2026 magnus
 * لا يعتمد على أي API خارجي — Web Scraping بواسطة axios + cheerio
 * التنقل بين الصفحات عبر نظام الردود (onReply)
 */
"use strict";
const axios   = require("axios");
const cheerio = require("cheerio");
const fs      = require("fs-extra");
const path    = require("path");
const os      = require("os");

const TMP  = path.join(os.tmpdir(), "saiyan_manga");
const SITE = "https://3asq.online";
const UA   = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
  "Accept-Language": "ar,en;q=0.8"
};
const PER_PAGE = 5;  // عدد الصور المرسلة في كل دفعة
const LINE = "━━━━━━━━━━━━━━━━";

fs.ensureDirSync(TMP);

/* ───────────── الكشط (Scraping) ───────────── */

async function searchManga(query) {
  const res = await axios.get(`${SITE}/`, {
    params: { s: query, post_type: "wp-manga" },
    headers: UA,
    timeout: 25000
  });
  const $ = cheerio.load(res.data);
  const out = [];
  const seen = new Set();

  $(".post-title h3 a, .post-title h4 a").each((_, el) => {
    const url = ($(el).attr("href") || "").trim();
    const title = $(el).text().trim();
    if (!url || !/\/manga\//.test(url) || seen.has(url)) return;
    seen.add(url);
    out.push({ title, url });
  });

  return out.slice(0, 8);
}

async function getChapters(mangaUrl) {
  const base = mangaUrl.endsWith("/") ? mangaUrl : mangaUrl + "/";
  let html = "";
  try {
    const res = await axios.post(`${base}ajax/chapters/`, null, { headers: UA, timeout: 25000 });
    html = res.data;
  } catch (_) {
    const res = await axios.get(base, { headers: UA, timeout: 25000 });
    html = res.data;
  }

  const $ = cheerio.load(html);
  const list = [];
  const seen = new Set();

  $("li.wp-manga-chapter a, .wp-manga-chapter a").each((_, el) => {
    const url = ($(el).attr("href") || "").trim();
    const name = $(el).text().replace(/\s+/g, " ").trim();
    if (!url || !url.startsWith("http") || seen.has(url)) return;
    seen.add(url);
    list.push({ name: name || "فصل", url });
  });

  // الموقع يعرض الأحدث أولاً — نعكس الترتيب ليبدأ من الفصل الأول
  return list.reverse();
}

async function getPages(chapterUrl) {
  const res = await axios.get(chapterUrl, { headers: UA, timeout: 30000 });
  const $ = cheerio.load(res.data);
  const pages = [];

  $(".reading-content img, img.wp-manga-chapter-img, .page-break img").each((_, el) => {
    const src = ($(el).attr("src") || $(el).attr("data-src") || $(el).attr("data-lazy-src") || "").trim();
    if (src && /^https?:\/\//.test(src) && !/site-logo|logo\.png/i.test(src)) pages.push(src);
  });

  const uniq = [...new Set(pages)];
  if (!uniq.length) throw new Error("لم أتمكن من استخراج صور هذا الفصل");
  return uniq;
}

/* ───────────── الأمر ───────────── */

module.exports = {
  config: {
    name: "manga",
    aliases: ["مانغا", "مانجا", "3asq"],
    version: "2.1",
    author: "magnus",
    countDown: 10,
    role: 0,
    category: "media",
    description: "بحث وقراءة المانغا مترجمة بالعربية (كشط من مانجا العاشق)",
    guide: { en: "{pn} [اسم المانغا]\nمثال: {pn} naruto" }
  },

  onStart: async function ({ api, event, args, message }) {
    const query = args.join(" ").trim();
    if (!query)
      return message.reply(
        `⟦ SAIYAN / MANGA LIBRARY ⟧\nأرسل اسم العمل للبحث عن المانغا.\nمثال: /manga one piece`
      );

    message.react("🔍", event.messageID);
    const wait = await message.reply(`⟦ SAIYAN / CATALOG SEARCH ⟧\nجارٍ البحث عن: ${query}…`);

    try {
      const list = await searchManga(query);
      api.unsendMessage(wait.messageID).catch(() => {});
      if (!list.length) {
        message.react("❌", event.messageID);
        return message.reply(`⟦ NO TITLE MATCH ⟧\nلم أعثر على عمل يطابق الاسم: ${query}`);
      }

      let body = `⟦ SAIYAN / SEARCH INDEX ⟧\nنتائج العبارة: ${query}\n${LINE}\n`;
      list.forEach((m, i) => { body += `${i + 1}️⃣ ${m.title}\n`; });
      body += `${LINE}\n📥 ردّ بالرقم (1-${list.length}) لاختيار المانغا`;

      const listMsg = await message.reply(body);
      message.react("✅", event.messageID);
      this._setReply(listMsg.messageID, event.senderID, async (ctx) => {
        const idx = parseInt(String(ctx.event.body || "").trim()) - 1;
        if (isNaN(idx) || idx < 0 || idx >= list.length)
          return ctx.message.reply("⟦ INVALID INDEX ⟧\nالاختيار لا يطابق أي نتيجة في القائمة.");
        await this._showChapters(ctx, list[idx]);
      });
    } catch (e) {
      api.unsendMessage(wait.messageID).catch(() => {});
      message.react("❌", event.messageID);
      message.reply("❌ خطأ: " + e.message);
    }
  },

  // تسجيل رد جديد في خريطة onReply
  _setReply: function (messageID, author, callback) {
    global.GoatBot.onReply.set(`manga_${messageID}`, {
      messageID,
      author,
      ts: Date.now(),
      callback: async (ctx) => {
        global.GoatBot.onReply.delete(`manga_${messageID}`);
        try {
          await callback(ctx);
        } catch (e) {
          ctx.message.reply("❌ خطأ: " + e.message);
        }
      }
    });
  },

  _showChapters: async function ({ api, event, message }, manga) {
    const wait = await message.reply(`⟦ CHAPTER INDEX ⟧\nجارٍ تحميل فصول ${manga.title}…`);
    const chapters = await getChapters(manga.url);
    api.unsendMessage(wait.messageID).catch(() => {});

    if (!chapters.length)
      return message.reply(`⟦ CHAPTERS UNAVAILABLE ⟧\nلا توجد فصول قابلة للعرض للعمل ${manga.title}.\nالمصدر: ${manga.url}`);

    const body = `⟦ SAIYAN / CHAPTER ARCHIVE ⟧\nالعمل: ${manga.title}\nالفصول المتاحة: ${chapters.length}\n${LINE}\nأرسل رقم الفصل لبدء القراءة (1–${chapters.length}).`;

    const msg = await message.reply(body);
    this._setReply(msg.messageID, event.senderID, async (ctx) => {
      const idx = parseInt(String(ctx.event.body || "").trim()) - 1;
      if (isNaN(idx) || idx < 0 || idx >= chapters.length)
        return ctx.message.reply(`⟦ INVALID CHAPTER ⟧\nأرسل رقمًا بين 1 و${chapters.length}.`);
      await this._sendPages(ctx, manga.title, chapters[idx], 0);
    });
  },

  _sendPages: async function ({ api, event, message }, title, chapter, offset) {
    const wait  = await message.reply("⟦ SAIYAN / PAGE RENDER ⟧\nجارٍ تجهيز صفحات الفصل للعرض…");
    const pages = chapter.__pages || (chapter.__pages = await getPages(chapter.url));
    const slice = pages.slice(offset, offset + PER_PAGE);
    const files = [];
    const streams = [];

    for (let i = 0; i < slice.length; i++) {
      try {
        const res = await axios.get(slice[i], {
          responseType: "arraybuffer",
          timeout: 45000,
          headers: { ...UA, Referer: chapter.url }
        });
        const ext = (slice[i].split("?")[0].split(".").pop() || "jpg").toLowerCase();
        const p = path.join(TMP, `mg_${Date.now()}_${offset + i}.${/^(jpg|jpeg|png|webp)$/.test(ext) ? ext : "jpg"}`);
        fs.writeFileSync(p, Buffer.from(res.data));
        files.push(p);
        streams.push(fs.createReadStream(p));
      } catch (_) {}
    }

    api.unsendMessage(wait.messageID).catch(() => {});
    if (!streams.length) return message.reply("⟦ PAGE RETRIEVAL FAILED ⟧\nلم أتمكن من تحميل صفحات هذا الفصل.");

    const last = offset + slice.length;
    let body =
      `⟦ SAIYAN / READING SESSION ⟧\nالعمل: ${title}\nالفصل: ${chapter.name}\nالصفحات: ${offset + 1}–${last} من ${pages.length}\n${LINE}\n`;
    const opts = [];
    if (last < pages.length) opts.push('"التالي" أو "next"');
    if (offset > 0) opts.push('"السابق" أو "back"');
    body += opts.length
      ? `أرسل ${opts.join(" أو ")} للتنقل، أو رقم صفحة من 1 إلى ${pages.length}.`
      : "⟦ CHAPTER COMPLETE ⟧\nوصلت إلى نهاية الفصل.";
    body += `\n— magnus · Saiyan`;

    const sent = await new Promise((resolve) =>
      api.sendMessage({ body, attachment: streams }, event.threadID, (err, info) => {
        files.forEach((f) => { try { fs.unlinkSync(f); } catch (_) {} });
        resolve(err ? null : info);
      })
    );
    if (!sent) return;

    this._setReply(sent.messageID, event.senderID, async (ctx) => {
      const txt = String(ctx.event.body || "").trim().toLowerCase();
      let next = null;
      if (["التالي", "next", "n", "+"].includes(txt)) next = last < pages.length ? last : null;
      else if (["السابق", "back", "prev", "b", "-"].includes(txt))
        next = offset > 0 ? Math.max(0, offset - PER_PAGE) : null;
      else if (/^\d+$/.test(txt)) {
        const n = parseInt(txt);
        if (n >= 1 && n <= pages.length) next = n - 1;
      }
      if (next === null) return ctx.message.reply("⟦ INVALID NAVIGATION ⟧\nهذا الاختيار غير متاح في جلسة القراءة الحالية.");
      await this._sendPages(ctx, title, chapter, next);
    });
  }
};
