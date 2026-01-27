const express = require('express');
const cors = require('cors');
const admin = require('firebase-admin');
require('dotenv').config();
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

const PORT = 5001;
app.listen(PORT, () => {
  console.log(`🔥 Server running on port ${PORT} (Firestore Connected)`);
});