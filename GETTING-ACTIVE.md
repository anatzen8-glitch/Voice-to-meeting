# VoiceMeet — Step-by-Step: Make It Active

This guide gets VoiceMeet **live** and then completes the MVP so users can schedule meetings end-to-end.

---

## Part A: Get It Live (Current App)

**Goal:** Deploy so the app is on a public URL and voice + parsing works.

### Step A1: Get a Gemini API key

1. Go to [Google AI Studio](https://aistudio.google.com/).
2. Sign in with your Google account.
3. Open **Get API key** (or **API keys** in the menu).
4. Create an API key and copy it. You’ll add it in A3.

### Step A2: Deploy to Vercel

1. Push your code to GitHub (if you haven’t already).
2. Go to [vercel.com](https://vercel.com) and sign in (e.g. with GitHub).
3. Click **Add New…** → **Project**.
4. Import your **Voice-to-meeting** repo.
5. Leave **Framework Preset** as “Other” (no build).
6. Before deploying, open **Environment Variables** and add:
   - **Name:** `GEMINI_API_KEY`  
   - **Value:** (paste the key from A1)  
   - **Environment:** Production (and Preview if you want).
7. Click **Deploy**.
8. When it’s done, open the project **Settings** → **Domains** to see your live URL (e.g. `voice-meet-xxx.vercel.app`).

### Step A3: Test the live app

1. Open your Vercel URL in **Chrome** (for best voice support).
2. Allow microphone when prompted.
3. Tap the mic, say something like: *“Meeting with john@test.com tomorrow at 3pm”*.
4. You should see your message and the app’s “I understood: …” plus “I still need: …” if something is missing.

**Checkpoint:** App is **active** — voice input and Gemini parsing work in production.

---

## Part B: Complete the Conversation (Phase 4)

**Goal:** App asks for missing info and shows a confirmation before creating anything.

| Step | What to do | Result |
|------|------------|--------|
| B1 | In the frontend, keep **state** for the current “draft” meeting (title, date, time, duration, attendee, location). | One object holds everything parsed so far. |
| B2 | After each parse, **merge** new fields into the draft; **don’t** replace the whole thing. | Multiple voice turns fill in missing fields. |
| B3 | If required fields are missing (date, time, attendee), **ask once** for the next missing item (e.g. “When should it be?” or “Who should I invite?”). | One follow-up question per turn. |
| B4 | When date, time, and attendee are all present, **show confirmation**: “Here’s what I have: … Should I schedule this?” | User sees full summary. |
| B5 | **Listen for confirmation** (“yes”, “confirm”, “schedule it”) and then call the calendar API (Phase 5). If you don’t have calendar yet, show “Schedule it” and a “Coming soon” or mock success message. | Ready to plug in real calendar in Part C. |

**Checkpoint:** Full conversation from “What do you have?” to “Should I schedule this?” works.

---

## Part C: Google Calendar (Phase 5)

**Goal:** User signs in with Google and meetings are created on their calendar.

### Step C1: Google Cloud project

1. Go to [Google Cloud Console](https://console.cloud.google.com/).
2. Create a **new project** (e.g. “VoiceMeet”).
3. Enable **Google Calendar API**: APIs & Services → **Library** → search “Google Calendar API” → **Enable**.

### Step C2: OAuth credentials

1. APIs & Services → **Credentials** → **Create Credentials** → **OAuth client ID**.
2. If asked, configure **OAuth consent screen**: External, add your email as tester.
3. Application type: **Web application**.
4. Add **Authorized JavaScript origins**:  
   - `https://your-app.vercel.app`  
   - `http://localhost:3000` (for local dev)
5. Add **Authorized redirect URIs**:  
   - `https://your-app.vercel.app` (or `/api/auth/callback` if you use a callback route)  
   - `http://localhost:3000` (for local)
6. Create and copy **Client ID** and **Client Secret**.

### Step C3: Backend auth and calendar

1. Add a serverless route (e.g. `/api/auth/callback`) to exchange the OAuth code for tokens; store **refresh token** securely (e.g. Vercel env or a small DB).
2. Add an API route (e.g. `/api/calendar/create`) that:
   - Uses the user’s stored token to call Google Calendar API.
   - Accepts: title, date, time, duration, attendee(s), optional location.
   - Creates an event and returns success/error.
3. Set **env vars** on Vercel: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and any secret you use for encrypting/signing tokens.

### Step C4: Frontend: Sign in and “Schedule it”

1. Add a **“Sign in with Google”** flow that redirects to OAuth and then back to your app (callback above).
2. When the user confirms (“Yes, schedule it”), call `/api/calendar/create` with the draft meeting.
3. On success: show “Done! Meeting scheduled.” and clear the draft. On error: show a short message and keep the draft.

**Checkpoint:** End-to-end — voice → parse → confirm → real event on Google Calendar.

---

## Part D: Polish (Phase 6)

| Step | What to do |
|------|------------|
| D1 | **Errors:** Network failures, “API key not configured”, calendar errors → show clear messages and “Try again”. |
| D2 | **Mobile:** Test on a phone; ensure mic button and conversation are usable (you already have some responsive CSS). |
| D3 | **Edge cases:** No speech, denied mic, very long utterances — handle without breaking the UI. |

---

## Quick reference: what you need

| What | When | Where |
|------|------|--------|
| **Vercel account** | Part A | vercel.com |
| **Gemini API key** | Part A | aistudio.google.com → API keys |
| **GEMINI_API_KEY** | Part A | Vercel project → Environment Variables |
| **Google Cloud project** | Part C | console.cloud.google.com |
| **Calendar API + OAuth client** | Part C | Same project → APIs & Services |
| **GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET** | Part C | Vercel Environment Variables |

---

## Current status

- **Done:** Phases 1–3 (UI, voice input, Gemini parsing).  
- **Next:** Part A (deploy) → then Part B (conversation) → Part C (Calendar) → Part D (polish).

Start with **Part A** to get the app active; then do B → C → D in order for the full MVP.
