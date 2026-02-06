const express = require('express');
const cors = require('cors');
const admin = require('firebase-admin');
const OAuth = require('oauth-1.0a');
const crypto = require('crypto');
// Ensure node-fetch is available
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

const app = express();
app.use(cors());
app.use(express.json());

// --- HARDCODED KEYS (To bypass .env issues) ---
// Transcribed directly from your screenshot
const FATSECRET_KEY = '720ff6ec882f4d0fa89c1b28fa2d9685';
const FATSECRET_SECRET = 'ae20febb460142649756aca2889265a3';

console.log("---------------------------------------------------");
console.log("🔹 SERVER STARTING (HARDCODED MODE)");
console.log(`🔹 Key Check: ${FATSECRET_KEY.substring(0, 5)}... (Length: ${FATSECRET_KEY.length})`);
console.log("---------------------------------------------------");

// --- FIREBASE INIT ---
// Make sure this file exists in the same folder!
const serviceAccount = require('./serviceAccountKey.json');
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}
const db = admin.firestore();

// --- PROXY ROUTE ---
app.get('/api/food-search', async (req, res) => {
  try {
    const query = String(req.query.search_expression || "").trim();
    if (!query) return res.status(400).json({ error: "Missing search term" });

    // Initialize OAuth
    const oauth = OAuth({
      consumer: { key: FATSECRET_KEY, secret: FATSECRET_SECRET },
      signature_method: 'HMAC-SHA1',
      hash_function(base_string, key) {
        return crypto.createHmac('sha1', key).update(base_string).digest('base64');
      },
    });

    const request_data = {
      url: 'https://platform.fatsecret.com/rest/server.api',
      method: 'POST',
      data: {
        method: 'foods.search',
        search_expression: query,
        format: 'json',
      },
    };

    // Sign request
    const authorization = oauth.authorize(request_data);
    
    // Combine data + auth signature into the body
    const params = new URLSearchParams({ ...request_data.data, ...authorization });

    console.log(`🔎 Searching: "${query}"`);

    const response = await fetch(request_data.url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString() 
    });

    const data = await response.json();

    if (data.error) {
        console.error("❌ API Error:", data.error.message);
        return res.status(400).json(data);
    }

    res.json(data);

  } catch (error) {
    console.error('❌ Server Exception:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// --- FIREBASE ROUTES (Keep these so the app doesn't break) ---
app.get('/api/foods', async (req, res) => {
    const s = await db.collection('foods').get();
    res.json(s.docs.map(d => ({id:d.id, ...d.data()})));
});
app.get('/api/log/:userId', async (req, res) => {
    const { userId } = req.params;
    const today = new Date().toISOString().split('T')[0];
    const s = await db.collection('logs').where('userId','==',userId).where('date','==',today).get();
    res.json(s.docs.map(d => ({log_id:d.id, ...d.data()})));
});
app.post('/api/log', async (req, res) => {
    const { userId, foodId, ...rest } = req.body;
    const d = { userId, foodId, date: new Date().toISOString().split('T')[0], timestamp: admin.firestore.FieldValue.serverTimestamp(), ...rest };
    const r = await db.collection('logs').add(d);
    res.json({success:true, logId:r.id});
});
app.delete('/api/log/:logId', async (req, res) => {
    await db.collection('logs').doc(req.params.logId).delete();
    res.json({success:true});
});

const PORT = 5001;
app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));