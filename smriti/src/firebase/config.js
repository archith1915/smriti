import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';

const firebaseConfig = {
  apiKey: "AIzaSyAr6Dvv6kNHhn75sAQ9PC9fhybhZqvfkUU",
  authDomain: "smriti-7b67f.firebaseapp.com",
  projectId: "smriti-7b67f",
  storageBucket: "smriti-7b67f.firebasestorage.app",
  messagingSenderId: "329379769166",
  appId: "1:329379769166:web:a48d05b00e2e1703668c1f",
  measurementId: "G-VBYYWLV6VW"
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const auth = getAuth(app);

let messaging = null;
try {
  if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
    messaging = getMessaging(app);
  }
} catch (error) {
  console.log('FCM not supported:', error);
}

export { messaging, getToken, onMessage };
export default app;