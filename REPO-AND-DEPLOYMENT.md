# VoiceMeet — Repo & Deployment: One Place, All Correct

## Is everything in one place? **Yes.**

| What | Where | Status |
|------|--------|--------|
| **Requirements (PRD)** | This repo → `README.md` | ✅ |
| **Deployment guide** | This repo → `GETTING-ACTIVE.md` | ✅ |
| **Solution (code)** | This repo → `index.html`, `app.js`, `styles.css`, `api/parse.js` | ✅ |
| **Vercel config** | This repo → `vercel.json` | ✅ |
| **Live deployment** | Vercel project **voice-meet-cur** (deploys from this repo) | ✅ |

**Your single source of truth:**  
- **Folder:** `C:\Users\anatz\Projects\Voice-to-meeting`  
- **GitHub:** https://github.com/anatzen8-glitch/Voice-to-meeting (branch: `claude/define-product-requirements-EcuJu`)  
- **Vercel:** Project name **voice-meet-cur** — it *pulls* from the GitHub repo above. The name "voice-meet-cur" is only what you see in Vercel; the code is always from Voice-to-meeting.

So: **one repo (Voice-to-meeting), one deployment (voice-meet-cur).** Different names, same project.

---

## Naming (why it feels confusing)

| Name | What it is |
|------|------------|
| **Voice-to-meeting** | GitHub **repository** name (where the code lives). |
| **voice-meet-cur** | Vercel **project** name (what you chose when importing). It’s just a label; the app still runs the code from Voice-to-meeting. |
| **voice-to-meeting.vercel.app** | Default Vercel URL (from repo name). Your real URL may be like `voice-meet-cur-xxx.vercel.app` — check Vercel → your project → Domains. |

You are **not** maintaining two projects. You have:
1. One GitHub repo: **Voice-to-meeting**
2. One Vercel project: **voice-meet-cur** that deploys from that repo

---

## Repo verification (this folder = what’s on GitHub)

```
Voice-to-meeting/
├── api/
│   └── parse.js          ← Serverless function (Gemini parsing)
├── index.html            ← App entry
├── app.js                ← Voice + UI logic
├── styles.css            ← Styles
├── vercel.json           ← Vercel config (version 2 only)
├── README.md              ← PRD / requirements
├── GETTING-ACTIVE.md      ← Deployment + MVP steps
└── REPO-AND-DEPLOYMENT.md ← This file
```

- **Git remote:** `origin` → `https://github.com/anatzen8-glitch/Voice-to-meeting.git`  
- **Current branch:** `claude/define-product-requirements-EcuJu`  
- **Vercel** should be set to deploy from: **anatzen8-glitch/Voice-to-meeting**, branch **claude/define-product-requirements-EcuJu**.

---

## “It’s still not working” — what to check

### 1. Build on Vercel

- Vercel → your project **voice-meet-cur** → **Deployments**.
- Latest deployment should be **Ready** (green), not **Build Failed**.
- If it failed: open the deployment → **Build Logs** and fix the error (we already fixed the “Function Runtimes” issue).

### 2. Environment variable (required for “Understanding”)

- Vercel → **voice-meet-cur** → **Settings** → **Environment Variables**.
- You must have: **Name:** `GEMINI_API_KEY`, **Value:** your key from [Google AI Studio](https://aistudio.google.com/).
- Scope: **Production** (and **Preview** if you test preview URLs).
- If this is missing or wrong, the app will load but “Understanding…” will fail when you speak.

### 3. Redeploy after changing env vars

- After adding or changing `GEMINI_API_KEY`, use **Redeploy** (e.g. Deployments → … on latest → Redeploy) so the new value is used.

### 4. Use the real Vercel URL

- In Vercel → **voice-meet-cur** → **Settings** → **Domains** (or the project overview), copy the **production URL** (e.g. `voice-meet-cur-xxx.vercel.app` or `voice-to-meeting.vercel.app`).
- Open that URL in the browser (Chrome recommended for mic). Don’t test only on `localhost` unless you’re running the same code and API locally.

### 5. Microphone and HTTPS

- The app needs **microphone** permission and works best in **Chrome**.
- Use **HTTPS** (Vercel gives you HTTPS). Some browsers block mic on plain HTTP.

---

## Quick checklist (run through once)

- [ ] GitHub repo is **anatzen8-glitch/Voice-to-meeting**, branch **claude/define-product-requirements-EcuJu**.
- [ ] Local folder **Voice-to-meeting** is that repo (e.g. `git remote -v` shows the URL above).
- [ ] Vercel project **voice-meet-cur** is connected to that repo and branch.
- [ ] Latest deployment on Vercel is **Ready** (green).
- [ ] **GEMINI_API_KEY** is set in Vercel (Settings → Environment Variables) and you redeployed after setting it.
- [ ] You’re opening the **Vercel production URL** in **Chrome** and allowing the microphone when prompted.

If all of the above are true and it still doesn’t work, the next step is to see the exact error (e.g. in the browser **Developer Tools → Console** and **Network** when you tap the mic).

---

## Summary

- **Requirements, solution, and deployment are all tied to one place:** the repo **Voice-to-meeting** (this folder and its GitHub copy).
- **voice-meet-cur** is just the Vercel project name; it doesn’t create a second repo or a second “project” — it’s the same app, deployed.
- To fix “still not working,” go through the checklist above (build, `GEMINI_API_KEY`, redeploy, correct URL, Chrome, mic).
