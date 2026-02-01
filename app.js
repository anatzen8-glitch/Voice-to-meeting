// VoiceMeet - Phase 2: Voice Input
// Web Speech API implementation with Hebrew support

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

    // Support both Hebrew and English
    // User can speak in either language
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
            // Final result - add to conversation
            addMessage(transcript, 'user');
            status.textContent = 'Tap to speak';

            // For now, echo back what we heard
            // Phase 3 will send this to Gemini for parsing
            setTimeout(() => {
                addMessage(`I heard: "${transcript}"`, 'system');
            }, 500);
        }
    };

    // Handle end of speech
    recognition.onend = () => {
        isListening = false;
        micButton.classList.remove('listening');
        status.textContent = 'Tap to speak';
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
        // Stop listening
        recognition.stop();
        isListening = false;
        micButton.classList.remove('listening');
        status.textContent = 'Tap to speak';
    } else {
        // Start listening
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
console.log('VoiceMeet loaded - Phase 2: Voice Input ready');
console.log('Language set to Hebrew (he-IL)');
