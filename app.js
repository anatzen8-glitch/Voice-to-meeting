// VoiceMeet - Phase 3 + Calendar (MVP)
// Voice input + Gemini parsing + Google Calendar create

const micButton = document.getElementById('mic-button');
const status = document.getElementById('status');
const conversation = document.getElementById('conversation');
const scheduleWrap = document.getElementById('schedule-wrap');
const scheduleButton = document.getElementById('schedule-button');
const signinStatus = document.getElementById('signin-status');
const googleSigninButton = document.getElementById('google-signin-button');

// Meeting draft: we merge each parse into this so we don't lose context
let meetingDraft = {
    title: null,
    date: null,
    time: null,
    duration: null,
    attendee: null,
    location: null
};

// Google Sign-In: access token for Calendar API
let accessToken = null;
let tokenClient = null;
let googleClientId = '';

// Check for Web Speech API support
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

if (!SpeechRecognition) {
    status.textContent = 'Voice not supported in this browser. Try Chrome.';
    micButton.disabled = true;
}

// Create speech recognition instance
let recognition = null;
let isListening = false;

if (SpeechRecognition) {
    recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'he-IL'; // Primary: Hebrew

    // Handle results
    recognition.onresult = (event) => {
        const transcript = Array.from(event.results)
            .map(result => result[0].transcript)
            .join('');

        // Show interim results in status
        if (!event.results[0].isFinal) {
            status.textContent = transcript;
        } else {
            // Final result - add to conversation and parse
            addMessage(transcript, 'user');
            status.textContent = 'Understanding...';
            parseWithGemini(transcript);
        }
    };

    // Handle end of speech
    recognition.onend = () => {
        isListening = false;
        micButton.classList.remove('listening');
        if (status.textContent === 'Listening...') {
            status.textContent = 'Tap to speak';
        }
    };

    // Handle errors
    recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        isListening = false;
        micButton.classList.remove('listening');

        if (event.error === 'no-speech') {
            status.textContent = 'No speech detected. Tap to try again.';
        } else if (event.error === 'not-allowed') {
            status.textContent = 'Microphone access denied. Please allow mic access.';
        } else {
            status.textContent = 'Error occurred. Tap to try again.';
        }
    };
}

// Parse text with Gemini API (optionally send current draft for context)
async function parseWithGemini(text) {
    try {
        const response = await fetch('/api/parse', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ text, draft: meetingDraft })
        });

        if (!response.ok) {
            throw new Error('Failed to parse');
        }

        const parsed = await response.json();
        displayParsedResult(parsed);

    } catch (error) {
        console.error('Parse error:', error);
        addMessage('Sorry, I had trouble understanding. Try again?', 'system');
        status.textContent = 'Tap to speak';
    }
}

// Merge parsed result into draft (only set fields that are provided)
function mergeIntoDraft(parsed) {
    if (parsed.title != null && parsed.title !== '') meetingDraft.title = parsed.title;
    if (parsed.date != null && parsed.date !== '') meetingDraft.date = parsed.date;
    if (parsed.time != null && parsed.time !== '') meetingDraft.time = parsed.time;
    if (parsed.duration != null && parsed.duration !== '') meetingDraft.duration = parsed.duration;
    if (parsed.attendee != null && parsed.attendee !== '') meetingDraft.attendee = parsed.attendee;
    if (parsed.location != null && parsed.location !== '') meetingDraft.location = parsed.location;
}

// Display what we understood and update draft (keeps context across turns)
function displayParsedResult(parsed) {
    if (parsed.raw_interpretation) {
        addMessage(parsed.raw_interpretation, 'system');
    }

    mergeIntoDraft(parsed);

    // Show summary from the draft (so we don't lose context)
    const details = [];
    if (meetingDraft.title) details.push(`Title: ${meetingDraft.title}`);
    if (meetingDraft.date) details.push(`Date: ${meetingDraft.date}`);
    if (meetingDraft.time) details.push(`Time: ${meetingDraft.time}`);
    if (meetingDraft.duration) details.push(`Duration: ${meetingDraft.duration} min`);
    if (meetingDraft.attendee) details.push(`With: ${meetingDraft.attendee}`);
    if (meetingDraft.location) details.push(`Location: ${meetingDraft.location}`);

    if (details.length > 0) {
        addMessage('I understood:\n' + details.join('\n'), 'system');
    }

    const missing = [];
    if (!meetingDraft.date) missing.push('date');
    if (!meetingDraft.time) missing.push('time');
    if (!meetingDraft.attendee) missing.push('attendee');

    if (missing.length > 0) {
        addMessage(`I still need: ${missing.join(', ')}`, 'system');
        if (scheduleWrap) scheduleWrap.classList.add('hidden');
    } else {
        addMessage('Got it! Here\'s what I have. Should I schedule this?', 'system');
        if (scheduleWrap) scheduleWrap.classList.remove('hidden');
    }

    status.textContent = 'Tap to speak';
}

