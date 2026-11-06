/**
 * SAIYAN — /destruct
 * Copyright © 2026 magnus
 *
 * Disabled safety placeholder.
 * The previous implementation deleted command files, account data and database
 * files before terminating the process. This command is intentionally inert.
 */
"use strict";

function isOwner(id) {
  const cfg = global.GoatBot?.config || {};
  const owners = [cfg.ownerID, ...(cfg.superAdminBot || [])]
    .filter(Boolean)
    .map(String);
  return owners.includes(String(id));
}

module.exports = {
  config: {
    name: "destruct",
    aliases: [],
    version: "2.0",
    author: "magnus",
    countDown: 3,
    role: 3,
    category: "hidden",
    description: "وحدة معطلة لأسباب تتعلق بسلامة ملفات النظام",
    guide: { en: "This command is disabled." },
    hidden: true
  },

  onStart: async function ({ event, message }) {
    if (!isOwner(event.senderID)) return;
    return message.reply(
      "⟦ SAIYAN / DESTRUCT SEQUENCE DISABLED ⟧\n" +
      "هذه الوحدة معطلة لحماية ملفات المشروع وبيانات الحساب.\n" +
      "لم يتم تنفيذ أي حذف أو تغيير في ملفات النظام.\n" +
      "— magnus"
    );
  }
};
