import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Edit, Trash2 } from 'lucide-react';
import { doc, deleteDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase/config';
import ReactMarkdown from 'react-markdown';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import Loader from '../components/Loader';

const JournalView = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [journal, setJournal] = useState(null);
  const [loading, setLoading] = useState(true);

  // --- LIVE LISTENER ---
  useEffect(() => {
    if (!currentUser || !id) return;

    setLoading(true);
    const docRef = doc(db, 'journals', id);

    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        
        if (data.userId !== currentUser.uid) {
          toast.error('Unauthorized');
          navigate('/journals');
          return;
        }
        
        setJournal({ id: docSnap.id, ...data });
      }
      setLoading(false);
    }, (error) => {
      console.error("Error fetching journal:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [id, currentUser, navigate]);

  const handleDelete = async () => {
    if (window.confirm('Delete this journal? This cannot be undone.')) {
      try {
        await deleteDoc(doc(db, 'journals', id));
        toast.success('Journal deleted');
        navigate('/journals');
      } catch (error) {
        console.error('Error deleting journal:', error);
        toast.error('Failed to delete journal');
      }
    }
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

  if (loading) return <Loader />;

  if (!journal) return null;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={() => navigate('/journals')}
          className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back</span>
        </button>
        <div className="flex items-center space-x-2">
          <Link
            to={`/journals/edit/${id}`}
            className="flex items-center space-x-1 px-3 py-1.5 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 rounded text-sm font-medium hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors"
          >
            <Edit className="w-3.5 h-3.5" />
            <span>Edit</span>
          </Link>
          <button
            onClick={handleDelete}
            className="p-1.5 rounded hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Journal Article */}
      <article className="p-6 md:p-8">
        {/* Metadata */}
        <div className="flex flex-wrap items-center gap-3 mb-6 pb-6 border-b border-gray-200 dark:border-gray-800">
          <span className="text-sm text-gray-600 dark:text-gray-400">{journal.date}</span>
          <span className="text-sm text-gray-600 dark:text-gray-400">{journal.time}</span>
          <span 
            className="text-xs px-2 py-1 rounded"
            style={{ backgroundColor: getMoodColor(journal.mood), color: '#000' }}
          >
            {journal.mood}
          </span>
        </div>

        {/* Title */}
        <h1 className="text-3xl font-bold mb-6 text-gray-900 dark:text-gray-100">{journal.title}</h1>

        {/* Content */}
        <div className="prose prose-sm dark:prose-invert max-w-none markdown-content leading-relaxed text-gray-700 dark:text-gray-300">
          <ReactMarkdown>{journal.content}</ReactMarkdown>
        </div>
      </article>
    </div>
  );
};

export default JournalView;