// Convert draft date/time/duration to start_iso and end_iso (user timezone)
function draftToStartEnd() {
    const dateStr = (meetingDraft.date || '').toLowerCase().trim();
    const timeStr = (meetingDraft.time || '').toString().trim();
    const duration = Math.max(15, parseInt(meetingDraft.duration, 10) || 30);

    const now = new Date();
    let start = new Date(now);

    if (dateStr === 'tomorrow' || dateStr === 'מחר') {
        start.setDate(start.getDate() + 1);
    } else if (dateStr !== 'today' && dateStr !== 'היום') {
        const parsed = new Date(dateStr);
        if (!isNaN(parsed.getTime())) {
            start = parsed;
        }
    }

    const timeMatch = timeStr.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i) || timeStr.match(/(\d{1,2})/);
    if (timeMatch) {
        let h = parseInt(timeMatch[1], 10);
        const m = timeMatch[2] ? parseInt(timeMatch[2], 10) : 0;
        if (timeMatch[3]) {
            if (timeMatch[3].toLowerCase() === 'pm' && h < 12) h += 12;
            if (timeMatch[3].toLowerCase() === 'am' && h === 12) h = 0;
        } else if (h <= 12 && !timeStr.includes(':') && timeStr.toLowerCase().includes('pm')) {
            h += 12;
        } else if (h < 7 && !timeStr.includes(':')) {
            h += 12;
        }
        start.setHours(h, m, 0, 0);
    }

    const end = new Date(start.getTime() + duration * 60 * 1000);
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
    const fmt = (d) => {
        const y = d.getFullYear();
        const M = String(d.getMonth() + 1).padStart(2, '0');
        const D = String(d.getDate()).padStart(2, '0');
        const H = String(d.getHours()).padStart(2, '0');
        const min = String(d.getMinutes()).padStart(2, '0');
        const s = String(d.getSeconds()).padStart(2, '0');
        const offset = -d.getTimezoneOffset();
        const sign = offset >= 0 ? '+' : '-';
        const oh = String(Math.floor(Math.abs(offset) / 60)).padStart(2, '0');
        const om = String(Math.abs(offset) % 60).padStart(2, '0');
        return `${y}-${M}-${D}T${H}:${min}:${s}${sign}${oh}:${om}`;
    };
    return { start_iso: fmt(start), end_iso: fmt(end) };
}

// Create event on Google Calendar
async function createCalendarEvent() {
    if (!accessToken) {
        addMessage('Please sign in with Google first.', 'system');
        return;
    }
    const times = draftToStartEnd();
    if (!times) {
        addMessage('I couldn\'t figure out the date or time. Try saying the date and time again.', 'system');
        return;
    }
    scheduleButton.disabled = true;
    status.textContent = 'Scheduling...';
    try {
        const res = await fetch('/api/calendar-create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                accessToken,
                title: meetingDraft.title || 'VoiceMeet',
                start_iso: times.start_iso,
                end_iso: times.end_iso,
                attendee: meetingDraft.attendee || null,
                location: meetingDraft.location || null
            })
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
            addMessage(data.error || 'Failed to create event. Try again.', 'system');
            return;
        }
        addMessage('Done! Meeting scheduled.', 'system');
        meetingDraft = { title: null, date: null, time: null, duration: null, attendee: null, location: null };
        scheduleWrap.classList.add('hidden');
    } catch (e) {
        addMessage('Something went wrong. Try again.', 'system');
    } finally {
        scheduleButton.disabled = false;
        status.textContent = 'Tap to speak';
    }
}

// Initialize Google Sign-In when config and GSI are ready
async function initGoogleSignIn() {
    try {
        const configRes = await fetch('/api/config');
        const config = await configRes.json();
        googleClientId = config.googleClientId || '';
        if (!googleClientId) {
            signinStatus.textContent = '(Calendar: set GOOGLE_CLIENT_ID in Vercel)';
            return;
        }
    } catch (e) {
        signinStatus.textContent = '';
        return;
    }

    function tryInit() {
        if (typeof google === 'undefined' || !google.accounts || !google.accounts.oauth2) {
            setTimeout(tryInit, 100);
            return;
        }
        tokenClient = google.accounts.oauth2.initTokenClient({
            client_id: googleClientId,
            scope: 'https://www.googleapis.com/auth/calendar.events',
            callback: (tokenResponse) => {
                accessToken = tokenResponse.access_token;
                signinStatus.textContent = 'Signed in';
                if (googleSigninButton) googleSigninButton.textContent = 'Signed in';
            }
        });
        if (googleSigninButton) {
            googleSigninButton.textContent = 'Sign in with Google';
            googleSigninButton.style.cssText = 'padding:8px 16px;border-radius:8px;border:1px solid #dadce0;background:#fff;cursor:pointer;font-size:14px;';
            googleSigninButton.onclick = () => tokenClient.requestAccessToken({ prompt: '' });
        }
    }
    tryInit();
}

// Add a message to the conversation
function addMessage(text, type = 'system') {
    const message = document.createElement('div');
    message.className = `message ${type}`;
    message.textContent = text;
    conversation.appendChild(message);
    conversation.scrollTop = conversation.scrollHeight;
}

// Schedule button: create calendar event
if (scheduleButton) {
    scheduleButton.addEventListener('click', createCalendarEvent);
}

// Load Google Sign-In config and init when ready
initGoogleSignIn();

// Hide schedule area until draft is complete
if (scheduleWrap) scheduleWrap.classList.add('hidden');

// Handle mic button click
micButton.addEventListener('click', () => {
    if (!recognition) return;

    if (isListening) {
        recognition.stop();
        isListening = false;
        micButton.classList.remove('listening');
        status.textContent = 'Tap to speak';
    } else {
        try {
            recognition.start();
            isListening = true;
            micButton.classList.add('listening');
            status.textContent = 'Listening...';
        } catch (error) {
            console.error('Failed to start recognition:', error);
            status.textContent = 'Error starting. Tap to try again.';
        }
    }
});

// Log that app is ready
console.log('VoiceMeet loaded - Phase 3: Understanding ready');
