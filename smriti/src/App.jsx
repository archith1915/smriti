import React, { useEffect } from 'react';
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
import Auth from './pages/Auth';
import { ThemeProvider } from './context/ThemeContext';
import { SettingsProvider } from './context/SettingsContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { NotificationManager } from './utils/notifications';
import { useTheme } from './context/ThemeContext';

const PrivateRoute = ({ children }) => {
  const { currentUser } = useAuth();
  return currentUser ? children : <Navigate to="/auth" />;
};

const AppContent = () => {
  const { currentUser } = useAuth();
  const { theme } = useTheme();
  
  useEffect(() => {
    if (currentUser) {
      NotificationManager.requestPermission();
      NotificationManager.startListening();
    }

    return () => {
      NotificationManager.stopListening();
    };
  }, [currentUser]);

  return (
    <div className="min-h-screen bg-transparent text-gray-900 dark:text-gray-100">

      {currentUser && <Navbar />}
      <main className={currentUser ? "pb-6" : ""}>
        <Routes>
          <Route path="/auth" element={currentUser ? <Navigate to="/" /> : <Auth />} />
          <Route path="/" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
          <Route path="/journals" element={<PrivateRoute><Journals /></PrivateRoute>} />
          <Route path="/journals/new" element={<PrivateRoute><JournalEditor /></PrivateRoute>} />
          <Route path="/journals/edit/:id" element={<PrivateRoute><JournalEditor /></PrivateRoute>} />
          <Route path="/journals/view/:id" element={<PrivateRoute><JournalView /></PrivateRoute>} />
          <Route path="/tasks" element={<PrivateRoute><Tasks /></PrivateRoute>} />
          <Route path="/calendar" element={<PrivateRoute><Calendar /></PrivateRoute>} />
          <Route path="/settings" element={<PrivateRoute><Settings /></PrivateRoute>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <Toaster
    position="bottom-center"
    toastOptions={{
      duration: 3000,
      style: {
        background: theme === 'dark' ? '#000' : '#fff',
        color: theme === 'dark' ? '#fff' : '#000',
        border: theme === 'dark' ? '1px solid #333' : '1px solid #e5e7eb',
      },
    }}
  />
    </div>
  );
};

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <SettingsProvider>
          <Router>
            <AppContent />
          </Router>
        </SettingsProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;