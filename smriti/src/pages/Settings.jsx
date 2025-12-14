import React, { useState } from 'react';
import { Save, Download, Upload, Trash2, Plus, X } from 'lucide-react';
import { useSettings } from '../context/SettingsContext';
import { collection, getDocs, deleteDoc, doc, writeBatch } from 'firebase/firestore';
import { db } from '../firebase/config';
import toast from 'react-hot-toast';
import { useTheme } from '../context/ThemeContext';

const Settings = () => {
  const { settings, updateSettings } = useSettings();
  const { theme } = useTheme();
  const [formData, setFormData] = useState({ ...settings });
  const [newCategory, setNewCategory] = useState({ task: '', event: '' });
  const [newMood, setNewMood] = useState('');
  const [clearDataPassword, setClearDataPassword] = useState('');
  const [clearDataUsername, setClearDataUsername] = useState('');
  const [showClearModal, setShowClearModal] = useState(false);

  const handleSave = async () => {
    const success = await updateSettings(formData);
    if (success) {
      toast.success('Settings saved successfully! ⚙️');
    } else {
      toast.error('Failed to save settings');
    }
  };

  const handleAddCategory = (type) => {
    const value = type === 'task' ? newCategory.task : newCategory.event;
    if (!value.trim()) {
      toast.error('Please enter a category name');
      return;
    }

    const key = type === 'task' ? 'taskCategories' : 'eventCategories';
    if (formData[key].includes(value.trim())) {
      toast.error('Category already exists');
      return;
    }

    setFormData({
      ...formData,
      [key]: [...formData[key], value.trim()],
    });
    setNewCategory({ ...newCategory, [type]: '' });
    toast.success('Category added! Click Save to apply.');
  };

  const handleRemoveCategory = (type, category) => {
    const key = type === 'task' ? 'taskCategories' : 'eventCategories';
    setFormData({
      ...formData,
      [key]: formData[key].filter(c => c !== category),
    });
    toast.success('Category removed! Click Save to apply.');
  };

  const handleAddMood = () => {
    if (!newMood.trim()) {
      toast.error('Please enter a mood');
      return;
    }

    if (formData.moods.includes(newMood.trim())) {
      toast.error('Mood already exists');
      return;
    }

    setFormData({
      ...formData,
      moods: [...formData.moods, newMood.trim()],
    });
    setNewMood('');
    toast.success('Mood added! Click Save to apply.');
  };

  const handleRemoveMood = (mood) => {
    setFormData({
      ...formData,
      moods: formData.moods.filter(m => m !== mood),
    });
    toast.success('Mood removed! Click Save to apply.');
  };

  const handleBackup = async () => {
    try {
      const backup = {
        journals: [],
        tasks: [],
        events: [],
        settings: formData,
        exportDate: new Date().toISOString(),
      };

      // Get all collections
      const collections = ['journals', 'tasks', 'events'];
      for (const collectionName of collections) {
        const snapshot = await getDocs(collection(db, collectionName));
        backup[collectionName] = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        }));
      }

      // Download as JSON
      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `smriti-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success('Backup downloaded successfully! 💾');
    } catch (error) {
      console.error('Error creating backup:', error);
      toast.error('Failed to create backup');
    }
  };

  const handleRestore = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      const text = await file.text();
      const backup = JSON.parse(text);

      if (!backup.journals || !backup.tasks || !backup.events) {
        toast.error('Invalid backup file');
        return;
      }

      if (!window.confirm('This will replace all your current data. Are you sure?')) {
        return;
      }

      const batch = writeBatch(db);

      // Clear existing data
      const collectionsToDelete = ['journals', 'tasks', 'events'];
      for (const collectionName of collectionsToDelete) {
        const snapshot = await getDocs(collection(db, collectionName));
        snapshot.docs.forEach(document => {
          batch.delete(document.ref);
        });
      }

      // Restore data
      for (const collectionName of collectionsToDelete) {
        backup[collectionName].forEach(item => {
          const { id, ...data } = item;
          const docRef = doc(db, collectionName, id);
          batch.set(docRef, data);
        });
      }

      await batch.commit();

      // Restore settings
      if (backup.settings) {
        await updateSettings(backup.settings);
        setFormData(backup.settings);
      }

      toast.success('Data restored successfully! 🎉');
      setTimeout(() => window.location.reload(), 1500);
    } catch (error) {
      console.error('Error restoring backup:', error);
      toast.error('Failed to restore backup');
    }
  };

  const handleClearData = async () => {
    if (clearDataUsername !== formData.username || clearDataPassword !== formData.password) {
      toast.error('Incorrect username or password');
      return;
    }

    try {
      const collections = ['journals', 'tasks', 'events'];
      for (const collectionName of collections) {
        const snapshot = await getDocs(collection(db, collectionName));
        const deletePromises = snapshot.docs.map(document => deleteDoc(document.ref));
        await Promise.all(deletePromises);
      }

      toast.success('All data cleared successfully');
      setShowClearModal(false);
      setClearDataUsername('');
      setClearDataPassword('');
      setTimeout(() => window.location.reload(), 1500);
    } catch (error) {
      console.error('Error clearing data:', error);
      toast.error('Failed to clear data');
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Settings ⚙️</h1>
        <p className="text-gray-600 dark:text-gray-400">
          Customize your Smriti experience
        </p>
      </div>

      <div className="space-y-6">
        {/* Date & Time Formats */}
        <div className="glass rounded-2xl p-6">
          <h2 className="text-xl font-semibold mb-4">Date & Time Formats</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Date Format</label>
              <select
                value={formData.dateFormat}
                onChange={(e) => setFormData({ ...formData, dateFormat: e.target.value })}
                className="w-full px-4 py-3 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="MMM dd, yyyy">MMM dd, yyyy (Dec 14, 2025)</option>
                <option value="dd/MM/yyyy">dd/MM/yyyy (14/12/2025)</option>
                <option value="MM/dd/yyyy">MM/dd/yyyy (12/14/2025)</option>
                <option value="yyyy-MM-dd">yyyy-MM-dd (2025-12-14)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Time Format</label>
              <select
                value={formData.timeFormat}
                onChange={(e) => setFormData({ ...formData, timeFormat: e.target.value })}
                className="w-full px-4 py-3 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="12h">12 Hour (2:30 PM)</option>
                <option value="24h">24 Hour (14:30)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Task Categories */}
        <div className="glass rounded-2xl p-6">
          <h2 className="text-xl font-semibold mb-4">Task Categories</h2>
          <div className="flex flex-wrap gap-2 mb-4">
            {formData.taskCategories.map(cat => (
              <div
                key={cat}
                className="flex items-center space-x-2 px-3 py-2 bg-purple-100 dark:bg-purple-900 rounded-lg"
              >
                <span className="text-sm">{cat}</span>
                <button
                  onClick={() => handleRemoveCategory('task', cat)}
                  className="text-red-600 hover:text-red-700"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={newCategory.task}
              onChange={(e) => setNewCategory({ ...newCategory, task: e.target.value })}
              placeholder="Add new category..."
              className="flex-1 px-4 py-3 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 outline-none focus:ring-2 focus:ring-purple-500"
              onKeyPress={(e) => e.key === 'Enter' && handleAddCategory('task')}
            />
            <button
              onClick={() => handleAddCategory('task')}
              className="p-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-all"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Event Categories */}
        <div className="glass rounded-2xl p-6">
          <h2 className="text-xl font-semibold mb-4">Event Categories</h2>
          <div className="flex flex-wrap gap-2 mb-4">
            {formData.eventCategories.map(cat => (
              <div
                key={cat}
                className="flex items-center space-x-2 px-3 py-2 bg-blue-100 dark:bg-blue-900 rounded-lg"
              >
                <span className="text-sm">{cat}</span>
                <button
                  onClick={() => handleRemoveCategory('event', cat)}
                  className="text-red-600 hover:text-red-700"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={newCategory.event}
              onChange={(e) => setNewCategory({ ...newCategory, event: e.target.value })}
              placeholder="Add new category..."
              className="flex-1 px-4 py-3 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 outline-none focus:ring-2 focus:ring-purple-500"
onKeyPress={(e) => e.key === 'Enter' && handleAddCategory('event')}
/>
<button
onClick={() => handleAddCategory('event')}
className="p-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-all"
>
<Plus className="w-5 h-5" />
</button>
</div>
</div>
    {/* Mood Options */}
    <div className="glass rounded-2xl p-6">
      <h2 className="text-xl font-semibold mb-4">Mood Options</h2>
      <div className="flex flex-wrap gap-2 mb-4">
        {formData.moods.map(mood => (
          <div
            key={mood}
            className="flex items-center space-x-2 px-3 py-2 bg-yellow-100 dark:bg-yellow-900 rounded-lg"
          >
            <span className="text-sm">{mood}</span>
            <button
              onClick={() => handleRemoveMood(mood)}
              className="text-red-600 hover:text-red-700"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          type="text"
          value={newMood}
          onChange={(e) => setNewMood(e.target.value)}
          placeholder="Add new mood (e.g., 😊 Happy)..."
          className="flex-1 px-4 py-3 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 outline-none focus:ring-2 focus:ring-purple-500"
          onKeyPress={(e) => e.key === 'Enter' && handleAddMood()}
        />
        <button
          onClick={handleAddMood}
          className="p-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-all"
        >
          <Plus className="w-5 h-5" />
        </button>
      </div>
    </div>

    {/* Journal Reminder Time */}
    <div className="glass rounded-2xl p-6">
      <h2 className="text-xl font-semibold mb-4">Journal Reminder</h2>
      <div>
        <label className="block text-sm font-medium mb-2">Daily Reminder Time</label>
        <input
          type="time"
          value={formData.journalReminderTime}
          onChange={(e) => setFormData({ ...formData, journalReminderTime: e.target.value })}
          className="w-full md:w-1/2 px-4 py-3 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 outline-none focus:ring-2 focus:ring-purple-500"
        />
      </div>
    </div>

    {/* Account Security */}
    <div className="glass rounded-2xl p-6">
      <h2 className="text-xl font-semibold mb-4">Account Security</h2>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
        These credentials are used to verify data clearing operations
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-2">Username</label>
          <input
            type="text"
            value={formData.username}
            onChange={(e) => setFormData({ ...formData, username: e.target.value })}
            className="w-full px-4 py-3 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">Password</label>
          <input
            type="password"
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            className="w-full px-4 py-3 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>
      </div>
    </div>

    {/* Data Management */}
    <div className="glass rounded-2xl p-6">
      <h2 className="text-xl font-semibold mb-4">Data Management</h2>
      <div className="space-y-3">
        <button
          onClick={handleBackup}
          className="w-full flex items-center justify-center space-x-2 px-6 py-4 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all"
        >
          <Download className="w-5 h-5" />
          <span>Download Backup</span>
        </button>

        <label className="w-full flex items-center justify-center space-x-2 px-6 py-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all cursor-pointer">
          <Upload className="w-5 h-5" />
          <span>Restore from Backup</span>
          <input
            type="file"
            accept=".json"
            onChange={handleRestore}
            className="hidden"
          />
        </label>

        <button
          onClick={() => setShowClearModal(true)}
          className="w-full flex items-center justify-center space-x-2 px-6 py-4 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all"
        >
          <Trash2 className="w-5 h-5" />
          <span>Clear All Data</span>
        </button>
      </div>
    </div>

    {/* Save Button */}
    <button
      onClick={handleSave}
      className="w-full flex items-center justify-center space-x-2 px-6 py-4 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-all shadow-lg hover:shadow-xl"
    >
      <Save className="w-5 h-5" />
      <span>Save Settings</span>
    </button>
  </div>

  {/* Clear Data Modal */}
  {showClearModal && (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className="glass rounded-2xl p-6 w-full max-w-md">
        <h2 className="text-2xl font-bold mb-4 text-red-600">⚠️ Clear All Data</h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
          This action will permanently delete all your journals, tasks, and events.
          This cannot be undone. Please enter your credentials to confirm.
        </p>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Username</label>
            <input
              type="text"
              value={clearDataUsername}
              onChange={(e) => setClearDataUsername(e.target.value)}
              className="w-full px-4 py-3 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 outline-none focus:ring-2 focus:ring-red-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Password</label>
            <input
              type="password"
              value={clearDataPassword}
              onChange={(e) => setClearDataPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 outline-none focus:ring-2 focus:ring-red-500"
            />
          </div>
        </div>

        <div className="flex items-center justify-end space-x-3 mt-6">
          <button
            onClick={() => {
              setShowClearModal(false);
              setClearDataUsername('');
              setClearDataPassword('');
            }}
            className="px-6 py-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all"
          >
            Cancel
          </button>
          <button
            onClick={handleClearData}
            className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all"
          >
            Clear Data
          </button>
        </div>
      </div>
    </div>
  )}
</div>
);
};
export default Settings;