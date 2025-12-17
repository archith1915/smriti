import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  enableIndexedDbPersistence,
  initializeFirestore, 
  CACHE_SIZE_UNLIMITED 
} from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import { getStorage } from 'firebase/storage';

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
const auth = getAuth(app);

// Initialize Firestore with settings
const db = initializeFirestore(app, {
  cacheSizeBytes: CACHE_SIZE_UNLIMITED
});

// Enable Offline Persistence
enableIndexedDbPersistence(db).catch((err) => {
  if (err.code == 'failed-precondition') {
    // Multiple tabs open, persistence can only be enabled in one tab at a a time.
    console.log("Persistence failed: Multiple tabs open.");
  } else if (err.code == 'unimplemented') {
    // The current browser does not support all of the features required to enable persistence
    console.log("Persistence not supported by browser.");
  }
});

const storage = getStorage(app);
const messaging = getMessaging(app);

export { auth, db, storage, messaging, getToken, onMessage };