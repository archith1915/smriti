import React, { useState, useEffect } from 'react';
import { Plus, Search, Trash2, Edit2, X, Save } from 'lucide-react';
import { collection, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase/config';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import Loader from '../components/Loader';

const Notes = () => {
  const { currentUser } = useAuth();
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // State for Modals
  const [showEditModal, setShowEditModal] = useState(false);
  const [viewingNote, setViewingNote] = useState(null); 
  
  const [editingNote, setEditingNote] = useState(null);
  const [formData, setFormData] = useState({ title: '', description: '' });

  // Real-time listener
  useEffect(() => {
    if (!currentUser) return;
    
    const q = query(
      collection(db, 'notes'),
      where('userId', '==', currentUser.uid),
      orderBy('updatedAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setNotes(list);
      setLoading(false);
    }, (error) => {
      console.error(error);
      toast.error('Failed to sync notes');
      setLoading(false);
    });

    return () => unsubscribe();
  }, [currentUser]);

   if (loading) return <Loader />;
   
  const filteredNotes = notes.filter(note => 
    note.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    note.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title.trim()) return toast.error('Title is required');

    try {
      const payload = {
        title: formData.title,
        description: formData.description,
        userId: currentUser.uid,
        updatedAt: serverTimestamp()
      };

      if (editingNote) {
        await updateDoc(doc(db, 'notes', editingNote.id), payload);
        toast.success('Note updated');
      } else {
        await addDoc(collection(db, 'notes'), { ...payload, createdAt: serverTimestamp() });
        toast.success('Note created');
      }
      closeEditModal();
    } catch (error) {
      toast.error('Error saving note');
    }
  };

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    if (window.confirm('Delete this note?')) {
      try {
        await deleteDoc(doc(db, 'notes', id));
        toast.success('Note deleted');
        if (viewingNote?.id === id) setViewingNote(null);
      } catch (error) {
        toast.error('Error deleting note');
      }
    }
  };

  // --- ACTIONS ---

  const openEditModal = (e, note = null) => {
    if (e) e.stopPropagation();
    setEditingNote(note);
    setFormData(note ? { title: note.title, description: note.description } : { title: '', description: '' });
    setShowEditModal(true);
    setViewingNote(null);
  };

  const closeEditModal = () => {
    setShowEditModal(false);
    setEditingNote(null);
  };

  const openViewModal = (note) => {
    setViewingNote(note);
  };

  const closeViewModal = () => {
    setViewingNote(null);
  };

  if (loading) return <Loader />;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-semibold mb-1">Notes</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">Capture your ideas quickly</p>
        </div>
        <button
          onClick={(e) => openEditModal(e)}
          className="flex items-center space-x-1.5 px-4 py-2 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 rounded text-sm font-medium hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>New Note</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="bg-white dark:bg-[#191919] border border-gray-300 dark:border-gray-800 rounded p-3 mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search notes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm bg-transparent outline-none border-none focus:ring-0 text-gray-900 dark:text-gray-100 placeholder-gray-500"
          />
        </div>
      </div>

      {/* Notes Grid */}
      {/* Notes Grid */}
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  {filteredNotes.map(note => (
    <div 
      key={note.id} 
      onClick={() => openViewModal(note)}
      className="bg-white dark:bg-[#191919] border border-gray-300 dark:border-gray-800 rounded p-4 transition-shadow group relative cursor-pointer"
    >
      <div className="flex justify-between items-start mb-2">
        <h3 className="font-semibold text-lg pr-16 text-gray-900 dark:text-gray-100 truncate">{note.title}</h3>
        
        {/* Action Buttons - ALWAYS VISIBLE ON MOBILE, HOVER ON DESKTOP */}
        <div className="flex space-x-1 md:opacity-0 md:group-hover:opacity-100 transition-opacity bg-white/80 dark:bg-[#1e1e1e]/80 p-1 rounded-lg backdrop-blur-sm absolute top-4 right-4 z-10">
          <button 
            onClick={(e) => {
              e.stopPropagation();
              openEditModal(e, note);
            }} 
            className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-gray-600 dark:text-gray-300"
            title="Edit"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <button 
            onClick={(e) => {
              e.stopPropagation();
              handleDelete(e, note.id);
            }} 
            className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/20 rounded text-red-500"
            title="Delete"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
      
      <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap line-clamp-6">
        {note.description}
      </p>
    </div>
  ))}
</div>

      {/* --- EDIT / CREATE MODAL (Original Compact Style) --- */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#191919] rounded-xl border border-gray-200 dark:border-gray-800 p-6 w-full max-w-lg shadow-2xl">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{editingNote ? 'Edit Note' : 'New Note'}</h2>
              <button onClick={closeEditModal} className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <input
                type="text"
                placeholder="Note Title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-3 py-2 text-lg font-medium rounded bg-transparent border-b border-gray-200 dark:border-gray-700 focus:border-gray-900 dark:focus:border-gray-100 outline-none text-gray-900 dark:text-gray-100 placeholder-gray-400"
                autoFocus
              />
              <textarea
                placeholder="Write something..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-3 py-2 min-h-[300px] text-sm rounded bg-gray-50 dark:bg-[#252525] border border-gray-200 dark:border-gray-700 outline-none focus:border-gray-400 text-gray-900 dark:text-gray-100 placeholder-gray-400 resize-none leading-relaxed"
              />
              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  className="flex items-center space-x-2 px-6 py-2 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 rounded-lg font-medium hover:opacity-90 transition-opacity"
                >
                  <Save className="w-4 h-4" />
                  <span>Save</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- READ-ONLY VIEW MODAL (Matched to Editor) --- */}
      {viewingNote && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200" onClick={closeViewModal}>
          <div 
            className="bg-white dark:bg-[#191919] rounded-xl border border-gray-200 dark:border-gray-800 p-6 w-full max-w-lg shadow-2xl max-h-[85vh] flex flex-col" 
            onClick={e => e.stopPropagation()} 
          >
            {/* View Header */}
            <div className="flex justify-between items-center mb-4 border-b border-gray-100 dark:border-gray-800 pb-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 pr-4 leading-tight">{viewingNote.title}</h2>
              <div className="flex items-center gap-1 shrink-0">
                <button 
                  onClick={(e) => openEditModal(e, viewingNote)}
                  className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg text-gray-600 dark:text-gray-400"
                  title="Edit"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button onClick={closeViewModal} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg text-gray-500">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* View Content (Scrollable) */}
            <div className="overflow-y-auto pr-2 custom-scrollbar flex-1 min-h-[300px]">
              <p className="text-sm text-gray-900 dark:text-gray-100 whitespace-pre-wrap leading-relaxed">
                {viewingNote.description}
              </p>
            </div>
            
            <div className="mt-4 pt-2 border-t border-gray-100 dark:border-gray-800 text-xs text-gray-400 text-right">
                {viewingNote.createdAt?.toDate().toLocaleDateString()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Notes;
