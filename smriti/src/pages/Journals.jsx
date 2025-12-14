import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Plus, Search, Edit, Trash2, Eye } from "lucide-react";
import {
  collection,
  getDocs,
  deleteDoc,
  doc,
  orderBy,
  query,
} from "firebase/firestore";
import { db } from "../firebase/config";
import toast from "react-hot-toast";

const Journals = () => {
  const [journals, setJournals] = useState([]);
  const [filteredJournals, setFilteredJournals] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadJournals();
  }, []);

  useEffect(() => {
    if (searchTerm) {
      const filtered = journals.filter(
        (journal) =>
          journal.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          journal.content.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredJournals(filtered);
    } else {
      setFilteredJournals(journals);
    }
  }, [searchTerm, journals]);

  const loadJournals = async () => {
    try {
      setLoading(true);
      const journalsRef = collection(db, "journals");
      const q = query(journalsRef, orderBy("createdAt", "desc"));
      const snapshot = await getDocs(q);
      const journalsList = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setJournals(journalsList);
      setFilteredJournals(journalsList);
    } catch (error) {
      console.error("Error loading journals:", error);
      toast.error("Failed to load journals");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this journal?")) {
      try {
        await deleteDoc(doc(db, "journals", id));
        setJournals(journals.filter((j) => j.id !== id));
        toast.success("Journal deleted successfully");
      } catch (error) {
        console.error("Error deleting journal:", error);
        toast.error("Failed to delete journal");
      }
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">My Journals 📖</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Your thoughts, memories, and reflections
          </p>
        </div>
        <Link
          to="/journals/new"
          className="flex items-center space-x-2 px-6 py-3 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-all shadow-lg hover:shadow-xl"
        >
          <Plus className="w-5 h-5" />
          <span>New Journal</span>
        </Link>
      </div>

      {/* Search */}
      <div className="glass rounded-2xl p-4 mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search journals..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-transparent border-none outline-none text-gray-900 dark:text-white"
          />
        </div>
      </div>

      {/* Journals Grid */}
      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
        </div>
      ) : filteredJournals.length === 0 ? (
        <div className="text-center py-12 glass rounded-2xl">
          <p className="text-gray-500 mb-4">
            {searchTerm
              ? "No journals found"
              : "No journals yet. Start writing!"}
          </p>
          {!searchTerm && (
            <Link
              to="/journals/new"
              className="inline-flex items-center space-x-2 px-6 py-3 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-all"
            >
              <Plus className="w-5 h-5" />
              <span>Create Your First Journal</span>
            </Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredJournals.map((journal) => (
            <div
              key={journal.id}
              className="glass rounded-2xl p-6 hover:shadow-lg transition-all animate-fade-in group"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-2">
                    <span className="text-2xl">{journal.mood}</span>
                    <span className="text-xs text-gray-500">
                      {journal.date}
                    </span>
                  </div>
                  <h3 className="text-lg font-semibold mb-2 line-clamp-2">
                    {journal.title}
                  </h3>
                </div>
              </div>

              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 line-clamp-3">
                {journal.content.substring(0, 150)}...
              </p>

              <div className="flex items-center space-x-2">
                <Link
                  to={`/journals/view/${journal.id}`}
                  className="flex-1 flex items-center justify-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-all"
                >
                  <Eye className="w-4 h-4" />
                  <span className="text-sm">Read</span>
                </Link>
                <Link
                  to={`/journals/edit/${journal.id}`}
                  className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-all"
                >
                  <Edit className="w-4 h-4" />
                </Link>
                <button
                  onClick={() => handleDelete(journal.id)}
                  className="p-2 rounded-lg hover:bg-red-100 dark:hover:bg-red-900 text-red-600 transition-all"
                >
                  <Trash2 className="w-4 h-4" />
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
