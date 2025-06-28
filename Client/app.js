// ===== CONFIG =====
const REGION  = "us-east-1";
const BUCKET  = "voicenav-bucket";
const PREFIX  = "audio-store/";
const WS_URL  = "wss://YOUR_WS.execute-api.us-east-1.amazonaws.com/prod"; // replace

AWS.config.update({
  region: REGION,
  credentials: new AWS.CognitoIdentityCredentials({
    IdentityPoolId: "us-east-1:xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" // replace
  })
});
const s3  = new AWS.S3({ apiVersion:"2006-03-01" });
const log = m => { const el = document.getElementById("log"); el.textContent += m+"\n"; el.scrollTop = el.scrollHeight; };

// ===== WebSocket =====
let ws;
function ensureWS() {
  if (ws && ws.readyState===1) return; // open
  ws = new WebSocket(WS_URL);
  ws.onmessage = e=>{ const intent=JSON.parse(e.data); log("← "+e.data); runIntent(intent); };
  ws.onopen = ()=>log("WS connected");
}

function runIntent(i){
  if(i.action==="click") document.querySelector(i.selector)?.click();
  else if(i.action==="navigate") location.href=i.selector;
  else if(i.action==="type"){const el=document.querySelector(i.selector); if(el) el.value=i.value;}
}

// ===== Upload mic recording =====
async function uploadBlob(blob,name){
  const key=PREFIX+crypto.randomUUID()+"-"+name;
  log("→ uploading "+key);
  await s3.upload({Bucket:BUCKET,Key:key,Body:blob,ContentType:blob.type}).promise();
  log("✅ upload done");
}

let mediaRec,chunks=[];
const micBtn=document.getElementById("micBtn");
micBtn.onclick=async()=>{
  ensureWS();
  if(!mediaRec||mediaRec.state==="inactive"){const strm=await navigator.mediaDevices.getUserMedia({audio:true});
    mediaRec=new MediaRecorder(strm,{mimeType:"audio/webm"}); chunks=[];
    mediaRec.ondataavailable=e=>chunks.push(e.data);
    mediaRec.onstop=()=>uploadBlob(new Blob(chunks,{type:"audio/webm"}),"rec.webm");
    mediaRec.start(); micBtn.textContent="⏸️ Stop"; document.getElementById("status").textContent=" recording…";
  }else{mediaRec.stop(); micBtn.textContent="🎤 Start Recording"; document.getElementById("status").textContent="";}
};

// ===== Page rendering =====
function render(hash){
  document.querySelectorAll("nav a").forEach(a=>a.classList.remove("active"));
  const link=document.querySelector(`nav a[href='${hash}']`); link?.classList.add("active");
  const c=document.getElementById("content");
  switch(hash){
    case "#book": c.innerHTML=`<h2>Book an Appointment</h2><p>(Demo placeholder)</p>`;break;
    case "#services": c.innerHTML=`<h2>Our Services</h2><ul><li>Cleaning</li><li>Whitening</li><li>Braces</li></ul>`;break;
    case "#contact": c.innerHTML=`<h2>Contact Us</h2><p>123 Smile St.<br>Bright City<br>📞 555‑DENTAL</p>`;break;
    default: c.innerHTML=`<h2>Welcome to BrightSmile</h2><p>Say “book appointment” or “click services”.</p>`;
  }
}
window.addEventListener("hashchange",()=>render(location.hash));
render(location.hash||"#home");