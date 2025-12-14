import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Edit, Trash2, Calendar, Clock } from 'lucide-react';
import { doc, getDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import ReactMarkdown from 'react-markdown';
import toast from 'react-hot-toast';

const JournalView = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [journal, setJournal] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadJournal();
  }, [id]);

  const loadJournal = async () => {
    try {
      const docRef = doc(db, 'journals', id);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setJournal({ id: docSnap.id, ...docSnap.data() });
      } else {
        toast.error('Journal not found');
        navigate('/journals');
      }
    } catch (error) {
      console.error('Error loading journal:', error);
      toast.error('Failed to load journal');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this journal? This action cannot be undone.')) {
      try {
        await deleteDoc(doc(db, 'journals', id));
        toast.success('Journal deleted successfully');
        navigate('/journals');
      } catch (error) {
        console.error('Error deleting journal:', error);
        toast.error('Failed to delete journal');
      }
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
        </div>
      </div>
    );
  }

  if (!journal) return null;

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
        <div className="flex items-center space-x-2">
          <Link
            to={`/journals/edit/${id}`}
            className="flex items-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-all"
          >
            <Edit className="w-4 h-4" />
            <span>Edit</span>
          </Link>
          <button
            onClick={handleDelete}
            className="p-2 rounded-lg hover:bg-red-100 dark:hover:bg-red-900 text-red-600 transition-all"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Journal Article */}
      <article className="glass rounded-2xl p-8 md:p-12">
        {/* Metadata */}
        <div className="flex flex-wrap items-center gap-4 mb-6 pb-6 border-b border-gray-200 dark:border-gray-800">
          <div className="flex items-center space-x-2 text-gray-600 dark:text-gray-400">
            <Calendar className="w-4 h-4" />
            <span className="text-sm">{journal.date}</span>
          </div>
          <div className="flex items-center space-x-2 text-gray-600 dark:text-gray-400">
            <Clock className="w-4 h-4" />
            <span className="text-sm">{journal.time}</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-2xl">{journal.mood}</span>
          </div>
        </div>

        {/* Title */}
        <h1 className="text-3xl md:text-4xl font-bold mb-8">{journal.title}</h1>

        {/* Content */}
        <div className="prose prose-lg dark:prose-invert max-w-none markdown-content">
          <ReactMarkdown>{journal.content}</ReactMarkdown>
        </div>

        {/* Footer */}
        <div className="mt-12 pt-6 border-t border-gray-200 dark:border-gray-800">
          <p className="text-sm text-gray-500">
            Written on {journal.date} at {journal.time}
          </p>
        </div>
      </article>

      {/* Reflection Section */}
      <div className="mt-8 glass rounded-2xl p-6">
        <h3 className="text-lg font-semibold mb-3">💭 Reflection Space</h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Take a moment to reflect on this entry. How do you feel reading it now? 
          What insights can you gain from your past self?
        </p>
      </div>
    </div>
  );
};

export default JournalView;