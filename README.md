# SycoScan

**Detect when an AI's answer was shaped by what you wanted to hear rather than by facts**

SycoScan adds a tag to AI replies (Likely sycophantic / Mixed signals / Independent) and shows the evidence behind it. Built for the Nebius x NVIDIA Global AI Hackathon, **Best Apps and Agents** track.

## The idea: differential testing

Judging one reply's text for sycophancy is unreliable. SycoScan instead asks: *would the answer have changed if the user had said something different?*

1. Find the stance the user expressed ("I think X, right?", "I wrote this").
2. Rewrite the prompt two ways: **neutral** (stance removed) and **flipped** (opposite stance).
3. Get answers to both and compare them with the original reply.
4. If the conclusion tracks the user's stance rather than the facts, flag it, with the three answers as evidence.

Agreement with a user who is actually right is not flagged.

## How it works

```
 user prompt + AI reply
          |
   [Nemotron Nano]   cheap screen -> clearly fine? return "Independent" (fast path)
          |
   [Nemotron Super]  rewrite prompt (neutral + flipped), answer both in parallel
          |
   [Nemotron Ultra]  adjudicate whether the substance changed because of the stance
          |
   verdict + score + reason + evidence + neutral answer
```

| Model tier | Job | Why |
|---|---|---|
| Nano | First-pass screen of every reply | Fast and cheap, most replies stop here |
| Super | Prompt rewriting and probe answers | Frequent calls, moderate reasoning |
| Ultra | Final adjudication and explanation | Only runs when the screen is suspicious |

## Nebius and NVIDIA usage

- **NVIDIA Nemotron** Nano, Super and Ultra, each with a distinct role (table above).
- **Nebius Token Factory**: all inference goes through its OpenAI-compatible API (`backend/server.py`). The tiered routing keeps latency and credit use low.
- Other Nebius services: _none yet_ (see Roadmap).

## Repository layout

```
backend/     FastAPI service: the Nano -> Super -> Ultra pipeline + paste-in web page
extension/   Chrome extension (Manifest V3) that tags replies on supported chat sites
LICENSE      MIT
```

## Quick start

### 1. Backend
```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env      # add your Token Factory key and model IDs
uvicorn server:app --port 8000
```
Open http://localhost:8000 and paste a prompt and the AI's reply.

### 2. Browser extension (optional)
1. Open `chrome://extensions`, enable Developer mode.
2. Click **Load unpacked** and select the `extension/` folder.
3. Open a supported chat, wait for a reply to finish, and click the tag under it.

Chat sites change their page structure often. If tags stop appearing, update the selectors at the top of `extension/content.js`.

### API
`POST /analyze` with `{"user_prompt": "...", "ai_reply": "..."}` returns `verdict`, `score`, `reason`, `evidence`, and `neutral_answer`.

## Privacy

The backend does not store conversations. Text is sent only to the configured Token Factory endpoint to run the analysis. The extension checks a reply only when you click its tag, unless you turn on auto-check in the popup.

## Limitations

- The probe and judge models can themselves be biased. The counterfactual method reduces reliance on the judge's taste, but doesn't remove it.
- Sycophancy detection is probabilistic; treat the tag as evidence, not proof.
- No benchmark results yet.

## Roadmap

- [ ] Verify factual claims in the prompt with web search
- [ ] Benchmark precision/recall on public sycophancy datasets
- [ ] Deploy on Nebius Serverless Endpoints
- [ ] Pushback test ("are you sure?") and per-conversation trend

## License

MIT, see [LICENSE](LICENSE).
