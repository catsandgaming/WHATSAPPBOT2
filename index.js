// index.js

// 🛡️ MUST BE FIRST — stops SessionError from killing the process
import { webcrypto } from "crypto";
if (!globalThis.crypto) globalThis.crypto = webcrypto;

process.on("uncaughtException",  (err) => console.error("⚠️ Uncaught:", err.message));
process.on("unhandledRejection", (r)   => console.error("⚠️ Unhandled:", r?.message || r));

import baileys from "@whiskeysockets/baileys";
import pino from "pino";
import dotenv from "dotenv";
import http from "http";
import qrcode from "qrcode";
dotenv.config();

const makeWASocket         = baileys.default;
const useMultiFileAuthState = baileys.useMultiFileAuthState;
const DisconnectReason      = baileys.DisconnectReason;

console.log("🤖 Starting EXTREME MOD BOT...");
console.log("📦 Node:", process.version);

const TARGET_GROUP_ID = process.env.GROUP_ID || "120363425771650708@g.us";
const MAX_WARNINGS    = 3;

// ─────────────────────────────────────────────
// 🌐 WEB SERVER
// ─────────────────────────────────────────────
let currentQR = null;
let botStatus = "starting";
let lastError = null;

http.createServer(async (req, res) => {
  res.setHeader("Content-Type", "text/html");
  const style = "font-family:sans-serif;text-align:center;padding:40px;background:#111;color:#fff";
  try {
    if (botStatus === "connected") {
      res.end(`<html><body style="${style}"><h1>✅ Bot Connected!</h1><p>Monitoring: <code>${TARGET_GROUP_ID}</code></p></body></html>`);
    } else if (currentQR) {
      const img = await qrcode.toDataURL(currentQR);
      res.end(`<html><head><meta http-equiv="refresh" content="30"/></head><body style="${style}">
        <h1>📱 Scan QR in WhatsApp</h1>
        <p>WhatsApp → ⋮ → Linked Devices → Link a Device</p>
        <img src="${img}" style="width:280px;height:280px;background:#fff;padding:10px;border-radius:8px"/>
        <p><small>Auto-refreshes every 30s</small></p>
      </body></html>`);
    } else {
      res.end(`<html><head><meta http-equiv="refresh" content="4"/></head><body style="${style}">
        <h1>⏳ ${botStatus}</h1>
        ${lastError ? `<p style="color:salmon">Error: ${lastError}</p>` : ""}
        <p>Auto-refreshing...</p>
      </body></html>`);
    }
  } catch(e) { res.end(`<h1>Error: ${e.message}</h1>`); }
}).listen(process.env.PORT || 3000, "0.0.0.0", () =>
  console.log(`🌐 Web server on port ${process.env.PORT || 3000}`)
);

