// Groq version. Paste this over api/chat.js on GitHub, and set GROQ_API_KEY in Vercel.
const SYSTEM = `You are Sutton AI, a friendly study helper for students. Help people understand ideas: explain step by step, give examples, check understanding, and answer questions clearly like a great tutor. For homework-style problems, teach the method and walk through a similar example so the student can do it themselves. Do not write full essays or complete graded assignments to be turned in as the student's own work; offer outlines, feedback, and explanations instead. Be warm and concise.`;

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });

  const body = req.body || {};
  let messages = Array.isArray(body.messages) ? body.messages : [];
  messages = messages
    .filter((m) => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
    .slice(-20)
    .map((m) => ({ role: m.role, content: m.content.slice(0, 4000) }));

  if (!messages.length || messages[0].role !== "user") {
    return res.status(400).json({ error: "Bad request" });
  }

  try {
    const r = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: "Bearer " + process.env.GROQ_API_KEY,
      },
      body: JSON.stringify({
        model: process.env.MODEL || "llama-3.3-70b-versatile",
        max_tokens: 1200,
        messages: [{ role: "system", content: SYSTEM }, ...messages],
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
