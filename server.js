/* =======================================================================================
 *                               BACKEND SETUP
 * =======================================================================================
 */
/* eslint-disable */
/* jshint esversion: 2020 */

require("dotenv").config();
console.log("🔑 GROQ KEY LOADED:", !!process.env.GROQ_API_KEY);
const express = require("express");
const session = require("express-session");
const OpenAI = require("openai");
const mongoose = require("mongoose");

mongoose.connect(process.env.MONGO_URI);

mongoose.connection.on("connected", () => {
    console.log("🍃 MongoDB connected");
});

mongoose.connection.on("error", (err) => {
    console.error("❌ MongoDB error:", err);
});

const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const FacebookStrategy = require("passport-facebook").Strategy;
const multer = require("multer");
const path = require("path");
const app = express();

/* -------------------- Middleware -------------------- */
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(
    session({
        secret: "8berries-secret-key",
        resave: false,
        saveUninitialized: false,
        cookie: {
            httpOnly: true,
            sameSite: "lax"
        }
    })
);

app.use(passport.initialize());
app.use(passport.session());


/* -------------------- Constants -------------------- */
const PORT = process.env.PORT || 3000;

/* -------------------- In-memory Users -------------------- */
const UserSchema = new mongoose.Schema({
    email: { type: String, unique: true },
    password: String,
    googleId: String,
    facebookId: String
}, { timestamps: true });

const SessionSchema = new mongoose.Schema({
    userEmail: String,
    title: String,
    pinned: Boolean
}, { timestamps: true });

const MessageSchema = new mongoose.Schema({
    sessionId: mongoose.Schema.Types.ObjectId,
    role: String, // user | bot
    type: String, // text | chart
    content: mongoose.Schema.Types.Mixed
}, { timestamps: true });

const UserDB = mongoose.model("User", UserSchema);
const SessionDB = mongoose.model("Session", SessionSchema);
const MessageDB = mongoose.model("Message", MessageSchema);

/* NOTE: This is intentional for demo / learning */
const users = {};
passport.serializeUser((user, done) => {
    done(null, user.email);
});

passport.deserializeUser((email, done) => {
    done(null, { email });
});


/* -------------------- File Upload Setup -------------------- */
const upload = multer({
    storage: multer.diskStorage({
        destination: "uploads/",
        filename: (req, file, cb) => {
            cb(null, Date.now() + "-" + file.originalname);
        }
    })
});

/* -------------------- AI Client -------------------- */
const groq = new OpenAI({
    apiKey: process.env.GROQ_API_KEY,
    baseURL: "https://api.groq.com/openai/v1"
});

/* -------------------- Google OAuth Strategy -------------------- */
passport.use(
    new GoogleStrategy({
            clientID: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            callbackURL: "/auth/google/callback"
        },
        (accessToken, refreshToken, profile, done) => {
            let email;
            if (profile.emails && profile.emails.length > 0) {
                email = profile.emails[0].value;
            } else {
                email = profile.id + "@google.com";
            }
            if (!users[email]) {
                users[email] = { password: null, googleId: profile.id };
            }
            done(null, { email });
        }
    )
);

/* -------------------- Auth Middleware -------------------- */
function requireLogin(req, res, next) {
    if (req.session.user || req.user) {
        return next();
    }
    return res.redirect("/login");
}

/* =======================================================================================
 *                               FRONTEND PAGES
 * =======================================================================================
 */

/* =======================================================================================
 * SIGN UP PAGE (GLASSMORPHISM)
 * =======================================================================================
 */

