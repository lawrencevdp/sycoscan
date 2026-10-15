// Site adapters. Chat DOMs change often: verify these selectors in DevTools if tags stop appearing.
const ADAPTERS = {
  "chatgpt.com": { assistant: '[data-message-author-role="assistant"]', user: '[data-message-author-role="user"]' },
  "chat.openai.com": { assistant: '[data-message-author-role="assistant"]', user: '[data-message-author-role="user"]' },
  "claude.ai": { assistant: ".font-claude-response, .font-claude-message", user: '[data-testid="user-message"]' },
};
const A = ADAPTERS[location.hostname];
const LABELS = { sycophantic: "Likely sycophantic", mixed: "Mixed signals", independent: "Independent" };
let autoCheck = false;
chrome.storage.sync.get({ auto: false }, (s) => (autoCheck = s.auto));

function previousUserText(node) {
  const all = [...document.querySelectorAll(`${A.assistant}, ${A.user}`)];
  for (let i = all.indexOf(node) - 1; i >= 0; i--) if (all[i].matches(A.user)) return all[i].innerText.trim();
  return "";
}

function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text; // textContent only: never inject page or model text as HTML
  return e;
}

function renderResult(wrap, tag, data) {
  tag.className = `sycoscan-tag sycoscan-${data.verdict}`;
  tag.textContent = `${LABELS[data.verdict] || data.verdict} · ${data.score}`;
  const old = wrap.querySelector(".sycoscan-panel");
  if (old) old.remove();
  const p = el("div", "sycoscan-panel");
  p.append(el("p", "sycoscan-reason", data.reason));
  if (data.evidence) {
    for (const [k, label] of [["original", "This reply said"], ["neutral", "Asked neutrally"], ["flipped", "With your opinion flipped"]]) {
      p.append(el("div", "sycoscan-label", label), el("div", "sycoscan-ev", data.evidence[k] || ""));
    }
  }
  if (data.neutral_answer) {
    const d = el("details");
    d.append(el("summary", "", "Show the neutral answer"), el("div", "sycoscan-ev", data.neutral_answer));
    p.append(d);
  }
  wrap.append(p);
}

function run(node, wrap, tag) {
  const user_prompt = previousUserText(node), ai_reply = node.innerText.trim();
  if (!user_prompt || !ai_reply) return;
  tag.className = "sycoscan-tag sycoscan-pending";
  tag.textContent = "Checking…";
  chrome.runtime.sendMessage({ type: "analyze", user_prompt, ai_reply }, (res) => {
    if (!res || !res.ok) {
      tag.className = "sycoscan-tag sycoscan-error";
      tag.textContent = "Check failed · retry";
      tag.title = res ? res.error : "No response from extension";
      return;
    }
    renderResult(wrap, tag, res.data);
  });
}

function attach(node) {
  if (node.dataset.sycoscan) return;
  node.dataset.sycoscan = "1";
  const wrap = el("div", "sycoscan-wrap");
  const tag = el("button", "sycoscan-tag sycoscan-idle", "Check for bias");
  tag.type = "button";
  tag.onclick = () => run(node, wrap, tag);
  wrap.append(tag);
  node.insertAdjacentElement("afterend", wrap);
  if (autoCheck) run(node, wrap, tag);
}

// Wait until a reply stops changing (i.e. finished streaming) before tagging it.
let timer;
const scan = () => document.querySelectorAll(A.assistant).forEach((n) => {
  if (n.dataset.sycoscan) return;
  const len = n.innerText.length;
  setTimeout(() => n.innerText.length === len && len > 0 && attach(n), 1500);
});
if (A) new MutationObserver(() => { clearTimeout(timer); timer = setTimeout(scan, 800); }).observe(document.body, { childList: true, subtree: true });
