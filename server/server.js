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
const FATSECRET_KEY = process.env.FATSECRET_CLIENT_ID;
const FATSECRET_SECRET = process.env.FATSECRET_CLIENT_SECRET;

const app = express();
app.use(cors());
app.use(express.json());

// --- FIREBASE INIT ---
// We check if the file exists to avoid crashing if it's missing (Render Secret File handles this)
let serviceAccount;
try {
  // If running locally or if Render mounted the secret file correctly
  serviceAccount = require('./serviceAccountKey.json');
} catch (e) {
  console.log("⚠️ serviceAccountKey.json not found. Ensure Firebase is configured.");
}

if (serviceAccount && !admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}
const db = admin.firestore();

// --- ROUTES ---

// 1. FATSECRET PROXY
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

// 2. GET ALL FOODS
app.get('/api/foods', async (req, res) => {
  try {
    const snapshot = await db.collection('foods').get();
    const foods = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json(foods);
  } catch (err) {
    console.error("Error fetching foods:", err);
    res.status(500).send("Server Error");
  }
});

// 3. GET USER LOG
app.get('/api/log/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const today = new Date().toISOString().split('T')[0];
    const snapshot = await db.collection('logs')
      .where('userId', '==', userId)
      .where('date', '==', today)
      .get();
    const logItems = snapshot.docs.map(doc => ({ log_id: doc.id, ...doc.data() }));
    res.json(logItems);
  } catch (err) {
    console.error("Error fetching log:", err);
    res.status(500).send("Server Error");
  }
});

// 4. ADD TO LOG
app.post('/api/log', async (req, res) => {
  try {
    const { userId, foodId, ...foodData } = req.body;
    const newLogItem = {
      userId,
      foodId,
      date: new Date().toISOString().split('T')[0],
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      ...foodData
    };
    const docRef = await db.collection('logs').add(newLogItem);
    res.json({ success: true, logId: docRef.id });
  } catch (err) {
    console.error("Error adding to log:", err);
    res.status(500).send("Server Error");
  }
});

// 5. DELETE FROM LOG
app.delete('/api/log/:logId', async (req, res) => {
  try {
    await db.collection('logs').doc(req.params.logId).delete();
    res.json({ success: true });
  } catch (err) {
    console.error("Error deleting log:", err);
    res.status(500).send("Server Error");
  }
});

app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));