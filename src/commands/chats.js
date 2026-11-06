/**
 * Saiyan V1 — /chats — مركز إدارة المحادثات
 * Copyright © 2026 magnus
 */
"use strict";

const fs   = require("fs-extra");
const path = require("path");
const ctrl = require("../utils/cmdControl");

const DM_DATA = path.join(
  process.cwd(),
  "database/data/dmLock.json"
);

const MANAGED_COMMANDS = [
  { name: "angel", label: "Saiyan Presence — الرسائل التلقائية" },
  { name: "nm",    label: "Name Core — تثبيت اسم المجموعة" },
  { name: "nick",  label: "Nickname Core — تثبيت كنيات الأعضاء" },
];

const MANAGED_COMMAND_NAMES =
  new Set(MANAGED_COMMANDS.map(c => c.name));


// ── التحقق من الأدمن ──────────────────────────────────────────────────────────

function isAdmin(id) {
  const cfg = global.GoatBot?.config || {};

  const supers = [
    ...(cfg.superAdminBot || []),
    cfg.ownerID
  ]
    .filter(Boolean)
    .map(String);

  const admins =
    (cfg.adminBot || [])
      .map(String);

  return (
    supers.includes(String(id)) ||
    admins.includes(String(id))
  );
}


// ── DM LOCK ──────────────────────────────────────────────────────────────────

function getDmLocked() {

  if (
    global.GoatBot?.dmLocked !== undefined
  ) {
    return !!global.GoatBot.dmLocked;
  }

  try {

    if (fs.existsSync(DM_DATA)) {

      const data =
        JSON.parse(
          fs.readFileSync(
            DM_DATA,
            "utf8"
          )
        );

      global.GoatBot.dmLocked =
        !!data.locked;

      return global.GoatBot.dmLocked;
    }

  } catch (_) {}

  return false;
}


function setDmLocked(value) {

  global.GoatBot.dmLocked =
    !!value;

  try {

    fs.ensureDirSync(
      path.dirname(DM_DATA)
    );

    fs.writeFileSync(
      DM_DATA,
      JSON.stringify(
        { locked: !!value },
        null,
        2
      )
    );

  } catch (_) {}
}


// ── SEND ─────────────────────────────────────────────────────────────────────

function send(api, body, threadID, callback) {

  return new Promise(resolve => {

    let settled = false;

    const finish = (error, info) => {

      if (settled)
        return;

      settled = true;

      if (callback)
        callback(error, info);

      resolve(info);
    };

    try {

      const result =
        api.sendMessage(
          body,
          threadID,
          finish
        );

      if (
        result &&
        typeof result.then === "function"
      ) {

        result
          .then(info =>
            finish(null, info)
          )
          .catch(error =>
            finish(error)
          );
      }

    } catch (error) {

      finish(error);
    }

  });
}


// ── GET THREAD LIST ──────────────────────────────────────────────────────────

function getThreadList(
  api,
  limit,
  cursor,
  tags
) {

  return new Promise(resolve => {

    let settled = false;

    const finish = (error, data) => {

      if (settled)
        return;

      settled = true;

      if (error)
        return resolve([]);

      resolve(
        Array.isArray(data)
          ? data
          : data?.data || []
      );
    };

    try {

      const result =
        api.getThreadList(
          limit,
          cursor,
          tags,
          finish
        );

      if (
        result &&
        typeof result.then === "function"
      ) {

        result
          .then(data =>
            finish(null, data)
          )
          .catch(error =>
            finish(error)
          );

      } else if (
        Array.isArray(result)
      ) {

        finish(null, result);
      }

    } catch (error) {

      finish(error);
    }

  });
}


// ── جلب المحادثات ────────────────────────────────────────────────────────────

async function fetchThreads(api, tags) {

  const items = [];

  let cursor = null;

  for (
    let page = 0;
    page < 5;
    page++
  ) {

    const batch =
      await getThreadList(
        api,
        50,
        cursor,
        tags
      );

    if (!batch.length)
      break;

    for (const t of batch) {

      if (t?.threadID)
        items.push(t);
    }

    if (batch.length < 50)
      break;

    cursor =
      batch[
        batch.length - 1
      ]?.timestamp || null;

    if (!cursor)
      break;
  }

  const seen = new Set();

  return items.filter(t => {

    const id =
      String(t.threadID);

    if (seen.has(id))
      return false;

    seen.add(id);

    return true;
  });
}


