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

// Language: Hebrew (עברית) or English
let currentLanguage = 'he'; // Default: Hebrew (עברית)
const translations = {
    he: {
        initialMessage: 'לקביעת פגישה אפשר ללחוץ על המיקרופון ולתת פרטים',
        tapToSpeak: 'לחיצה לדיבור',
        listening: 'מאזין...',
        understanding: 'מחשב...',
        stillNeed: 'נדרש:',
        gotIt: 'אז אילו הפרטים שיש לי',
        anyAttendees: 'להוסיף משתתפים או משתתפות?',
        shouldSchedule: 'לזמן?',
        scheduled: 'זה ביומן שלך',
        viewCalendar: 'צפייה בלוח השנה →',
        signInWithGoogle: 'התחברות עם Google',
        signedIn: 'התחברנו',
        scheduleIt: 'יש אישור לזימון?',
        pleaseSignIn: 'נדרשת התחברות עם Google קודם.',
        errorUnderstanding: 'לא הבנתי אפשר שוב',
        errorQuota: 'המכסה זמנית מלאה. נסה שוב בעוד דקה.',
        noSpeech: 'לא זוהה דיבור. לחיצה לנסות שוב.',
        micDenied: 'גישה למיקרופון נדחתה. נדרש לאפשר גישה למיקרופון.',
        errorOccurred: 'אירעה שגיאה. לחיצה לנסות שוב.',
        errorStarting: 'שגיאה בהתחלה. לחיצה לנסות שוב.',
        title: 'כותרת',
        date: 'תאריך',
        time: 'שעה',
        duration: 'משך',
        attendee: 'משתתפים.ות',
        location: 'מיקום',
        min: 'דקות'
    },
    en: {
        initialMessage: 'Ready to schedule a meeting. Tap the mic and tell me the details.',
        tapToSpeak: 'Tap to speak',
        listening: 'Listening...',
        understanding: 'Understanding...',
        stillNeed: 'I still need:',
        gotIt: 'Got it! Here\'s what I have.',
        anyAttendees: 'Any attendees to invite?',
        shouldSchedule: 'Should I schedule this?',
        scheduled: 'is scheduled in your calendar.',
        viewCalendar: 'View in Calendar →',
        signInWithGoogle: 'Sign in with Google',
        signedIn: 'Signed in',
        scheduleIt: 'Schedule it',
        pleaseSignIn: 'Please sign in with Google first.',
        errorUnderstanding: 'Sorry, I had trouble understanding. Try again?',
        errorQuota: 'API quota used for now. Try again in a minute.',
        noSpeech: 'No speech detected. Tap to try again.',
        micDenied: 'Microphone access denied. Please allow mic access.',
        errorOccurred: 'Error occurred. Tap to try again.',
        errorStarting: 'Error starting. Tap to try again.',
        title: 'Title',
        date: 'Date',
        time: 'Time',
        duration: 'Duration',
        attendee: 'Attendee',
        location: 'Location',
        min: 'min'
    }
};

function t(key) {
    return translations[currentLanguage][key] || translations.en[key] || key;
}

// Check for Web Speech API support
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

if (!SpeechRecognition) {
    status.textContent = currentLanguage === 'he' ? 'קול לא נתמך בדפדפן זה. נסה Chrome.' : 'Voice not supported in this browser. Try Chrome.';
    micButton.disabled = true;
}

// Create speech recognition instance
let recognition = null;
let isListening = false;

