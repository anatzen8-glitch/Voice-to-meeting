// VoiceMeet - Phase 1: Basic UI
// Voice functionality will be added in Phase 2

const micButton = document.getElementById('mic-button');
const status = document.getElementById('status');
const conversation = document.getElementById('conversation');

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
    // Toggle listening state (visual only for now)
    const isListening = micButton.classList.toggle('listening');

    if (isListening) {
        status.textContent = 'Listening...';
        // Phase 2 will add actual voice recognition here
    } else {
        status.textContent = 'Tap to speak';
    }
});

// Log that app is ready
console.log('VoiceMeet loaded - Phase 1 complete');