function getAllGroups(api) {

  return fetchThreads(
    api,
    ["INBOX"]
  ).then(list =>
    list.filter(
      t => t?.isGroup
    )
  );
}


function getAllMessageRequests(api) {

  return fetchThreads(
    api,
    ["PENDING"]
  );
}


function getAllOtherMessages(api) {

  return fetchThreads(
    api,
    ["OTHER"]
  );
}


// ── أسماء المحادثات ───────────────────────────────────────────────────────────

function threadName(t) {

  return (
    t.name ||
    t.threadName ||
    t.senderName ||
    t.snippet ||
    `مستخدم ${t.threadID}`
  );
}


// ── حالة الأوامر ──────────────────────────────────────────────────────────────

function commandStatus(tid, cmd) {

  return ctrl.isEnabled(
    tid,
    cmd
  )
    ? "🟩 يعمل"
    : "⬛ متوقف";
}


// ── REPLY SYSTEM ──────────────────────────────────────────────────────────────

function registerReply(
  api,
  event,
  state,
  callback
) {

  if (
    !state?.messageID ||
    !global.GoatBot?.onReply
  )
    return;

  const key =
    `crow_chats_${state.messageID}`;

  global.GoatBot.onReply.set(
    key,
    {
      messageID:
        state.messageID,

      author:
        String(event.senderID),

      ts:
        Date.now(),

      callback:
        async ({
          api: rApi,
          event: rEv,
          message
        }) => {

          if (
            String(rEv.senderID) !==
            String(event.senderID)
          )
            return;

          await callback({
            api: rApi,
            event: rEv,
            message,
            state,
            input:
              String(
                rEv.body || ""
              ).trim(),
          });
        },
    }
  );
}


async function sendReplyMenu(
  api,
  event,
  body,
  state,
  callback
) {

  await send(
    api,
    body,
    event.threadID,
    (_e, info) => {

      if (info?.messageID) {

        registerReply(
          api,
          event,
          {
            ...state,
            messageID:
              info.messageID
          },
          callback
        );
      }
    }
  );
}


// ── قبول المحادثة ─────────────────────────────────────────────────────────────

async function acceptConversation(
  api,
  threadID
) {

  const tid =
    String(threadID);

  let accepted = false;
  let acceptError = null;

  try {

    if (
      typeof api.handleMessageRequest ===
      "function"
    ) {

      await new Promise(resolve => {

        let done = false;

        const finish = error => {

          if (done)
            return;

          done = true;

          if (error)
            acceptError = error;
          else
            accepted = true;

          resolve();
        };

        try {

          const result =
            api.handleMessageRequest(
              tid,
              true,
              finish
            );

          if (
            result &&
            typeof result.then ===
            "function"
          ) {

            result
              .then(() =>
                finish(null)
              )
              .catch(finish);
          }

        } catch (e) {

          finish(e);
        }

      });
    }

  } catch (e) {

    acceptError = e;
  }


  let helloSent = false;
  let helloError = null;

  try {

    await new Promise(resolve => {

      let done = false;

      const finish = error => {

        if (done)
          return;

        done = true;

        if (error)
          helloError = error;
        else
          helloSent = true;

        resolve();
      };

      try {

        const result =
          api.sendMessage(
            "⟦ SAIYAN / CHANNEL OPEN ⟧\nأهلًا، تم فتح قناة المحادثة.",
            tid,
            finish
          );

        if (
          result &&
          typeof result.then ===
          "function"
        ) {

          result
            .then(() =>
              finish(null)
            )
            .catch(finish);
        }

      } catch (e) {

        finish(e);
      }

    });

  } catch (e) {

    helloError = e;
  }

  return {
    accepted,
    acceptError,
    helloSent,
    helloError
  };
}


// ── القائمة الرئيسية ─────────────────────────────────────────────────────────

function buildMainMenu() {

  return (
    "⟦ SAIYAN / CONVERSATION COMMAND CENTER ⟧\n\n" +

    "حدد القسم الذي تريد إدارته:\n\n" +

    "01 — سجل المجموعات\n" +
    "02 — طلبات التواصل\n" +
    "03 — الرسائل الأخرى\n" +
    "04 — إحصائيات الاتصال\n" +
    "05 — قفل الرسائل الخاصة\n\n" +

    "────────────────────────\nأرسل رقم القسم للمتابعة."
  );
}


