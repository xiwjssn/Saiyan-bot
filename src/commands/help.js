/**
 * Saiyan V1 — /help — Command Center
 * Copyright © 2026 magnus
 * Saiyan Messenger Bot
 */
"use strict";

const CATEGORIES = [
  {
    icon: "◈",
    title: "إدارة النواة",
    cmds: [
      { name: "nm",        icon: "▣", desc: "تثبيت اسم الغروب ومنع العبث به" },
      { name: "nick",      icon: "◆", desc: "حماية كنيات الأعضاء ومراقبة تغييراتها" },
      { name: "groupimg",  icon: "◉", desc: "تغيير صورة الغروب وتثبيتها" },
      { name: "groupname", icon: "▰", desc: "تحديث اسم الغروب بالاسم المطلوب" },
      { name: "setavatar", icon: "◎", desc: "تغيير صورة حساب Saiyan" },
      { name: "addlock",   icon: "⛓", desc: "تثبيت عدد أعضاء الغروب وحمايته" },
      { name: "thread",    icon: "⌘", desc: "إدارة إعدادات الغروب والرسائل التلقائية" },
      { name: "out",       icon: "↪", desc: "إخراج Saiyan من الغروب الحالي" },
    ],
  },

  {
    icon: "◉",
    title: "إدارة الوصول والأعضاء",
    cmds: [
      { name: "all",      icon: "✦", desc: "استدعاء أعضاء الغروب" },
      { name: "tag",      icon: "◎", desc: "إنشاء وإدارة قوائم التاق" },
      { name: "kick",     icon: "×", desc: "إزالة عضو من الغروب" },
      { name: "adduser",  icon: "+", desc: "إضافة أعضاء إلى الغروب" },
      { name: "addadmin", icon: "♛", desc: "إدارة مستويات الوصول إلى النواة" },
      { name: "ban",      icon: "⊘", desc: "إدارة قيود الوصول إلى Saiyan" },
      { name: "warn",     icon: "!", desc: "إدارة التحذيرات والتنبيهات" },
      { name: "badwords", icon: "≠", desc: "تنقية المحادثة من الكلمات المحددة" },
    ],
  },

  {
    icon: "⟳",
    title: "أنظمة الحضور والجدولة",
    cmds: [
      { name: "angel", icon: "⌁", desc: "إدارة جلسات الحضور والرسائل المجدولة" },
      { name: "divel", icon: "◐", desc: "إرسال رسائل بفترات زمنية متغيرة" },
      { name: "greet", icon: "✧", desc: "عرض رسالة الترحيب الخاصة بـ Saiyan" },
    ],
  },

  {
    icon: "♫",
    title: "مركز الوسائط",
    cmds: [
      { name: "song",    icon: "♪", desc: "استرجاع المقاطع الصوتية وتجهيزها" },
      { name: "video",   icon: "▶", desc: "فهرسة مقاطع الفيديو وتسليمها" },
      { name: "tiktok",  icon: "▸", desc: "تحميل فيديوهات TikTok" },
      { name: "sticker", icon: "◇", desc: "تحويل الصور إلى ملصقات" },
      { name: "pair",    icon: "∞", desc: "اختيار شخصين بشكل عشوائي" },
    ],
  },

  {
    icon: "⌬",
    title: "وحدات الذكاء والمعالجة",
    cmds: [
      { name: "ai",        icon: "◈", desc: "فتح قناة تفاعل مع وحدة الذكاء" },
      { name: "imagegen",  icon: "✎", desc: "تحويل الوصف النصي إلى صورة" },
      { name: "pinterest", icon: "⌕", desc: "البحث عن صور Pinterest" },
      { name: "webss",     icon: "▤", desc: "التقاط صورة لصفحة ويب" },
    ],
  },

  {
    icon: "⚙",
    title: "أدوات النظام",
    cmds: [
      { name: "translate", icon: "文", desc: "ترجمة النصوص بين اللغات" },
      { name: "weather",   icon: "☼", desc: "معرفة حالة الطقس في مدينة" },
      { name: "uid",       icon: "#", desc: "عرض معرف حساب فيسبوك" },
      { name: "info",      icon: "≡", desc: "عرض معلومات الغروب أو أحد أعضائه" },
      { name: "ping",      icon: "≈", desc: "قياس سرعة استجابة Saiyan" },
      { name: "rank",      icon: "◇", desc: "عرض المستوى ونقاط الخبرة" },
      { name: "unsend",    icon: "↶", desc: "حذف رسالة أرسلها Saiyan" },
    ],
  },

  {
    icon: "¤",
    title: "وحدة الاقتصاد",
    cmds: [
      {
        name: "economy",
        icon: "$",
        desc: "الرصيد والمكافآت والألعاب المالية",
      },
    ],
  },

  {
    icon: "⌘",
    title: "تهيئة النظام",
    cmds: [
      {
        name: "prefix",
        icon: "/",
        desc: "تغيير رمز بداية الأوامر",
      },
      {
        name: "autoseen",
        icon: "◉",
        desc: "التحكم بالمشاهدة التلقائية للرسائل",
      },
      {
        name: "uptime",
        icon: "◷",
        desc: "مؤشرات الجلسة وموارد التشغيل",
      },
      {
        name: "chats",
        icon: "▦",
        desc: "إدارة المحادثات والغروبات",
      },
      {
        name: "getstate",
        icon: "⌑",
        desc: "استخراج AppState للمالك",
      },
      {
        name: "help",
        icon: "?",
        desc: "فتح دليل التحكم — Saiyan",
      },
    ],
  },
];

