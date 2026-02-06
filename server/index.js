require('dotenv').config();
const express = require('express');
const cors = require('cors');
const admin = require('firebase-admin');
const OAuth = require('oauth-1.0a');
const crypto = require('crypto');
const serviceAccount = require('./serviceAccountKey.json');

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();
const app = express();

app.use(cors());
app.use(express.json());

// --- FIREBASE DATA ROUTES ---

// 1. GET ALL FOODS
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

// 2. GET USER LOG
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

// 3. ADD TO LOG
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

// 4. DELETE FROM LOG
app.delete('/api/log/:logId', async (req, res) => {
  try {
    await db.collection('logs').doc(req.params.logId).delete();
    res.json({ success: true });
  } catch (err) {
    console.error("Error deleting log:", err);
    res.status(500).send("Server Error");
  }
});

// --- NEW FATSECRET OAUTH 1.0 PROXY (Bypasses IP Whitelist) ---
app.get('/api/food-search', async (req, res) => {
  try {
    const query = req.query.search_expression;
    if (!query) return res.status(400).json({ error: "Missing search term" });

    // 1. Initialize OAuth 1.0 Helper
    const oauth = OAuth({
      consumer: {
        key: process.env.FATSECRET_CLIENT_ID,
        secret: process.env.FATSECRET_CLIENT_SECRET,
      },
      signature_method: 'HMAC-SHA1',
      hash_function(base_string, key) {
        return crypto.createHmac('sha1', key).update(base_string).digest('base64');
      },
    });

    // 2. Define the Request Data (FatSecret REST API)
    const request_data = {
      url: 'https://platform.fatsecret.com/rest/server.api',
      method: 'POST',
      data: {
        method: 'foods.search',
        search_expression: query,
        format: 'json',
        // Optional: 'region': 'US', 
      },
    };

    // 3. Sign the Request
    const authorization = oauth.authorize(request_data);

    // FatSecret Specific: Merge signature params into the body
    const params = new URLSearchParams({
      ...request_data.data,
      ...authorization 
    });

    // 4. Send Request
    const response = await fetch(request_data.url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params
    });

    const data = await response.json();
    
    if (data.error) {
      console.error("FatSecret Proxy Error:", data.error);
      return res.status(400).json(data);
    }

    res.json(data);

  } catch (error) {
    console.error('Server Search Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

const PORT = 5001;
app.listen(PORT, () => {
  console.log(`🔥 Server running on port ${PORT} (Firestore Connected)`);
});r