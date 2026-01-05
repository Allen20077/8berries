// =====================================
// 🍓 8Berries — ChartGPT (Chat + Charts)
// Frontend + Backend in ONE FILE
// Render Deployment Ready
// =====================================

require("dotenv").config();
const express = require("express");
const { OpenAI } = require("openai");

const app = express();
app.use(express.json());

// ================================
// ✅ RENDER PORT SUPPORT (ADDED)
// ================================
const PORT = process.env.PORT || 3000;

// ================================
// AI CLIENT (Groq / OpenAI style)
// ================================
const groq = new OpenAI({
    apiKey: process.env.GROQ_API_KEY,
    baseURL: "https://api.groq.com/openai/v1"
});

// ================================
// FRONTEND (HTML + CSS + JS)
// ================================
const HTML = `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>8Berries</title>

<script src="https://cdn.jsdelivr.net/npm/chart.js"></script>

<style>
* { box-sizing: border-box; }
body {
  margin: 0;
  font-family: system-ui, sans-serif;
  background: #000;
  color: #fff;
  height: 100vh;
  display: flex;
  flex-direction: column;
}
header {
  padding: 16px;
  text-align: center;
  font-size: 22px;
  font-weight: bold;
}
#chat {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
}
.bubble {
  max-width: 85%;
  padding: 14px 18px;
  border-radius: 20px;
  margin-bottom: 12px;
  line-height: 1.4;
}
.user {
  background: #7c3aed;
  margin-left: auto;
}
.bot {
  background: #111;
}
.chart-bubble {
  background: #111;
  padding: 16px;
}
.typing {
  font-style: italic;
  color: #aaa;
}
.input-bar {
  display: flex;
  padding: 14px;
  border-top: 1px solid #222;
}
#input {
  flex: 1;
  padding: 14px 18px;
  border-radius: 30px;
  border: none;
  background: #111;
  color: white;
}
#send {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  border: none;
  margin-left: 10px;
  background: #7c3aed;
  color: white;
  font-size: 20px;
}
</style>
</head>

<body>

<header>🍓 8Berries</header>

<div id="chat"></div>

<div class="input-bar">
  <input id="input" placeholder="Ask for insights or charts..." />
  <button id="send">↑</button>
</div>

<script>
const chat = document.getElementById("chat");
const input = document.getElementById("input");

function addBubble(text, cls) {
  const div = document.createElement("div");
  div.className = "bubble " + cls;
  div.textContent = text;
  chat.appendChild(div);
  chat.scrollTop = chat.scrollHeight;
}

function showTyping() {
  const t = document.createElement("div");
  t.id = "typing";
  t.className = "bubble bot typing";
  t.textContent = "Thinking...";
  chat.appendChild(t);
  chat.scrollTop = chat.scrollHeight;
}

function hideTyping() {
  const t = document.getElementById("typing");
  if (t) t.remove();
}

function addChart(chart) {
  const wrap = document.createElement("div");
  wrap.className = "bubble chart-bubble";

  const canvas = document.createElement("canvas");
  wrap.appendChild(canvas);
  chat.appendChild(wrap);

  new Chart(canvas, {
    type: chart.chartType,
    data: {
      labels: chart.labels,
      datasets: [{
        label: chart.title,
        data: chart.data,
        backgroundColor: "#7c3aed"
      }]
    }
  });

  chat.scrollTop = chat.scrollHeight;
}

async function send() {
  const text = input.value.trim();
  if (!text) return;

  input.value = "";
  addBubble(text, "user");
  showTyping();

  const res = await fetch("/api", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message: text })
  });

  const data = await res.json();
  hideTyping();

  if (data.type === "chart") {
    addChart(data);
  } else {
    addBubble(data.reply, "bot");
  }
}

document.getElementById("send").onclick = send;
input.addEventListener("keydown", e => {
  if (e.key === "Enter") send();
});
</script>

</body>
</html>
`;

// ================================
// ROUTES
// ================================

// Root UI
app.get("/", (_, res) => {
    res.send(HTML);
});

// ================================
// ✅ HEALTH CHECK (ADDED FOR RENDER)
// ================================
app.get("/health", (_, res) => {
    res.send("8Berries is healthy");
});

// AI API
app.post("/api", async(req, res) => {
    try {
        const ai = await groq.chat.completions.create({
            model: "llama-3.3-70b-versatile",
            messages: [{
                    role: "system",
                    content: `
You are ChartGPT.
If the user asks for a chart, respond ONLY in JSON:
{
  "type": "chart",
  "chartType": "bar|line|pie",
  "title": "Chart title",
  "labels": [],
  "data": []
}
Otherwise respond normally as text.
          `
                },
                { role: "user", content: req.body.message }
            ]
        });

        const content = ai.choices[0].message.content.trim();

        try {
            const parsed = JSON.parse(content);
            if (parsed.type === "chart") return res.json(parsed);
        } catch {}

        res.json({ reply: content });

    } catch (err) {
        console.error(err);
        res.json({ reply: "AI error." });
    }
});

// ================================
// START SERVER (RENDER READY)
// ================================
app.listen(PORT, () => {
    console.log("🍓 8Berries running on port " + PORT);
});