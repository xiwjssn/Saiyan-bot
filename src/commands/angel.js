/**
 * Saiyan — Angel v6 — نظام الرسائل التلقائية
 * Copyright © 2026 magnus
 *
 * ✦ يرسل 3 رسائل متتالية
 * ✦ يهدأ بعدها وينتظر أي رد بشري
 * ✦ يعود فور ظهور رسالة جديدة
 * ✦ إذا استمر الصمت 16 دقيقة، يغادر المجموعة
 */

"use strict";

const { brandApi } = require("../utils/identity");
const fs = require("fs-extra");
const path = require("path");

const DATA = path.join(
  process.cwd(),
  "database/data/saiyanMessages.json"
);

const SILENCE_MS = 16 * 60 * 1000;

function load() {
  try {
    if (fs.existsSync(DATA)) {
      return JSON.parse(
        fs.readFileSync(DATA, "utf8")
      );
    }
  } catch (_) {}

  return {};
}

function save(data) {
  fs.ensureDirSync(
    path.dirname(DATA)
  );

  fs.writeFileSync(
    DATA,
    JSON.stringify(data, null, 2)
  );
}

function rand(min, max) {
  return min + Math.random() * (max - min);
}


// ── Global state ──────────────────────────────────────────────────────────────

if (!global.GoatBot)
  global.GoatBot = {};

if (!global.GoatBot.saiyanIntervals)
  global.GoatBot.crowIntervals = {};

if (!global.GoatBot.saiyanSilenceTimers)
  global.GoatBot.crowSilenceTimers = {};

if (!global._saiyanMessageState)
  global._crowState = {};


// _crowState[tid] = {
//   consecutive,
//   paused,
//   pausedAt,
//   lastHumanTs,
//   lastHumanMessageID,
//   leaving
// }


// ── Human-message listener ────────────────────────────────────────────────────

if (!global._msgListeners)
  global._msgListeners = [];

if (!global._saiyanMessageListenerRegistered) {

  global._crowListenerRegistered = true;

  global._msgListeners.push(
    ({ threadID, messageID }) => {

      const tid = String(threadID);

      const st =
        global._crowState[tid];

      if (!st)
        return;

      st.consecutive = 0;
      st.lastHumanTs = Date.now();

      if (messageID) {
        st.lastHumanMessageID =
          String(messageID);
      }

      // إذا وصل رد أثناء التوقف، يعود Saiyan للعمل
      if (st.paused) {

        st.paused = false;
        st.pausedAt = null;

        clearSilenceWatchdog(tid);

        const data = load();
        const td = data[tid];

        if (
          td?.active &&
          global.GoatBot?.fcaApi
        ) {

          scheduleNext(
            brandApi(global.GoatBot.fcaApi),
            tid,
            td
          );
        }
      }

      const data = load();
      const td = data[tid];

      if (
        td?.active &&
        global.GoatBot?.fcaApi
      ) {

        scheduleSilenceWatchdog(
          brandApi(global.GoatBot.fcaApi),
          tid
        );
      }
    }
  );
}


// ── Silence watchdog ──────────────────────────────────────────────────────────

function clearSilenceWatchdog(tid) {

  const timer =
    global.GoatBot
      .crowSilenceTimers?.[tid];

  if (timer)
    clearTimeout(timer);

  if (
    global.GoatBot
      .crowSilenceTimers
  ) {

    delete global.GoatBot
      .crowSilenceTimers[tid];
  }
}


// ── رسالة الخروج ─────────────────────────────────────────────────────────────

function sendEscapeAndLeave(api, tid, st) {

  if (st.leaving)
    return Promise.resolve();

  st.leaving = true;

  clearTimeout(
    global.GoatBot
      .crowIntervals[tid]
  );

  delete global.GoatBot
    .crowIntervals[tid];

  clearSilenceWatchdog(tid);

  return (async () => {

    const escapeMessage =
      "⟦ SAIYAN / SESSION CLOSED ⟧\nلم يصل أي تفاعل خلال فترة الانتظار، لذلك سأغادر المجموعة الآن.\n— magnus";

    try {

      await new Promise(
        (resolve, reject) => {

          api.sendMessage(
            escapeMessage,
            tid,
            err =>
              err
                ? reject(err)
                : resolve()
          );

        }
      );

    } catch (_) {}

    await new Promise(
      resolve =>
        setTimeout(resolve, 1500)
    );

    try {

      const botID =
        String(
          api.getCurrentUserID?.() ||
          global.GoatBot?.botID ||
          ""
        );

      await new Promise(
        (resolve, reject) => {

          api.removeUserFromGroup(
            botID,
            String(tid),
            err =>
              err
                ? reject(err)
                : resolve()
          );

        }
      );

    } catch (error) {

      global.log?.warn?.(
        "Saiyan",
        `تعذر على Saiyan مغادرة المحادثة ${tid}: ${error.message}`
      );

    } finally {

      const data = load();

      if (data[tid]) {

        data[tid].active = false;

        save(data);
      }

      delete global._crowState[tid];
    }

  })();
}