const CMD_DETAILS = {
  nm: {
    usage: "/nm [اسم] / off / time [min] [max] / status",
    role: "🔐 Admin",
    cat: "الإدارة",
  },

  nick: {
    usage: "/nick [اسم] / off / status / حدف",
    role: "🔐 Admin",
    cat: "الإدارة",
  },

  groupimg: {
    usage: "/groupimg [رابط أو صورة] / off / status",
    role: "🔐 Admin",
    cat: "الإدارة",
  },

  groupname: {
    usage: "/groupname [الاسم الجديد]",
    role: "🔐 Admin",
    cat: "الإدارة",
  },

  setavatar: {
    usage: "/setavatar [رابط] — أو الرد على صورة",
    role: "👑 Owner",
    cat: "الإدارة",
  },

  addlock: {
    usage: "/addlock on|off|status|list|clear / [id] [روابط...]",
    role: "👑 Owner",
    cat: "الإدارة",
  },

  thread: {
    usage: "/thread welcome [رسالة] / leave [رسالة] / status",
    role: "🔐 Admin",
    cat: "الإدارة",
  },

  out: {
    usage: "/out — إخراج Saiyan من الغروب",
    role: "👑 Owner",
    cat: "الإدارة",
  },

  all: {
    usage: "/all [رسالة اختيارية] — استدعاء الجميع",
    role: "🔐 Admin",
    cat: "الأعضاء",
  },

  tag: {
    usage: "/tag add [اسم] @tag / [اسم] / list / remove / info",
    role: "🔐 Admin",
    cat: "الأعضاء",
  },

  kick: {
    usage: "/kick @شخص — أو الرد على رسالته",
    role: "🔐 Admin",
    cat: "الأعضاء",
  },

  adduser: {
    usage: "/adduser [ID أو رابط] / [ID1] [ID2]",
    role: "🔐 Admin",
    cat: "الأعضاء",
  },

  addadmin: {
    usage: "/addadmin [1-3] @tag / list / remove [ID]",
    role: "👑 Owner",
    cat: "الأعضاء",
  },

  ban: {
    usage: "/ban @شخص / list / remove [ID]",
    role: "🔐 Admin",
    cat: "الأعضاء",
  },

  warn: {
    usage: "/warn @شخص / clear @شخص / list",
    role: "🔐 Admin",
    cat: "الأعضاء",
  },

  badwords: {
    usage: "/badwords on|off / add [كلمات] / remove / list / unwarn",
    role: "🔐 Admin",
    cat: "الأعضاء",
  },

  angel: {
    usage: "/angel [رسالة] [min-max ثانية] / off / status",
    role: "🔐 Admin",
    cat: "التشغيل",
  },

  divel: {
    usage: "/divel [رسالة] [min-max] / off / status",
    role: "🔐 Admin",
    cat: "التشغيل",
  },

  greet: {
    usage: "/greet — عرض رسالة الترحيب",
    role: "👤 User",
    cat: "التشغيل",
  },

  song: {
    usage: "/song [اسم الأغنية أو كلمات البحث]",
    role: "👤 User",
    cat: "الوسائط",
  },

  video: {
    usage: "/video [بحث أو رابط يوتيوب]",
    role: "👤 User",
    cat: "الوسائط",
  },

  tiktok: {
    usage: "/tiktok [بحث أو رابط]",
    role: "👤 User",
    cat: "الوسائط",
  },

  tik: {
    usage: "/tiktok [بحث أو رابط]",
    role: "👤 User",
    cat: "الوسائط",
  },

  sticker: {
    usage: "/sticker — الرد على صورة بالأمر",
    role: "👤 User",
    cat: "الوسائط",
  },

  pair: {
    usage: "/pair — اختيار عشوائي / @شخص لتحديد العضو",
    role: "👤 User",
    cat: "الوسائط",
  },

  ai: {
    usage: "/ai [سؤالك] / /gpt [سؤالك]",
    role: "👤 User",
    cat: "الذكاء",
  },

  imagegen: {
    usage: "/imagegen [وصف الصورة] / /wgen [prompt]",
    role: "👤 User",
    cat: "الذكاء",
  },

  pinterest: {
    usage: "/pinterest [كلمة البحث] / /pin [كلمة]",
    role: "👤 User",
    cat: "الذكاء",
  },

  webss: {
    usage: "/webss [رابط الموقع]",
    role: "👤 User",
    cat: "الذكاء",
  },

  translate: {
    usage: "/translate [نص] -> [كود]\n/trans مرحبا -> en",
    role: "👤 User",
    cat: "الخدمات",
  },

  weather: {
    usage: "/weather [المدينة]\nمثال: /weather طرابلس",
    role: "👤 User",
    cat: "الخدمات",
  },

  uid: {
    usage: "/uid — معرفك / الرد على رسالة / @tag",
    role: "👤 User",
    cat: "الخدمات",
  },

  info: {
    usage: "/info — بيانات الغروب / @tag لبيانات شخص",
    role: "👤 User",
    cat: "الخدمات",
  },

  ping: {
    usage: "/ping — اختبار سرعة الاستجابة",
    role: "👤 User",
    cat: "الخدمات",
  },

  rank: {
    usage: "/rank — مستواك / /rank @tag — مستوى شخص",
    role: "👤 User",
    cat: "الخدمات",
  },

  unsend: {
    usage: "/unsend — الرد على رسالة Saiyan لحذفها",
    role: "👤 User",
    cat: "الخدمات",
  },

  economy: {
    usage: "/balance / /daily / /bet [مبلغ] / /slot [مبلغ] / /pay @شخص [مبلغ]",
    role: "👤 User",
    cat: "الاقتصاد",
  },

  prefix: {
    usage: "/prefix [البادئة الجديدة] — مثال: /prefix !",
    role: "👑 Owner",
    cat: "النظام",
  },

  autoseen: {
    usage: "/autoseen on|off|status",
    role: "🔐 Admin",
    cat: "النظام",
  },

  uptime: {
    usage: "/uptime — عرض مدة تشغيل Saiyan",
    role: "👤 User",
    cat: "النظام",
  },

  chats: {
    usage:
      "/chats — إدارة الغروبات\n" +
      "/chats count\n" +
      "/chats dm on|off",
    role: "🔐 Admin",
    cat: "النظام",
  },

  getstate: {
    usage: "/getstate / /getstate cookie / /getstate string",
    role: "👑 Owner",
    cat: "النظام",
  },

  help: {
    usage: "/help — القائمة العامة / /help [الأمر]",
    role: "👤 User",
    cat: "النظام",
  },
};