// ── قائمة الغروبات ────────────────────────────────────────────────────────────

function buildGroupList(groups) {

  let body =
    `⟦ SAIYAN / GROUP DIRECTORY ⟧\nعدد المجموعات المتاحة: ${groups.length}\n────────────────────────\n`;

  groups
    .slice(0, 30)
    .forEach((g, i) => {

      body +=
        `🔹 ${i + 1} — ${threadName(g)}\n` +
        `   🆔 ${g.threadID}\n\n`;
    });

  body +=
    "────────────────────────\nأرسل رقم المجموعة لفتح إعداداتها.\n0 — العودة";

  return body;
}


// ── قائمة الطلبات ─────────────────────────────────────────────────────────────

function buildRequestList(
  requests,
  emoji,
  title
) {

  let body =
    `${emoji} ${title}: ${requests.length}\n` +
    "━━━━━━━━━━━━━━━━\n";

  requests
    .slice(0, 30)
    .forEach((r, i) => {

      body +=
        `🔸 ${i + 1} — ${threadName(r)}\n` +
        `   🆔 ${r.threadID}\n`;

      if (r.snippet) {

        body +=
          `   💭 ${String(
            r.snippet
          ).slice(0, 80)}\n`;
      }

      body += "\n";
    });

  body +=
    "━━━━━━━━━━━━━━━━\n" +
    "🎯 أرسل الرقم لفتح المحادثة\n" +
    "↩️ 0 — رجوع";

  return body;
}


// ── تفاصيل الطلب ─────────────────────────────────────────────────────────────

function buildRequestDetails(
  request,
  emoji,
  title
) {

  return (
    `${emoji} ${title}\n` +
    "━━━━━━━━━━━━━━━━\n" +
    `👤 الحساب: ${threadName(request)}\n` +
    `🔗 Thread: ${request.threadID}\n` +
    (
      request.snippet
        ? `💭 آخر رسالة: ${request.snippet}\n`
        : ""
    ) +
    "━━━━━━━━━━━━━━━━\n" +
    "🟢 1 — قبول المحادثة\n" +
    "⚪ 0 — رجوع"
  );
}


// ── خيارات الغروب ─────────────────────────────────────────────────────────────

function buildGroupActions(group) {

  const tid =
    String(group.threadID);

  let body =
    `🐦‍⬛ ${threadName(group)}\n` +
    `🔗 ${tid}\n` +
    "━━━━━━━━━━━━━━━━\n";

  MANAGED_COMMANDS.forEach(
    (c, i) => {

      body +=
        `${i + 1}️⃣ /${c.name}\n` +
        `   ${commandStatus(
          tid,
          c.name
        )}\n`;
    }
  );

  body +=
    "━━━━━━━━━━━━━━━━\n" +
    "⚙️ أرسل رقم الأمر لتبديل حالته\n" +
    "↩️ 0 — رجوع";

  return body;
}


// ── تنفيذ الأمر في غروب آخر ───────────────────────────────────────────────────

function parseManagedCommand(input) {

  const prefix =
    global.GoatBot?.config?.prefix || "/";

  const raw =
    String(input || "").trim();

  if (
    !raw.startsWith(prefix)
  )
    return null;

  const parts =
    raw
      .slice(prefix.length)
      .trim()
      .split(/\s+/)
      .filter(Boolean);

  const name =
    String(
      parts.shift() || ""
    ).toLowerCase();

  if (
    !MANAGED_COMMAND_NAMES.has(name)
  )
    return null;

  const command =
    global.GoatBot?.commands?.get(
      name
    );

  if (
    !command?.onStart
  )
    return null;

  return {
    name,
    args: parts,
    command
  };
}


