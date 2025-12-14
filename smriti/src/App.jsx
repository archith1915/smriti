import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Navbar from './components/Navbar';
import Dashboard from './pages/Dashboard';
import Journals from './pages/Journals';
import JournalEditor from './pages/JournalEditor';
import JournalView from './pages/JournalView';
import Tasks from './pages/Tasks';
import Calendar from './pages/Calendar';
import Settings from './pages/Settings';
import { ThemeProvider } from './context/ThemeContext';
import { SettingsProvider } from './context/SettingsContext';
import { NotificationManager } from './utils/notifications';

function App() {
  useEffect(() => {
    // Initialize notification manager
    NotificationManager.requestPermission();
    NotificationManager.startListening();

    return () => {
      NotificationManager.stopListening();
    };
  }, []);

  return (
    <ThemeProvider>
      <SettingsProvider>
        <Router>
          <div className="min-h-screen bg-white dark:bg-black text-black dark:text-white transition-colors duration-200">
            <Navbar />
            <main className="pb-6">
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/journals" element={<Journals />} />
                <Route path="/journals/new" element={<JournalEditor />} />
                <Route path="/journals/edit/:id" element={<JournalEditor />} />
                <Route path="/journals/view/:id" element={<JournalView />} />
                <Route path="/tasks" element={<Tasks />} />
                <Route path="/calendar" element={<Calendar />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </main>
            <Toaster
              position="bottom-center"
              toastOptions={{
                duration: 3000,
                style: {
                  background: 'rgba(0, 0, 0, 0.8)',
                  color: '#fff',
                  backdropFilter: 'blur(10px)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '12px',
                  padding: '12px 20px',
                },
                success: {
                  iconTheme: {
                    primary: '#10b981',
                    secondary: '#fff',
                  },
                },
                error: {
                  iconTheme: {
                    primary: '#ef4444',
                    secondary: '#fff',
                  },
                },
              }}
            />
          </div>
        </Router>
      </SettingsProvider>
    </ThemeProvider>
  );
}

export default App;