// ─────────────────────────────────────────────
// 🚫 BANNED LISTS
// ─────────────────────────────────────────────
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
  "tvd stream","tvd watch","tvd live","tvd channel","tvd tv","tvd app","tvd download","tvd free","tvd hd","tvd online",
  "tvdmovies","tvd hub","tvdhub","tvd4","tvd365","tvdmania","tvd world","tvdworld","tvd net","tvd.net",
  "tvd.com","tvd.tv","tvd.link","tvd.site","tvdmovie","tvdstream","tvdlive","tvdwatch","tvdapp","tvddl",
  "tvd dl","tvd show","tvd series","tvd episode","tvd cast","tvd full","tvd hd link","tvd free link","tvd watch link","tvd dl link",
  "tvd123","tvd456","tvd789","tvd2","tvd3","tvdx","tvdz","tvdq","tvdplus","tvd+",
  "tvdpro","tvdvip","tvdelite","tvdgold","tvdsilver","tvdbronze","tvdpremium","tvdbasic","tvdaccess","tvdpass",
  "tvdcode","tvdkey","tvdtoken","tvdlogin","tvdsignup",
];
const freyaSkyeWords = [
  "freya skye","freya_skye","freyaskye","freya.skye","freya-skye","freya skye link","freya skye video","freya skye nude","freya skye leaked",
  "freya skye onlyfans","freya skye snap","freya skye tiktok","freya skye twitter","freya skye pics","freya skye photo","freya skye ig",
  "freyaskye1","freyaskye2","freyaskyeof","freyaskyesnap","f skye","fskye","freyask","freya sk",
  "freyasky","freyaskye_","_freyaskye","skye freya","skyefreya","skye_freya","skye.freya","skye-freya",
  "fr3ya","fr3ya skye","freya sky3","fr3ya sky3","frya skye","freya skye real","freya skye fake","freya skye hot",
  "freya skye acc","freya skye account","freya skye backup","freya skye new","freya skye official","freya skye page",
  "freya skye fan","freya skye fans","freya skye fanpage","freya skye follow","freya skye sub","freya skye contact",
  "freya skye back","freya skye here","freya skye check","freya skye look","freya skye see","freya skye dm",
];
const bannedEmojis = [
  "😀","😁","😂","😃","😄","😅","😆","😇","😈","😉","😊","😋","😌","😍","😎","😏","😐","😑","😒","😓",
  "😔","😕","😖","😗","😘","😙","😚","😛","😜","😝","😞","😟","😠","😡","😢","😣","😤","😥","😦","😧",
  "😨","😩","😪","😫","😬","😭","😮","😯","😰","😱","😲","😳","😴","😵","😶","😷","🥰","🥳","🥴","🥵",
  "🥶","🥺","🤩","🤪","🤫","🤭","🤯","🤬","🤮","🤧","🤠","🤡","🤢","🥸","😸","😿","🙈","🙉","🙊","😻",
];
const labubuWords = [
  "labubus","labubu","labubs","labu","l@bubus","labubus123","labubus1","labubus2","labubus3","labubusfan",
  "labubu toy","labubu figure","labubu doll","labubu plush","labubu pop mart","labubu popmart","labubu blind box","labubu series","labubu limited","labubu rare",
  "labubu drop","labubu release","labubu collab","labubu link","labubu buy","labubu sell","labubu trade","labubu swap","labubu cheap","labubu free",
  "labubu price","labubu cost","labubu worth","labubu value","labubu fake","labubu real","labubu legit","labubu auth","labubu authentic","labubu og",
  "labubu new","labubu latest","labubu 2024","labubu 2025","labubu sale","labubu shop","labubu store","labubu site","labubu url","labubu website",
  "labubu order","labubu shipping","labubu delivery","labubu stock","labubu restock","labubu available","labubu sold","labubu gone","labubu last","labubu final",
  "labubu pics","labubu photo","labubu pic","labubu image","labubu video","labubu vid","labubu unbox","labubu haul","labubu collection","labubu collector",
  "labubu fan","labubu fans","labubu fanpage",
];
const clickbaitWords = [
  "click here","read more","clickbait","click now","tap here","tap now","click link","link below","link in bio","link in comments",
  "swipe up","swipe now","watch now","watch this","must watch","must see","must read","you wont believe","you won't believe","unbelievable",
  "shocking","mind blowing","mind-blowing","omg look","omg watch","omg see","this is insane","this is crazy","gone wrong","gone viral",
  "viral now","trending now","everyone is talking","nobody talks about","secret revealed","hidden truth","exposed","they don't want you","banned video","deleted video",
  "limited time","limited offer","act now","don't miss","last chance","final chance","only today","expires soon","offer ends","sale ends",
  "free gift","win now","you won","you've won","claim now","claim your","get free","free access","free money","free robux",
  "100% free","totally free","no cost","at no cost","subscribe now","follow now","like now","share now","repost now","forward this",
  "pass this on","send to everyone","tell your friends","spread the word","breaking news","urgent","alert","warning message","important notice","official notice",
];
const snapchatWords = [
  "snapchat","snap chat","snpchat","snapcht","s n a p","sn@p","$nap","snapchat link","snap link","snapchat url",
  "snap url","snapchat id","snap id","snapchat user","snap user","snapchat name","snap name","snapchat acc","snap acc","snapchat account",
  "snap account","snapchat handle","snap handle","snapchat add","snap add","add on snap","add me on snap","add my snap","my snap is","my snapchat is",
  "heres my snap","here's my snap","dm on snap","dm me snap","snap me","snapchat me","message on snap","snapchat streaks","snap streaks","snap score",
  "snapchat score","snap streak","snapchat story","snap story","snap stories","snapchat stories","snapchat post","snap post","snapchat pic","snap pic",
  "snapchat photo","snap photo","snapchat video","snap video","snap vid","snapchat vid","snapchat filter","snap filter","snapchat lens","snap lens",
  "snapchat map","snap map","snapchat spotlight","snap spotlight","snapchat discover","snap discover","snapchat premium","snap premium","snapchat plus","snap plus",
  "snapchat+","snap+","snapcode","snap code","sc name","sc user",
];
const filterWords = [
  "filter","filters","photo filter","pic filter","image filter","camera filter","face filter","beauty filter","skin filter","light filter",
  "vsco","vsco filter","vsco edit","vsco preset","vsco cam","vscocam","vsco app","vsco link","vsco feed","vsco grid",
  "lightroom preset","lr preset","lightroom filter","lr filter","lightroom edit","lr edit","preset","presets","editing preset","photo preset",
  "facetune","face tune","faceapp","face app","meitu","snow app","b612","ulike","airbrush app","perfect365",
  "airbrush","airbrush filter","smooth filter","glow filter","blur filter","bokeh filter","hdr filter","vintage filter","retro filter","film filter",
  "instagram filter","ig filter","tiktok filter","snap filter","facebook filter","fb filter","reels filter","story filter","feed filter","reel filter",
  "aesthetic filter","tumblr filter","dark filter","warm filter","cool filter","cold filter","sunny filter","moody filter","faded filter","edited photo",
  "heavily edited","fake photo","filtered photo","photo edit","heavy filter",
];
const inappropriateImageKeywords = [
  ...nudeWords,
  "nsfw","not safe for work","explicit","adult","lewd","hentai","ecchi","gore","graphic","disturbing","dead body","violence","self harm",
];

