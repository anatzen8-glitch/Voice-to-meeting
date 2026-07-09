# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

VoiceMeet — a voice-first web app that lets SMB owners schedule Google Calendar meetings by speaking (Hebrew or English). The user speaks → browser transcribes → Gemini extracts meeting fields → user confirms → a Google Calendar event is created.

## Commands

There is **no build step, no package.json, no tests, and no linter**. The frontend is static files served as-is; the backend is Vercel serverless functions using only Node.js built-ins (global `fetch`, no npm dependencies).

- **Deploy:** `git push` to the branch connected in Vercel — Vercel auto-deploys. There is no manual build.
- **Local dev (optional):** `vercel dev` (Vercel CLI) runs the static site + `/api/*` functions together with env vars. Opening `index.html` directly will NOT work because the `/api/*` calls 404.
- **Redeploy without a push:** Vercel dashboard → Deployments → ⋯ → Redeploy. Required after changing environment variables.

## Environment variables (set in Vercel → Settings → Environment Variables)

- `GEMINI_API_KEY` — Google AI Studio key. Consumed server-side by `api/parse.js`. **The Google Cloud project behind the key must have billing enabled** or Gemini returns errors.
- `GOOGLE_CLIENT_ID` — OAuth client ID. Exposed to the browser via `GET /api/config` (never expose a client *secret* here; the app uses the implicit token flow, no secret needed).

After changing either, you must Redeploy for functions to pick up the new value.

## Architecture

Two layers, connected only over HTTP:

**Frontend (static, runs in browser):** `index.html`, `styles.css`, `app.js`
- `app.js` is the whole client. Key pieces:
  - `meetingDraft` — a single mutable object accumulating fields across turns. Each Gemini parse is merged in via `mergeIntoDraft()` so context is *not* lost between utterances. This is the core state model — Gemini returns `null` for anything not mentioned in the current turn, and only non-null fields overwrite the draft.
  - `translations` + `t()` — all UI strings are bilingual (`he`/`en`). `currentLanguage` also switches `recognition.lang` and page `dir` (rtl/ltr). Default is Hebrew.
  - `draftToStartEnd()` — converts the draft's loose date/time strings into RFC3339 `start_iso`/`end_iso`. Contains substantial Hebrew normalization (month names, spoken numbers like `שלוש`→`3`, `בערב`→pm) and **hardcodes the `Asia/Jerusalem` timezone with a manual DST offset guess**. This is the most fragile part of the codebase — most date/time bugs live here, not in Gemini.
  - Google Sign-In uses the GSI token client (`google.accounts.oauth2.initTokenClient`) to get an `accessToken` scoped to `calendar.events`. The token is held in memory only.

**Backend (Vercel serverless, `api/*.js`):** each file is a `module.exports = async (req,res) => {}` handler, CommonJS, no imports.
- `api/parse.js` — builds the extraction prompt and calls the Gemini REST API. Escapes user text (`escapeForPrompt`) against prompt injection. Returns strict JSON `{title,date,time,duration,attendee,location,raw_interpretation}`.
- `api/calendar-create.js` — takes the browser's `accessToken` + iso times and POSTs to the Google Calendar API. The browser holds the token; this function just relays it.
- `api/config.js` — returns `GOOGLE_CLIENT_ID` to the frontend so the client ID isn't hardcoded.

**Data flow:** mic → Web Speech API (browser) → `POST /api/parse` (Gemini) → merge into `meetingDraft` → user taps Schedule → `draftToStartEnd()` → `POST /api/calendar-create` → Google Calendar.

### BACKEND switch

`app.js` has a top-level `const BACKEND = 'vercel' | 'n8n'`. In `'n8n'` mode the app posts to n8n webhook URLs instead of `/api/*` and skips the built-in Google Sign-In (n8n owns OAuth). The `n8n/` directory holds an importable workflow and setup notes for that alternative. Default and primary path is `'vercel'`.

## Gemini API gotchas (these have each caused outages)

- Model + API version must be a **currently supported pair**. Gemini 1.5 models are retired and 404 on any version. `api/parse.js` currently uses `v1beta/models/gemini-2.0-flash`. If you get `404 ... not found for API version`, the model name is the problem — do not blindly toggle `v1`/`v1beta`; verify the model is live first.
- A 500 from `/api/parse` is usually one of: missing/rotated `GEMINI_API_KEY`, billing disabled on the Google project, or a retired model — check the Vercel **function logs** for the real Gemini error message, which the handler forwards in `details`.

## vercel.json

Keep it minimal — `{ "version": 2 }`. Do **not** add a `functions.runtime` field with a version string (e.g. `nodejs20.x`); it triggers `Function Runtimes must have a valid version` build failures. Vercel auto-detects `api/*.js` as Node functions without configuration.

## Reference docs in this repo

`README.md` is the full PRD (product spec, KPIs, roadmap). `SETUP-FROM-SCRATCH.md`, `GETTING-ACTIVE.md`, and `REPO-AND-DEPLOYMENT.md` are user-facing setup guides for the non-technical owner. `n8n/README.md` covers the n8n alternative backend.