function buildRemoteMessage(
  api,
  targetEvent
) {

  return {

    reply:
      (body, cb) =>
        send(
          api,
          body,
          targetEvent.threadID,
          cb
        ),

    unsend:
      (mid, cb) => {

        try {

          return api.unsendMessage(
            mid ||
            targetEvent.messageID,
            cb
          );

        } catch (_) {}
      },

    react:
      (emoji, mid, cb) => {

        try {

          return api.setMessageReaction(
            emoji,
            mid ||
            targetEvent.messageID,
            cb ||
            (() => {}),
            true
          );

        } catch (_) {}
      },

    send:
      (body, tid, cb) =>
        send(
          api,
          body,
          tid ||
          targetEvent.threadID,
          cb
        ),
  };
}


async function executeRemoteCommand(
  api,
  sourceEvent,
  sourceMessage,
  group,
  input
) {

  const parsed =
    parseManagedCommand(input);

  if (!parsed) {

    return sourceMessage.reply(
      "⚠️ الأمر غير معروف.\n\n" +
      "الأوامر المتاحة:\n" +
      "• /angel [رسالة] [min] [max]\n" +
      "• /nm [اسم] [min] [max]\n" +
      "• /nick [اسم]\n\n" +
      "↩️ أرسل 0 للإلغاء."
    );
  }

  const targetThreadID =
    String(group.threadID);

  ctrl.setCommandEnabled(
    targetThreadID,
    parsed.name,
    true
  );

  const targetEvent = {

    ...sourceEvent,

    type: "message",

    messageID:
      `crow_remote_${Date.now()}`,

    threadID:
      targetThreadID,

    isGroup: true,

    body:
      String(input).trim(),
  };

  try {

    await parsed.command.onStart({

      api,

      event:
        targetEvent,

      args:
        parsed.args,

      commandName:
        parsed.name,

      message:
        buildRemoteMessage(
          api,
          targetEvent
        ),

      prefix:
        global.GoatBot?.config?.prefix ||
        "/",

      role: 2,

      senderID:
        sourceEvent.senderID,

      threadID:
        targetThreadID,
    });

    return sourceMessage.reply(
      `🟢 تم تمرير /${parsed.name} إلى "${threadName(group)}".\n\n` +
      "🐦‍⬛ Saiyan جاهز لأمر آخر."
    );

  } catch (error) {

    global.log?.error?.(
      "CROW_CHATS_REMOTE",
      `فشل تنفيذ /${parsed.name}: ${error.message}`
    );

    return sourceMessage.reply(
      `🔴 تعذر تنفيذ /${parsed.name}.\n` +
      `📍 الغروب: ${threadName(group)}\n` +
      `⚠️ ${error.message}`
    );
  }
}


// ── التنقل بين القوائم ───────────────────────────────────────────────────────

function buildCommandPrompt(group) {

  return (
    "🐦‍⬛ Saiyan — Remote Control\n\n" +

    `🎯 الهدف: ${threadName(group)}\n` +
    `🔗 ${group.threadID}\n\n` +

    "━━━━━━━━━━━━━━━━\n" +

    "اكتب الأمر الذي تريد تمريره:\n\n" +

    "🪽 /angel hh 60 80\n" +
    "🔒 /nm hhh 5 15\n" +
    "👤 /nick hhh\n\n" +

    "━━━━━━━━━━━━━━━━\n" +
    "↩️ 0 — إلغاء"
  );
}


async function showGroupCommandPrompt(
  api,
  event,
  group
) {

  return sendReplyMenu(
    api,
    event,
    buildCommandPrompt(group),
    {
      step:
        "COMMAND_INPUT",
      group
    },

    async ({
      api: rApi,
      event: rEv,
      message,
      state,
      input
    }) => {

      if (input === "0") {

        return message.reply(
          "↩️ تم إلغاء العملية."
        );
      }

      return executeRemoteCommand(
        rApi,
        event,
        message,
        state.group,
        input
      );
    }
  );
}