if (SpeechRecognition) {
    recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = currentLanguage === 'he' ? 'he-IL' : 'en-US';

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
            status.textContent = t('understanding');
            parseWithGemini(transcript);
        }
    };

    // Handle end of speech
    recognition.onend = () => {
        isListening = false;
        micButton.classList.remove('listening');
        if (status.textContent === t('listening')) {
            status.textContent = t('tapToSpeak');
        }
    };

    // Handle errors
    recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        isListening = false;
        micButton.classList.remove('listening');

        if (event.error === 'no-speech') {
            status.textContent = t('noSpeech');
        } else if (event.error === 'not-allowed') {
            status.textContent = t('micDenied');
        } else {
            status.textContent = t('errorOccurred');
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
            body: JSON.stringify({ text, draft: meetingDraft, language: currentLanguage })
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
            const isQuota = typeof errorMsg === 'string' && (errorMsg.includes('Resource exhausted') || errorMsg.includes('429'));
            const msg = isQuota ? t('errorQuota') : (currentLanguage === 'he' ? `שגיאה: ${errorMsg}` : `Error: ${errorMsg}`);
            addMessage(msg, 'system');
            status.textContent = t('tapToSpeak');
            return;
        }

        const parsed = await response.json();
        displayParsedResult(parsed);

    } catch (error) {
        console.error('Parse error:', error);
        addMessage(`${t('errorUnderstanding')} ${error.message}`, 'system');
        status.textContent = t('tapToSpeak');
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
    if (parsed.attendee != null && parsed.attendee !== '') {
        // Normalize email: "david at gmail.com" -> "david@gmail.com"
        let normalizedAttendee = parsed.attendee.replace(/\s+at\s+/gi, '@').replace(/\s+/g, '');
        meetingDraft.attendee = normalizedAttendee;
    }
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
    if (meetingDraft.title) details.push(`${t('title')}: ${meetingDraft.title}`);
    if (meetingDraft.date) details.push(`${t('date')}: ${meetingDraft.date}`);
    if (meetingDraft.time) details.push(`${t('time')}: ${meetingDraft.time}`);
    if (meetingDraft.duration) details.push(`${t('duration')}: ${meetingDraft.duration} ${t('min')}`);
    if (meetingDraft.attendee) {
        // Format email nicely: "david at gmail.com" -> "david@gmail.com" or show as "Attendee: email"
        const attendeeStr = meetingDraft.attendee.replace(/\s+at\s+/gi, '@').replace(/\s+/g, '');
        // Emails always shown in English format
        details.push(`${t('attendee')}: ${attendeeStr}`);
    }
    if (meetingDraft.location) details.push(`${t('location')}: ${meetingDraft.location}`);

    if (details.length > 0) {
        const understoodLabel = currentLanguage === 'he' ? 'התקבל:' : 'I understood:';
        addMessage(`${understoodLabel}\n${details.join('\n')}`, 'system');
    }

    const missing = [];
    if (!meetingDraft.date) missing.push('date');
    if (!meetingDraft.time) missing.push('time');
    // Attendee is optional - don't require it

    if (missing.length > 0) {
        addMessage(`${t('stillNeed')} ${missing.map(m => t(m)).join(', ')}`, 'system');
        if (scheduleWrap) scheduleWrap.classList.add('hidden');
    } else {
        // If no attendee, optionally ask (but don't require)
        if (!meetingDraft.attendee) {
            addMessage(`${t('gotIt')} ${t('anyAttendees')}`, 'system');
        } else {
            addMessage(`${t('gotIt')} ${t('shouldSchedule')}`, 'system');
        }
        if (scheduleWrap) scheduleWrap.classList.remove('hidden');
    }

    status.textContent = t('tapToSpeak');
}

