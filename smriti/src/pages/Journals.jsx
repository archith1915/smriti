import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, Edit, Trash2, Eye } from 'lucide-react';
import { collection, deleteDoc, doc, orderBy, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase/config';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';

const Journals = () => {
  const { currentUser } = useAuth();
  const [journals, setJournals] = useState([]);
  const [filteredJournals, setFilteredJournals] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  // --- LIVE LISTENER ---
  useEffect(() => {
    if (!currentUser) return;

    setLoading(true);
    
    // 1. Define Query
    const journalsRef = collection(db, 'journals');
    const q = query(
      journalsRef,
      where('userId', '==', currentUser.uid),
      orderBy('createdAt', 'desc')
    );

    // 2. Start Listener
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const journalsList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));
      
      setJournals(journalsList);
      // We don't setFilteredJournals here directly, because the 
      // useEffect below handles filtering whenever 'journals' changes.
      setLoading(false);
    }, (error) => {
      console.error('Error listening to journals:', error);
      toast.error('Failed to sync journals');
      setLoading(false);
    });

    // 3. Cleanup
    return () => unsubscribe();
  }, [currentUser]);

  // --- FILTERING ---
  useEffect(() => {
    if (searchTerm) {
      const filtered = journals.filter(
        journal =>
          journal.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          journal.content.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredJournals(filtered);
    } else {
      setFilteredJournals(journals);
    }
  }, [searchTerm, journals]);

  const handleDelete = async (id) => {
    if (window.confirm('Delete this journal?')) {
      try {
        await deleteDoc(doc(db, 'journals', id));
        toast.success('Journal deleted');
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

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-semibold mb-1">Journals</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Your thoughts and reflections
          </p>
        </div>
        <Link
          to="/journals/new"
          className="flex items-center space-x-1.5 px-4 py-2 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 rounded text-sm font-medium hover:bg-gray-800 dark:hover:bg-gray-200"
        >
          <Plus className="w-4 h-4" />
          <span>New Journal</span>
        </Link>
      </div>

      {/* Search */}
      <div className="bg-white dark:bg-[#191919] border border-gray-300 dark:border-gray-800 rounded p-3 mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search journals..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm bg-transparent outline-none"
          />
        </div>
      </div>

      {/* Journals Grid */}
      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-gray-100"></div>
        </div>
      ) : filteredJournals.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-[#191919] border border-gray-300 dark:border-gray-800 rounded">
          <p className="text-sm text-gray-500 mb-4">
            {searchTerm ? 'No journals found' : 'No journals yet. Start writing!'}
          </p>
          {!searchTerm && (
            <Link
              to="/journals/new"
              className="inline-flex items-center space-x-1.5 px-4 py-2 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 rounded text-sm font-medium"
            >
              <Plus className="w-4 h-4" />
              <span>Create First Journal</span>
            </Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredJournals.map(journal => (
            <div
              key={journal.id}
              className="bg-white dark:bg-[#191919] border border-gray-300 dark:border-gray-800 rounded p-4 hover:bg-gray-50 dark:hover:bg-white/5 group"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 mb-2">
                    <span 
                      className="text-xs px-2 py-0.5 rounded"
                      style={{ backgroundColor: getMoodColor(journal.mood), color: '#000' }}
                    >
                      {journal.mood?.split(' ')[0]}
                    </span>
                    <span className="text-xs text-gray-500">{journal.date}</span>
                  </div>
                  <h3 className="text-sm font-semibold mb-2 line-clamp-2">{journal.title}</h3>
                </div>
              </div>
              
              <p className="text-xs text-gray-600 dark:text-gray-400 mb-4 line-clamp-3">
                {journal.content.substring(0, 150)}...
              </p>

              <div className="flex items-center space-x-1">
                <Link
                  to={`/journals/view/${journal.id}`}
                  className="flex-1 flex items-center justify-center space-x-1 px-3 py-1.5 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 rounded text-xs font-medium hover:bg-gray-800 dark:hover:bg-gray-200"
                >
                  <Eye className="w-3 h-3" />
                  <span>Read</span>
                </Link>
                <Link
                  to={`/journals/edit/${journal.id}`}
                  className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
                >
                  <Edit className="w-3.5 h-3.5" />
                </Link>
                <button
                  onClick={() => handleDelete(journal.id)}
                  className="p-1.5 rounded hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Journals;
