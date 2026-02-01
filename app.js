// VoiceMeet - Phase 3: Understanding + conversation context
// Voice input + Gemini parsing; keeps a meeting draft across turns

const micButton = document.getElementById('mic-button');
const status = document.getElementById('status');
const conversation = document.getElementById('conversation');

// Meeting draft: we merge each parse into this so we don't lose context
let meetingDraft = {
    title: null,
    date: null,
    time: null,
    duration: null,
    attendee: null,
    location: null
};

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
    } else {
        addMessage('Got it! Here\'s what I have. Should I schedule this? (Coming soon: calendar)', 'system');
    }

    status.textContent = 'Tap to speak';
}

// Add a message to the conversation
function addMessage(text, type = 'system') {
    const message = document.createElement('div');
    message.className = `message ${type}`;
    message.textContent = text;
    conversation.appendChild(message);
    conversation.scrollTop = conversation.scrollHeight;
}

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