const LINE = "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━";

function buildHelpAll(prefix) {
  const allCmds = global.GoatBot?.commands;
  let totalCmds = 0;

  if (allCmds?.size) {
    const seen = new Set();

    for (const [, cmd] of allCmds) {
      if (cmd.config?.name) {
        seen.add(cmd.config.name);
      }
    }

    totalCmds = seen.size;
  } else {
    for (const cat of CATEGORIES) {
      totalCmds += cat.cmds.length;
    }
  }

  const lines = [];

  lines.push(LINE);
  lines.push("          S A I Y A N  /  COMMAND MATRIX");
  lines.push("          واجهة التحكم المركزية");
  lines.push(`          Developer: magnus  |  Prefix: ${prefix}`);
  lines.push(LINE);
  lines.push("");

  for (const cat of CATEGORIES) {
    const padLen = Math.max(
      1,
      22 - cat.title.length
    );

    lines.push(
      `┏━ ${cat.icon} ${cat.title} ${"━".repeat(padLen)}┓`
    );

    for (const cmd of cat.cmds) {
      lines.push(
        `┃ ${cmd.icon} ${prefix}${cmd.name.padEnd(
          13
        )} ${cmd.desc}`
      );
    }

    lines.push(
      `┗${"━".repeat(35)}┛`
    );

    lines.push("");
  }

  lines.push(LINE);
  lines.push(`  الوحدات المسجلة: ${totalCmds}`);
  lines.push(`  ${prefix}help [الأمر] — فتح ملف تعريف الوحدة`);
  lines.push(`  magnus  •  Saiyan`);
  lines.push(LINE);

  return lines.join("\n");
}

