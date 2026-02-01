// Public config for the frontend (e.g. Google Client ID for Sign-In)
// Vercel: GET /api/config

module.exports = async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 'public, max-age=300');

    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const googleClientId = process.env.GOOGLE_CLIENT_ID || '';

    return res.status(200).json({
        googleClientId
    });
};