// Convert draft date/time/duration to start_iso and end_iso (user timezone)
function draftToStartEnd() {
    const dateStr = (meetingDraft.date || '').toLowerCase().trim();
    const timeStr = (meetingDraft.time || '').toString().trim();
    const duration = Math.max(15, parseInt(meetingDraft.duration, 10) || 30);

    const now = new Date();
    let start = new Date(now);

    // Convert Hebrew month names to English
    const hebrewMonths = {
        'ינואר': 'January', 'פברואר': 'February', 'מרץ': 'March', 'מרס': 'March',
        'מארס': 'March', 'אפריל': 'April', 'מאי': 'May', 'יוני': 'June',
        'יולי': 'July', 'אוגוסט': 'August', 'ספטמבר': 'September', 'אוקטובר': 'October',
        'נובמבר': 'November', 'דצמבר': 'December'
    };
    
    let normalizedDateStr = dateStr;
    for (const [hebrew, english] of Object.entries(hebrewMonths)) {
        normalizedDateStr = normalizedDateStr.replace(new RegExp(hebrew, 'gi'), english);
    }
    // Remove Hebrew "ל" (to) prefix if present: "20 לפברואר" -> "20 February"
    normalizedDateStr = normalizedDateStr.replace(/\s*ל\s*/g, ' ');
    
    console.log('Parsing date:', { original: dateStr, normalized: normalizedDateStr });

    if (normalizedDateStr === 'tomorrow' || normalizedDateStr === 'מחר') {
        start.setDate(start.getDate() + 1);
    } else if (normalizedDateStr !== 'today' && normalizedDateStr !== 'היום') {
        // Try parsing the normalized date
        let parsed = new Date(normalizedDateStr);
        
        // If YYYY-MM-DD format (from Gemini), parse directly
        if (isNaN(parsed.getTime()) && /^\d{4}-\d{1,2}-\d{1,2}$/.test(normalizedDateStr)) {
            parsed = new Date(normalizedDateStr + 'T00:00:00');
        }
        
        if (isNaN(parsed.getTime())) {
            // Try common formats: "20 February", "February 20", "20/2", etc.
            const dateMatch = normalizedDateStr.match(/(\d{1,2})\s*(?:ל|to|-|\/)\s*(\w+)/i) || 
                             normalizedDateStr.match(/(\d{1,2})\s+(\w+)/i) ||
                             normalizedDateStr.match(/(\w+)\s+(\d{1,2})/i);
            if (dateMatch) {
                const day = parseInt(dateMatch[1] || dateMatch[2], 10);
                const monthStr = (dateMatch[2] || dateMatch[1]).toLowerCase();
                const currentYear = now.getFullYear();
                // Try to parse as "day month" or "month day"
                parsed = new Date(`${monthStr} ${day}, ${currentYear}`);
                if (isNaN(parsed.getTime())) {
                    parsed = new Date(`${day} ${monthStr} ${currentYear}`);
                }
            }
        }
        if (!isNaN(parsed.getTime())) {
            start = parsed;
            console.log('Parsed date:', start, 'from:', normalizedDateStr);
        } else {
            console.warn('Could not parse date:', normalizedDateStr, '- using today');
        }
    }

    // Convert Hebrew time words to English
    let normalizedTimeStr = timeStr.toLowerCase();
    normalizedTimeStr = normalizedTimeStr.replace(/בערב/g, 'pm');
    normalizedTimeStr = normalizedTimeStr.replace(/אחר הצהריים/g, 'pm');
    normalizedTimeStr = normalizedTimeStr.replace(/בוקר/g, 'am');
    normalizedTimeStr = normalizedTimeStr.replace(/צהריים/g, 'pm');
    
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
        } else if (h <= 12 && !normalizedTimeStr.includes(':') && (normalizedTimeStr.toLowerCase().includes('pm') || normalizedTimeStr.includes('בערב') || normalizedTimeStr.includes('אחר הצהריים'))) {
            // Hebrew: "בערב" = "in the evening" = PM, "אחר הצהריים" = "afternoon" = PM
            h += 12;
        } else if (h < 7 && !normalizedTimeStr.includes(':')) {
            // Assume PM for single-digit hours without AM/PM (common in Hebrew: "5" = 5PM)
            h += 12;
        } else if (h >= 7 && h <= 12 && !normalizedTimeStr.includes(':')) {
            // For 7-12, check if Hebrew indicates PM
            if (normalizedTimeStr.includes('בערב') || normalizedTimeStr.includes('אחר הצהריים') || normalizedTimeStr.includes('לילה')) {
                if (h < 12) h += 12; // 7-11 become 7PM-11PM
            }
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
        addMessage(t('pleaseSignIn'), 'system');
        return;
    }
    console.log('Creating calendar event from draft:', meetingDraft);
    const times = draftToStartEnd();
    console.log('Converted times:', times);
    if (!times) {
        const errorMsg = currentLanguage === 'he' ? 'לא הובן התאריך או השעה. נסה לומר שוב.' : 'I couldn\'t figure out the date or time. Try saying the date and time again.';
        addMessage(errorMsg, 'system');
        return;
    }
    scheduleButton.disabled = true;
    status.textContent = currentLanguage === 'he' ? 'קובעים...' : 'Scheduling...';
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
            const errorMsg = data.error || data.details || (currentLanguage === 'he' ? 'נכשל ביצירת האירוע' : 'Failed to create event');
            addMessage(currentLanguage === 'he' ? `שגיאה: ${errorMsg}` : `Error: ${errorMsg}`, 'system');
            return;
        }
        console.log('Calendar event created:', data);
        const eventTitle = meetingDraft.title || (currentLanguage === 'he' ? 'פגישה' : 'Meeting');
        const eventLink = data.htmlLink 
            ? ` <a href="${data.htmlLink}" target="_blank" style="color: #1a73e8; text-decoration: underline; font-weight: 500;">${t('viewCalendar')}</a>` 
            : '';
        addMessage(`✓ "${eventTitle}" ${t('scheduled')}${eventLink}`, 'system');
        meetingDraft = { title: null, date: null, time: null, duration: null, attendee: null, location: null };
        scheduleWrap.classList.add('hidden');
    } catch (e) {
        const errorMsg = currentLanguage === 'he' ? 'משהו השתבש. נסה שוב.' : 'Something went wrong. Try again.';
        addMessage(errorMsg, 'system');
    } finally {
        scheduleButton.disabled = false;
        status.textContent = t('tapToSpeak');
    }
}

