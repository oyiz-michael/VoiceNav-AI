/***** CONFIGURATION *****/
// Load configuration - in production, load from config.js
const CONFIG = {
    REGION: "us-east-1",
    BUCKET: "voicenav-bucket",
    PREFIX: "audio-store/",
    WS_URL: "wss://ry6pg133uf.execute-api.us-east-1.amazonaws.com/production",
    RECORDING_FORMAT: "audio/webm",
    MAX_RECORDING_TIME: 30000,
    SHOW_DEBUG_LOG: true,
    AUTO_RECONNECT: true,
    RECONNECT_DELAY: 1000
};

/***** WebSocket Management *****/
let ws;

function ensureWS() {
    if (ws && ws.readyState === WebSocket.OPEN) return;

    ws = new WebSocket(CONFIG.WS_URL);

    ws.onopen = () => log("WebSocket connected");
    ws.onerror = error => {
        console.error("WebSocket error:", error);
        log("WebSocket error occurred");
    };
    ws.onclose = event => {
        log(
            `WebSocket closed (${event.code}) - reconnecting in ${CONFIG.RECONNECT_DELAY}ms`
        );
        if (CONFIG.AUTO_RECONNECT) {
            setTimeout(ensureWS, CONFIG.RECONNECT_DELAY);
        }
    };
    ws.onmessage = event => {
        log("← " + event.data);
        try {
            const intent = JSON.parse(event.data);
            runIntent(intent);
        } catch (err) {
            console.error("Failed to parse WebSocket message:", err);
            log("Invalid JSON received from server");
        }
    };
}

/***** ACT ON INTENTS FROM VOICENAV *****/
function runIntent(i) {
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
            location.href = i.url || i.selector; // fallback for old format
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
async function uploadBlob(blob, name) {
    const key = PREFIX + crypto.randomUUID() + "-" + name;
    const url = `https://${BUCKET}.s3.${REGION}.amazonaws.com/${key}`;
    log("→ uploading " + key);
    await fetch(url, {
        method: "PUT",
        body: blob,
        headers: { "Content-Type": blob.type }
    });
    log("✅ upload done – wait ~60 s");
}

let mediaRec,
    chunks = [];
const micBtn = document.getElementById("micBtn");
micBtn.onclick = async () => {
    ensureWS();

    if (!mediaRec || mediaRec.state === "inactive") {
        const stream = await navigator.mediaDevices.getUserMedia({
            audio: true
        });
        mediaRec = new MediaRecorder(stream, { mimeType: "audio/webm" });
        chunks = [];
        mediaRec.ondataavailable = e => chunks.push(e.data);
        mediaRec.onstop = () =>
            uploadBlob(new Blob(chunks, { type: "audio/webm" }), "rec.webm");
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
function render(hash) {
    document
        .querySelectorAll("nav a")
        .forEach(a => a.classList.remove("active"));
    (
        document.querySelector(`nav a[href='${hash}']`) ||
        document.querySelector("#nav-home")
    ).classList.add("active");

    const c = document.getElementById("content");
    switch (hash) {
        case "#bookAppointment": // ← updated IDs
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
    el.scrollTop = el.scrollHeight;
};

window.addEventListener("hashchange", () => render(location.hash));
render(location.hash || "#home");