async function showGroupActions(
  api,
  event,
  group
) {

  return sendReplyMenu(
    api,
    event,
    buildGroupActions(group),
    {
      step:
        "GROUP_ACTION",
      group
    },

    async ({
      api: rApi,
      event: rEv,
      message: m,
      state,
      input
    }) => {

      if (input === "0")
        return showGroups(
          rApi,
          rEv
        );

      const idx =
        Number.parseInt(
          input,
          10
        ) - 1;

      if (
        !Number.isInteger(idx) ||
        idx < 0 ||
        idx >= MANAGED_COMMANDS.length
      ) {

        return m.reply(
          `⚠️ الاختيار غير صحيح.\nاختر رقمًا من 1 إلى ${MANAGED_COMMANDS.length}.`
        );
      }

      const cmd =
        MANAGED_COMMANDS[idx];

      const enabled =
        !ctrl.isEnabled(
          state.group.threadID,
          cmd.name
        );

      ctrl.setCommandEnabled(
        state.group.threadID,
        cmd.name,
        enabled
      );

      await showGroupActions(
        rApi,
        rEv,
        state.group
      );

      return m.reply(
        `${enabled ? "🟢" : "⚫"} /${cmd.name} أصبح ${enabled ? "يعمل" : "متوقفًا"} في "${threadName(state.group)}".`
      );
    }
  );
}


async function showGroups(
  api,
  event
) {

  const groups =
    await getAllGroups(api);

  if (!groups.length) {

    return send(
      api,
      "⟦ EMPTY DIRECTORY ⟧\nلا توجد مجموعات متاحة في قائمة المحادثات الحالية.",
      event.threadID
    );
  }

  return sendReplyMenu(
    api,
    event,
    buildGroupList(groups),
    {
      step:
        "GROUP_LIST",
      groups
    },

    async ({
      api: rApi,
      event: rEv,
      message,
      state,
      input
    }) => {

      if (input === "0")
        return showMainMenu(
          rApi,
          rEv
        );

      const idx =
        Number.parseInt(
          input,
          10
        ) - 1;

      if (
        !Number.isInteger(idx) ||
        idx < 0 ||
        idx >= Math.min(
          state.groups.length,
          30
        )
      ) {

        return message.reply(
          `⟦ INVALID SELECTION ⟧\nاختر رقمًا بين 1 و${Math.min(state.groups.length, 30)}.`
        );
      }

      return showGroupCommandPrompt(
        rApi,
        rEv,
        state.groups[idx]
      );
    }
  );
}


async function showRequestList(
  api,
  event,
  fetcher,
  emoji,
  title,
  stepPrefix
) {

  const items =
    await fetcher(api);

  if (!items.length) {

    return sendReplyMenu(
      api,
      event,

      `${emoji} ${title}\n` +
      "━━━━━━━━━━━━━━━━\n" +
      "لا توجد عناصر في هذا القسم حاليًا.\n" +
      "━━━━━━━━━━━━━━━━\n" +
      "↩️ 0 — رجوع",

      {
        step:
          `${stepPrefix}_EMPTY`
      },

      async ({
        api: rApi,
        event: rEv,
        message,
        input
      }) => {

        if (input === "0")
          return showMainMenu(
            rApi,
            rEv
          );

        return message.reply(
          "⟦ NAVIGATION ⟧\nأرسل 0 للعودة إلى القائمة الرئيسية."
        );
      }
    );
  }

  return sendReplyMenu(
    api,
    event,
    buildRequestList(
      items,
      emoji,
      title
    ),

    {
      step:
        `${stepPrefix}_LIST`,
      items
    },

    async ({
      api: rApi,
      event: rEv,
      message,
      state,
      input
    }) => {

      if (input === "0")
        return showMainMenu(
          rApi,
          rEv
        );

      const idx =
        Number.parseInt(
          input,
          10
        ) - 1;

      if (
        !Number.isInteger(idx) ||
        idx < 0 ||
        idx >= Math.min(
          state.items.length,
          30
        )
      ) {

        return message.reply(
          `⟦ INVALID SELECTION ⟧\nالرقم غير موجود. اختر من 1 إلى ${Math.min(state.items.length, 30)}.`
        );
      }

      const selected =
        state.items[idx];

      return sendReplyMenu(
        rApi,
        rEv,

        buildRequestDetails(
          selected,
          emoji,
          title
        ),

        {
          step:
            `${stepPrefix}_DETAILS`,
          items:
            state.items,
          selected
        },

        async ({
          api: dApi,
          event: dEv,
          message: dMsg,
          state: dState,
          input: dInput
        }) => {

          if (dInput === "0") {

            return showRequestList(
              dApi,
              dEv,
              fetcher,
              emoji,
              title,
              stepPrefix
            );
          }

          if (
            dInput === "1" ||
            dInput.toLowerCase() ===
              "قبول" ||
            dInput.toLowerCase() ===
              "accept"
          ) {

            const result =
              await acceptConversation(
                dApi,
                dState.selected.threadID
              );

            if (result.helloSent) {

              return dMsg.reply(
                "⟦ CONVERSATION ACCEPTED ⟧\nتم فتح المحادثة وإرسال رسالة تعريفية من Saiyan."
              );
            }

            return dMsg.reply(
              "⟦ PARTIAL COMPLETION ⟧\nتمت محاولة فتح المحادثة، لكن تعذر إرسال رسالة التعريف.\n"
              (
                result.helloError?.message ||
                "تحقق من اتصال الحساب."
              )
            );
          }

          return dMsg.reply(
            "⟦ INVALID ACTION ⟧\n1 — قبول المحادثة\n0 — العودة"
          );
        }
      );
    }
  );
}


