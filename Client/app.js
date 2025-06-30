/***** HARD-CODED CONFIG *****/
const REGION  = "us-east-1";
const BUCKET  = "voicenav-bucket";
const PREFIX  = "audio-store/";
const WS_URL  = "wss://ry6pg133uf.execute-api.us-east-1.amazonaws.com/production";

/***** WebSocket *****/
let ws;
function ensureWS () {
  if (ws && ws.readyState === WebSocket.OPEN) return;

  ws = new WebSocket(WS_URL);

  ws.onopen    = () => log("WS connected");
  ws.onerror   = console.error;
  ws.onclose   = () => {               // auto-reconnect on 1006 (gone)
    log("WS closed – reconnecting in 1 s");
    setTimeout(ensureWS, 1000);
  };
  ws.onmessage = e => {
    log("← " + e.data);
    try { runIntent(JSON.parse(e.data)); }
    catch (err) { console.error("Bad JSON:", err); }
  };
}

/***** ACT ON INTENTS FROM VOICENAV *****/
function runIntent (i) {
  switch (i.action) {
    /*--------------------------------------------
      ① STANDARD “CLICK”                        */
    case "click": {
      const el = document.querySelector(i.selector);
      /* If Bedrock gave us a page-hash like “#bookAppointment”
         and there’s no element to click, treat it as navigation. */
      if (!el && i.selector.startsWith("#")) {
        location.hash = i.selector;
      } else {
        el?.click();
      }
      break;
    }

    /*--------------------------------------------
      ② NEW “navigate” (Bedrock may return url) */
    case "navigate": {
      location.href = i.url || i.selector;   // fallback for old format
      break;
    }

    /*--------------------------------------------
      ③ FILLING A FIELD                         */
    case "type": {
      const el = document.querySelector(i.selector);
      if (el) el.value = i.value ?? "";
      break;
    }

    default:
      console.warn("Unknown intent:", i);
  }
}

/***** Mic Recording → S3 (public PUT) *****/
async function uploadBlob (blob, name) {
  const key = PREFIX + crypto.randomUUID() + "-" + name;
  const url = `https://${BUCKET}.s3.${REGION}.amazonaws.com/${key}`;
  log("→ uploading " + key);
  await fetch(url, { method:"PUT", body:blob, headers:{ "Content-Type": blob.type } });
  log("✅ upload done – wait ~60 s");
}

let mediaRec, chunks = [];
const micBtn = document.getElementById("micBtn");
micBtn.onclick = async () => {
  ensureWS();

  if (!mediaRec || mediaRec.state === "inactive") {
    const stream = await navigator.mediaDevices.getUserMedia({ audio:true });
    mediaRec = new MediaRecorder(stream,{ mimeType:"audio/webm" });
    chunks = [];
    mediaRec.ondataavailable = e => chunks.push(e.data);
    mediaRec.onstop = () => uploadBlob(new Blob(chunks,{type:"audio/webm"}),"rec.webm");
    mediaRec.start();
    micBtn.textContent = "⏸️ Stop";
    document.getElementById("status").textContent = " recording…";
  } else {
    mediaRec.stop();
    micBtn.textContent = "🎤 Start Recording";
    document.getElementById("status").textContent = "";
  }
};

/***** SPA Routing *****/
function render (hash) {
  document.querySelectorAll("nav a").forEach(a => a.classList.remove("active"));
  (document.querySelector(`nav a[href='${hash}']`) || document.querySelector("#nav-home"))
    .classList.add("active");

  const c = document.getElementById("content");
  switch (hash) {
    case "#bookAppointment":               // ← updated IDs
    case "#book":
      c.innerHTML = `<h2>Book Appointment</h2>
        <form onsubmit="alert('Demo: appointment booked');return false;">
          <input type=date required />
          <input type=time required />
          <input type=text placeholder='Name' required />
          <button>Submit</button>
        </form>`;
      break;

    case "#contactSupport":
    case "#contact":
      c.innerHTML = `<h2>Contact Support</h2>
        <form onsubmit="alert('Demo: message sent');return false;">
          <textarea rows=4 placeholder='How can we help?'></textarea>
          <button>Send</button>
        </form>`;
      break;

    default:
      c.innerHTML = `<h2>Welcome to BrightSmile</h2>
        <p>Say “book appointment” or “click contact support”.</p>`;
  }
}

const log = m => {
  const el = document.getElementById("log");
  el.textContent += m + "\n";
  el.scrollTop    = el.scrollHeight;
};

window.addEventListener("hashchange", () => render(location.hash));
render(location.hash || "#home");