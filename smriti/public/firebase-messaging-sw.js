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
  console.log('Background Message:', payload);

  // 1. Unpack data from payload.data (NOT payload.notification)
  const { title, body, url, tag } = payload.data;

  const notificationOptions = {
    body: body,
    icon: '/smriti-logo.svg', // Ensure this file exists in public/
    badge: '/smriti-logo.svg',
    tag: tag, // Replaces old notification if same ID
    data: { url: url || 'https://arteccosmriti.netlify.app' },
    requireInteraction: true // Keeps notification visible until clicked
  };

  return self.registration.showNotification(title, notificationOptions);
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const urlToOpen = event.notification.data?.url || 'https://arteccosmriti.netlify.app';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // Focus existing tab if open
      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i];
        if (client.url.includes('arteccosmriti.netlify.app') && 'focus' in client) {
          return client.focus().then(c => 'navigate' in c ? c.navigate(urlToOpen) : null);
        }
      }
      // Otherwise open new
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});