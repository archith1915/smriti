import React, { useState } from 'react';
import { Save, Download, Upload, Trash2, Plus, X } from 'lucide-react';
import { useSettings } from '../context/SettingsContext';
import {
  collection,
  getDocs,
  deleteDoc,
  doc,
  writeBatch
} from 'firebase/firestore';
import {
  getAuth,
  EmailAuthProvider,
  reauthenticateWithCredential
} from 'firebase/auth';
import { db } from '../firebase/config';
import toast from 'react-hot-toast';

const Section = ({ title, children }) => (
  <div className="
    bg-[#f3f3f1] dark:bg-[#1f1f1f]
    border border-gray-200 dark:border-[#2a2a2a]
    rounded-lg p-6
  ">
    <h2 className="text-lg font-semibold mb-4">{title}</h2>
    {children}
  </div>
);

const Input = (props) => (
  <input
    {...props}
    className="
      w-full px-3 py-2.5 rounded-md
      bg-white dark:bg-[#191919]
      border border-gray-200 dark:border-[#2a2a2a]
      outline-none
      focus:border-gray-400 dark:focus:border-gray-500
    "
  />
);

const Settings = () => {
  const { settings, updateSettings } = useSettings();
  const [formData, setFormData] = useState({ ...settings });

  const [newCategory, setNewCategory] = useState({ task: '', event: '' });
  const [newMood, setNewMood] = useState('');

  const [showClearModal, setShowClearModal] = useState(false);
  const [password, setPassword] = useState('');

  /* ---------------- Save Settings ---------------- */

  const handleSave = async () => {
    const success = await updateSettings(formData);
    success
      ? toast.success('Settings saved')
      : toast.error('Failed to save settings');
  };

  /* ---------------- Categories & Moods ---------------- */

  const addItem = (key, value, reset) => {
    if (!value.trim() || formData[key].includes(value.trim())) return;
    setFormData({ ...formData, [key]: [...formData[key], value.trim()] });
    reset('');
  };

  const removeItem = (key, value) => {
    setFormData({
      ...formData,
      [key]: formData[key].filter(v => v !== value)
    });
  };

  /* ---------------- Backup & Restore ---------------- */

  const handleBackup = async () => {
    try {
      const backup = {
        journals: [],
        tasks: [],
        events: [],
        settings: formData,
        exportedAt: new Date().toISOString()
      };

      for (const name of ['journals', 'tasks', 'events']) {
        const snap = await getDocs(collection(db, name));
        backup[name] = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      }

      const blob = new Blob(
        [JSON.stringify(backup, null, 2)],
        { type: 'application/json' }
      );

      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'smriti-backup.json';
      a.click();

      toast.success('Backup downloaded');
    } catch {
      toast.error('Backup failed');
    }
  };

  const handleRestore = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      const backup = JSON.parse(await file.text());

      if (!backup.settings) {
        toast.error('Invalid backup file');
        return;
      }

      if (!window.confirm('This will replace all existing data. Continue?')) {
        return;
      }

      const batch = writeBatch(db);

      for (const name of ['journals', 'tasks', 'events']) {
        const snap = await getDocs(collection(db, name));
        snap.docs.forEach(d => batch.delete(d.ref));

        backup[name]?.forEach(item => {
          const { id, ...data } = item;
          batch.set(doc(db, name, id), data);
        });
      }

      await batch.commit();
      await updateSettings(backup.settings);
      setFormData(backup.settings);

      toast.success('Data restored');
      setTimeout(() => window.location.reload(), 1000);
    } catch {
      toast.error('Restore failed');
    }
  };

  /* ---------------- Clear All Data (Secure) ---------------- */

  const handleClearData = async () => {
    try {
      const auth = getAuth();
      const user = auth.currentUser;

      if (!user || !user.email) {
        toast.error('User not authenticated');
        return;
      }

      const credential = EmailAuthProvider.credential(
        user.email,
        password
      );

      await reauthenticateWithCredential(user, credential);

      for (const name of ['journals', 'tasks', 'events']) {
        const snap = await getDocs(collection(db, name));
        await Promise.all(snap.docs.map(d => deleteDoc(d.ref)));
      }

      toast.success('All data cleared');
      setShowClearModal(false);
      setPassword('');
      setTimeout(() => window.location.reload(), 1000);

    } catch (err) {
      if (err.code === 'auth/wrong-password') {
        toast.error('Incorrect password');
      } else {
        toast.error('Authentication failed');
      }
    }
  };

  /* ---------------- Render ---------------- */

  return (
    <div className="max-w-4xl mx-auto px-6 py-8 space-y-8">

      <div>
        <h1 className="text-3xl font-bold mb-1">Settings</h1>
        <p className="text-gray-600 dark:text-gray-400">
          Customize your Smriti experience
        </p>
      </div>

      {/* <Section title="Date & Time">
        <div className="grid md:grid-cols-2 gap-4">
          <select
            value={formData.dateFormat}
            onChange={e => setFormData({ ...formData, dateFormat: e.target.value })}
            className="bg-white dark:bg-[#191919] border border-gray-200 dark:border-[#2a2a2a] rounded-md px-3 py-2.5"
          >
            <option value="MMM dd, yyyy">Dec 14, 2025</option>
            <option value="dd/MM/yyyy">14/12/2025</option>
            <option value="yyyy-MM-dd">2025-12-14</option>
          </select>

          <select
            value={formData.timeFormat}
            onChange={e => setFormData({ ...formData, timeFormat: e.target.value })}
            className="bg-white dark:bg-[#191919] border border-gray-200 dark:border-[#2a2a2a] rounded-md px-3 py-2.5"
          >
            <option value="12h">12 Hour</option>
            <option value="24h">24 Hour</option>
          </select>
        </div>
      </Section> */}

      <Section title="Task Categories">
        <div className="flex flex-wrap gap-2 mb-3">
          {formData.taskCategories.map(cat => (
            <span key={cat} className="px-3 py-1 rounded-md bg-gray-200 dark:bg-[#2a2a2a] text-sm flex items-center gap-1">
              {cat}
              <X className="w-3 h-3 cursor-pointer" onClick={() => removeItem('taskCategories', cat)} />
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          <Input
            value={newCategory.task}
            onChange={e => setNewCategory({ ...newCategory, task: e.target.value })}
            placeholder="Add category"
          />
          <button onClick={() => addItem('taskCategories', newCategory.task, v => setNewCategory({ ...newCategory, task: v }))}>
            <Plus />
          </button>
        </div>
      </Section>

      <Section title="Mood Options">
        <div className="flex flex-wrap gap-2 mb-3">
          {formData.moods.map(m => (
            <span key={m} className="px-3 py-1 rounded-md bg-gray-200 dark:bg-[#2a2a2a] text-sm flex items-center gap-1">
              {m}
              <X className="w-3 h-3 cursor-pointer" onClick={() => removeItem('moods', m)} />
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          <Input
            value={newMood}
            onChange={e => setNewMood(e.target.value)}
            placeholder="Add mood"
          />
          <button onClick={() => addItem('moods', newMood, setNewMood)}>
            <Plus />
          </button>
        </div>
      </Section>

      <Section title="Data Management">
        <div className="space-y-3">
          <button onClick={handleBackup} className="flex items-center gap-2">
            <Download /> Backup
          </button>

          <label className="flex items-center gap-2 cursor-pointer">
            <Upload /> Restore
            <input type="file" className="hidden" onChange={handleRestore} />
          </label>

          <button
            onClick={() => setShowClearModal(true)}
            className="flex items-center gap-2 text-red-600"
          >
            <Trash2 /> Clear All Data
          </button>
        </div>
      </Section>

      <button
        onClick={handleSave}
        className="flex items-center gap-2 px-6 py-3 rounded-md bg-black text-white dark:bg-white dark:text-black"
      >
        <Save /> Save Settings
      </button>

      {showClearModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#191919] border border-gray-200 dark:border-[#2a2a2a] rounded-lg p-6 w-full max-w-md">
            <h2 className="text-lg font-semibold mb-3 text-red-600">
              Confirm Password
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              For security reasons, please confirm your password.
            </p>
            <Input
              type="password"
              placeholder="Password"
              value={password}
              onChange={e => setPassword(e.target.value)}
            />
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowClearModal(false)}>Cancel</button>
              <button onClick={handleClearData} className="text-red-600">
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default Settings;
