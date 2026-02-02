# VoiceMeet n8n Workflow

This folder contains the n8n workflow that replaces the Vercel serverless functions.

## What It Does

Two webhook endpoints:
1. **Parse** (`/voicemeet-parse`) - Sends voice text to Gemini, returns parsed meeting details
2. **Calendar** (`/voicemeet-calendar`) - Creates Google Calendar event

## Setup Instructions

### 1. Import Workflow

1. Go to [n8n.io](https://n8n.io) and sign up (free)
2. In n8n, click **Add workflow** → **Import from file**
3. Select `voicemeet-workflow.json`
4. Click **Save**

### 2. Configure Credentials

#### Gemini API Key
1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Create an API key
3. In n8n: **Settings** → **Credentials** → **Add credential**
4. Choose **HTTP Query Auth**
5. Name: `Gemini API Key`
6. Parameter Name: `key`
7. Value: Your Gemini API key

#### Google Calendar OAuth
1. In n8n: **Settings** → **Credentials** → **Add credential**
2. Choose **Google Calendar OAuth2 API**
3. Follow the OAuth flow to connect your Google account
4. Make sure to grant calendar access

### 3. Activate Workflow

1. Open the workflow
2. Toggle **Active** in the top right
3. Copy the webhook URLs (click on each Webhook node)

Your URLs will look like:
```
https://YOUR-INSTANCE.app.n8n.cloud/webhook/voicemeet-parse
https://YOUR-INSTANCE.app.n8n.cloud/webhook/voicemeet-calendar
```

### 4. Update Frontend

Update `app.js` to use your n8n webhook URLs instead of the Vercel endpoints.

See `app.js.n8n-example` for the required changes.

## Workflow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        PARSE FLOW                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Webhook ──▶ Build Prompt ──▶ Gemini API ──▶ Parse ──▶ Respond │
│  (POST)      (Code node)      (HTTP)         (Code)    (JSON)  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                       CALENDAR FLOW                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Webhook ──▶ Google Calendar ──▶ Respond                       │
│  (POST)      (Create Event)      (JSON)                        │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## API Reference

### POST /voicemeet-parse

**Request Body:**
```json
{
  "text": "פגישה עם דוד מחר בשעה 3",
  "draft": { "title": null, "date": null, ... },
  "language": "he"
}
```

**Response:**
```json
{
  "title": null,
  "date": "tomorrow",
  "time": "15:00",
  "duration": null,
  "attendee": "david",
  "location": null,
  "raw_interpretation": "פגישה עם דוד מחר בשלוש"
}
```

### POST /voicemeet-calendar

**Request Body:**
```json
{
  "title": "Meeting with David",
  "start_iso": "2026-02-03T15:00:00+02:00",
  "end_iso": "2026-02-03T15:30:00+02:00",
  "attendee": "david@example.com",
  "location": "Office"
}
```

**Response:**
```json
{
  "success": true,
  "eventId": "abc123",
  "htmlLink": "https://calendar.google.com/...",
  "summary": "Meeting with David"
}
```

## Notes

- The n8n workflow handles Google OAuth internally - no need for frontend sign-in
- CORS headers are set to allow requests from any origin
- The prompt is identical to the Vercel version for consistency
