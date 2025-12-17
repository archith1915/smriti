import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Bold, Italic, List, Heading, Quote, Code } from 'lucide-react';
import { doc, getDoc, addDoc, updateDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase/config';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import { format } from 'date-fns';
import Loader from '../components/Loader';
import ReactMarkdown from 'react-markdown';

const JournalEditor = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { settings } = useSettings();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('write');
  const textareaRef = useRef(null);
  
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    mood: '',
    date: format(new Date(), 'yyyy-MM-dd'), // Default to today
    time: format(new Date(), 'HH:mm'),      // Default to now
  });

  // Set default mood once settings are loaded
  useEffect(() => {
    if (settings?.moods?.length > 0 && !formData.mood) {
      setFormData(prev => ({ ...prev, mood: settings.moods[0] }));
    }
  }, [settings]);

  useEffect(() => {
    if (id && currentUser) {
      loadJournal();
    }
  }, [id, currentUser]);

  const loadJournal = async () => {
    setLoading(true);
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
          mood: data.mood || settings.moods[0] || '😊 Happy',
          date: data.date || format(new Date(), 'yyyy-MM-dd'),
          time: data.time || format(new Date(), 'HH:mm'),
        });
      }
    } catch (error) {
      toast.error('Error loading journal');
    } finally {
      setLoading(false);
    }
  };

  const insertMarkdown = (prefix, suffix = '') => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = formData.content;
    const before = text.substring(0, start);
    const selection = text.substring(start, end);
    const after = text.substring(end);

    const newText = `${before}${prefix}${selection}${suffix}${after}`;
    setFormData({ ...formData, content: newText });
    
    setTimeout(() => {
      textarea.focus();
      const newCursorPos = start + prefix.length + selection.length + suffix.length;
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  };

  const handleToolbarClick = (type) => {
    if (activeTab === 'preview') setActiveTab('write'); 

    switch (type) {
      case 'bold': insertMarkdown('**', '**'); break;
      case 'italic': insertMarkdown('_', '_'); break;
      case 'heading': insertMarkdown('\n# '); break;
      case 'list': insertMarkdown('\n- '); break;
      case 'quote': insertMarkdown('\n> '); break;
      case 'code': insertMarkdown('`', '`'); break;
      default: break;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title.trim()) return toast.error('Title is required');

    try {
      // Use the date/time from the form state, allowing old dates
      const journalData = {
        ...formData,
        userId: currentUser.uid,
        updatedAt: serverTimestamp(),
      };

      if (id) {
        await updateDoc(doc(db, 'journals', id), journalData);
        toast.success('Journal updated');
      } else {
        await addDoc(collection(db, 'journals'), {
          ...journalData,
          createdAt: serverTimestamp(),
        });
        toast.success('Journal created');
      }
      navigate('/journals');
    } catch (error) {
      console.error(error);
      toast.error('Failed to save');
    }
  };

  if (loading) return <Loader />;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <button 
            type="button" 
            onClick={() => navigate('/journals')} 
            className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> <span>Back</span>
          </button>
          <button 
            type="submit" 
            className="flex items-center space-x-2 px-4 py-2 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 rounded-md font-medium hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors"
          >
            <Save className="w-4 h-4" /> <span>Save</span>
          </button>
        </div>

        {/* Date, Time & Mood Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex flex-col">
            <label className="text-xs font-medium text-gray-500 mb-1 ml-1">Date</label>
            <input
              type="date"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              className="px-3 py-2 rounded-lg bg-gray-50 dark:bg-[#191919] border border-gray-200 dark:border-gray-700 outline-none focus:border-gray-400 dark:focus:border-gray-500 text-sm text-gray-900 dark:text-gray-100 dark:[color-scheme:dark]"
            />
          </div>
          
          <div className="flex flex-col">
            <label className="text-xs font-medium text-gray-500 mb-1 ml-1">Time</label>
            <input
              type="time"
              value={formData.time}
              onChange={(e) => setFormData({ ...formData, time: e.target.value })}
              className="px-3 py-2 rounded-lg bg-gray-50 dark:bg-[#191919] border border-gray-200 dark:border-gray-700 outline-none focus:border-gray-400 dark:focus:border-gray-500 text-sm text-gray-900 dark:text-gray-100 dark:[color-scheme:dark]"
            />
          </div>

          <div className="flex flex-col">
            <label className="text-xs font-medium text-gray-500 mb-1 ml-1">Mood</label>
            <select
              value={formData.mood}
              onChange={(e) => setFormData({ ...formData, mood: e.target.value })}
              className="px-3 py-2 rounded-lg bg-gray-50 dark:bg-[#191919] border border-gray-200 dark:border-gray-700 outline-none focus:border-gray-400 dark:focus:border-gray-500 text-sm cursor-pointer text-gray-900 dark:text-gray-100"
            >
              <option value="">Select Mood</option>
              {settings?.moods?.map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Title */}
        <div className="space-y-4">
          <input
            type="text"
            placeholder="Journal Title"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            className="w-full text-3xl font-bold bg-transparent border-none placeholder-gray-400 focus:ring-0 px-0 outline-none text-gray-900 dark:text-gray-100"
          />

          {/* Editor Container */}
          <div className="min-h-[60vh] flex flex-col border border-gray-200 dark:border-gray-800 rounded-lg bg-white dark:bg-[#191919] shadow-sm overflow-hidden">
            
            {/* Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-2 p-2 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-[#202020]">
              <div className="flex flex-wrap items-center gap-1">
                <button type="button" onClick={() => handleToolbarClick('bold')} className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded text-gray-600 dark:text-gray-400" title="Bold"><Bold className="w-4 h-4" /></button>
                <button type="button" onClick={() => handleToolbarClick('italic')} className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded text-gray-600 dark:text-gray-400" title="Italic"><Italic className="w-4 h-4" /></button>
                <button type="button" onClick={() => handleToolbarClick('heading')} className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded text-gray-600 dark:text-gray-400" title="Heading"><Heading className="w-4 h-4" /></button>
                <button type="button" onClick={() => handleToolbarClick('list')} className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded text-gray-600 dark:text-gray-400" title="List"><List className="w-4 h-4" /></button>
                <button type="button" onClick={() => handleToolbarClick('quote')} className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded text-gray-600 dark:text-gray-400" title="Quote"><Quote className="w-4 h-4" /></button>
                <button type="button" onClick={() => handleToolbarClick('code')} className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded text-gray-600 dark:text-gray-400" title="Code"><Code className="w-4 h-4" /></button>
              </div>

              {/* View Toggle */}
              <div className="flex bg-gray-200 dark:bg-gray-700 rounded p-0.5">
                <button
                  type="button"
                  onClick={() => setActiveTab('write')}
                  className={`px-3 py-1 text-xs font-medium rounded-sm transition-all ${activeTab === 'write' ? 'bg-white dark:bg-[#2c2c2c] shadow-sm text-gray-900 dark:text-gray-100' : 'text-gray-500 dark:text-gray-400'}`}
                >
                  Write
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('preview')}
                  className={`px-3 py-1 text-xs font-medium rounded-sm transition-all ${activeTab === 'preview' ? 'bg-white dark:bg-[#2c2c2c] shadow-sm text-gray-900 dark:text-gray-100' : 'text-gray-500 dark:text-gray-400'}`}
                >
                  Preview
                </button>
              </div>
            </div>

            {/* Write Mode */}
            {activeTab === 'write' && (
              <textarea
                ref={textareaRef}
                placeholder="Start writing..."
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                className="flex-1 w-full h-full p-4 bg-transparent border-none resize-none focus:ring-0 outline-none text-base font-mono leading-relaxed text-gray-800 dark:text-gray-200"
              />
            )}

            {/* Preview Mode */}
            {activeTab === 'preview' && (
              <div className="flex-1 w-full h-full p-6 overflow-y-auto prose prose-sm dark:prose-invert max-w-none">
                {formData.content ? (
                  <ReactMarkdown>{formData.content}</ReactMarkdown>
                ) : (
                  <p className="text-gray-400 italic">Nothing to preview</p>
                )}
              </div>
            )}
          </div>
        </div>
      </form>
    </div>
  );
};

export default JournalEditor;