const signupHTML = `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Sign Up 🫐8Berries</title>

<style>
/* ---------- GLOBAL ---------- */
body {
  margin: 0;
  height: 100vh;
  font-family: system-ui, -apple-system;
  background: linear-gradient(135deg, #8fa5ff, #b8c4ff);
  display: flex;
  align-items: center;
  justify-content: center;
}

/* ---------- CARD ---------- */
.card {
  width: 760px;
  height: 420px;
  background: rgba(255,255,255,0.25);
  backdrop-filter: blur(20px);
  border-radius: 20px;
  padding: 40px;
  display: flex;
  box-shadow: 0 30px 60px rgba(0,0,0,0.25);
}

/* ---------- LEFT ---------- */
.left {
  flex: 1;
}
.left h2 {
  margin-bottom: 24px;
  color: #111;
}

/* ---------- INPUTS ---------- */
.input {
  width: 100%;
  padding: 14px 18px;
  border-radius: 30px;
  border: none;
  outline: none;
  margin-bottom: 14px;
  font-size: 14px;
}

/* ---------- RIGHT ---------- */
.right {
  flex: 1;
  padding-left: 40px;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.btn {
  padding: 14px;
  border-radius: 30px;
  border: none;
  cursor: pointer;
  font-size: 15px;
}

.primary {
  background: #000;
  color: #fff;
}

.social {
  background: transparent;
  border: 1px solid #000;
  margin-top: 10px;
}

.or {
  text-align: center;
  margin: 14px 0;
  font-size: 13px;
}

.link {
  font-size: 13px;
  text-align: center;
  margin-top: 10px;
}

.link a {
  text-decoration: none;
  color: #000;
  font-weight: 600;
}
</style>
</head>

<body>

<form class="card" method="POST" action="/auth/signup">

  <div class="left">
    <h2>Sign Up 🫐8Berries</h2>
    <input class="input" name="email" placeholder="Email Address" required />
    <input class="input" type="password" name="password" placeholder="Password" required />
    <input class="input" type="password" name="confirm" placeholder="Confirm Password" required />
  </div>

  <div class="right">
    <button class="btn primary">Sign Up</button>

    <div class="link">
      Already have an account?
      <a href="/login">Log in 🫐8Berries</a>
    </div>

    <div class="or">Or</div>

    <button type="button" class="btn social" onclick="location.href='/auth/google'">
    Sign up with Google
    </button>

    <button type="button" class="btn social" onclick="location.href='/auth/facebook'">
    Sign up with Facebook
    </button>

  </div>

</form>

</body>
</html>
`;

/* =======================================================================================
 * LOGIN PAGE
 * =======================================================================================
 */

const loginHTML = `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Login 🫐8Berries</title>

<style>
body {
  margin: 0;
  height: 100vh;
  font-family: system-ui;
  background: linear-gradient(135deg, #8fa5ff, #b8c4ff);
  display: flex;
  align-items: center;
  justify-content: center;
}

.card {
  width: 420px;
  background: rgba(255,255,255,0.25);
  backdrop-filter: blur(20px);
  border-radius: 20px;
  padding: 40px;
  box-shadow: 0 30px 60px rgba(0,0,0,0.25);
}

h2 {
  margin-bottom: 24px;
}

input {
  width: 100%;
  padding: 14px 18px;
  border-radius: 30px;
  border: none;
  outline: none;
  margin-bottom: 14px;
}

button {
  width: 100%;
  padding: 14px;
  border-radius: 30px;
  border: none;
  background: #000;
  color: #fff;
  font-size: 15px;
  cursor: pointer;
}

.link {
  font-size: 13px;
  text-align: center;
  margin-top: 12px;
}

.link a {
  color: #000;
  font-weight: 600;
  text-decoration: none;
}
</style>
</head>

<body>

<form class="card" method="POST" action="/auth/login">
  <h2>Login 🫐8Berries</h2>
  <input name="email" placeholder="Email Address" required />
  <input type="password" name="password" placeholder="Password" required />
  <button>Login 🫐8Berries</button>

  <div class="link">
    Don’t have an account?
    <a href="/signup">Sign up 🫐8Berries</a>
  </div>
</form>

</body>
</html>
`;

/* =======================================================================================
 * MAIN APP 
 * =======================================================================================
 */
