/**
 * Saiyan response identity layer.
 * Gives outgoing command messages a consistent, original presentation.
 */
"use strict";

const BRAND = "SAIYAN";
const DEVELOPER = "magnus";
const WRAP = new WeakMap();

function rewriteText(value) {
  return String(value)
    .replace(/\bCROW\b/gi, BRAND)
    .replace(/\bDAVID(?:\s*V\d+)?\b/gi, BRAND)
    .replace(/\bDJAMEL(?:BOT)?\b/gi, BRAND)
    .replace(/\bItachi\b/gi, DEVELOPER)
    .replace(/\bWHITE-V3\b/gi, BRAND);
}

function present(message) {
  if (typeof message === "string") {
    const body = rewriteText(message).trim();
    if (!body) return body;
    if (/^⟦ SAIYAN · CORE ⟧/.test(body)) return body;
    return `⟦ SAIYAN · CORE ⟧\n${body}\n\n— ${DEVELOPER}`;
  }
  if (message && typeof message === "object" && typeof message.body === "string") {
    return { ...message, body: present(message.body) };
  }
  return message;
}

function brandApi(api) {
  if (!api || (typeof api !== "object" && typeof api !== "function")) return api;
  if (WRAP.has(api)) return WRAP.get(api);
  const proxy = new Proxy(api, {
    get(target, property) {
      const value = Reflect.get(target, property, target);
      if (property === "sendMessage" && typeof value === "function") {
        return (message, ...args) => Reflect.apply(value, target, [present(message), ...args]);
      }
      return typeof value === "function" ? value.bind(target) : value;
    }
  });
  WRAP.set(api, proxy);
  return proxy;
}

module.exports = { brandApi, present, BRAND, DEVELOPER };
