// Create a Google Calendar event using the user's access token
// Vercel: POST /api/calendar-create
// Body: { accessToken, title, start_iso, end_iso, attendee?, location? }

module.exports = async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { accessToken, title, start_iso, end_iso, attendee, location } = req.body;

    if (!accessToken || !start_iso || !end_iso) {
        return res.status(400).json({ error: 'Missing accessToken, start_iso, or end_iso' });
    }

    const event = {
        summary: title || 'VoiceMeet',
        start: { dateTime: start_iso },
        end: { dateTime: end_iso }
    };
    if (attendee && attendee.includes('@')) {
        event.attendees = [{ email: attendee }];
    }
    if (location) event.location = location;

    try {
        const response = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(event)
        });

        if (!response.ok) {
            const errText = await response.text();
            console.error('Calendar API error', response.status, errText);
            return res.status(response.status).json({
                error: 'Calendar API failed',
                details: errText
            });
        }

        const created = await response.json();
        return res.status(200).json({
            success: true,
            eventId: created.id,
            htmlLink: created.htmlLink
        });
    } catch (e) {
        console.error('calendar-create error', e.message);
        return res.status(500).json({ error: 'Failed to create event', details: e.message });
    }
};