const chartHTML = `
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>8Berries</title>
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<script src="https://cdn.jsdelivr.net/npm/chart.js"></script>

<style>
/* ---------- GLOBAL ---------- */
body {
  margin: 0;
  font-family: system-ui;
  background: #000;
  color: #fff;
}

/* ---------- LAYOUT ---------- */
.app {
  display: flex;
  height: 100vh;
}

/* ---------- SIDEBAR ---------- */
.sidebar {
  width: 260px;
  background: #0b0b0b;
  border-right: 1px solid #222;
  padding: 16px;
  display: flex;
  flex-direction: column;
}

.brand {
  font-size: 20px;
  font-weight: 600;
  margin-bottom: 16px;
}

.side-btn {
  background: #1a1a1a;
  color: #fff;
  border: none;
  padding: 10px 14px;
  border-radius: 20px;
  cursor: pointer;
  margin-bottom: 10px;
  text-align: left;
}

/* ---------- HISTORY ---------- */
.history {
  flex: 1;
  overflow-y: auto;
}

.history-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 13px;
  padding: 8px 10px;
  border-radius: 12px;
  color: #ccc;
}

.history-item:hover {
  background: #1f1f1f;
}

.history-left {
  flex: 1;
  cursor: pointer;
}

.history-actions button {
  background: none;
  border: none;
  color: #aaa;
  cursor: pointer;
  margin-left: 6px;
}

/* ---------- MAIN ---------- */
.main {
  flex: 1;
  display: flex;
  flex-direction: column;
}

#chat {
  flex: 1;
  padding: 16px;
  overflow-y: auto;
}

/* ---------- CHAT ---------- */
.bubble {
  padding: 14px 18px;
  border-radius: 20px;
  margin-bottom: 12px;
  max-width: 85%;
}

.user {
  background: #7c3aed;
  margin-left: auto;
}

.bot {
  background: #111;
}

.chart {
  background: #111;
  padding: 14px;
}

/* ---------- INPUT BAR ---------- */
#bar {
  display: none;
  padding: 18px 24px;
  border-top: 1px solid #222;
  gap: 12px;
  align-items: center;
}
#bar input {
  flex: 1;
  background: #111;
  color: #fff;
  border: none;
  padding: 18px 22px;
  font-size: 16px;
  border-radius: 32px;
}

.send {
  width: 52px;
  height: 52px;
  border-radius: 50%;
  border: none;
  background: #7c3aed;
  color: #fff;
  cursor: pointer;
  font-size: 18px;
}

  /* ---------- HERO (New Chart Landing) ---------- */
.hero {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 18px;
}

.hero.hidden {
  display: none;
}

.hero-user {
  font-size: 20px;
  font-weight: 600;
  opacity: 0.9;
}

.hero-text {
  font-size: 28px;
  font-weight: 500;
}

.hero-input {
  display: flex;
  align-items: center;
  gap: 12px;
  width: min(600px, 100%);
}

.hero-input input {
  flex: 1;
  padding: 16px 20px;
  border-radius: 30px;
  border: none;
  background: #111;
  color: #fff;
}

.hero-input button {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  border: none;
  background: #7c3aed;
  color: #fff;
  cursor: pointer;
}
  /* ================= MOBILE RESPONSIVE ================= */
@media (max-width: 768px) {

  .sidebar {
    display: none;
  }

  .app {
    flex-direction: column;
  }

  .main {
    width: 100%;
  }

  .hero-text {
    font-size: 22px;
    text-align: center;
  }

  .hero-input {
    width: 100%;
    padding: 0 12px;
  }

  .hero-input input {
    font-size: 16px;
    padding: 16px;
  }

  #chat {
    padding: 12px;
  }

  .bubble {
    max-width: 95%;
    font-size: 14px;
  }

  #bar {
    padding: 12px;
  }

  #bar input {
    font-size: 16px;
    padding: 16px;
  }

  .send {
    width: 48px;
    height: 48px;
  }
}

</style>
</head>

<body>

<div class="app">

  <!-- SIDEBAR -->
  <div class="sidebar">
    <div class="brand">🫐 8Berries </div>
    <button class="side-btn" onclick="newChart()"> ＋ New Chat</button>
    <button class="side-btn" onclick="showTools()">🧠 AI Tools</button>

    <button class="side-btn" onclick="showImages()">🖼 AI Images</button>
    <button class="side-btn" onclick="showSearch()">🔍 Search Chats</button>

  <button class="side-btn" onclick="showGroupCharts()">👥💬 New Group Chart</button>
  <button class="side-btn" onclick="showProjects()">  🗂️ Projects</button>

  <button class="side-btn" onclick="showExploreGPTs()">🧭 Explore GPTs</button>
  <button class="side-btn" onclick="showPlagiarism()">📝 Plagiarism Checker</button>

    <div class="history" id="history"></div>
    <a href="/logout" class="side-btn" style="margin-top:auto;text-decoration:none">Logout</a>
  </div>

  <!-- MAIN -->
  <div class="main">
  <!-- HERO CENTER VIEW -->
<div id="hero" class="hero hidden">
  <div class="hero-text">What’s on the agenda today?</div>

  <div class="hero-input">
    <input id="heroInput" placeholder="Ask anything..." />
    <button onclick="sendFromHero()">↑</button>
  </div>
</div>

    <div id="chat"></div>
    <div id="bar">

  <input type="file" id="file" multiple style="display:none" />
  <button class="send" onclick="document.getElementById('file').click()">📎</button>
  <input id="input" placeholder="Ask for a chart or insight..." />
  <button class="send" onclick="send()">↑</button>
</div>

  </div>

</div>

<script>
/* ---------- STATE ---------- */
const chat = document.getElementById("chat");
const input = document.getElementById("input");
const fileInput = document.getElementById("file");
const hero = document.getElementById("hero");
const heroInput = document.getElementById("heroInput");
const bar = document.getElementById("bar");

fileInput.addEventListener("change", async () => {
  const formData = new FormData();

  for (const file of fileInput.files) {
    formData.append("files", file);
  }

  bubble("📎 Uploading files...", "user");

  try {
    const res = await fetch("/api/upload", {
      method: "POST",
      body: formData
    });

    const data = await res.json();

    data.files.forEach(f => {
      bubble("✅ Uploaded: " + f.name, "bot");
    });
  } catch (err) {
    bubble("❌ Upload failed", "bot");
  }

  fileInput.value = "";
});

input.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    send();
  }
});

heroInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    sendFromHero();
  }
});

const historyBox = document.getElementById("history");
let currentView = "chat";

function clearChat() {
  chat.innerHTML = "";
}

function showHero() {
  hero.classList.remove("hidden");
  chat.style.display = "none";
  bar.style.display = "none";
}

function hideHero() {
  hero.classList.add("hidden");
  chat.style.display = "block";
  bar.style.display = "flex";
}



function showTools() {
  currentView = "tools";
  clearChat();
  bubble("🧠 AI Tools coming soon…", "bot");
}

function showImages() {
  currentView = "images";
  clearChat();
  bubble("🖼 Describe an image you want to generate", "bot");
}

function showSearch() {
  currentView = "search";
  clearChat();
  bubble("🔍 Search your saved charts (coming soon)", "bot");
}

function showGroupCharts() {
  currentView = "groups";
  clearChat();

  bubble("👥 Group Charts", "bot");
  bubble("Create and manage charts shared with multiple users.", "bot");
  bubble("🚧 Coming soon", "bot");
}

function showProjects() {
  currentView = "projects";
  clearChat();

  bubble("📁 Projects", "bot");
  bubble("Projects help you organize multiple charts under one workspace.", "bot");
  bubble("🚧 Coming soon", "bot");
}

function showExploreGPTs() {
  currentView = "explore-gpts";
  clearChat();

  bubble("🧭 Explore GPTs", "bot");
  bubble("Browse and try specialized AI agents for different tasks.", "bot");
  bubble("🚧 Feature coming soon", "bot");
}

function showPlagiarism() {
  currentView = "plagiarism";
  clearChat();

  bubble("📝 Plagiarism Checker", "bot");
  bubble("Paste text to check originality and similarity.", "bot");
  bubble("🚧 Feature coming soon", "bot");
}

let sessions = {};
let currentSession = null;
let chartCount = 0;

/* ---------- CHAT ---------- */
function bubble(text, role) {
  const d = document.createElement("div");
  d.className = "bubble " + role;
  d.textContent = text;
  chat.appendChild(d);

  if (currentSession) {
    sessions[currentSession].items.push({ type: "text", role, value: text });
  }
}

function chart(c) {
  const w = document.createElement("div");
  w.className = "bubble chart";
  const cv = document.createElement("canvas");
  w.appendChild(cv);
  chat.appendChild(w);

  new Chart(cv, {
    type: c.chartType,
    data: {
      labels: c.labels,
      datasets: [{
        label: c.title,
        data: c.data,
        backgroundColor: "#7c3aed"
      }]
    }
  });

  if (currentSession) {
    sessions[currentSession].items.push({ type: "chart", value: c });
  }
}

/* ---------- HISTORY ---------- */
function newChart() {
  chat.innerHTML = "";
  currentSession = "chart_" + Date.now();
  chartCount++;

  sessions[currentSession] = {
    title: "Chart " + chartCount,
    pinned: false,
    items: []
  };

  renderHistory();
  showHero();
}


function openChart(id) {
  chat.innerHTML = "";
  currentSession = id;

  sessions[id].items.forEach(item => {
    if (item.type === "text") bubble(item.value, item.role);
    if (item.type === "chart") chart(item.value);
  });
}

function pinChart(id) {
  sessions[id].pinned = !sessions[id].pinned;
  renderHistory();
}

function renameChart(id) {
  const name = prompt("Rename chart:", sessions[id].title);
  if (name) {
    sessions[id].title = name;
    renderHistory();
  }
}

function deleteChart(id) {
  if (confirm("Delete this chart?")) {
    delete sessions[id];
    chat.innerHTML = "";
    renderHistory();
  }
}

function renderHistory() {
  historyBox.innerHTML = "";

  Object.entries(sessions)
    .sort((a, b) => b[1].pinned - a[1].pinned)
    .forEach(([id, s]) => {
      const row = document.createElement("div");
      row.className = "history-item";

      const left = document.createElement("div");
      left.className = "history-left";
      left.textContent = (s.pinned ? "⭐ " : "") + s.title;
      left.onclick = () => openChart(id);

      const actions = document.createElement("div");
      actions.className = "history-actions";

      const pin = document.createElement("button");
      pin.textContent = "⭐";
      pin.onclick = () => pinChart(id);

      const edit = document.createElement("button");
      edit.textContent = "✏";
      edit.onclick = () => renameChart(id);

      const del = document.createElement("button");
      del.textContent = "🗑";
      del.onclick = () => deleteChart(id);

      actions.append(pin, edit, del);
      row.append(left, actions);
      historyBox.appendChild(row);
    });
}

/* ---------- SEND ---------- */
function sendFromHero() {
  const text = heroInput.value.trim();
  if (!text) return;

  heroInput.value = "";
  hideHero();
  bubble(text, "user");
  sendMessage(text);
}

async function sendMessage(text) {
  try {
    const res = await fetch("/api", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: text })
    });

    const data = await res.json();
    bubble(data.reply || "⚠️ No response", "bot");
  } catch {
    bubble("❌ AI request failed", "bot");
  }
}

function send() {
  const text = input.value.trim();
  if (!text) return;

  input.value = "";
  hideHero();
  bubble(text, "user");
  sendMessage(text);
}

  async function loadHistory() {
  try {
    const res = await fetch("/api/history");
    const messages = await res.json();

    messages.forEach(m => {
      if (m.type === "text") {
        bubble(m.content, m.role);
      }
    });
  } catch (err) {
    console.error("History load failed", err);
  }
}
newChart();   // create a fresh empty session
// showHero() is already called inside newChart


</script>
</body>
</html>
`;

