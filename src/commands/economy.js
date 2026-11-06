/**
 * Saiyan V1 — /balance /daily /bet /slot — نظام الاقتصاد
 * Copyright © 2026 magnus
 * Ported from WHITE-V3 & adapted for Saiyan engine
 * Commands: balance, daily, bet, slot, pay
 */
"use strict";
const fs   = require("fs-extra");
const path = require("path");

const ECON_FILE = path.join(process.cwd(), "database", "data", "economy.json");
const DAILY_BONUS   = 500;
const DAILY_COOLDOWN = 24 * 60 * 60 * 1000;
const START_BALANCE  = 1000;

// ── File helpers ──────────────────────────────────────────────────────────────
function loadEcon() {
  try { if (fs.existsSync(ECON_FILE)) return JSON.parse(fs.readFileSync(ECON_FILE, "utf8")); } catch (_) {}
  return {};
}
function saveEcon(d) {
  fs.ensureDirSync(path.dirname(ECON_FILE));
  fs.writeFileSync(ECON_FILE, JSON.stringify(d, null, 2));
}
function getUser(uid) {
  const d  = loadEcon();
  if (!d[uid]) d[uid] = { balance: START_BALANCE, daily: 0, wins: 0, losses: 0 };
  return { data: d, user: d[uid] };
}
function saveUser(data) { saveEcon(data); }
function fmt(n) {
  if (n >= 1e9) return (n / 1e9).toFixed(1) + "B";
  if (n >= 1e6) return (n / 1e6).toFixed(1) + "M";
  if (n >= 1e3) return (n / 1e3).toFixed(1) + "K";
  return String(n);
}

// ── Slot Machine ──────────────────────────────────────────────────────────────
const SLOT_ITEMS = ["🍒", "🍋", "🍊", "🍉", "🎰", "⭐", "🔔", "💎"];
function spin() { return SLOT_ITEMS[Math.floor(Math.random() * SLOT_ITEMS.length)]; }
function slotMultiplier(a, b, c) {
  if (a === b && b === c) {
    if (a === "💎") return 10;
    if (a === "🎰") return 7;
    if (a === "⭐") return 5;
    return 3;
  }
  if (a === b || b === c || a === c) return 1.5;
  return 0;
}

