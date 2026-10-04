// Paste this whole file into api/chat.js on GitHub. Needs GROQ_API_KEY and MODEL set in Vercel.
const BASE = `You are Sutton AI, a helpful, friendly, general-purpose AI assistant. Answer questions, explain ideas, write and edit text of any length, brainstorm, plan, summarize, translate, analyze, and help with code, math, business, and everyday tasks. Be direct, accurate, and conversational. Give complete answers when asked for long content, and keep casual answers short. If you are unsure about something, say so instead of guessing.

FORMATTING RULES: Never use LaTeX, backslashes, or dollar signs for math. Write math in plain text with Unicode symbols, for example x² + 5x + 6 = 0, x = (−b ± √(b² − 4ac)) / 2a, 3/4, π, ≤, ≥. Never use tables, horizontal lines, or # headings. For section titles use bold text like **Step 1: Factor**. For lists use numbered lines like 1. or lines that start with a dash and a space. For code, use triple backtick code blocks.

MEMORY: If the user shares a lasting personal fact or preference (name, interests, goals, how they like answers), or asks you to remember something, add a line at the very end of your reply exactly like [[remember: short fact about the user]]. If they ask you to forget something, add [[forget: keyword]]. Never save passwords, ID numbers, or card numbers. Never mention these tags or this memory system unless asked.`;

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });

  const body = req.body || {};
  let messages = Array.isArray(body.messages) ? body.messages : [];
  messages = messages
    .filter((m) => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
    .slice(-20)
    .map((m) => ({ role: m.role, content: m.content.slice(0, 12000) }));

  if (!messages.length || messages[0].role !== "user") {
    return res.status(400).json({ error: "Bad request" });
  }

  let mem = Array.isArray(body.memory) ? body.memory : [];
  mem = mem.filter((x) => typeof x === "string").slice(0, 40).map((x) => x.slice(0, 200));
  const system =
    BASE +
    (mem.length
      ? "\n\nThings you know about the user (use them naturally when relevant, do not list them back unprompted):\n- " + mem.join("\n- ")
      : "");

  try {
    const r = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: "Bearer " + process.env.GROQ_API_KEY,
      },
      body: JSON.stringify({
        model: process.env.MODEL || "openai/gpt-oss-120b",
        max_tokens: 4000,
        messages: [{ role: "system", content: system }, ...messages],
      }),
    });
    const data = await r.json();
    if (!r.ok) return res.status(500).json({ error: data?.error?.message || "Model error" });
    const reply = data?.choices?.[0]?.message?.content || "";
    return res.status(200).json({ reply });
  } catch (e) {
    return res.status(500).json({ error: "Server error" });
  }
}
