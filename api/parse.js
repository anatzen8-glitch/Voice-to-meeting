// Serverless function to parse meeting details using Gemini
// Vercel will run this at /api/parse

export default async function handler(req, res) {
    // Only allow POST requests
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { text } = req.body;

    if (!text) {
        return res.status(400).json({ error: 'No text provided' });
    }

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
        return res.status(500).json({ error: 'API key not configured' });
    }

    const prompt = `You are a meeting scheduling assistant. Extract meeting details from the user's speech.
The user may speak in Hebrew or English. Always respond in this exact JSON format:

{
    "title": "meeting title or null if not mentioned",
    "date": "the date mentioned (e.g., 'tomorrow', 'Sunday', '15/2') or null",
    "time": "the time mentioned (e.g., '15:00', '3pm') or null",
    "duration": "duration in minutes as number (e.g., 30, 60) or null",
    "attendee": "email address if mentioned, or name if mentioned, or null",
    "location": "location if mentioned or null",
    "raw_interpretation": "brief summary of what you understood in the same language the user spoke"
}

Important rules:
- If the user says "חצי שעה" or "half hour", duration is 30
- If the user says "שעה" or "hour", duration is 60
- Extract email addresses exactly as spoken
- For names without email, just capture the name
- "מחר" means "tomorrow", "היום" means "today"
- Keep raw_interpretation friendly and brief

User said: "${text}"

Respond ONLY with the JSON, no other text.`;

    try {
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    contents: [{
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
            const error = await response.text();
            console.error('Gemini API error:', error);
            return res.status(500).json({ error: 'Failed to parse with AI' });
        }

        const data = await response.json();
        const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!responseText) {
            return res.status(500).json({ error: 'No response from AI' });
        }

        // Parse the JSON response
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            return res.status(500).json({ error: 'Invalid AI response format' });
        }

        const parsed = JSON.parse(jsonMatch[0]);
        return res.status(200).json(parsed);

    } catch (error) {
        console.error('Parse error:', error);
        return res.status(500).json({ error: 'Failed to process request' });
    }
}