function buildHelpOne(rawName, prefix) {
  const name = String(rawName)
    .toLowerCase()
    .replace(/^\//, "");

  const allCmds = global.GoatBot?.commands;

  let cmd = allCmds?.get(name);

  if (!cmd && allCmds) {
    for (const [, c] of allCmds) {
      if (
        (c.config?.aliases || [])
          .map(a => String(a).toLowerCase())
          .includes(name)
      ) {
        cmd = c;
        break;
      }
    }
  }

  const info =
    CMD_DETAILS[name] ||
    CMD_DETAILS[cmd?.config?.name] ||
    {};

  const config = cmd?.config || {};

  const cmdName =
    config.name || name;

  const desc =
    config.description ||
    config.longDescription ||
    "لا توجد معلومات إضافية متوفرة لهذا الأمر.";

  const usage =
    config.guide?.en
      ?.replace(/\{p[n]?\}/g, prefix) ||
    info.usage ||
    `${prefix}${cmdName}`;

  const role =
    info.role ||
    (
      config.role === 3
        ? "👑 Owner"
        : config.role === 2
          ? "🔐 Admin"
          : "👤 User"
    );

  const cat =
    info.cat ||
    config.category ||
    "عام";

  const aliases =
    (config.aliases || [])
      .filter(Boolean);

  let icon = "◇";

  outer:
  for (const c of CATEGORIES) {
    for (const cm of c.cmds) {
      if (
        cm.name === cmdName ||
        cm.name === name
      ) {
        icon = cm.icon;
        break outer;
      }
    }
  }

  const lines = [];

  lines.push(LINE);
  lines.push(
    `  ⟦ SAIYAN / ${cmdName.toUpperCase()} ⟧`
  );
  lines.push(LINE);
  lines.push("");

  lines.push("  ملف الوحدة:");
  lines.push(`     ${desc}`);
  lines.push("");

  lines.push("  صيغة التشغيل:");

  for (
    const l of String(usage).split("\n")
  ) {
    lines.push(`     ${l}`);
  }

  lines.push("");

  lines.push(`  ▸ التصنيف: ${cat}`);
  lines.push(`  ▸ مستوى الوصول: ${role}`);

  if (aliases.length) {
    lines.push(
      `  ▸ البدائل  : ${aliases.join("، ")}`
    );
  }

  lines.push("");
  lines.push("  magnus  •  Saiyan");
  lines.push("");
  lines.push(LINE);

  return lines.join("\n");
}

module.exports = {
  config: {
    name: "help",

    aliases: [
      "h",
      "مساعدة",
      "أوامر",
      "commands",
    ],

    version: "5.0",

    author: "magnus",

    countDown: 3,

    role: 0,

    category: "info",

    description:
      "مركز أوامر Saiyan ودليل استخدام البوت",

    guide: {
      en:
        "{pn} — عرض جميع الأوامر\n" +
        "{pn} [اسم الأمر] — عرض تفاصيل أمر محدد",
    },
  },

  onStart: async function ({
    args,
    message,
    prefix,
  }) {
    if (args[0]) {
      return message.reply(
        buildHelpOne(
          args[0],
          prefix
        )
      );
    }

    return message.reply(
      buildHelpAll(prefix)
    );
  },
};
