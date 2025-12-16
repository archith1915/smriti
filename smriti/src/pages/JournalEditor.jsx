import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Save, ArrowLeft } from 'lucide-react';
import { collection, addDoc, doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase/config';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { useSettings } from '../context/SettingsContext';
import { useAuth } from '../context/AuthContext';

const JournalEditor = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { settings } = useSettings();
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    mood: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    time: format(new Date(), 'HH:mm'),
  });

  useEffect(() => {
    if (id && currentUser) {
      loadJournal();
    }
  }, [id, currentUser]);

  const loadJournal = async () => {
    try {
      const docRef = doc(db, 'journals', id);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.userId !== currentUser.uid) {
          toast.error('Unauthorized');
          navigate('/journals');
          return;
        }
        setFormData({
          title: data.title,
          content: data.content,
          mood: data.mood,
          date: data.date,
          time: data.time,
        });
      }
    } catch (error) {
      console.error('Error loading journal:', error);
      toast.error('Failed to load journal');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.title.trim()) {
      toast.error('Please add a title');
      return;
    }
    
    if (!formData.content.trim()) {
      toast.error('Please write something');
      return;
    }
    
    if (!formData.mood) {
      toast.error('Please select a mood');
      return;
    }

    setLoading(true);
    try {
      const journalData = {
        ...formData,
        userId: currentUser.uid,
        updatedAt: serverTimestamp(),
      };

      if (id) {
        await updateDoc(doc(db, 'journals', id), journalData);
        toast.success('Journal updated');
      } else {
        journalData.createdAt = serverTimestamp();
        await addDoc(collection(db, 'journals'), journalData);
        toast.success('Journal created');
      }
      
      navigate('/journals');
    } catch (error) {
      console.error('Error saving journal:', error);
      toast.error('Failed to save journal');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const getMoodColor = (mood) => {
    if (mood?.includes('Happy')) return '#dcfce7';
    if (mood?.includes('Calm')) return '#dbeafe';
    if (mood?.includes('Sad')) return '#fef3c7';
    if (mood?.includes('Anxious')) return '#fee2e2';
    if (mood?.includes('Angry')) return '#fecaca';
    if (mood?.includes('Thoughtful')) return '#e9d5ff';
    if (mood?.includes('Tired')) return '#f3f4f6';
    if (mood?.includes('Excited')) return '#fef9c3';
    return '#f3f4f6';
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={() => navigate('/journals')}
          className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back</span>
        </button>
        <button
          onClick={handleSubmit}
          disabled={loading}
          className="flex items-center space-x-1.5 px-4 py-2 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 rounded text-sm font-medium hover:bg-gray-800 dark:hover:bg-gray-200 disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          <span>{loading ? 'Saving...' : id ? 'Update' : 'Save'}</span>
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Date, Time, and Mood */}
        <div className="card p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1">Date</label>
              <input
                type="date"
                name="date"
                value={formData.date}
                onChange={handleChange}
                className="w-full px-3 py-2 text-sm rounded bg-white dark:bg-[#2c2c2c] border border-gray-200 dark:border-gray-700 outline-none focus:border-gray-400 dark:focus:border-gray-500"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Time</label>
              <input
                type="time"
                name="time"
                value={formData.time}
                onChange={handleChange}
                className="w-full px-3 py-2 text-sm rounded bg-white dark:bg-[#2c2c2c] border border-gray-200 dark:border-gray-700 outline-none focus:border-gray-400 dark:focus:border-gray-500"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Mood</label>
              <select
                name="mood"
                value={formData.mood}
                onChange={handleChange}
                className="w-full px-3 py-2 text-sm rounded bg-white dark:bg-[#2c2c2c] border border-gray-200 dark:border-gray-700 outline-none focus:border-gray-400 dark:focus:border-gray-500"
                style={formData.mood ? { backgroundColor: getMoodColor(formData.mood), color: '#000' } : {}}
                required
              >
                <option value="">Select mood</option>
                {settings.moods.map(mood => (
                  <option key={mood} value={mood}>{mood}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Title */}
        <div className="card p-4">
          <input
            type="text"
            name="title"
            value={formData.title}
            onChange={handleChange}
            placeholder="Journal title..."
            className="w-full text-xl font-semibold bg-transparent outline-none"
            required
          />
        </div>

        {/* Content */}
        <div className="card p-4">
          <textarea
            name="content"
            value={formData.content}
            onChange={handleChange}
            placeholder="Write your thoughts...

Markdown supported:
# Heading
**bold** *italic*
- Lists
> Quotes"
            className="w-full bg-transparent outline-none min-h-[400px] resize-y text-sm font-mono leading-relaxed"
            required
          />
        </div>

        {/* Mobile Save Button */}
        <div className="md:hidden">
          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center space-x-1.5 px-4 py-3 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 rounded text-sm font-medium disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{loading ? 'Saving...' : id ? 'Update Journal' : 'Save Journal'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};

export default JournalEditor;