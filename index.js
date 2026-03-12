// index.js
import { webcrypto } from "crypto";
if (!globalThis.crypto) globalThis.crypto = webcrypto;

process.on("uncaughtException",  (e) => console.error("⚠️ Uncaught:", e.message));
process.on("unhandledRejection", (e) => console.error("⚠️ Rejected:", e?.message || e));

import baileys from "@whiskeysockets/baileys";
import pino from "pino";
import dotenv from "dotenv";
import http from "http";
import qrcode from "qrcode";
dotenv.config();

const makeWASocket          = baileys.default;
const useMultiFileAuthState = baileys.useMultiFileAuthState;
const DisconnectReason      = baileys.DisconnectReason;

const TARGET_GROUP_ID = process.env.GROUP_ID || "120363425771650708@g.us";
const MAX_WARNINGS    = 3;

// ── Web server (keeps Railway alive + shows QR) ──
let currentQR = null, botStatus = "starting";
http.createServer(async (req, res) => {
  res.setHeader("Content-Type", "text/html");
  const s = "font-family:sans-serif;text-align:center;padding:40px;background:#111;color:#fff";
  if (botStatus === "connected") {
    res.end(`<html><body style="${s}"><h1>✅ Bot Connected!</h1><p>${TARGET_GROUP_ID}</p></body></html>`);
  } else if (currentQR) {
    const img = await qrcode.toDataURL(currentQR);
    res.end(`<html><head><meta http-equiv="refresh" content="30"/></head><body style="${s}">
      <h1>📱 Scan QR in WhatsApp</h1>
      <p>WhatsApp → ⋮ → Linked Devices → Link a Device</p>
      <img src="${img}" style="width:280px;height:280px;background:#fff;padding:10px;border-radius:8px"/>
    </body></html>`);
  } else {
    res.end(`<html><head><meta http-equiv="refresh" content="4"/></head><body style="${s}">
      <h1>⏳ ${botStatus}</h1></body></html>`);
  }
}).listen(process.env.PORT || 3000, "0.0.0.0", () =>
  console.log(`🌐 Web server on port ${process.env.PORT || 3000}`)
);

