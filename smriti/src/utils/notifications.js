import { db, messaging, getToken, onMessage } from '../firebase/config';
import { collection, query, where, getDocs, doc, setDoc, getDoc } from 'firebase/firestore';
import { format, isToday, isTomorrow, parseISO } from 'date-fns';
import toast from 'react-hot-toast';

class NotificationManagerClass {
  constructor() {
    this.permission = 'default';
    this.checkInterval = null;
    this.fcmToken = null;
  }

  async requestPermission() {
    if (!('Notification' in window)) {
      console.log('This browser does not support notifications');
      return;
    }

    this.permission = await Notification.requestPermission();
    
    if (this.permission === 'granted' && messaging) {
      try {
        // Register service worker
        const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
        console.log('Service Worker registered:', registration);

        // Get FCM token
        this.fcmToken = await getToken(messaging, {
          vapidKey: 'BHLLKgL6s9yMrkSB18Uy12vWguUemVI2nC3rjaYAbiHQjKZ7O-Hcm8bxqdJTAWok9Komtl8f9JWLdWUls4TuGrM', // We'll get this from Firebase Console
          serviceWorkerRegistration: registration,
        });

        if (this.fcmToken) {
          console.log('FCM Token:', this.fcmToken);
          // Save token to Firestore
          await this.saveFCMToken(this.fcmToken);
          
          // Listen for foreground messages
          onMessage(messaging, (payload) => {
            console.log('Foreground message received:', payload);
            this.showNotification(
              payload.notification.title,
              payload.notification.body,
              payload.data?.tag
            );
          });
        }
      } catch (error) {
        console.error('Error getting FCM token:', error);
      }
    }
  }

  async saveFCMToken(token) {
    try {
      await setDoc(doc(db, 'fcmTokens', 'userToken'), {
        token,
        updatedAt: new Date(),
      });
    } catch (error) {
      console.error('Error saving FCM token:', error);
    }
  }

  showNotification(title, body, tag = 'smriti') {
    if (this.permission === 'granted') {
      try {
        new Notification(title, {
          body,
          icon: '/smriti-logo.svg',
          badge: '/smriti-logo.svg',
          tag,
          requireInteraction: false,
        });
      } catch (error) {
        console.log('Notification error:', error);
      }
    }
    // Also show toast
    toast(body, { icon: '🔔' });
  }

  async checkJournalStreak() {
    try {
      const today = format(new Date(), 'yyyy-MM-dd');
      const journalsRef = collection(db, 'journals');
      const q = query(journalsRef, where('date', '==', today));
      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        const now = new Date();
        const currentHour = now.getHours();
        
        // Check settings for reminder time
        const settingsDoc = await getDoc(doc(db, 'settings', 'userSettings'));
        let reminderHour = 21; // Default 9 PM
        
        if (settingsDoc.exists()) {
          const reminderTime = settingsDoc.data().journalReminderTime || '21:00';
          reminderHour = parseInt(reminderTime.split(':')[0]);
        }
        
        // Remind at set time if not written
        if (currentHour >= reminderHour) {
          this.showNotification(
            '📝 Journal Reminder',
            "Don't forget to write your journal today! Keep your streak going! 🔥",
            'journal-reminder'
          );
        }
      }
    } catch (error) {
      console.error('Error checking journal streak:', error);
    }
  }

  async checkUpcomingTasks() {
    try {
      const now = new Date();
      const today = format(now, 'yyyy-MM-dd');
      const tasksRef = collection(db, 'tasks');
      const q = query(
        tasksRef,
        where('status', '!=', 'completed'),
        where('dueDate', '==', today)
      );
      const snapshot = await getDocs(q);

      snapshot.forEach(document => {
        const task = document.data();
        if (task.dueTime) {
          const taskDateTime = parseISO(`${task.dueDate}T${task.dueTime}`);
          const diffMs = taskDateTime - now;
          const diffMins = Math.floor(diffMs / 60000);

          // Notify 30 minutes before
          if (diffMins > 0 && diffMins <= 30) {
            this.showNotification(
              '⏰ Task Due Soon',
              `"${task.title}" is due in ${diffMins} minutes!`,
              `task-${document.id}`
            );
          }
        }
      });
    } catch (error) {
      console.error('Error checking tasks:', error);
    }
  }

  async checkUpcomingEvents() {
    try {
      const today = format(new Date(), 'yyyy-MM-dd');
      const tomorrow = format(new Date(Date.now() + 86400000), 'yyyy-MM-dd');
      
      const eventsRef = collection(db, 'events');
      const snapshot = await getDocs(eventsRef);

      snapshot.forEach(document => {
        const event = document.data();

        if (event.date === today) {
          this.showNotification(
            '📅 Event Today',
            `"${event.title}" is today${event.time ? ` at ${event.time}` : ''}!`,
            `event-today-${document.id}`
          );
        } else if (event.date === tomorrow) {
          this.showNotification(
            '📅 Event Tomorrow',
            `"${event.title}" is tomorrow${event.time ? ` at ${event.time}` : ''}!`,
            `event-tomorrow-${document.id}`
          );
        }
      });
    } catch (error) {
      console.error('Error checking events:', error);
    }
  }

  async checkStreakMotivation() {
    try {
      const journalsRef = collection(db, 'journals');
      const snapshot = await getDocs(query(journalsRef));
      
      if (snapshot.size > 0) {
        const journals = snapshot.docs.map(doc => doc.data());
        const dates = [...new Set(journals.map(j => j.date))].sort().reverse();
        
        // Calculate current streak
        let streak = 0;
        const today = format(new Date(), 'yyyy-MM-dd');
        const yesterday = format(new Date(Date.now() - 86400000), 'yyyy-MM-dd');
        
        if (dates[0] === today || dates[0] === yesterday) {
          let checkDate = new Date();
          for (let i = 0; i < dates.length; i++) {
            const expectedDate = format(checkDate, 'yyyy-MM-dd');
            if (dates[i] === expectedDate) {
              streak++;
              checkDate = new Date(checkDate.getTime() - 86400000);
            } else {
              break;
            }
          }
        }

        // Motivational milestones
        if (streak === 7) {
          this.showNotification(
            '🎉 7-Day Streak!',
            'Amazing! You\'ve journaled for a whole week! Keep it up!',
            'streak-milestone'
          );
        } else if (streak === 30) {
          this.showNotification(
            '🏆 30-Day Streak!',
            'Incredible! A month of consistent journaling! You\'re unstoppable!',
            'streak-milestone'
          );
        } else if (streak === 100) {
          this.showNotification(
            '👑 100-Day Streak!',
            'LEGENDARY! 100 days of journaling! You\'re a journaling master!',
            'streak-milestone'
          );
        }
      }
    } catch (error) {
      console.error('Error checking streak motivation:', error);
    }
  }

  startListening() {
    // Check immediately
    this.checkJournalStreak();
    this.checkUpcomingTasks();
    this.checkUpcomingEvents();
    
    // Check every 15 minutes
    this.checkInterval = setInterval(() => {
      this.checkJournalStreak();
      this.checkUpcomingTasks();
      this.checkUpcomingEvents();
    }, 15 * 60 * 1000);

    // Check streak motivation once per day
    const checkStreakDaily = () => {
      this.checkStreakMotivation();
      // Check again in 24 hours
      setTimeout(checkStreakDaily, 24 * 60 * 60 * 1000);
    };
    checkStreakDaily();
  }

  stopListening() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
    }
  }
}

export const NotificationManager = new NotificationManagerClass();