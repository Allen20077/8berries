/*****************************************************************************************
 * 🍓 8Berries – All-in-One Full Stack App
 * ---------------------------------------------------------------------------------------
 * Frontend + Backend in ONE file
 * Features:
 *  - Glassmorphism Sign Up page
 *  - Glassmorphism Login page
 *  - Protected main app
 *  - ChartGPT-style chat
 *  - Sidebar with History
 *  - Clickable history (opens charts)
 *  - ⭐ Pin charts
 *  - ✏ Rename charts
 *  - 🗑 Delete charts
 *  - No backend logic modification required
 *  - Session-based authentication
 *
 * NOTE:
 *  - History is frontend-only (memory)
 *  - Restart server = history reset (expected)
 *****************************************************************************************/

/* =======================================================================================
 *                               BACKEND SETUP
 * =======================================================================================
 */

require("dotenv").config();
const express = require("express");
const session = require("express-session");
const { OpenAI } = require("openai");

const app = express();

/* -------------------- Middleware -------------------- */
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(
    session({
        secret: "8berries-secret-key",
        resave: false,
        saveUninitialized: false
    })
);

/* -------------------- Constants -------------------- */
const PORT = 3000;

/* -------------------- In-memory Users -------------------- */
/* NOTE: This is intentional for demo / learning */
const users = {};

/* -------------------- AI Client -------------------- */
const groq = new OpenAI({
    apiKey: process.env.GROQ_API_KEY,
    baseURL: "https://api.groq.com/openai/v1"
});

/* -------------------- Auth Middleware -------------------- */
function requireLogin(req, res, next) {
    if (!req.session.user) return res.redirect("/login");
    next();
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
<title>Sign Up – 8Berries</title>

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
    <h2>Sign Up</h2>
    <input class="input" name="email" placeholder="Email Address" required />
    <input class="input" type="password" name="password" placeholder="Password" required />
    <input class="input" type="password" name="confirm" placeholder="Confirm Password" required />
  </div>

  <div class="right">
    <button class="btn primary">Sign Up</button>

    <div class="link">
      Already have an account?
      <a href="/login">Log in</a>
    </div>

    <div class="or">Or</div>

    <button type="button" class="btn social">Sign up with Google</button>
    <button type="button" class="btn social">Sign up with Facebook</button>
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
<title>Login – 8Berries</title>

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
  <h2>Sign In</h2>
  <input name="email" placeholder="Email Address" required />
  <input type="password" name="password" placeholder="Password" required />
  <button>Sign In</button>

  <div class="link">
    Don’t have an account?
    <a href="/signup">Sign up</a>
  </div>
</form>

</body>
</html>
`;

/* =======================================================================================
 * MAIN APP (CHARTGPT + HISTORY + PIN / RENAME / DELETE)
 * =======================================================================================
 */

const chartHTML = `
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>8Berries</title>

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
  display: flex;
  padding: 14px;
  border-top: 1px solid #222;
}

input {
  flex: 1;
  background: #111;
  color: #fff;
  border: none;
  padding: 14px;
  border-radius: 30px;
}

.send {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  border: none;
  background: #7c3aed;
  color: #fff;
  margin-left: 10px;
}
</style>
</head>

<body>

<div class="app">

  <!-- SIDEBAR -->
  <div class="sidebar">
    <div class="brand">🍓 8Berries</div>
    <button class="side-btn" onclick="newChart()">＋ New Chart</button>
    <div class="history" id="history"></div>
    <a href="/logout" class="side-btn" style="margin-top:auto;text-decoration:none">Logout</a>
  </div>

  <!-- MAIN -->
  <div class="main">
    <div id="chat"></div>
    <div id="bar">
      <input id="input" placeholder="Ask for a chart or insight..." />
      <button class="send" onclick="send()">↑</button>
    </div>
  </div>

</div>

<script>
/* ---------- STATE ---------- */
const chat = document.getElementById("chat");
const input = document.getElementById("input");
const historyBox = document.getElementById("history");

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
async function send() {
  const text = input.value.trim();
  if (!text) return;

  input.value = "";
  bubble(text, "user");

  const res = await fetch("/api", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message: text })
  });

  const data = await res.json();
  if (data.type === "chart") chart(data);
  else bubble(data.reply, "bot");
}
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

/* -------------------- AI API -------------------- */
app.post("/api", requireLogin, async(req, res) => {
    try {
        const ai = await groq.chat.completions.create({
            model: "llama-3.3-70b-versatile",
            messages: [
                { role: "system", content: "Return chart JSON if chart requested" },
                { role: "user", content: req.body.message }
            ]
        });

        const content = ai.choices[0].message.content.trim();
        const jsonMatch = content.match(/\\{[\\s\\S]*\\}/);

        if (jsonMatch) {
            try {
                return res.json(JSON.parse(jsonMatch[0]));
            } catch {}
        }

        res.json({ reply: content });
    } catch {
        res.json({ reply: "AI error" });
    }
});

/* =======================================================================================
 *                               START SERVER
 * =======================================================================================
 */

app.listen(PORT, () => {
    console.log("🍓 8Berries running at http://localhost:" + PORT);
});