import { db, messaging, getToken, onMessage } from '../firebase/config';
import { doc, setDoc } from 'firebase/firestore';
import toast from 'react-hot-toast';

class NotificationManagerClass {
  constructor() {
    this.permission = 'default';
    this.fcmToken = null;
    this.isListening = false;
  }

  async requestPermission(userId) {
    if (!('Notification' in window)) {
      console.log('This browser does not support notifications');
      return;
    }

    if (!userId) {
      console.log('Notification setup skipped: No User ID');
      return;
    }

    this.permission = await Notification.requestPermission();
    
    if (this.permission === 'granted' && messaging) {
      try {
        // Explicitly register the service worker to avoid path issues
        const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
        
        // Get the token using the VAPID key
        this.fcmToken = await getToken(messaging, {
          vapidKey: 'BHLLKgL6s9yMrkSB18Uy12vWguUemVI2nC3rjaYAbiHQjKZ7O-Hcm8bxqdJTAWok9Komtl8f9JWLdWUls4TuGrM', 
          serviceWorkerRegistration: registration,
        });

        if (this.fcmToken) {
          console.log('FCM Token generated');
          // Save the token linked to the specific USER ID
          await this.saveFCMToken(userId, this.fcmToken);
          
          // Start listening for messages while the app is open
          this.listenForForeground();
        }
      } catch (error) {
        console.error('Error setting up notifications:', error);
      }
    }
  }

  async saveFCMToken(userId, token) {
    try {
      // We save the document with the ID as the userId
      // This allows the backend to find it easily: db.collection('fcmTokens').doc(userId)
      await setDoc(doc(db, 'fcmTokens', userId), {
        token,
        userId: userId, // Explicitly saving userId as a field too for query safety
        updatedAt: new Date(),
        device: navigator.userAgent
      });
      console.log('Token saved to Firestore for user:', userId);
    } catch (error) {
      console.error('Error saving FCM token:', error);
    }
  }

  listenForForeground() {
    if (this.isListening) return;

    onMessage(messaging, (payload) => {
      console.log('🔥 Foreground Message:', payload);
      const { title, body } = payload.notification;

      // 1. Force a System Notification (Browser Level) if permission granted
      // if (Notification.permission === 'granted') {
      //   new Notification(title, {
      //     body: body,
      //     icon: '/smriti-logo.svg',
      //   });
      // }

      // 2. Show a Toast inside the app (Fallback/Additional UI)
      toast(body, { 
        icon: '🔔',
        duration: 5000,
        style: {
          border: '1px solid #333',
          padding: '16px',
          color: '#333',
        },
      });
    });

    this.isListening = true;
  }
}

export const NotificationManager = new NotificationManagerClass();