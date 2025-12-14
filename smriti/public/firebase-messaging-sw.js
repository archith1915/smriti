// Service Worker for Firebase Cloud Messaging
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

// Initialize Firebase in the service worker
firebase.initializeApp({
  apiKey: "AIzaSyAr6Dvv6kNHhn75sAQ9PC9fhybhZqvfkUU",
  authDomain: "smriti-7b67f.firebaseapp.com",
  projectId: "smriti-7b67f",
  storageBucket: "smriti-7b67f.firebasestorage.app",
  messagingSenderId: "329379769166",
  appId: "1:329379769166:web:a48d05b00e2e1703668c1f",
  measurementId: "G-VBYYWLV6VW"
});

const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  console.log('Received background message:', payload);

  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/smriti-logo.svg',
    badge: '/smriti-logo.svg',
    tag: payload.data?.tag || 'smriti-notification',
    requireInteraction: false,
    data: payload.data,
  };

  return self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('Notification clicked:', event);
  event.notification.close();

  event.waitUntil(
    clients.openWindow('/')
  );
});