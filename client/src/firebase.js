// src/firebase.js
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// TODO: Replace the following with your app's Firebase project configuration
// You can get this from Firebase Console > Project Settings > General > Your Apps > SDK Setup
const firebaseConfig = {
    apiKey: "AIzaSyBNZ67JjwoFIXXDg5OK6w9SuabhQmzZ7aw",
  authDomain: "vensight-bfde4.firebaseapp.com",
  projectId: "vensight-bfde4",
  storageBucket: "vensight-bfde4.firebasestorage.app",
  messagingSenderId: "149066473193",
  appId: "1:149066473193:web:8ba0b6b75866a9923fda78",
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);