function showMessageRequests(
  api,
  event
) {

  return showRequestList(
    api,
    event,
    getAllMessageRequests,
    "✉️",
    "طلبات المراسلة",
    "REQUESTS"
  );
}


function showOtherMessages(
  api,
  event
) {

  return showRequestList(
    api,
    event,
    getAllOtherMessages,
    "🕸️",
    "Other",
    "OTHER"
  );
}


// ── قبول مباشر ────────────────────────────────────────────────────────────────

async function acceptByThreadID(
  api,
  event,
  message,
  threadID
) {

  const tid =
    String(threadID || "").trim();

  if (!tid) {

    return message.reply(
      "⟦ THREAD IDENTIFIER REQUIRED ⟧\nأرسل معرّف المحادثة.\nمثال: /chats accept 123456789"
    );
  }

  const result =
    await acceptConversation(
      api,
      tid
    );

  if (result.helloSent) {

    return message.reply(
      `⟦ CONVERSATION OPENED ⟧\nالمعرّف: ${tid}\nتم إرسال رسالة التعريف.\n— magnus`
    );
  }

  return message.reply(
    "⟦ CONVERSATION PARTIALLY OPENED ⟧\nتعذر إرسال رسالة التعريف.\n"
    (
      result.helloError?.message ||
      result.acceptError?.message ||
      "حدث خطأ غير معروف."
    )
  );
}


// ── الإحصائيات ────────────────────────────────────────────────────────────────

async function showChatCount(
  api,
  event
) {

  const threads =
    await getThreadList(
      api,
      50,
      null,
      ["INBOX"]
    );

  const groups =
    threads.filter(
      t => t?.isGroup
    );

  const dms =
    threads.filter(
      t => !t?.isGroup
    );

  const requests =
    await getAllMessageRequests(api);

  const other =
    await getAllOtherMessages(api);

  return sendReplyMenu(
    api,
    event,

    `⟦ SAIYAN / CONNECTION METRICS ⟧\nالمجموعات: ${groups.length}\nالمحادثات الخاصة: ${dms.length}\nطلبات التواصل: ${requests.length}\nالرسائل الأخرى: ${other.length}\nقفل الخاص: ${getDmLocked() ? "ACTIVE" : "OFF"}\n0 — العودة`,

    {
      step:
        "CHAT_COUNT"
    },

    async ({
      api: rApi,
      event: rEv,
      message,
      input
    }) => {

      if (input === "0")
        return showMainMenu(
          rApi,
          rEv
        );

      return message.reply(
        "↩️ أرسل 0 فقط للعودة."
      );
    }
  );
}


// ── القائمة الرئيسية ─────────────────────────────────────────────────────────

async function showMainMenu(
  api,
  event
) {

  return sendReplyMenu(
    api,
    event,
    buildMainMenu(),
    {
      step:
        "MAIN_MENU"
    },

    async ({
      api: rApi,
      event: rEv,
      message,
      input
    }) => {

      if (input === "1")
        return showGroups(
          rApi,
          rEv
        );

      if (input === "2")
        return showMessageRequests(
          rApi,
          rEv
        );

      if (input === "3")
        return showOtherMessages(
          rApi,
          rEv
        );

      if (input === "4")
        return showChatCount(
          rApi,
          rEv
        );

      if (input === "5") {

        return message.reply(
          "⟦ PRIVATE MESSAGE GATE ⟧\n\n" +
          `الحالة الحالية: ${
            getDmLocked()
              ? "🟢 ON"
              : "⚫ OFF"
          }\n\n` +
          "⚙️ التحكم:\n" +
          "/chats dm on\n" +
          "/chats dm off"
        );
      }

      return message.reply(
        "⟦ INVALID MENU INDEX ⟧\nاختر قسمًا من 1 إلى 5."
      );
    }
  );
}


