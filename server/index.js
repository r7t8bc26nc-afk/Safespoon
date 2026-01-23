const express = require('express');
const cors = require('cors');
const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

// 1. Initialize Firebase
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();
const app = express();

app.use(cors());
app.use(express.json());

// --- ROUTES ---

// 1. GET ALL FOODS (The Menu)
app.get('/api/foods', async (req, res) => {
  try {
    const snapshot = await db.collection('foods').get();
    // Convert Firebase documents to a simple list
    const foods = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    res.json(foods);
  } catch (err) {
    console.error("Error fetching foods:", err);
    res.status(500).send("Server Error");
  }
});

// 2. GET USER LOG (What they ate today)
app.get('/api/log/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Get today's date string (YYYY-MM-DD) to filter
    const today = new Date().toISOString().split('T')[0];

    const snapshot = await db.collection('logs')
      .where('userId', '==', userId)
      .where('date', '==', today)
      .get();

    const logItems = snapshot.docs.map(doc => ({
      log_id: doc.id,
      ...doc.data()
    }));

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
    
    // We save the WHOLE food object so we don't have to look it up later
    // This makes NoSQL much faster
    const newLogItem = {
      userId,
      foodId,
      date: new Date().toISOString().split('T')[0], // Save as "2024-01-18"
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      // Save food details directly in the log (Denormalization)
      name: foodData.name || "Unknown Item",
      cals: foodData.cals || 0,
      protein: foodData.protein || 0,
      carbs: foodData.carbs || 0,
      fat: foodData.fat || 0,
      brand: foodData.brand || ""
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
    const { logId } = req.params;
    await db.collection('logs').doc(logId).delete();
    res.json({ success: true });
  } catch (err) {
    console.error("Error deleting log:", err);
    res.status(500).send("Server Error");
  }
});

const PORT = 5000;
app.listen(PORT, () => {
  console.log(`🔥 Server running on port ${PORT} (Connected to Firestore)`);
});