// VoiceMeet - Phase 3: Understanding
// Voice input + Gemini parsing

const micButton = document.getElementById('mic-button');
const status = document.getElementById('status');
const conversation = document.getElementById('conversation');

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

// Parse text with Gemini API
async function parseWithGemini(text) {
    try {
        const response = await fetch('/api/parse', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ text })
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

// Display what Gemini understood
function displayParsedResult(parsed) {
    // Show the interpretation
    if (parsed.raw_interpretation) {
        addMessage(parsed.raw_interpretation, 'system');
    }

    // Build a summary of what we got
    const details = [];

    if (parsed.title) {
        details.push(`Title: ${parsed.title}`);
    }
    if (parsed.date) {
        details.push(`Date: ${parsed.date}`);
    }
    if (parsed.time) {
        details.push(`Time: ${parsed.time}`);
    }
    if (parsed.duration) {
        details.push(`Duration: ${parsed.duration} min`);
    }
    if (parsed.attendee) {
        details.push(`With: ${parsed.attendee}`);
    }
    if (parsed.location) {
        details.push(`Location: ${parsed.location}`);
    }

    if (details.length > 0) {
        addMessage('I understood:\n' + details.join('\n'), 'system');
    }

    // Check what's missing
    const missing = [];
    if (!parsed.date) missing.push('date');
    if (!parsed.time) missing.push('time');
    if (!parsed.attendee) missing.push('attendee');

    if (missing.length > 0) {
        addMessage(`I still need: ${missing.join(', ')}`, 'system');
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
