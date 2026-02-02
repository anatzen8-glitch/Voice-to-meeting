# VoiceMeet - Complete Setup from Scratch

This guide walks through configuring **all services** step-by-step for VoiceMeet. We'll do this cleanly, one service at a time.

---

## Overview: What We're Setting Up

| Service | What It Does | What We Need |
|---------|---------------|--------------|
| **Gemini API** | Parses voice input (Hebrew/English) → meeting details | API key from Google AI Studio |
| **Google Calendar API** | Creates events on user's calendar | OAuth Client ID from Google Cloud |
| **Vercel** | Hosts the app + serverless functions | Connect repo, set env vars |

---

## Step 1: Gemini API (NLP Parsing)

### 1.1 Get API Key

1. Go to **[Google AI Studio](https://aistudio.google.com/)**
2. Sign in with your Google account
3. Click **"Get API key"** (or **"API keys"** in menu)
4. Click **"Create API key"**
5. Choose **"Create API key in new project"** (or select existing project)
6. **Copy the API key** (starts with `AIza...` or similar)
7. **Save it somewhere safe** - you'll add it to Vercel in Step 3

**Gemini free tier limits:** The API has rate limits (e.g. ~15–20 requests per minute) and daily caps. If you see **"Resource exhausted"** or **429** in the app or logs, you've hit the quota for that period. Wait 1–2 minutes (or until the next day for daily limit) and try again. The app shows a friendly message: "המכסה זמנית מלאה. נסה שוב בעוד דקה." / "API quota used for now. Try again in a minute."

**Checkpoint:** You have a Gemini API key copied.

---

## Step 2: Google Calendar API (OAuth + Calendar)

### 2.1 Create Google Cloud Project

1. Go to **[Google Cloud Console](https://console.cloud.google.com/)**
2. Click the **project dropdown** at the top (may say "Select a project")
3. Click **"New Project"**
4. **Project name:** `VoiceMeet` (or any name you like)
5. Click **"Create"**
6. Wait for it to finish, then **select this new project** from the dropdown

**Checkpoint:** You have a new Google Cloud project selected.

---

### 2.2 Enable Google Calendar API

1. In Google Cloud Console, go to **"APIs & Services"** → **"Library"** (left sidebar)
2. Search for **"Google Calendar API"**
3. Click on **"Google Calendar API"**
4. Click **"Enable"**
5. Wait for it to enable (may take a few seconds)

**Checkpoint:** Google Calendar API is enabled.

---

### 2.3 Configure OAuth Consent Screen

1. Go to **"APIs & Services"** → **"OAuth consent screen"** (left sidebar)
   - OR: **Menu** → **"Google Auth platform"** → **"Branding"** (newer UI)
2. **User Type:** Select **"External"** → Click **"Create"**
3. **App information (Step 1):**
   - **App name:** `VoiceMeet`
   - **User support email:** Your email (e.g. anat.zenou@gmail.com)
   - **App logo:** (optional, skip for now)
   - **App domain:** (optional, skip for now)
   - **Application home page:** (optional, skip for now)
   - **Application privacy policy link:** (optional, skip for now)
   - **Application terms of service link:** (optional, skip for now)
   - **Authorized domains:** (optional, skip for now)
   - **Developer contact information:** Your email
4. Click **"Save and Continue"**
5. **Scopes (Step 2):**
   - Click **"+ ADD OR REMOVE SCOPES"** button
   - In the filter/search box, type: `calendar.events`
   - Find and check: **`https://www.googleapis.com/auth/calendar.events`**
     - Description: "View and edit events on all your calendars"
   - Click **"UPDATE"** (or "Add to table")
   - Click **"SAVE AND CONTINUE"**
6. **Test users (Step 3):**
   - Click **"+ ADD USERS"** button
   - Type your email: **anat.zenou@gmail.com** (or the email you'll use to test)
   - Click **"ADD"**
   - You should see your email listed under "Test users"
   - Click **"SAVE AND CONTINUE"**
7. **Summary (Step 4):**
   - Review your settings
   - Click **"BACK TO DASHBOARD"** (or "Save" if that's the only option)

**Important Notes:**
- **If you don't see a "Scopes" step:** Some Google Cloud Console versions don't show scopes in the consent screen. In that case:
  1. Complete Steps 1-3 and 6-7 (skip Step 5 about scopes)
  2. The scope will be configured when you create the OAuth Client ID in Step 2.4 (it will ask for scopes there)
- **If scopes are required:** The scope `https://www.googleapis.com/auth/calendar.events` will be requested automatically when your app calls `initTokenClient` with that scope in the code (which we already have in `app.js`)

**Checkpoint:** OAuth consent screen is configured with test user added.

---

### 2.4 Create OAuth Client ID

1. Go to **"APIs & Services"** → **"Credentials"** (left sidebar)
2. Click **"+ CREATE CREDENTIALS"** → **"OAuth client ID"**
3. **Application type:** Select **"Web application"**
4. **Name:** `VoiceMeet Web Client`
5. **Authorized JavaScript origins:**
   - Click **"+ ADD URI"**
   - Add: `https://your-app.vercel.app` (we'll update this with your real Vercel URL in Step 3.4)
   - Add: `http://localhost:3000` (for local testing)
6. **Authorized redirect URIs:** 
   - Leave empty (we're using Google Identity Services, no redirect needed)
   - OR if required, add: `http://localhost:3000` (for local testing)
7. **Scopes (if shown here):**
   - If you see a "Scopes" field or section, add: `https://www.googleapis.com/auth/calendar.events`
   - If not shown, that's OK - the scope is requested in your app code
8. Click **"Create"**
9. **Copy the Client ID** (long string ending in `.apps.googleusercontent.com`)
   - Example: `1008298051526-xxxxxxxxxxxxx.apps.googleusercontent.com`
10. **Save it somewhere safe** - you'll add it to Vercel in Step 3

**Note:** The scope `calendar.events` doesn't need to be explicitly listed here if it wasn't in Step 2.3. Your app code (`app.js`) already requests this scope when calling `initTokenClient`, and Google will prompt the user for permission when they sign in.

**Checkpoint:** You have an OAuth Client ID copied.

---

## Step 3: Vercel (Hosting + Environment Variables)

### 3.1 Connect Repository

1. Go to **[vercel.com](https://vercel.com)** → Sign in
2. Click **"Add New..."** → **"Project"**
3. **Import Git Repository:** Search for `Voice-to-meeting` (or `voice2meet2` if you're using that)
4. Select the repo: **`anatzen8-glitch/Voice-to-meeting`**
5. **Project Settings:**
   - **Project Name:** `voice-meet` (or any name)
   - **Framework Preset:** **"Other"** (or leave as detected)
   - **Root Directory:** `./` (should be default)
   - **Build Command:** Leave empty
   - **Output Directory:** Leave empty
6. **Don't deploy yet** - we need to add env vars first

**Checkpoint:** Project is created but not deployed.

---

### 3.2 Add Environment Variables

1. In the Vercel project setup, scroll to **"Environment Variables"** section
2. Click to expand it
3. Add **Variable 1:**
   - **Key:** `GEMINI_API_KEY`
   - **Value:** (paste the Gemini API key from Step 1.1)
   - **Environment:** Check **Production** (and **Preview** if you want)
4. Add **Variable 2:**
   - **Key:** `GOOGLE_CLIENT_ID`
   - **Value:** (paste the OAuth Client ID from Step 2.4)
   - **Environment:** Check **Production** (and **Preview** if you want)
5. Click **"Deploy"**

**Checkpoint:** Deployment starts with env vars set.

---

### 3.3 Get Your Vercel URL

1. Wait for deployment to finish (usually 1-2 minutes)
2. When it's **Ready**, click on the deployment
3. Copy your **production URL** (e.g. `voice-meet-xxxx.vercel.app`)
4. **Save this URL** - you'll need it in Step 3.4

**Checkpoint:** You have your Vercel app URL.

---

### 3.4 Update Google Cloud Authorized Origins

1. Go back to **Google Cloud Console** → **"APIs & Services"** → **"Credentials"**
2. Click the **pencil icon** (edit) next to your OAuth Client ID
3. Under **"Authorized JavaScript origins"**, find the entry with `https://your-app.vercel.app`
4. **Replace it** with your actual Vercel URL: `https://voice-meet-xxxx.vercel.app` (use your real URL)
5. Click **"Save"**

**Checkpoint:** Google Cloud knows your Vercel URL.

---

## Step 4: Test Everything

### 4.1 Test the App

1. Open your **Vercel app URL** in **Chrome** (best for voice support)
2. **Sign in with Google:**
   - Click **"Sign in with Google"** button
   - Sign in with the email you added as a test user (anat.zenou@gmail.com)
   - Allow calendar access when asked
   - You should see **"Signed in"** status
3. **Language:** Default is Hebrew. Use **עברית / English** in the header to switch; conversation and UI follow the selected language.
4. **Test voice:**
   - Click the **mic button**
   - Say: *"Meeting with test@example.com tomorrow at 3pm"* (or in Hebrew)
   - You should see your message and the app's understanding (e.g. "התקבל:" / "I understood: ...")
5. **Test scheduling:**
   - When draft is complete (date + time), click **"יש אישור לזימון?"** (Hebrew) or **"Schedule it"** (English)
   - Check your **Google Calendar** — the event should appear

**Checkpoint:** Everything works end-to-end!

---

## Troubleshooting

### "API key not configured" error
- **Fix:** Check Vercel → Settings → Environment Variables → `GEMINI_API_KEY` is set and you **redeployed** after adding it

### "403 access_denied" when signing in
- **Fix:** Make sure your email is in **OAuth consent screen** → **Test users** (Step 2.3)

### "Sign in with Google" button doesn't appear
- **Fix:** Check Vercel → Settings → Environment Variables → `GOOGLE_CLIENT_ID` is set and you **redeployed**

### 404 error on Vercel
- **Fix:** Make sure Vercel is connected to the correct repo (`Voice-to-meeting`) and the correct branch

### "Resource exhausted" / 429 when speaking
- **Cause:** Gemini API free tier limit (rate limit or daily quota).
- **Fix:** Wait 1–2 minutes and try again; for daily limit, wait until the next day. The app shows a friendly message instead of the raw error. Optionally enable billing in Google Cloud for higher limits.

---

## Quick Checklist

- [ ] Gemini API key created and added to Vercel as `GEMINI_API_KEY`
- [ ] Google Cloud project created
- [ ] Google Calendar API enabled
- [ ] OAuth consent screen configured (External, test user added)
- [ ] OAuth Client ID created (Web application, authorized origins set)
- [ ] OAuth Client ID added to Vercel as `GOOGLE_CLIENT_ID`
- [ ] Vercel project connected to repo and deployed
- [ ] Vercel URL added to Google Cloud authorized origins
- [ ] Test: Sign in works
- [ ] Test: Voice parsing works
- [ ] Test: Schedule it creates calendar event

---

## Next Steps After Setup

Once everything is working:
- You can add more test users in Google Cloud → OAuth consent screen
- You can add a custom domain in Vercel (optional)
- You can remove the old/duplicate configurations if you created any
