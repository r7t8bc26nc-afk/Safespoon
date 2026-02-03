// src/firebase.js
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore"; // <--- This was missing
import { getMessaging } from "firebase/messaging";

const firebaseConfig = {
  apiKey: "AIzaSyBNZ67JjwoFIXXDg5OK6w9SuabhQmzZ7aw",
  authDomain: "vensight-bfde4.firebaseapp.com",
  projectId: "vensight-bfde4",
  storageBucket: "vensight-bfde4.firebasestorage.app",
  messagingSenderId: "149066473193",
  appId: "1:149066473193:web:8ba0b6b75866a9923fda78"
};

const app = initializeApp(firebaseConfig);

// Initialize services
export const auth = getAuth(app);
export const db = getFirestore(app); // <--- App.jsx needs this!
export const messaging = getMessaging(app);

export default app;