// ── Banned lists ──
const swearWords = [
  "fuck","f*ck","fuk","fvck","fucc","fuxk","fück","f u c k","feck","frick",
  "shit","sh1t","sht","$hit","sh!t","shyt","shiit","shite","s h i t","shitt",
  "bitch","b1tch","b!tch","bytch","biatch","btch","b*tch","biotch","bich","bítch",
  "ass","a55","a**","@ss","arse","arsehole","asshole","asshat","dumbass","jackass",
  "cunt","c*nt","cvnt","kunt","c u n t","cnt","cünt","bastard","bullshit","bollocks",
  "dick","d1ck","d!ck","dik","dyck","cock","c0ck","cok","cocc","cocksucker",
  "motherfucker","mofo","mf","nigger","nigga","n1gger","n-word","nigg","niggah","n1gga",
  "wanker","twat","slut","whore","prick",
];
const nudeWords = [
  "nude","nudes","naked","nakd","n*de","n@ked","nudity","nudez","nudie","nudepic",
  "porn","p0rn","pr0n","p*rn","porno","pornhub","xvideos","xhamster","pornsite","pornn",
  "xxx","x x x","xxxx","xxxxx","18+","onlyfans","only fans","of link","onlyfan","onlyfanz",
  "sex tape","sextape","sex vid","sex video","sexvid","sexting","sext","sexts","s3x","s*x",
  "boobs","b00bs","b*obs","bewbs","titties","tits","t1ts","titt","titty","tittes",
  "vagina","vag","v@gina","vajayjay","cooch","coochie","coochi","pussy","p*ssy","pussi",
  "penis","p*nis","shaft","boner","erection","cock pic","dick pic","nude pic","naked photo","adult content",
  "dildo","vibrator","anal","a**l","an@l","blowjob","bj","handjob","cumshot","cum shot",
];
const tvdWords = [
  "tvd","t.v.d","t v d","tvdlink","tvd link","tvd site","tvdsite","tvd url","tvd video","tvd vid",
  "tvd stream","tvd watch","tvd live","tvd channel","tvd app","tvd download","tvd free","tvd hd","tvd online",
  "tvdmovies","tvd hub","tvdhub","tvd4","tvd365","tvdmania","tvd world","tvdworld","tvd net","tvd.net",
  "tvd.com","tvd.tv","tvd.link","tvd.site","tvdmovie","tvdstream","tvdlive","tvdwatch","tvdapp","tvddl",
  "tvd dl","tvd series","tvd episode","tvd cast","tvd full","tvd free link","tvd watch link","tvd dl link",
  "tvd123","tvd456","tvd789","tvd2","tvd3","tvdx","tvdz","tvdq","tvdplus","tvd+",
  "tvdpro","tvdvip","tvdelite","tvdgold","tvdpremium","tvdbasic","tvdaccess","tvdpass",
  "tvdcode","tvdkey","tvdtoken","tvdlogin","tvdsignup",
];
const freyaSkyeWords = [
  "freya skye","freya_skye","freyaskye","freya.skye","freya-skye","freya skye link","freya skye video",
  "freya skye onlyfans","freya skye snap","freya skye tiktok","freya skye twitter","freya skye pics",
  "freyaskye1","freyaskye2","freyaskyeof","f skye","fskye","freyask","freya sk","freyasky",
  "skye freya","skyefreya","skye_freya","skye.freya","fr3ya","fr3ya skye","freya sky3",
  "freya skye acc","freya skye account","freya skye page","freya skye fan","freya skye fans",
];
const bannedEmojis = [
  "😀","😁","😂","😃","😄","😅","😆","😇","😈","😉","😊","😋","😌","😍","😎","😏","😐","😑","😒","😓",
  "😔","😕","😖","😗","😘","😙","😚","😛","😜","😝","😞","😟","😠","😡","😢","😣","😤","😥","😦","😧",
  "😨","😩","😪","😫","😬","😭","😮","😯","😰","😱","😲","😳","😴","😵","😶","😷","🥰","🥳","🥴","🥵",
  "🥶","🥺","🤩","🤪","🤫","🤭","🤯","🤬","🤮","🤧","🤠","🤡","🤢","🥸","😸","😿","🙈","🙉","🙊","😻",
];
const labubuWords = [
  "labubus","labubu","labubs","labu","l@bubus","labubus123","labubu toy","labubu figure","labubu doll",
  "labubu plush","labubu pop mart","labubu popmart","labubu blind box","labubu series","labubu limited",
  "labubu drop","labubu release","labubu buy","labubu sell","labubu trade","labubu price","labubu shop",
  "labubu store","labubu order","labubu restock","labubu available","labubu collection","labubu collector",
  "labubu fan","labubu fans","labubu fanpage","labubu video","labubu unbox","labubu haul",
];
const clickbaitWords = [
  "click here","read more","clickbait","click now","tap here","tap now","click link","link below",
  "link in bio","link in comments","swipe up","must watch","must see","you wont believe",
  "you won't believe","unbelievable","shocking","mind blowing","omg look","this is insane","gone viral",
  "viral now","trending now","secret revealed","hidden truth","exposed","banned video","deleted video",
  "limited time","limited offer","act now","last chance","only today","expires soon","free gift",
  "win now","you won","claim now","get free","free access","free money","free robux","subscribe now",
  "breaking news","urgent","important notice","official notice",
];
const snapchatWords = [
  "snapchat","snap chat","snpchat","snapchat link","snap link","snapchat url","snapchat id","snap id",
  "snapchat user","snapchat name","snap name","snapchat acc","snap acc","snapchat account",
  "snapchat add","snap add","add on snap","add me on snap","add my snap","my snap is","my snapchat is",
  "heres my snap","here's my snap","dm on snap","snap me","snapchat me","snapchat story","snap story",
  "snapchat photo","snap photo","snapchat video","snap video","snapchat filter","snap filter",
  "snapchat map","snap map","snapchat premium","snap premium","snapcode","snap code","sc name",
];
const filterWords = [
  "filter","filters","photo filter","pic filter","image filter","camera filter","face filter",
  "beauty filter","vsco","vsco filter","vsco edit","vsco preset","vscocam","vsco app",
  "lightroom preset","lr preset","lightroom filter","lr filter","preset","presets","photo preset",
  "facetune","face tune","faceapp","face app","meitu","snow app","b612","ulike","airbrush app",
  "airbrush","smooth filter","glow filter","blur filter","vintage filter","retro filter","film filter",
  "instagram filter","ig filter","tiktok filter","reels filter","aesthetic filter","moody filter",
  "edited photo","heavily edited","filtered photo","photo edit","heavy filter",
];

const userWarnings = {};
const RULES = `📋 *Group Rules:*
1️⃣  No swearing
2️⃣  No nude content
3️⃣  No TVD links
4️⃣  No Freya Skye
5️⃣  No face emojis
6️⃣  No fancy keyboards
7️⃣  No Labubus
8️⃣  No clickbaiting
9️⃣  No Snapchat
🔟  No filters`;