// ── مراقبة فترة الصمت ────────────────────────────────────────────────────────

function scheduleSilenceWatchdog(api, tid) {

  const key = String(tid);

  clearSilenceWatchdog(key);

  const st =
    global._crowState[key];

  if (
    !st ||
    st.leaving ||
    !st.paused
  ) {

    return;
  }

  const elapsed =
    Date.now() -
    (st.pausedAt || Date.now());

  const remaining =
    Math.max(
      0,
      SILENCE_MS - elapsed
    );

  global.GoatBot
    .crowSilenceTimers[key] =
    setTimeout(
      async () => {

        delete global.GoatBot
          .crowSilenceTimers[key];

        const fresh =
          load()[key];

        const current =
          global._crowState[key];

        if (
          !fresh?.active ||
          !current ||
          current.leaving ||
          !current.paused
        ) {

          return;
        }

        if (
          Date.now() -
          (current.pausedAt || Date.now())
          <
          SILENCE_MS
        ) {

          scheduleSilenceWatchdog(
            api,
            key
          );

          return;
        }

        await sendEscapeAndLeave(
          api,
          key,
          current
        );

      },
      remaining
    );
}


// ── Core scheduler ────────────────────────────────────────────────────────────

function scheduleNext(api, tid, td) {

  clearTimeout(
    global.GoatBot
      .crowIntervals[tid]
  );

  delete global.GoatBot
    .crowIntervals[tid];

  if (
    !td?.active ||
    !td?.message
  ) {

    return;
  }

  if (
    !global._crowState[tid]
  ) {

    global._crowState[tid] = {

      consecutive: 0,

      paused: false,

      pausedAt: null,

      lastHumanTs: Date.now(),

      lastHumanMessageID: null,

      leaving: false
    };
  }

  if (
    global._crowState[tid].paused
  ) {

    return;
  }

  const ms =
    Math.round(
      rand(
        td.minSeconds ?? 60,
        td.maxSeconds ??
          td.minSeconds ??
          60
      ) * 1000
    );

  global.GoatBot
    .crowIntervals[tid] =
    setTimeout(
      async () => {

        delete global.GoatBot
          .crowIntervals[tid];

        const fresh =
          load()[tid];

        if (!fresh?.active)
          return;

        const st =
          global._crowState[tid] ||
          {};

        // ── بعد 3 رسائل ──────────────────────────────────────────────────

        if (
          (st.consecutive || 0) >= 3
        ) {

          st.paused = true;
          st.pausedAt = Date.now();

          global._crowState[tid] =
            st;

          scheduleSilenceWatchdog(
            api,
            tid
          );

          return;
        }

        // ── إرسال الرسالة ─────────────────────────────────────────────────

        try {

          const delay =
            global.utils
              ?.calcHumanTypingDelay
              ?.(
                fresh.message
              ) || 1500;

          await global.utils
            ?.simulateTyping
            ?.(
              api,
              tid,
              delay
            );

          await api.sendMessage(
            fresh.message,
            tid
          );

          st.consecutive =
            (st.consecutive || 0) + 1;

          global._crowState[tid] =
            st;

        } catch (_) {}

        const next =
          load()[tid];

        if (!next?.active)
          return;

        // بعد الرسالة الثالثة
        if (
          (st.consecutive || 0) >= 3
        ) {

          st.paused = true;
          st.pausedAt = Date.now();

          global._crowState[tid] =
            st;

          scheduleSilenceWatchdog(
            api,
            tid
          );

          return;
        }

        scheduleNext(
          api,
          tid,
          next
        );

      },
      ms
    );
}


// ── Session restore ────────────────────────────────────────────────────────────

function restoreAll(api) {

  if (
    global.GoatBot
      ._crowRestored
  ) {

    return;
  }

  global.GoatBot
    ._crowRestored = true;

  const data = load();

  for (
    const [tid, td]
    of Object.entries(data)
  ) {

    if (
      td.active &&
      td.message
    ) {

      if (
        !global._crowState[tid]
      ) {

        global._crowState[tid] = {

          consecutive: 0,

          paused: false,

          pausedAt: null,

          lastHumanTs: Date.now(),

          lastHumanMessageID: null,

          leaving: false
        };
      }

      scheduleNext(
        api,
        tid,
        td
      );

      if (
        global._crowState[tid]
          .paused
      ) {

        scheduleSilenceWatchdog(
          api,
          tid
        );
      }
    }
  }
}


// ── Module ────────────────────────────────────────────────────────────────────

