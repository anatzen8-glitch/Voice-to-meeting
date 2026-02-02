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
            let errorData;
            try {
                const text = await response.text();
                errorData = JSON.parse(text);
            } catch (e) {
                errorData = { error: `HTTP ${response.status}: ${await response.text().catch(() => 'Unknown error')}` };
            }
            console.error('Parse API error:', response.status, JSON.stringify(errorData, null, 2));
            const errorMsg = errorData.error || errorData.details || `HTTP ${response.status} error`;
            addMessage(`Error: ${errorMsg}. Check browser console (F12) for details.`, 'system');
            status.textContent = 'Tap to speak';
            return;
        }

        const parsed = await response.json();
        displayParsedResult(parsed);

    } catch (error) {
        console.error('Parse error:', error);
        addMessage(`Sorry, I had trouble understanding: ${error.message}. Check browser console (F12) for details.`, 'system');
        status.textContent = 'Tap to speak';
    }
}

// Merge parsed result into draft (only set fields that are provided)
function mergeIntoDraft(parsed) {
    console.log('Merging parsed result into draft:', parsed);
    if (parsed.title != null && parsed.title !== '') meetingDraft.title = parsed.title;
    if (parsed.date != null && parsed.date !== '') meetingDraft.date = parsed.date;
    if (parsed.time != null && parsed.time !== '') {
        console.log('Setting time from Gemini:', parsed.time);
        meetingDraft.time = parsed.time;
    }
    if (parsed.duration != null && parsed.duration !== '') meetingDraft.duration = parsed.duration;
    if (parsed.attendee != null && parsed.attendee !== '') meetingDraft.attendee = parsed.attendee;
    if (parsed.location != null && parsed.location !== '') meetingDraft.location = parsed.location;
    console.log('Draft after merge:', meetingDraft);
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

    // Convert Hebrew numbers to digits (e.g., "חמש" -> "5", "שלוש" -> "3")
    const hebrewToNumber = {
        'אחת': '1', 'אחד': '1', 'שתיים': '2', 'שניים': '2', 'שלוש': '3', 'שלושה': '3',
        'ארבע': '4', 'ארבעה': '4', 'חמש': '5', 'חמישה': '5', 'שש': '6', 'שישה': '6',
        'שבע': '7', 'שבעה': '7', 'שמונה': '8', 'תשע': '9', 'תשעה': '9', 'עשר': '10',
        'אחת עשרה': '11', 'שתים עשרה': '12', 'שלוש עשרה': '13', 'ארבע עשרה': '14',
        'חמש עשרה': '15', 'שש עשרה': '16', 'שבע עשרה': '17', 'שמונה עשרה': '18',
        'תשע עשרה': '19', 'עשרים': '20', 'עשרים ואחת': '21', 'עשרים ושתיים': '22',
        'עשרים ושלוש': '23', 'עשרים וארבע': '24'
    };
    let normalizedTimeStr = timeStr.toLowerCase();
    for (const [hebrew, num] of Object.entries(hebrewToNumber)) {
        normalizedTimeStr = normalizedTimeStr.replace(new RegExp(hebrew, 'g'), num);
    }
    
    const timeMatch = normalizedTimeStr.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i) || normalizedTimeStr.match(/(\d{1,2})/);
    if (timeMatch) {
        let h = parseInt(timeMatch[1], 10);
        const m = timeMatch[2] ? parseInt(timeMatch[2], 10) : 0;
        console.log('Parsing time:', { original: timeStr, normalized: normalizedTimeStr, hour: h, minute: m });
        
        if (timeMatch[3]) {
            if (timeMatch[3].toLowerCase() === 'pm' && h < 12) h += 12;
            if (timeMatch[3].toLowerCase() === 'am' && h === 12) h = 0;
        } else if (h <= 12 && !normalizedTimeStr.includes(':') && normalizedTimeStr.toLowerCase().includes('pm')) {
            h += 12;
        } else if (h < 7 && !normalizedTimeStr.includes(':')) {
            // Assume PM for single-digit hours without AM/PM (common in Hebrew: "5" = 5PM)
            h += 12;
        } else if (h >= 7 && h <= 12 && !normalizedTimeStr.includes(':')) {
            // For 7-12, assume PM unless context suggests otherwise
            // But actually, let's be smarter: if it's a single number 7-12, it's ambiguous
            // Default to PM for evening hours
            if (h < 12) h += 12; // 7-11 become 7PM-11PM
        }
        console.log('Final parsed time:', { hour: h, minute: m, time24: `${h}:${m}` });
        start.setHours(h, m, 0, 0);
    } else {
        console.warn('Could not parse time:', timeStr);
    }

    const end = new Date(start.getTime() + duration * 60 * 1000);
    
    // Format date/time in Israel timezone (Asia/Jerusalem) as RFC3339 ISO string
    // Since Google Calendar API accepts timeZone in the event object, we format the time
    // as it appears in Israel, then let Google handle timezone conversion
    const israelTz = 'Asia/Jerusalem';
    const fmt = (d) => {
        // Get what this date/time looks like in Israel timezone
        const israelDateStr = d.toLocaleString('en-US', {
            timeZone: israelTz,
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false
        });
        // Format: "MM/DD/YYYY, HH:mm:ss"
        const [datePart, timePart] = israelDateStr.split(', ');
        const [month, day, year] = datePart.split('/');
        const [hour, minute, second] = timePart.split(':');
        
        // Determine Israel timezone offset (UTC+2 in winter, UTC+3 in summer/DST)
        // DST in Israel: last Friday in March to last Sunday in October (approximately)
        const m = parseInt(month, 10);
        const dayNum = parseInt(day, 10);
        let offset = '+02:00'; // Default: winter time (UTC+2)
        if (m >= 4 && m <= 9) {
            offset = '+03:00'; // Summer months: definitely DST (UTC+3)
        } else if (m === 3 && dayNum >= 25) {
            offset = '+03:00'; // Late March: likely DST
        } else if (m === 10 && dayNum <= 25) {
            offset = '+03:00'; // Early October: likely DST
        }
        
        return `${year}-${month}-${day}T${hour}:${minute}:${second}${offset}`;
    };
    return { start_iso: fmt(start), end_iso: fmt(end) };
}

// Create event on Google Calendar
async function createCalendarEvent() {
    if (!accessToken) {
        addMessage('Please sign in with Google first.', 'system');
        return;
    }
    console.log('Creating calendar event from draft:', meetingDraft);
    const times = draftToStartEnd();
    console.log('Converted times:', times);
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
            console.error('Calendar create error:', res.status, data);
            const errorMsg = data.error || data.details || 'Failed to create event';
            addMessage(`Error: ${errorMsg}. Check console (F12) for details.`, 'system');
            return;
        }
        console.log('Calendar event created:', data);
        const eventLink = data.htmlLink ? ` <a href="${data.htmlLink}" target="_blank" style="color: #1a73e8; text-decoration: underline;">View in Calendar</a>` : '';
        const eventInfo = data.summary ? ` "${data.summary}"` : '';
        const organizerInfo = data.organizer ? ` (in ${data.organizer}'s calendar)` : '';
        addMessage(`Done! Meeting scheduled${eventInfo}${organizerInfo}.${eventLink}`, 'system');
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
