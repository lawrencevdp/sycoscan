// Service worker does the network call so page CSP/CORS never gets in the way.
chrome.runtime.onMessage.addListener((msg, _sender, reply) => {
  if (msg.type !== "analyze") return;
  chrome.storage.sync.get({ backend: "http://localhost:8000" }, async ({ backend }) => {
    try {
      const r = await fetch(`${backend.replace(/\/$/, "")}/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_prompt: msg.user_prompt, ai_reply: msg.ai_reply }),
      });
      if (!r.ok) throw new Error(`Backend returned ${r.status}`);
      reply({ ok: true, data: await r.json() });
    } catch (e) {
      reply({ ok: false, error: String(e.message || e) });
    }
  });
  return true; // keep channel open for async reply
});
