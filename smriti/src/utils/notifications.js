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
    if (!('Notification' in window)) return;
    if (!userId) return;

    this.permission = await Notification.requestPermission();
    
    if (this.permission === 'granted' && messaging) {
      try {
        const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
        
        this.fcmToken = await getToken(messaging, {
          vapidKey: 'BHLLKgL6s9yMrkSB18Uy12vWguUemVI2nC3rjaYAbiHQjKZ7O-Hcm8bxqdJTAWok9Komtl8f9JWLdWUls4TuGrM', 
          serviceWorkerRegistration: registration,
        });

        if (this.fcmToken) {
          console.log('FCM Token generated');
          await this.saveFCMToken(userId, this.fcmToken);
          this.listenForForeground();
        }
      } catch (error) {
        console.error('Error setting up notifications:', error);
      }
    }
  }

  async saveFCMToken(userId, token) {
    try {
      await setDoc(doc(db, 'fcmTokens', userId), {
        token,
        userId: userId,
        updatedAt: new Date(),
        device: navigator.userAgent
      });
    } catch (error) {
      console.error('Error saving FCM token:', error);
    }
  }

  listenForForeground() {
    if (this.isListening) return;

    onMessage(messaging, (payload) => {
      console.log('🔥 Foreground Message:', payload);
      
      const title = payload.data?.title || payload.notification?.title;
      const body = payload.data?.body || payload.notification?.body;

      // ✅ RESTORED: This is required for Data-Only messages to show up!
      if (Notification.permission === 'granted') {
        new Notification(title, {
          body: body,
          icon: '/smriti-logo.svg',
          // Optional: Add click behavior here if needed to focus the window
        });
      }

      // Also show the Toast (Visual feedback inside the app)
      if (body) {
        toast(body, { 
          icon: '🔔',
          duration: 5000,
          style: {
            border: '1px solid #333',
            padding: '16px',
            color: '#333',
          },
        });
      }
    });

    this.isListening = true;
  }
}

export const NotificationManager = new NotificationManagerClass();