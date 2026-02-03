// src/components/NotificationManager.jsx
import { useEffect } from 'react';
import { getToken } from "firebase/messaging";
import { doc, updateDoc, arrayUnion } from "firebase/firestore";
import { messaging, db } from '../firebase'; 

// REPLACE WITH YOUR KEY
const VAPID_KEY = "_qhDosr-U-LDSkXRy_f65mGyYbKnN2QVX1vqTz0OJTw";

const NotificationManager = ({ user }) => {
    useEffect(() => {
        if (!user) return;

        const requestPermission = async () => {
            try {
                const permission = await Notification.requestPermission();
                if (permission === 'granted') {
                    const token = await getToken(messaging, { vapidKey: VAPID_KEY });
                    if (token) {
                        await updateDoc(doc(db, "users", user.uid), {
                            fcmTokens: arrayUnion(token)
                        });
                        
                        // --- NEW: Send Immediate Welcome Notification ---
                        // This runs locally on the device to confirm setup
                        new Notification("Welcome to Safespoon", {
                            body: "You're all set! Tap here to log your first meal and start thriving.",
                            icon: "/app-icon.png",
                            badge: "/app-icon.png", // Small icon for Android status bar
                            tag: "welcome-message" // Prevents duplicate notifications
                        });
                    }
                }
            } catch (error) {
                console.error("Error setting up notifications:", error);
            }
        };

        requestPermission();
    }, [user]);

    return null; 
};

export default NotificationManager;