/* =======================================================================================
 *                               ROUTES
 * =======================================================================================
 */

app.get("/signup", (_, res) => res.send(signupHTML));
app.get("/login", (_, res) => res.send(loginHTML));
app.get("/", requireLogin, (_, res) => res.send(chartHTML));

/* -------------------- AUTH -------------------- */
app.post("/auth/signup", (req, res) => {
    const { email, password, confirm } = req.body;
    if (password !== confirm) return res.send("Passwords do not match");
    users[email] = { password };
    req.session.user = email;
    res.redirect("/");
});

app.post("/auth/login", (req, res) => {
    const { email, password } = req.body;
    if (!users[email] || users[email].password !== password)
        return res.send("Invalid credentials");
    req.session.user = email;
    res.redirect("/");
});

app.get("/logout", (req, res) => {
    req.session.destroy(() => res.redirect("/login"));
});
app.get(
    "/auth/google",
    passport.authenticate("google", { scope: ["profile", "email"] })
);

app.get(
    "/auth/google/callback",
    passport.authenticate("google", { failureRedirect: "/login" }),
    (req, res) => {
        req.session.user = req.user.email;
        res.redirect("/");
    }
);

/* -------------------- AI API -------------------- */
app.post("/api", requireLogin, async(req, res) => {
    try {
        const message = req.body && req.body.message;

        // 1️⃣ Validate first
        if (!message) {
            return res.json({ reply: "⚠️ Empty message sent" });
        }

        // 2️⃣ Get or create session
        let sessionDoc = await SessionDB.findOne({ userEmail: req.session.user });
        if (!sessionDoc) {
            sessionDoc = await SessionDB.create({
                userEmail: req.session.user,
                title: "New Chart",
                pinned: false
            });
        }

        // 3️⃣ Call Groq
        const completion = await groq.chat.completions.create({
            model: "llama-3.1-8b-instant",
            messages: [
                { role: "system", content: "You are a helpful AI assistant." },
                { role: "user", content: message }
            ]
        });

        let reply = "⚠️ Empty AI response";

        if (
            completion &&
            completion.choices &&
            completion.choices[0] &&
            completion.choices[0].message &&
            completion.choices[0].message.content
        ) {
            reply = completion.choices[0].message.content;
        }

        // 4️⃣ Save messages AFTER success
        await MessageDB.create({
            sessionId: sessionDoc._id,
            role: "user",
            type: "text",
            content: message
        });

        await MessageDB.create({
            sessionId: sessionDoc._id,
            role: "bot",
            type: "text",
            content: reply
        });

        res.json({ reply });

    } catch (err) {
        console.error("🔥 API ERROR FULL:", err);
        res.json({ reply: "❌ AI backend error" });
    }
});


