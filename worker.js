import { WebPush } from 'webpush'; // En Workers, usa un módulo compatible o implementa firmado VAPID manual.
// Si prefieres sin dependencia, busca "VAPID JWT in Cloudflare Workers".

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    if (req.method === "POST" && url.pathname === "/register") {
      const { subscription, tz } = await req.json();
      const id = idFromSub(subscription);
      await env.DB.put(`sub:${id}`, JSON.stringify({ subscription, tz }));
      return new Response("ok");
    }
    if (req.method === "POST" && url.pathname === "/schedule") {
      const { subscription, schedule } = await req.json();
      const id = idFromSub(subscription);
      await env.DB.put(`sched:${id}`, JSON.stringify(schedule));
      return new Response("ok");
    }
    return new Response("not found", { status: 404 });
  },

  // CRON cada minuto
  async scheduled(event, env, ctx) {
    // lee todas las suscripciones (para demo: scan simple; en prod indexa IDs)
    const list = await listKeys(env.DB, "sub:");
    const now = new Date();
    for (const key of list) {
      const { subscription, tz } = JSON.parse(await env.DB.get(key));
      const id = key.slice(4);
      const sched = JSON.parse(await env.DB.get(`sched:${id}`) || "null");
      if (!sched) continue;

      // Hora local del usuario (tz o America/Santiago por defecto)
      const zone = tz || "America/Santiago";
      const local = new Date(now.toLocaleString("en-US", { timeZone: zone }));
      const hh = String(local.getHours()).padStart(2,"0");
      const mm = String(local.getMinutes()).padStart(2,"0");
      const dayCode = ["SU","MO","TU","WE","TH","FR","SA"][local.getDay()];
      if (!["MO","TU","WE","TH","FR"].includes(dayCode)) continue;

      const entries = sched[dayCode] || [];
      for (const e of entries) {
        if (e.time === `${hh}:${mm}`) {
          await sendPush(env, subscription, {
            title: "Recordatorio",
            body: e.msg,
            tag: `rem-${dayCode}-${e.time}`
          });
        }
      }
    }
  }
};

function idFromSub(sub){
  // Un hash simple: en prod usa SHA-256
  return btoa(JSON.stringify(sub)).slice(0, 64);
}

async function listKeys(kv, prefix){
  const out = [];
  let cursor = undefined;
  do{
    const res = await kv.list({ prefix, cursor, limit: 100 });
    out.push(...res.keys.map(k=>k.name));
    cursor = res.list_complete ? undefined : res.cursor;
  }while(cursor);
  return out;
}

async function sendPush(env, subscription, payload) {
  const push = new WebPush({
    vapidDetails: {
      subject: env.VAPID_SUBJECT,
      publicKey: env.VAPID_PUBLIC_KEY,
      privateKey: env.VAPID_PRIVATE_KEY
    }
  });
  // Algunos SDKs no funcionan nativamente en Workers; si es tu caso,
  // firma el JWT VAPID manualmente y haz fetch al endpoint de push.
  await push.sendNotification(subscription, JSON.stringify(payload));
}
