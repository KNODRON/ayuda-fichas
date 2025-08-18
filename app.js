/* ====== Estado y utilidades ====== */
const listEl = document.getElementById("list");
const addBtn = document.getElementById("addBtn");
const clearBtn = document.getElementById("clearBtn");
const icsBtn = document.getElementById("icsBtn");
const schedBtn = document.getElementById("schedBtn");
const schedInfo = document.getElementById("schedInfo");
const permInfo = document.getElementById("permInfo");

const timeInput = document.getElementById("timeInput");
const msgInput = document.getElementById("msgInput");
const dowBoxes = [...document.querySelectorAll(".dow")];

const STORAGE_KEY = "weekday_reminders_v1";
let reminders = load() || defaultSeed();

/* ====== PWA install prompt ====== */
let deferredPrompt = null;
const installBtn = document.getElementById("installBtn");
window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  deferredPrompt = e;
  installBtn.hidden = false;
});
installBtn?.addEventListener("click", async () => {
  if (!deferredPrompt) return;
  deferredPrompt.prompt();
  await deferredPrompt.userChoice;
  installBtn.hidden = true;
});

/* ====== Service worker ====== */
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("service-worker.js");
}

/* ====== Notificaciones: pedir permiso ====== */
(async () => {
  if (!("Notification" in window)) {
    permInfo.textContent = "Este navegador no soporta notificaciones.";
    return;
  }
  let perm = Notification.permission;
  if (perm === "default") {
    try { perm = await Notification.requestPermission(); } catch {}
  }
  if (perm === "granted") {
    permInfo.innerHTML = "Permisos de notificación: <span class='ok'>concedidos</span>.";
  } else if (perm === "denied") {
    permInfo.innerHTML = "Permisos de notificación: <span class='warn'>denegados</span>. El .ics seguirá funcionando.";
  } else {
    permInfo.textContent = "Permisos de notificación: pendientes.";
  }
})();

/* ====== Datos iniciales del ejemplo ====== */
function defaultSeed() {
  return [
    { days:["MO"], time:"16:00", msg:"Martina y Roberto" },
    { days:["TU"], time:"15:45", msg:"Martina" },
    { days:["TU"], time:"16:00", msg:"Roberto" },
  ];
}

/* ====== Persistencia ====== */
function save(){ localStorage.setItem(STORAGE_KEY, JSON.stringify(reminders)); }
function load(){
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "null"); }
  catch { return null; }
}

/* ====== Render ====== */
function render(){
  listEl.innerHTML = "";
  if (!reminders.length){
    const p = document.createElement("p");
    p.className = "tiny"; p.textContent = "Sin recordatorios aún.";
    listEl.appendChild(p);
    return;
  }
  reminders.forEach((r, idx) => {
    const div = document.createElement("div");
    div.className = "entry";
    const left = document.createElement("div");
    const right = document.createElement("div");

    left.innerHTML = `<div><strong>${r.time}</strong> — ${escapeHtml(r.msg)}</div>
                      <div class="tiny">${r.days.map(d=>dowLabel(d)).join(", ")}</div>`;

    const del = document.createElement("button");
    del.className = "btn-secondary";
    del.textContent = "Eliminar";
    del.onclick = () => { reminders.splice(idx,1); save(); render(); };

    right.appendChild(del);
    div.appendChild(left);
    div.appendChild(right);
    listEl.appendChild(div);
  });
}
render();

/* ====== Añadir / Limpiar ====== */
addBtn.addEventListener("click", () => {
  const time = timeInput.value.trim();
  const msg = msgInput.value.trim();
  const days = dowBoxes.filter(b=>b.checked).map(b=>b.value);
  if (!time || !msg || days.length===0) { alert("Completa días, hora y mensaje."); return; }
  reminders.push({ days, time, msg });
  save(); render();
});

clearBtn.addEventListener("click", () => {
  if (!confirm("¿Eliminar todos los recordatorios?")) return;
  reminders = [];
  save(); render();
});

/* ====== ICS (calendario) ====== */
icsBtn.addEventListener("click", () => {
  if (!reminders.length){ alert("Agrega al menos un recordatorio."); return; }

  const tz = guessTZ();
  const now = new Date();
  const dtstamp = toICSDateUTC(now);

  // Creamos un VEVENT por recordatorio, con RRULE semanal y BYDAY según lo elegido
  let ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//RecordatoriosLuVi//ES",
    "CALSCALE:GREGORIAN",
  ];

  reminders.forEach((r,i) => {
    const days = r.days.join(",");
    // Construimos DTSTART próximo acorde a la hora indicada y el primer día aplicable
    const nextLocal = nextOccurrenceForDaysAndTime(r.days, r.time);
    const uid = cryptoRandom() + "@local";
    ics.push(
      "BEGIN:VEVENT",
      `UID:${uid}`,
      `DTSTAMP:${dtstamp}`,
      `SUMMARY:${escapeICS(r.msg)}`,
      `RRULE:FREQ=WEEKLY;BYDAY=${days}`,
      `DTSTART;TZID=${tz}:${toICSDateLocal(nextLocal)}`,
      "DURATION:PT1M",
      "END:VEVENT"
    );
  });

  ics.push("END:VCALENDAR");

  const blob = new Blob([ics.join("\r\n")], {type:"text/calendar;charset=utf-8"});
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = "recordatorios_lu_vi.ics";
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(()=>URL.revokeObjectURL(url), 5000);
});