function checkText(msgText) {
  const text = msgText.toLowerCase();
  const violations = [];
  const checks = [
    { list: swearWords,     label: "swearing" },
    { list: nudeWords,      label: "nude content" },
    { list: tvdWords,       label: "TVD link" },
    { list: freyaSkyeWords, label: "Freya Skye" },
    { list: labubuWords,    label: "Labubus" },
    { list: clickbaitWords, label: "clickbait" },
    { list: snapchatWords,  label: "Snapchat" },
    { list: filterWords,    label: "filters" },
  ];
  for (const { list, label } of checks) {
    for (const word of list) {
      if (text.includes(word.toLowerCase())) { violations.push(`${label}: "${word}"`); break; }
    }
  }
  for (const emoji of bannedEmojis) {
    if (msgText.includes(emoji)) { violations.push(`face emoji: ${emoji}`); break; }
  }
  if (/[𝒜-𝓏𝔄-𝔷𝕬-𝖟]/u.test(msgText))        violations.push("fancy keyboard text");
  if (/\u0336/.test(msgText))                   violations.push("strikethrough text");
  if (/[\uD83C][\uDD70-\uDD8A]/u.test(msgText)) violations.push("circled letter text");
  return violations;
}

function applyWarning(sender, violations) {
  if (!userWarnings[sender]) userWarnings[sender] = 0;
  userWarnings[sender]++;
  const used = userWarnings[sender];
  const left = MAX_WARNINGS - used;
  return left > 0 ? { action: "warn", used, left } : { action: "ban", used };
}

async function startBot() {
  try {
    const { state, saveCreds } = await useMultiFileAuthState("auth_info");
    console.log("✅ Auth loaded. Has creds:", !!state.creds?.me);

    let waVersion = [2, 3000, 1015901307];
    try {
      const r = await baileys.fetchLatestBaileysVersion();
      waVersion = r.version;
      console.log("📦 WA version:", waVersion.join("."));
    } catch(e) { console.log("⚠️  Using fallback WA version"); }

    const sock = makeWASocket({
      version: waVersion,
      auth: state,
      printQRInTerminal: true,
      logger: pino({ level: "silent" }),
      browser: baileys.Browsers.ubuntu("Chrome"),
      connectTimeoutMs: 60000,
      keepAliveIntervalMs: 10000,
    });

    sock.ev.on("creds.update", saveCreds);

    sock.ev.on("connection.update", ({ connection, lastDisconnect, qr }) => {
      if (qr) { currentQR = qr; botStatus = "SCAN QR ↑"; console.log("📱 Open Railway URL to scan QR!"); }
      if (connection === "open") {
        currentQR = null; botStatus = "connected";
        console.log("✅ Connected! Monitoring:", TARGET_GROUP_ID);
      }
      if (connection === "close") {
        const code = lastDisconnect?.error?.output?.statusCode;
        console.log(`❌ Closed — code ${code}`);
        botStatus = "reconnecting...";
        if (code === DisconnectReason.loggedOut) {
          botStatus = "logged out";
          console.log("🚪 Logged out — delete auth_info and redeploy");
        } else {
          setTimeout(startBot, 5000);
        }
      }
    });

    sock.ev.on("messages.upsert", async ({ messages, type }) => {
      if (type !== "notify") return;
      for (const msg of messages) {
        try {
          if (!msg.message || msg.key.fromMe) continue;
          if (msg.key.remoteJid !== TARGET_GROUP_ID) continue;

          const sender    = msg.key.participant || msg.key.remoteJid;
          const senderNum = sender.split("@")[0];
          const name      = msg.pushName || senderNum;
          const m         = msg.message;
          const text      = m.conversation || m.extendedTextMessage?.text || "";
          const isMedia   = !!(m.imageMessage || m.videoMessage || m.stickerMessage);

          const violations = [];
          if (text)    violations.push(...checkText(text));
          if (isMedia) violations.push("media sent");
          if (!violations.length) continue;

          const result = applyWarning(sender, violations);
          const reason = violations.join(", ");
          console.log(`${result.action === "ban" ? "⛔ BAN" : "⚠️  WARN #" + result.used} — ${name} — ${reason}`);

          if (result.action === "warn") {
            await sock.sendMessage(TARGET_GROUP_ID, {
              text:
                `⚠️ Warning #${result.used}/${MAX_WARNINGS} — @${senderNum}\n` +
                `📌 Reason: ${reason}\n` +
                `❗ You will be removed after ${MAX_WARNINGS} warnings.\n\n` + RULES,
            });
          }

          if (result.action === "ban") {
            await sock.sendMessage(TARGET_GROUP_ID, {
              text:
                `⛔ @${senderNum} has been removed from the group.\n` +
                `📌 Reason: ${reason}\n` +
                `🔢 Used all ${MAX_WARNINGS}/${MAX_WARNINGS} warnings.`,
            });
            try {
              await sock.groupParticipantsUpdate(TARGET_GROUP_ID, [sender], "remove");
              console.log(`✅ Removed ${name}`);
            } catch(e) { console.log("⚠️  Remove failed:", e.message); }
          }

        } catch(e) { console.log("⚠️  Handler error:", e.message); }
      }
    });

  } catch(e) {
    console.error("💥 Crash:", e.message);
    botStatus = "crashed";
    setTimeout(startBot, 5000);
  }
}

startBot();
