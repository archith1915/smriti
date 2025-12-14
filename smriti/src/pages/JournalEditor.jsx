import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Save, ArrowLeft } from 'lucide-react';
import { collection, addDoc, doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase/config';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { useSettings } from '../context/SettingsContext';

const JournalEditor = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { settings } = useSettings();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    mood: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    time: format(new Date(), 'HH:mm'),
  });

  useEffect(() => {
    if (id) {
      loadJournal();
    }
  }, [id]);

  const loadJournal = async () => {
    try {
      const docRef = doc(db, 'journals', id);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
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
        updatedAt: serverTimestamp(),
      };

      if (id) {
        await updateDoc(doc(db, 'journals', id), journalData);
        toast.success('Journal updated successfully! 📝');
      } else {
        journalData.createdAt = serverTimestamp();
        await addDoc(collection(db, 'journals'), journalData);
        toast.success('Journal created successfully! 🎉');
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

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <button
          onClick={() => navigate('/journals')}
          className="flex items-center space-x-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-all"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Back to Journals</span>
        </button>
        <button
          onClick={handleSubmit}
          disabled={loading}
          className="flex items-center space-x-2 px-6 py-3 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Save className="w-5 h-5" />
          <span>{loading ? 'Saving...' : id ? 'Update' : 'Save'}</span>
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Date, Time, and Mood */}
        <div className="glass rounded-2xl p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Date</label>
              <input
                type="date"
                name="date"
                value={formData.date}
                onChange={handleChange}
                className="w-full px-4 py-3 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 outline-none focus:ring-2 focus:ring-purple-500 transition-all"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Time</label>
              <input
                type="time"
                name="time"
                value={formData.time}
                onChange={handleChange}
                className="w-full px-4 py-3 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 outline-none focus:ring-2 focus:ring-purple-500 transition-all"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Mood</label>
              <select
                name="mood"
                value={formData.mood}
                onChange={handleChange}
                className="w-full px-4 py-3 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 outline-none focus:ring-2 focus:ring-purple-500 transition-all"
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
        <div className="glass rounded-2xl p-6">
          <label className="block text-sm font-medium mb-2">Title</label>
          <input
            type="text"
            name="title"
            value={formData.title}
            onChange={handleChange}
            placeholder="Give your journal a title..."
            className="w-full px-4 py-3 text-xl font-semibold rounded-lg bg-transparent border-none outline-none focus:ring-2 focus:ring-purple-500 transition-all"
            required
          />
        </div>

        {/* Content - Markdown Editor */}
        <div className="glass rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <label className="block text-sm font-medium">Content</label>
            <span className="text-xs text-gray-500">Markdown supported</span>
          </div>
          <textarea
            name="content"
            value={formData.content}
            onChange={handleChange}
            placeholder="Write your thoughts here... 

You can use:
# Heading
**bold** and *italic*
- Lists
> Quotes"
            className="w-full px-4 py-3 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 outline-none focus:ring-2 focus:ring-purple-500 transition-all min-h-[400px] resize-y font-mono text-sm"
            required
          />
          <div className="mt-4 text-xs text-gray-500">
            <p className="mb-1">💡 Quick Tips:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Use # for headings (# H1, ## H2, ### H3)</li>
              <li>Use **text** for bold and *text* for italic</li>
              <li>Use - or * for bullet lists</li>
              <li>Use > for blockquotes</li>
            </ul>
          </div>
        </div>

        {/* Mobile Save Button */}
        <div className="md:hidden">
          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center space-x-2 px-6 py-4 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save className="w-5 h-5" />
            <span>{loading ? 'Saving...' : id ? 'Update Journal' : 'Save Journal'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};

export default JournalEditor;