const userWarnings = {};
let isReady = false;  // prevents acting before sessions are established
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
🔟  No filters
🖼️  No inappropriate images/GIFs`;

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

function checkMedia(msg) {
  const violations = [];
  const m = msg.message;
  const caption = (m.imageMessage?.caption || m.videoMessage?.caption || "").toLowerCase();
  if (caption) {
    for (const word of inappropriateImageKeywords) {
      if (caption.includes(word.toLowerCase())) { violations.push(`bad caption: "${word}"`); break; }
    }
  }
  if (m.imageMessage)                              violations.push("image (auto-deleted)");
  if (m.videoMessage?.gifPlayback)                 violations.push("GIF (auto-deleted)");
  if (m.stickerMessage)                            violations.push("sticker (auto-deleted)");
  if (m.videoMessage && !m.videoMessage.gifPlayback) violations.push("video (auto-deleted)");
  return violations;
}

function applyWarning(sender, violations) {
  if (!userWarnings[sender]) userWarnings[sender] = 0;
  userWarnings[sender]++;
  const used = userWarnings[sender];
  const left = MAX_WARNINGS - used;
  return left > 0
    ? { action: "warn", violations, used, left }
    : { action: "ban",  violations, used };
}

// ─────────────────────────────────────────────
// 🛡️ SAFE SEND — retries up to 3x with delay
// ─────────────────────────────────────────────
async function safeSend(sock, jid, content, label = "message") {
  for (let i = 1; i <= 3; i++) {
    try {
      await sock.sendMessage(jid, content);
      return true;
    } catch (e) {
      console.log(`⚠️  Send attempt ${i}/3 failed (${e.message})`);
      if (i < 3) await new Promise(r => setTimeout(r, 3000 * i));
    }
  }
  console.log(`❌ Could not send ${label} after 3 attempts`);
  return false;
}

// ─────────────────────────────────────────────
// 🗑️ SAFE DELETE — never crashes the bot
// ─────────────────────────────────────────────
async function safeDelete(sock, chatId, msgKey, senderName) {
  for (let i = 1; i <= 2; i++) {
    try {
      await sock.sendMessage(chatId, { delete: msgKey });
      console.log(`🗑️  Deleted msg from ${senderName}`);
      return true;
    } catch (e) {
      if (i === 1) {
        await new Promise(r => setTimeout(r, 3000));
      } else {
        console.log(`⚠️  Delete skipped (${e.message})`);
      }
    }
  }
  return false;
}

// ─────────────────────────────────────────────
// 🤖 BOT
// ─────────────────────────────────────────────
async function startBot() {
  try {
    // If CLEAR_AUTH=true, wipe corrupted session and start fresh
    if (process.env.CLEAR_AUTH === "true") {
      const { rmSync, existsSync } = await import("fs");
      if (existsSync("auth_info")) {
        rmSync("auth_info", { recursive: true, force: true });
        console.log("🗑️  Cleared auth_info — fresh QR scan required");
      }
    }

    botStatus = "loading auth...";
    const { state, saveCreds } = await useMultiFileAuthState("auth_info");
    console.log("✅ Auth loaded. Has creds:", !!state.creds?.me);

    let waVersion = [2, 3000, 1015901307];
    try {
      const r = await baileys.fetchLatestBaileysVersion();
      waVersion = r.version;
      console.log("📦 WA version:", waVersion.join("."));
    } catch(e) {
      console.log("⚠️  Using fallback WA version");
    }

    botStatus = "connecting...";
    const sock = makeWASocket({
      version: waVersion,
      auth: state,
      printQRInTerminal: true,
      logger: pino({ level: "silent" }),
      browser: baileys.Browsers.ubuntu("Chrome"),
      connectTimeoutMs: 30000,
      keepAliveIntervalMs: 15000,
    });

    sock.ev.on("creds.update", saveCreds);

    sock.ev.on("connection.update", (update) => {
      const { connection, lastDisconnect, qr } = update;
      if (qr) {
        currentQR = qr;
        botStatus = "SCAN QR CODE ↑";
        console.log("📱 QR ready — open your Railway URL!");
      }
      if (connection === "open") {
        currentQR = null;
        lastError = null;
        isReady = false;
        botStatus = "connected — syncing...";
        console.log("✅ Connected! Waiting for WhatsApp to finish syncing...");
      }
      if (connection === "close") {
        isReady = false;
        const code   = lastDisconnect?.error?.output?.statusCode;
        const reason = lastDisconnect?.error?.message || "unknown";
        lastError = `code ${code}: ${reason}`;
        console.log(`❌ Closed — ${lastError}`);
        if (code === DisconnectReason.loggedOut) {
          botStatus = "logged out — delete auth_info and redeploy";
        } else {
          botStatus = `reconnecting...`;
          setTimeout(startBot, 5000);
        }
      }
    });

    // Fire once WhatsApp has fully synced — safe to send messages after this
    sock.ev.on("messaging-history.set", () => {
      if (!isReady) {
        isReady = true;
        botStatus = "connected";
        console.log("✅ WhatsApp sync complete — bot is ready to moderate!");
      }
    });

    // Fallback: if messaging-history.set never fires, go ready after 60s
    setTimeout(() => {
      if (!isReady) {
        isReady = true;
        botStatus = "connected (fallback ready)";
        console.log("✅ Fallback: bot marked ready after 60s");
      }
    }, 60000);

    sock.ev.on("messages.upsert", async ({ messages }) => {
      for (const msg of messages) {
        try {
          if (!msg.message || msg.key.fromMe) continue;
          if (!isReady) continue;  // skip until sessions are synced
          const chatId = msg.key.remoteJid;
          if (chatId !== TARGET_GROUP_ID) continue;

          const sender     = msg.key.participant || msg.key.remoteJid;
          const senderNum  = sender.split("@")[0];
          const senderName = msg.pushName || senderNum;
          const m          = msg.message;

          const textContent = m.conversation || m.extendedTextMessage?.text || "";
          const isMedia     = !!(m.imageMessage || m.videoMessage || m.stickerMessage);

          let violations = [];
          if (textContent) violations = checkText(textContent);
          if (isMedia)     violations = [...violations, ...checkMedia(msg)];
          if (!violations.length) continue;

          // Delete first — safely, never crashes
          await safeDelete(sock, chatId, msg.key, senderName);

          const result = applyWarning(sender, violations);
          const reason = violations.join(", ");

          if (result.action === "warn") {
            console.log(`⚠️  WARN #${result.used} — ${senderName} — ${reason}`);
            await safeSend(sock, TARGET_GROUP_ID, {
              text:
                `🗑️ *Message deleted.*\n\n` +
                `⚠️ *Warning #${result.used} for @${senderNum}*\n` +
                `📌 Violation: ${reason}\n` +
                `🔢 Warnings: ${result.used}/${MAX_WARNINGS}\n` +
                `❗ You will be removed at ${MAX_WARNINGS} warnings.\n\n` + RULES,
            }, "warning");
          }

          if (result.action === "ban") {
            console.log(`⛔ BAN — ${senderName} — ${reason}`);
            await safeSend(sock, TARGET_GROUP_ID, {
              text:
                `🗑️ *Message deleted.*\n\n` +
                `⛔ *@${senderNum} has been removed.*\n` +
                `📌 Final violation: ${reason}\n` +
                `🔢 Used all ${MAX_WARNINGS}/${MAX_WARNINGS} warnings.`,
            }, "ban notice");
            try {
              await sock.groupParticipantsUpdate(TARGET_GROUP_ID, [sender], "remove");
              console.log(`✅ Removed ${senderName}`);
            } catch (e) {
              console.log(`⚠️  Remove failed: ${e.message}`);
            }
          }
        } catch (msgErr) {
          console.error("⚠️  Message handler error (non-fatal):", msgErr.message);
        }
      }
    });

  } catch (err) {
    lastError = err.message;
    botStatus = `crashed: ${err.message}`;
    console.error("💥 startBot error:", err.message);
    setTimeout(startBot, 5000);
  }
}

startBot();
