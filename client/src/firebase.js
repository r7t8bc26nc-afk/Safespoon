// DELETE THIS (Admin/Service Account)
// import serviceAccount from './serviceAccountKey.json';
// admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });

// USE THIS INSTEAD (Safe for Client)
import { initializeApp } from "firebase/app";
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT",
  // ... other config values from Firebase Console
};
const app = initializeApp(firebaseConfig);