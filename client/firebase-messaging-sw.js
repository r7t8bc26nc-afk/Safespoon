// public/firebase-messaging-sw.js
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

// 1. Initialize Firebase in the worker (Paste your config from firebase.js here)
const firebaseConfig = {
  apiKey: "AIzaSyBNZ67JjwoFIXXDg5OK6w9SuabhQmzZ7aw",
  authDomain: "vensight-bfde4.firebaseapp.com",
  projectId: "vensight-bfde4",
  storageBucket: "vensight-bfde4.firebasestorage.app",
  messagingSenderId: "149066473193",
  appId: "1:149066473193:web:8ba0b6b75866a9923fda78"
};

firebase.initializeApp(firebaseConfig);

// 2. Retrieve an instance of Firebase Messaging so that it can handle background messages.
const messaging = firebase.messaging();

// 3. Handle background messages
messaging.onBackgroundMessage(function(payload) {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  
  // Customize notification here
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/app-icon.png' // Your app icon
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});