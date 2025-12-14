import React, { createContext, useContext, useState, useEffect } from 'react';
import { db } from '../firebase/config';
import { doc, getDoc, setDoc } from 'firebase/firestore';

const SettingsContext = createContext();

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within SettingsProvider');
  }
  return context;
};

const defaultSettings = {
  dateFormat: 'MMM dd, yyyy',
  timeFormat: '12h',
  taskCategories: ['Work', 'Personal', 'Health', 'Study', 'Other'],
  eventCategories: ['Birthday', 'Anniversary', 'Meeting', 'Appointment', 'Other'],
  moods: ['😊 Happy', '😌 Calm', '😔 Sad', '😰 Anxious', '😡 Angry', '🤔 Thoughtful', '😴 Tired', '🎉 Excited'],
  journalReminderTime: '21:00',
  username: 'user',
  password: 'smriti123',
};

export const SettingsProvider = ({ children }) => {
  const [settings, setSettings] = useState(defaultSettings);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const docRef = doc(db, 'settings', 'userSettings');
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        setSettings({ ...defaultSettings, ...docSnap.data() });
      } else {
        await setDoc(docRef, defaultSettings);
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateSettings = async (newSettings) => {
    try {
      const updated = { ...settings, ...newSettings };
      await setDoc(doc(db, 'settings', 'userSettings'), updated);
      setSettings(updated);
      return true;
    } catch (error) {
      console.error('Error updating settings:', error);
      return false;
    }
  };

  return (
    <SettingsContext.Provider value={{ settings, updateSettings, loading }}>
      {children}
    </SettingsContext.Provider>
  );
};