module.exports = {

  config: {

    name: "angel",

    aliases: [
      "ang",
      "كرو"
    ],

    version: "6.0",

    author: "magnus",

    countDown: 3,

    role: 2,

    category: "management",

    description:
      "Saiyan — رسائل تلقائية بأسلوب هادئ",

    guide: {
      en:
        "{pn} [رسالة] [min] [max] — بدء Saiyan\n" +
        "{pn} off — إيقاف Saiyan\n" +
        "{pn} status — عرض حالة Saiyan"
    }
  },


  onStart: async function({
    api,
    event,
    args,
    message
  }) {

    const tid =
      event.threadID;

    restoreAll(api);

    const data =
      load();

    const sub =
      (args[0] || "")
        .toLowerCase();


    // ── الحالة ───────────────────────────────────────────────────────────────

    if (
      !sub ||
      sub === "status" ||
      sub === "حالة"
    ) {

      const td =
        data[tid];

      if (!td?.active) {

        return message.reply(
          "⟦ SAIYAN / AUTO PRESENCE ⟧\nلا توجد جلسة رسائل تلقائية نشطة هنا. أرسل الأمر مع الرسالة المطلوبة لبدء جلسة جديدة."
        );
      }

      const st =
        global._crowState[tid] ||
        {};

      const mode =
        st.paused
          ? "⏸️ أخذ استراحة — ينتظر ردًا"
          : "🟢 موجود ويعمل";

      return message.reply(

        "╭─〔 🐦‍⬛ Saiyan 〕─╮\n" +

        `• الحالة: ${mode}\n` +

        `• الكلام: ${td.message}\n` +

        `• التوقيت: ${td.minSeconds}–${td.maxSeconds} ثانية\n` +

        `• الإرسال: ${st.consecutive || 0}/3\n\n` +

        "صاحب Saiyan: magnus\n" +

        "╰────────────────╯"

      );
    }


    // ── إيقاف ───────────────────────────────────────────────────────────────

    if (
      sub === "off" ||
      sub === "ايقاف" ||
      sub === "إيقاف"
    ) {

      clearTimeout(
        global.GoatBot
          .crowIntervals[tid]
      );

      delete global.GoatBot
        .crowIntervals[tid];

      clearSilenceWatchdog(tid);

      delete global._crowState[tid];

      if (data[tid]) {

        data[tid].active =
          false;

        save(data);
      }

      return message.reply(

        "⟦ SAIYAN / AUTO PRESENCE HALTED ⟧\nتم إيقاف الرسائل التلقائية في هذه المجموعة.\nيمكن إعادة تشغيل الوحدة بإرسال الأمر مجددًا.\n— magnus"

      );
    }


    // ── قراءة الرسالة والوقت ────────────────────────────────────────────────

    const nums =
      args.filter(
        a =>
          /^\d+$/.test(a)
      );

    const textParts =
      args.filter(
        a =>
          !/^\d+$/.test(a) &&
          a.toLowerCase() !== "on"
      );

    const msg =
      textParts
        .join(" ")
        .trim() ||
      data[tid]?.message ||
      "⟦ Saiyan online ⟧";

    const minS =
      parseInt(nums[0]) || 60;

    const maxS =
      Math.max(
        parseInt(nums[1]) || minS,
        minS
      );


    // ── حفظ الإعدادات ──────────────────────────────────────────────────────

    data[tid] = {

      active: true,

      message: msg,

      minSeconds: minS,

      maxSeconds: maxS
    };

    save(data);


    // ── تهيئة الحالة ───────────────────────────────────────────────────────

    global._crowState[tid] = {

      consecutive: 0,

      paused: false,

      pausedAt: null,

      lastHumanTs: Date.now(),

      lastHumanMessageID: null,

      leaving: false
    };


    scheduleNext(
      api,
      tid,
      data[tid]
    );

    scheduleSilenceWatchdog(
      api,
      tid
    );


    return message.reply(

      "╭─〔 🐦‍⬛ Saiyan 〕─╮\n" +

      "تمام، Saiyan صار حاضر.\n\n" +

      `• الكلام: ${msg}\n` +

      `• التوقيت: ${minS}–${maxS} ثانية\n\n` +

      "ثلاث رسائل متتالية، وبعدها يأخذ استراحة.\n" +

      "أول ما يجي رد بشري، يرجع يكمل.\n" +

      "وإذا مرّت 16 دقيقة بدون رد، يرسل كلمته الأخيرة ويطلع.\n\n" +

      "magnus\n" +

      "╰────────────────╯"

    );
  },


  _test: {

    sendEscapeAndLeave,

    scheduleNext,

    scheduleSilenceWatchdog,

    clearSilenceWatchdog,

    SILENCE_MS
  }
};
