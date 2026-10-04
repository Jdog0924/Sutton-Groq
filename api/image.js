// Vercel image backend (Cloudflare Workers AI, FLUX.1 schnell). Needs CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN.
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });
  const body = req.body || {};
  const prompt = typeof body.prompt === "string" ? body.prompt.trim().slice(0, 1500) : "";
  if (!prompt) return res.status(400).json({ error: "No prompt" });

  const id = process.env.CLOUDFLARE_ACCOUNT_ID;
  const token = process.env.CLOUDFLARE_API_TOKEN;
  if (!id || !token) return res.status(500).json({ error: "Image service is not set up yet" });

  try {
    const r = await fetch("https://api.cloudflare.com/client/v4/accounts/" + id + "/ai/run/@cf/black-forest-labs/flux-1-schnell", {
      method: "POST",
      headers: { authorization: "Bearer " + token, "content-type": "application/json" },
      body: JSON.stringify({ prompt }),
    });
    const type = (r.headers.get("content-type") || "").split(";")[0];
    let b64 = "";
    let mime = "image/jpeg";
    if (type.startsWith("image/")) {
      mime = type;
      b64 = Buffer.from(await r.arrayBuffer()).toString("base64");
    } else {
      const d = await r.json();
      if (!r.ok || d.success === false) return res.status(500).json({ error: (d && d.errors && d.errors[0] && d.errors[0].message) || "Image error" });
      b64 = (d && d.result && d.result.image) || "";
    }
    if (!b64) return res.status(500).json({ error: "No image came back" });
    return res.status(200).json({ image: "data:" + mime + ";base64," + b64 });
  } catch (e) {
    return res.status(500).json({ error: "Server error" });
  }
}
