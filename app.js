const DAYS = [
  { code:"MO", label:"Lunes" }, { code:"TU", label:"Martes" },
  { code:"WE", label:"Miércoles" }, { code:"TH", label:"Jueves" }, { code:"FR", label:"Viernes" },
];

const WORKER_URL = "https://TU_SUBDOMINIO.workers.dev";
const VAPID_PUBLIC_KEY = "PEGA_AQUI_TU_VAPID_PUBLIC_KEY_BASE64URL";

const tbody = document.getElementById("tbody");
const log = (msg)=>document.getElementById("log").textContent = msg;

DAYS.forEach(d=>{
  const tr = document.createElement("tr");
  tr.innerHTML = `
    <td><strong>${d.label}</strong></td>
    <td><input type="time" id="${d.code}_t1"></td>
    <td><input type="text" id="${d.code}_m1" placeholder="Mensaje 1"></td>
    <td><input type="time" id="${d.code}_t2"></td>
    <td><input type="text" id="${d.code}_m2" placeholder="Mensaje 2"></td>`;
  tbody.appendChild(tr);
});

// Pre-carga tu ejemplo
document.getElementById("MO_t1").value = "16:00";
document.getElementById("MO_m1").value = "Martina y Roberto";
document.getElementById("TU_t1").value = "15:45";
document.getElementById("TU_m1").value = "Martina";
document.getElementById("TU_t2").value = "16:00";
document.getElementById("TU_m2").value = "Roberto";

if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js");

document.getElementById("enable").addEventListener("click", enablePush);
document.getElementById("save").addEventListener("click", saveSchedule);

async function enablePush(){
  try{
    if (!("Notification" in window)) throw new Error("Este navegador no soporta notificaciones.");
    const perm = await Notification.requestPermission();
    if (perm !== "granted") throw new Error("Permiso de notificaciones no concedido.");

    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    });

    // Enviar la suscripción al Worker (guarda/actualiza)
    const r = await fetch(`${WORKER_URL}/register`, {
      method: "POST",
      headers: {"content-type":"application/json"},
      body: JSON.stringify({ subscription: sub, tz: Intl.DateTimeFormat().resolvedOptions().timeZone })
    });
    if(!r.ok) throw new Error("No se pudo registrar la suscripción");
    log("Notificaciones activadas ✔️");
  }catch(e){ log("Error: " + e.message); }
}

async function saveSchedule(){
  try{
    const schedule = {};
    for (const d of DAYS){
      schedule[d.code] = [];
      const t1 = val(`${d.code}_t1`), m1 = val(`${d.code}_m1`);
      const t2 = val(`${d.code}_t2`), m2 = val(`${d.code}_m2`);
      if (t1 && m1) schedule[d.code].push({time:t1, msg:m1});
      if (t2 && m2) schedule[d.code].push({time:t2, msg:m2});
    }
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (!sub) throw new Error("Primero pulsa “Activar notificaciones”.");

    const r = await fetch(`${WORKER_URL}/schedule`, {
      method: "POST",
      headers: {"content-type":"application/json"},
      body: JSON.stringify({ subscription: sub, schedule })
    });
    if(!r.ok) throw new Error("No se pudo guardar el horario");
    log("Horario guardado ✔️ (Lu–Vi, 2 por día)");
  }catch(e){ log("Error: " + e.message); }
}

function val(id){ return (document.getElementById(id).value||"").trim(); }
function urlBase64ToUint8Array(base64String){
  const padding = "=".repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/\-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i=0;i<raw.length;i++) output[i] = raw.charCodeAt(i);
  return output;
}
