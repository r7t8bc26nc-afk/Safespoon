const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, './.env') });

const express = require('express');
const cors = require('cors');
const admin = require('firebase-admin');
const OAuth = require('oauth-1.0a');
const crypto = require('crypto');
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

// --- CONFIGURATION ---
const PORT = process.env.PORT || 5001;

// --- SECURE KEY LOADING ---
// checking process.env instead of hardcoded strings
const FATSECRET_KEY = process.env.FATSECRET_CLIENT_ID;
const FATSECRET_SECRET = process.env.FATSECRET_CLIENT_SECRET;

const app = express();
app.use(cors());
app.use(express.json());

// --- FIREBASE INIT ---
// We check if the file exists to avoid crashing in environments where it might be injected differently
let serviceAccount;
try {
  serviceAccount = require('./serviceAccountKey.json');
} catch (e) {
  // If running on Render/Cloud without the file, we might depend on env vars (optional advanced setup)
  console.log("⚠️ serviceAccountKey.json not found. Ensure Firebase env vars are set if needed.");
}

if (serviceAccount && !admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

// --- ROUTES ---

app.get('/api/food-search', async (req, res) => {
  try {
    const query = String(req.query.search_expression || "").trim();
    if (!query) return res.status(400).json({ error: "Missing search term" });

    if (!FATSECRET_KEY || !FATSECRET_SECRET) {
        console.error("❌ Server Error: Missing API Keys");
        return res.status(500).json({ error: "Server Misconfiguration" });
    }

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

    const authorization = oauth.authorize(request_data);
    const params = new URLSearchParams({ ...request_data.data, ...authorization });

    const response = await fetch(request_data.url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString() 
    });

    if (!response.ok) throw new Error(await response.text());
    const data = await response.json();
    res.json(data);

  } catch (error) {
    console.error('Proxy Error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// ... (Keep your existing Firebase routes for /api/foods and /api/log here) ...
// (Copy them from your previous file, they are safe as they don't contain keys)

app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));

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