app.post("/api/stream", requireLogin, async(req, res) => {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    try {
        const message = req.body && req.body.message;
        if (!message) {
            res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
            return res.end();
        }

        const stream = await groq.chat.completions.create({
            model: "llama-3.1-8b-instant",
            stream: true,
            messages: [{ role: "user", content: message }]
        });

        for await (const chunk of stream) {
            let token = null;

            if (
                chunk &&
                chunk.choices &&
                chunk.choices.length > 0 &&
                chunk.choices[0] &&
                chunk.choices[0].delta &&
                chunk.choices[0].delta.content
            ) {
                token = chunk.choices[0].delta.content;
            }

            if (token) {
                res.write(`data: ${JSON.stringify({ token })}\n\n`);
            }
        }

        res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
        res.end();

    } catch (err) {
        console.error("🔥 STREAM ERROR:", err);
        res.write(`data: ${JSON.stringify({ error: true })}\n\n`);
        res.end();
    }
});

app.get("/api/history", requireLogin, async(req, res) => {
    const sessionDoc = await SessionDB.findOne({ userEmail: req.session.user });
    if (!sessionDoc) return res.json([]);

    const messages = await MessageDB
        .find({ sessionId: sessionDoc._id })
        .sort({ createdAt: 1 });

    res.json(messages);
});

/* -------------------- FILE UPLOAD API -------------------- */
app.post("/api/upload", upload.array("files"), (req, res) => {
    if (!req.session.user && !req.user) {
        return res.json({ error: "Not logged in" });
    }

    const files = req.files.map(f => ({
        name: f.originalname,
        path: f.path,
        type: f.mimetype
    }));

    res.json({ files });
});

/* -------------------- STATIC FILES -------------------- */
app.use("/uploads", express.static("uploads"));

/* =======================================================================================
 *                               START SERVER
 * =======================================================================================
 */

app.listen(PORT, () => {
    console.log(`🍓 Server running on port ${PORT}`);
});