/* ====== Notificaciones locales programadas (Android/Chromium recientes) ====== */
schedBtn.addEventListener("click", async () => {
  const supported = await supportsScheduledNotifications();
  if (!supported) {
    schedInfo.innerHTML = "Programación local no soportada aquí. Usa el .ics para recibir notificaciones del sistema (recomendado).";
    return;
  }
  if (Notification.permission !== "granted"){
    try { await Notification.requestPermission(); } catch {}
    if (Notification.permission !== "granted"){
      schedInfo.textContent = "No hay permiso de notificaciones.";
      return;
    }
  }
  const reg = await navigator.serviceWorker.getRegistration();
  if (!reg) { schedInfo.textContent = "Service Worker no disponible."; return; }

  // Programamos próximas 4 semanas (28 días) para cada recordatorio
  const scheduled = [];
  const end = addDays(new Date(), 28);
  for (const r of reminders){
    const occurrences = enumerateOccurrences(r.days, r.time, new Date(), end);
    for (const when of occurrences){
      try{
        await reg.showNotification(r.msg, {
          body: `${dowLabel(shortDay(when))} ${formatHHMM(when)}`,
          showTrigger: new window.TimestampTrigger(when.getTime()),
          tag: `rem-${r.msg}-${r.time}`, // colapsa duplicados
        });
        scheduled.push(when);
      }catch(e){
        console.warn("No se pudo programar:", e);
      }
    }
  }
  schedInfo.innerHTML = `Programadas ${scheduled.length} notificaciones locales para los próximos 28 días.`;
});

/* ====== Helpers ====== */
function dowLabel(code){
  return {MO:"Lunes",TU:"Martes",WE:"Miércoles",TH:"Jueves",FR:"Viernes"}[code] || code;
}
function shortDay(d){
  return ["SU","MO","TU","WE","TH","FR","SA"][d.getDay()];
}
function formatHHMM(d){
  const hh = String(d.getHours()).padStart(2,"0");
  const mm = String(d.getMinutes()).padStart(2,"0");
  return `${hh}:${mm}`;
}
function escapeHtml(s){ return s.replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); }
function escapeICS(s){ return s.replace(/([,;])/g,"\\$1"); }

function guessTZ(){
  try { return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC"; }
  catch { return "UTC"; }
}
function toICSDateUTC(d){
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth()+1).padStart(2,"0");
  const dd = String(d.getUTCDate()).padStart(2,"0");
  const HH = String(d.getUTCHours()).padStart(2,"0");
  const MM = String(d.getUTCMinutes()).padStart(2,"0");
  const SS = String(d.getUTCSeconds()).padStart(2,"0");
  return `${yyyy}${mm}${dd}T${HH}${MM}${SS}Z`;
}
function toICSDateLocal(d){
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth()+1).padStart(2,"0");
  const dd = String(d.getDate()).padStart(2,"0");
  const HH = String(d.getHours()).padStart(2,"0");
  const MM = String(d.getMinutes()).padStart(2,"0");
  const SS = String(d.getSeconds()).padStart(2,"0");
  return `${yyyy}${mm}${dd}T${HH}${MM}${SS}`;
}
function addDays(d, n){ const x = new Date(d); x.setDate(x.getDate()+n); return x; }

function nextOccurrenceForDaysAndTime(days, hhmm){
  // Encuentra la próxima fecha/hora local que coincida con alguno de esos días y hora
  const [hh,mm] = hhmm.split(":").map(x=>parseInt(x,10));
  const now = new Date();
  for (let i=0;i<14;i++){
    const cand = new Date(now);
    cand.setDate(now.getDate()+i);
    cand.setHours(hh, mm, 0, 0);
    if (cand > now && days.includes(shortDay(cand))) return cand;
  }
  // fallback: mañana
  const f = new Date(); f.setDate(f.getDate()+1); f.setHours(hh,mm,0,0); return f;
}
function enumerateOccurrences(days, hhmm, start, end){
  const out = [];
  const [hh,mm] = hhmm.split(":").map(x=>parseInt(x,10));
  const cur = new Date(start);
  cur.setHours(0,0,0,0);
  while (cur <= end){
    const c = new Date(cur);
    c.setHours(hh,mm,0,0);
    if (days.includes(shortDay(c)) && c >= start && c <= end) out.push(new Date(c));
    cur.setDate(cur.getDate()+1);
  }
  return out;
}
function cryptoRandom(){
  if (window.crypto?.getRandomValues){
    const a = new Uint32Array(4); crypto.getRandomValues(a);
    return [...a].map(x=>x.toString(16)).join("");
  }
  return Math.random().toString(16).slice(2);
}

async function supportsScheduledNotifications(){
  // Requiere: ServiceWorkerRegistration.showNotification con showTrigger + window.TimestampTrigger
  if