// ── Module ────────────────────────────────────────────────────────────────────
module.exports = {
  config: {
    name: "economy",
    aliases: ["balance", "bal", "daily", "bet", "slot", "pay", "رصيد", "يومي"],
    version: "2.0",
    author: "magnus",
    countDown: 3,
    role: 0,
    category: "economy",
    description: "نظام الاقتصاد: رصيد، مكافأة يومية، رهان، سلوت",
    guide: {
      en: "{pn} balance — رصيدك\n" +
          "{pn} daily   — مكافأة يومية\n" +
          "{pn} bet [مبلغ] — رهان\n" +
          "{pn} slot [مبلغ] — سلوت\n" +
          "{pn} pay @شخص [مبلغ] — تحويل"
    }
  },

  onStart: async function ({ event, args, message, api }) {
    const { senderID, mentions, messageID } = event;
    const sub = (args[0] || "balance").toLowerCase();

    // ── /balance ──────────────────────────────────────────────────────────
    if (["balance", "bal", "رصيد"].includes(sub)) {
      const targetID = Object.keys(mentions || {})[0] || senderID;
      const { data, user } = getUser(targetID);
      const LINE = "━━━━━━━━━━━━━━━━━━━━━━━━━";
      return message.reply(
        `${LINE}\n` +
        `⟦ SAIYAN / ACCOUNT LEDGER ⟧\nالحساب: ${targetID === senderID ? "حسابك" : mentions?.[targetID] || targetID}\n` +
        `${LINE}\n\n` +
        `الرصيد المتاح: ${fmt(user.balance)} عملة\n` +
        `مرات الفوز: ${user.wins}\n` +
        `مرات الخسارة: ${user.losses}\n\n` +
        `${LINE}`
      );
    }

    // ── /daily ────────────────────────────────────────────────────────────
    if (["daily", "يومي"].includes(sub)) {
      const { data, user } = getUser(senderID);
      const now  = Date.now();
      const diff = now - (user.daily || 0);
      if (diff < DAILY_COOLDOWN) {
        const rem = DAILY_COOLDOWN - diff;
        const h   = Math.floor(rem / 3600000);
        const m   = Math.floor((rem % 3600000) / 60000);
        return message.reply(`⟦ DAILY CLAIM LOCKED ⟧\nتم استلام مكافأة اليوم مسبقًا.\nالموعد التالي بعد: ${h} ساعة و${m} دقيقة.`);
      }
      user.balance += DAILY_BONUS;
      user.daily    = now;
      saveUser(data);
      return message.reply(
        `⟦ SAIYAN / DAILY REWARD ⟧\nتمت إضافة ${DAILY_BONUS} عملة إلى رصيدك.\nالرصيد الحالي: ${fmt(user.balance)} عملة\nالحالة: تمت المطالبة بنجاح\n— magnus`
      );
    }

    // ── /bet ──────────────────────────────────────────────────────────────
    if (["bet", "رهان"].includes(sub)) {
      const amount = parseInt(args[1]);
      if (!amount || amount < 10) return message.reply("⟦ INVALID AMOUNT ⟧\nأدخل مبلغًا لا يقل عن 10 عملات.");
      const { data, user } = getUser(senderID);
      if (user.balance < amount) return message.reply(`⟦ INSUFFICIENT FUNDS ⟧\nرصيدك الحالي ${fmt(user.balance)} عملة، وهو لا يكفي لهذه العملية.`);

      const win = Math.random() < 0.5;
      if (win) { user.balance += amount; user.wins++; }
      else      { user.balance -= amount; user.losses++; }
      saveUser(data);

      return message.reply(
        `⟦ SAIYAN / BET RESULT ⟧\n${win ? "نتيجة الجولة: فوز" : "نتيجة الجولة: خسارة"}\n${win ? "المبلغ المكتسب" : "المبلغ المفقود"}: ${fmt(amount)} عملة\nالرصيد الحالي: ${fmt(user.balance)} عملة\n— magnus`
      );
    }

    // ── /slot ─────────────────────────────────────────────────────────────
    if (["slot", "سلوت"].includes(sub)) {
      const amount = parseInt(args[1]);
      if (!amount || amount < 10) return message.reply("⟦ INVALID STAKE ⟧\nحدد قيمة الرهان، على ألا تقل عن 10 عملات.");
      const { data, user } = getUser(senderID);
      if (user.balance < amount) return message.reply(`⟦ INSUFFICIENT FUNDS ⟧\nرصيدك الحالي ${fmt(user.balance)} عملة، ولا يكفي لتنفيذ الرهان.`);

      const [a, b, c] = [spin(), spin(), spin()];
      const mult = slotMultiplier(a, b, c);
      const gain = Math.floor(amount * mult);

      user.balance -= amount;
      user.balance += gain;
      if (gain > 0) user.wins++; else user.losses++;
      saveUser(data);

      const resultLine = mult >= 3 ? "MAXIMUM MATCH / تطابق كامل" : mult > 0 ? "PARTIAL MATCH / عائد جزئي" : "NO MATCH / لا عائد";
      return message.reply(
        `⟦ SAIYAN / SLOT ENGINE ⟧\n` +
        `نتيجة الدور: ${a}  ${b}  ${c}\n` +
        `التقييم: ${resultLine}\n` +
        `العائد: ${gain > 0 ? `+${fmt(gain)}` : `-${fmt(amount)}`} عملة · معامل ${mult}\n` +
        `الرصيد بعد الجولة: ${fmt(user.balance)} عملة\n— magnus`
      );
    }

    // ── /pay ──────────────────────────────────────────────────────────────
    if (["pay", "تحويل"].includes(sub)) {
      const targetID = Object.keys(mentions || {})[0];
      const amount   = parseInt(args[2] || args[1]);
      if (!targetID || !amount || amount < 1)
        return message.reply("⟦ TRANSFER FORMAT ⟧\nاستخدم: /pay @عضو [المبلغ]");
      if (String(targetID) === String(senderID))
        return message.reply("⟦ TRANSFER BLOCKED ⟧\nلا يمكن أن يكون المرسل والمستلم الحساب نفسه.");

      const { data: d1, user: sender } = getUser(senderID);
      if (sender.balance < amount) return message.reply(`⟦ TRANSFER DECLINED ⟧\nرصيدك الحالي ${fmt(sender.balance)} عملة، وهو أقل من قيمة التحويل المطلوبة.`);

      const recv = getUser(targetID);
      sender.balance -= amount;
      recv.user.balance += amount;
      recv.data[targetID] = recv.user;
      d1[senderID] = sender;
      saveEcon(d1);

      return message.reply(
        `✅ تم تحويل ${fmt(amount)} عملة 🪙\n` +
        `💰 رصيدك الجديد: ${fmt(sender.balance)}`
      );
    }

    // ── مساعدة ────────────────────────────────────────────────────────────
    const prefix = global.GoatBot?.config?.prefix || "/";
    return message.reply(
      `⟦ SAIYAN / ECONOMY MODULE ⟧\n` +
      `${prefix}balance — عرض الرصيد والسجل\n` +
      `${prefix}daily — استلام ${DAILY_BONUS} عملة كل 24 ساعة\n` +
      `${prefix}bet [مبلغ] — جولة رهان\n` +
      `${prefix}slot [مبلغ] — تشغيل آلة الحظ\n` +
      `${prefix}pay @عضو [مبلغ] — تحويل عملات\n— magnus`
    );
  }
};