// ── MODULE ────────────────────────────────────────────────────────────────────

module.exports = {

  config: {

    name:
      "chats",

    aliases:
      [
        "محادثات",
        "chat"
      ],

    version:
      "4.3",

    author: "magnus",

    countDown:
      3,

    role:
      2,

    category:
      "management",

    description:
      "مركز Saiyan لإدارة الغروبات والمحادثات والطلبات",

    guide: {

      en:
        "{pn} — فتح مركز Saiyan\n" +
        "{pn} list — استعراض الغروبات\n" +
        "{pn} requests — طلبات المراسلة\n" +
        "{pn} other — Other\n" +
        "{pn} spam — Other\n" +
        "{pn} accept THREAD_ID — قبول محادثة\n" +
        "{pn} count — الإحصائيات\n" +
        "{pn} dm on/off — التحكم بالخاص",
    },
  },


  onStart:
    async function ({
      api,
      event,
      args,
      message
    }) {

      if (
        !isAdmin(
          event.senderID
        )
      ) {

        return message.reply(
          "⟦ SAIYAN / ACCESS DENIED ⟧\nهذا المركز متاح لحسابات الإدارة المصرح لها فقط."
        );
      }

      const sub =
        String(
          args[0] || ""
        ).toLowerCase();


      // DM LOCK

      if (sub === "dm") {

        const action =
          String(
            args[1] || ""
          ).toLowerCase();

        if (
          action === "on"
        ) {

          setDmLocked(true);

          return message.reply(
            "⟦ PRIVATE GATE ENABLED ⟧\nتم تفعيل قفل الرسائل الخاصة."
          );
        }

        if (
          action === "off"
        ) {

          setDmLocked(false);

          return message.reply(
            "⟦ PRIVATE GATE DISABLED ⟧\nتم إلغاء قفل الرسائل الخاصة."
          );
        }

        return message.reply(
          "⟦ PRIVATE GATE STATUS ⟧\nالحالة الحالية: " +
          (
            getDmLocked()
              ? "🟢 ON"
              : "⚫ OFF"
          ) +
          "\n\n" +
          "استخدم:\n" +
          "/chats dm on\n" +
          "/chats dm off"
        );
      }


      // قبول مباشر

      if (
        sub === "accept" ||
        sub === "قبول"
      ) {

        return acceptByThreadID(
          api,
          event,
          message,
          args[1]
        );
      }


      // الإحصائيات

      if (
        sub === "count"
      ) {

        return showChatCount(
          api,
          event
        );
      }


      // الطلبات

      if (
        sub === "requests" ||
        sub === "pending" ||
        sub === "طلبات"
      ) {

        return showMessageRequests(
          api,
          event
        );
      }


      // Other / Spam

      if (
        sub === "other" ||
        sub === "spam" ||
        sub === "غيرمهم"
      ) {

        return showOtherMessages(
          api,
          event
        );
      }


      // الغروبات

      if (
        sub === "list" ||
        sub === "groups"
      ) {

        return showGroups(
          api,
          event
        );
      }


      // القائمة الرئيسية

      if (!sub) {

        return showMainMenu(
          api,
          event
        );
      }


      // الاستخدام

      return message.reply(

        "⟦ SAIYAN / COMMAND CENTER ⟧\n\n"

        "الأقسام المتاحة:\n\n"

        "📂 /chats\n" +
        "   فتح المركز\n\n" +

        "👥 /chats list\n" +
        "   الغروبات\n\n" +

        "✉️ /chats requests\n" +
        "   طلبات المراسلة\n\n" +

        "🕸️ /chats other\n" +
        "   Other\n\n" +

        "🟢 /chats accept [Thread ID]\n" +
        "   قبول محادثة\n\n" +

        "📊 /chats count\n" +
        "   الإحصائيات\n\n" +

        "🔐 /chats dm on/off\n" +
        "   التحكم بالخاص"
      );
    },


  onReply:
    async function () {},
};
