# Frontend Changes for n8n

## Changes Needed in app.js

### 1. Add n8n Configuration (top of file)

```javascript
// n8n webhook URLs - replace with your actual URLs
const N8N_PARSE_URL = 'https://YOUR-INSTANCE.app.n8n.cloud/webhook/voicemeet-parse';
const N8N_CALENDAR_URL = 'https://YOUR-INSTANCE.app.n8n.cloud/webhook/voicemeet-calendar';
```

### 2. Update parseWithGemini function

Change line ~159 from:
```javascript
const response = await fetch('/api/parse', {
```

To:
```javascript
const response = await fetch(N8N_PARSE_URL, {
```

### 3. Update createCalendarEvent function

Change line ~426 from:
```javascript
const res = await fetch('/api/calendar-create', {
```

To:
```javascript
const res = await fetch(N8N_CALENDAR_URL, {
```

### 4. Remove Google Sign-In (Optional)

Since n8n handles Google Calendar OAuth internally, you can:
- Remove the Google Sign-In button from index.html
- Remove initGoogleSignIn() from app.js
- Remove the accessToken from the calendar request body

**Note:** If you keep the frontend Google Sign-In, the n8n workflow will use its own credentials (not the user's token). This means events are created by your n8n account, not the user's calendar.

## Option A: n8n Calendar (simpler)

Events go to YOUR calendar (the one connected to n8n).
- Remove frontend Google Sign-In
- n8n uses its own OAuth credentials

## Option B: User's Calendar (more complex)

Events go to the USER's calendar.
- Keep frontend Google Sign-In
- Pass accessToken to n8n
- Modify n8n workflow to use the passed token instead of stored credentials

For MVP, **Option A is recommended** - simpler setup, you can invite users as attendees.
