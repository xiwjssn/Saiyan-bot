/**
 * Saiyan V1 — /delete — حذف رسالة (الرد على رسالة البوت)
 * Copyright © 2026 magnus
 * Ported from WHITE-V3 & adapted for Saiyan engine
 * يتحقق من صلاحية إدارة الرسائل (Manage Messages) عبر adminIDs
 */
"use strict";

// ── التحقق من صلاحية إدارة الرسائل ──────────────────────────────────────────
async function canManageMessages(api, senderID, threadID) {
  const cfg    = global.GoatBot?.config || {};
  const sid    = String(senderID);
  const supers = [...(cfg.superAdminBot || []), cfg.ownerID].filter(Boolean).map(String);
  const admins = (cfg.adminBot || []).map(String);

  // مالك البوت أو الأدمن العام يملكون الصلاحية دائماً
  if (supers.includes(sid) || admins.includes(sid)) return true;

  // التحقق من صلاحية إدارة الرسائل في الغروب (adminIDs)
  try {
    const info = await new Promise((res, rej) =>
      api.getThreadInfo(String(threadID), (e, d) => e ? rej(e) : res(d))
    );
    const groupAdmins = (info?.adminIDs || []).map(a => String(a.id || a));
    return groupAdmins.includes(sid);
  } catch (_) {
    return false;
  }
}

module.exports = {
  config: {
    name: "delete",
    aliases: ["حذف", "del", "rm"],
    version: "2.0",
    author: "magnus",
    countDown: 3,
    role: 1,
    category: "management",
    description: "حذف رسالة البوت بالرد عليها — يتطلب صلاحية إدارة الرسائل",
    guide: { en: "{pn} — رد على رسالة البوت لحذفها" }
  },

  onStart: async function ({ api, event, message }) {
    const { threadID, senderID, messageReply } = event;

    // ── التحقق من صلاحية إدارة الرسائل (Manage Messages) ──────────────────
    const allowed = await canManageMessages(api, senderID, threadID);
    if (!allowed) {
      return message.reply(
        "⟦ SAIYAN / PERMISSION DENIED ⟧\nحسابك لا يملك صلاحية إدارة الرسائل في هذه المجموعة.\nيلزم أن تكون من إدارة البوت أو من مشرفي المجموعة."
      );
    }

    // ── يجب الرد على رسالة ────────────────────────────────────────────────
    if (!messageReply) {
      return message.reply(
        "⟦ SAIYAN / MESSAGE PURGE ⟧\nللإزالة، قم بالرد على رسالة صادرة من Saiyan ثم أرسل /delete."
      );
    }

    const botID = String(api.getCurrentUserID?.() || global.GoatBot?.botID || "");
    const targetSender = String(messageReply.senderID || "");

    // يمكن حذف رسائل البوت فقط
    if (targetSender !== botID) {
      return message.reply(
        "⟦ TARGET NOT SUPPORTED ⟧\nهذه الوحدة تزيل رسائل Saiyan فقط، والرسالة المحددة ليست صادرة عنه."
      );
    }

    const targetID = messageReply.messageID;

    // ── الحذف بعدة طرق لتوافق إصدارات fca ──────────────────────────────────
    try {
      if (message && typeof message.unsend === "function") {
        await message.unsend(targetID);
      } else if (typeof api.unsendMessage === "function") {
        await new Promise((res, rej) =>
          api.unsendMessage(targetID, (e) => e ? rej(e) : res())
        );
      } else {
        return message.reply("⟦ FEATURE UNAVAILABLE ⟧\nواجهة الاتصال الحالية لا توفر وظيفة إزالة الرسائل.");
      }

      // حذف رسالة الأمر نفسها بعد ثانية
      setTimeout(() => {
        try {
          if (message && typeof message.unsend === "function") {
            message.unsend(event.messageID);
          } else {
            api.unsendMessage(event.messageID, () => {});
          }
        } catch (_) {}
      }, 1000);

    } catch (e) {
      return message.reply("⟦ PURGE FAILED ⟧\nتعذرت إزالة الرسالة: " + (e.message || JSON.stringify(e)));
    }
  }
};
