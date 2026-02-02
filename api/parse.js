// Serverless function to parse meeting details using Gemini
// Vercel will run this at /api/parse

module.exports = async function handler(req, res) {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // Only allow POST requests
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { text, draft, language = 'he' } = req.body;

    if (!text) {
        return res.status(400).json({ error: 'No text provided' });
    }

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
        console.error('GEMINI_API_KEY not found in environment');
        return res.status(500).json({ 
            error: 'API key not configured',
            details: 'GEMINI_API_KEY environment variable is missing. Add it in Vercel → Settings → Environment Variables and redeploy.'
        });
    }

    const draftLine = draft && (draft.date || draft.time || draft.attendee || draft.title || draft.duration || draft.location)
        ? `Current meeting draft so far: ${JSON.stringify(draft)}. Only fill in fields the user is adding or changing in this turn; use null for anything not mentioned now.\n\n`
        : '';

    const responseLanguage = language === 'he' ? 'Hebrew' : 'English';
    const prompt = `You are a meeting scheduling assistant. Extract meeting details from the user's speech.
The user is speaking in ${responseLanguage}. Respond in ${responseLanguage} for the raw_interpretation field, but keep all other fields (dates, times, emails) in their standard formats.
Always respond in this exact JSON format:

{
    "title": "meeting title or null if not mentioned",
    "date": "the date mentioned in format 'YYYY-MM-DD' or relative like 'tomorrow', 'today' (e.g., '2026-02-20', 'tomorrow', 'מחר') or null",
    "time": "the time mentioned in 24-hour format or 12-hour with am/pm (e.g., '18:00', '6pm', '6:00 בערב') or null",
    "duration": "duration in minutes as number (e.g., 30, 60) or null",
    "attendee": "email address if mentioned (convert 'at' to '@', e.g., 'david at gmail.com' -> 'david@gmail.com'), or name if mentioned, or null if no attendees",
    "location": "location if mentioned or null",
    "raw_interpretation": "brief summary of what you understood in ${responseLanguage}"
}

Important rules:
- If the user says "חצי שעה" or "half hour", duration is 30
- If the user says "שעה" or "hour", duration is 60
- Extract email addresses: if user says "david at gmail.com" or "david@gmail.com", convert to proper email format "david@gmail.com" (replace "at" with "@")
- Emails are always in English/Latin characters - normalize them properly
- For names without email, just capture the name
- Attendees are optional - if user doesn't mention any, return null
- "מחר" means "tomorrow", "היום" means "today"
- For dates: Convert Hebrew dates to YYYY-MM-DD format (e.g., "20 לפברואר 2026" -> "2026-02-20")
- For times: Convert Hebrew times to 24-hour format or include am/pm (e.g., "6 בערב" -> "18:00" or "6pm")
- Keep raw_interpretation friendly and brief

${draftLine}User said: "${text}"

Respond ONLY with the JSON, no other text.`;

    try {
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    contents: [{
                        role: "user",
                        parts: [{ text: prompt }]
                    }],
                    generationConfig: {
                        temperature: 0.1,
                        maxOutputTokens: 500,
                    }
                })
            }
        );

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Gemini API error:', response.status, errorText);
            let errorDetails;
            try {
                const errorJson = JSON.parse(errorText);
                errorDetails = errorJson.error?.message || errorJson.error || errorText;
            } catch {
                errorDetails = errorText;
            }
            return res.status(500).json({ 
                error: 'Failed to parse with AI', 
                details: errorDetails,
                status: response.status
            });
        }

        const data = await response.json();
        const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!responseText) {
            console.error('No response text from Gemini:', JSON.stringify(data));
            return res.status(500).json({ error: 'No response from AI' });
        }

        // Parse the JSON response
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            console.error('Could not parse JSON from response:', responseText);
            return res.status(500).json({ error: 'Invalid AI response format' });
        }

        const parsed = JSON.parse(jsonMatch[0]);
        return res.status(200).json(parsed);

    } catch (error) {
        console.error('Parse error:', error.message, error.stack);
        return res.status(500).json({ 
            error: 'Failed to process request', 
            details: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
};