// Initialize Google Sign-In when config and GSI are ready
async function initGoogleSignIn() {
    try {
        const configRes = await fetch('/api/config');
        const config = await configRes.json();
        googleClientId = config.googleClientId || '';
        if (!googleClientId) {
            signinStatus.textContent = currentLanguage === 'he' ? '(לוח שנה: הגדר GOOGLE_CLIENT_ID ב-Vercel)' : '(Calendar: set GOOGLE_CLIENT_ID in Vercel)';
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
                signinStatus.textContent = t('signedIn');
                if (googleSigninButton) googleSigninButton.textContent = t('signedIn');
            }
        });
        if (googleSigninButton) {
            googleSigninButton.textContent = t('signInWithGoogle');
            googleSigninButton.style.cssText = 'padding:8px 16px;border-radius:8px;border:1px solid #dadce0;background:#fff;cursor:pointer;font-size:14px;';
            googleSigninButton.onclick = () => tokenClient.requestAccessToken({ prompt: '' });
        }
    }
    tryInit();
}

// Add a message to the conversation (supports HTML)
function addMessage(text, type = 'system') {
    const message = document.createElement('div');
    message.className = `message ${type}`;
    message.innerHTML = text; // Use innerHTML to support links
    conversation.appendChild(message);
    conversation.scrollTop = conversation.scrollHeight;
}

// Language toggle
const languageToggle = document.getElementById('language-toggle');
function updateLanguage(lang) {
    currentLanguage = lang;
    // Update HTML lang and dir attributes
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'he' ? 'rtl' : 'ltr';
    // Update speech recognition language
    if (recognition) {
        recognition.lang = lang === 'he' ? 'he-IL' : 'en-US';
    }
    // Update UI elements
    if (status) status.textContent = t('tapToSpeak');
    if (scheduleButton) scheduleButton.textContent = t('scheduleIt');
    if (languageToggle) {
        languageToggle.textContent = lang === 'he' ? 'עברית / English' : 'עברית / English';
    }
    // Update initial message
    const initialMsg = document.getElementById('initial-message');
    if (initialMsg) initialMsg.textContent = t('initialMessage');
    // Update sign-in status if already signed in
    if (accessToken && signinStatus) {
        signinStatus.textContent = t('signedIn');
    }
    if (accessToken && googleSigninButton) {
        googleSigninButton.textContent = t('signedIn');
    }
    // Note: We don't translate existing messages, only new ones will use the new language
}

if (languageToggle) {
    languageToggle.addEventListener('click', () => {
        const newLang = currentLanguage === 'he' ? 'en' : 'he';
        updateLanguage(newLang);
    });
}

// Schedule button: create calendar event
if (scheduleButton) {
    scheduleButton.addEventListener('click', createCalendarEvent);
}

// Load Google Sign-In config and init when ready
initGoogleSignIn();

// Hide schedule area until draft is complete
if (scheduleWrap) scheduleWrap.classList.add('hidden');

// Initialize language (Hebrew by default)
updateLanguage('he');

// Handle mic button click
micButton.addEventListener('click', () => {
    if (!recognition) return;

    if (isListening) {
        recognition.stop();
        isListening = false;
        micButton.classList.remove('listening');
        status.textContent = t('tapToSpeak');
    } else {
        try {
            recognition.start();
            isListening = true;
            micButton.classList.add('listening');
            status.textContent = t('listening');
        } catch (error) {
            console.error('Failed to start recognition:', error);
            status.textContent = t('errorStarting');
        }
    }
});

// Log that app is ready
console.log('VoiceMeet loaded - Phase 3: Understanding ready');
