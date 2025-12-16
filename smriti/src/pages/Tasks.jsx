import React, { useState, useEffect } from 'react';
import { Plus, Search, Trash2, Edit2, Check, Clock, RotateCw } from 'lucide-react';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, query, orderBy, where } from 'firebase/firestore';
import { db } from '../firebase/config';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { useSettings } from '../context/SettingsContext';
import { useAuth } from '../context/AuthContext';

const Tasks = () => {
  const { currentUser } = useAuth();
  const { settings } = useSettings();
  const [tasks, setTasks] = useState([]);
  const [filteredTasks, setFilteredTasks] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    dueDate: '',
    dueTime: '',
    status: 'pending',
    recurring: 'none',
    recurringInterval: 1,
  });

  useEffect(() => {
    if (currentUser) {
      loadTasks();
    }
  }, [currentUser]);

  useEffect(() => {
    filterTasks();
  }, [tasks, searchTerm, filterStatus, filterCategory]);

  const loadTasks = async () => {
    try {
      const tasksRef = collection(db, 'tasks');
      const q = query(
        tasksRef,
        where('userId', '==', currentUser.uid),
        orderBy('createdAt', 'desc')
      );
      const snapshot = await getDocs(q);
      const tasksList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));
      setTasks(tasksList);
    } catch (error) {
      console.error('Error loading tasks:', error);
      toast.error('Failed to load tasks');
    }
  };

  const filterTasks = () => {
    let filtered = [...tasks];

    if (searchTerm) {
      filtered = filtered.filter(task =>
        task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        task.description?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (filterStatus !== 'all') {
      filtered = filtered.filter(task => task.status === filterStatus);
    }

    if (filterCategory !== 'all') {
      filtered = filtered.filter(task => task.category === filterCategory);
    }

    setFilteredTasks(filtered);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.title.trim()) {
      toast.error('Please add a title');
      return;
    }

    if (!formData.category) {
      toast.error('Please select a category');
      return;
    }

    try {
      const taskData = {
        ...formData,
        userId: currentUser.uid,
        updatedAt: serverTimestamp(),
      };

      if (editingTask) {
        await updateDoc(doc(db, 'tasks', editingTask.id), taskData);
        toast.success('Task updated');
      } else {
        taskData.createdAt = serverTimestamp();
        await addDoc(collection(db, 'tasks'), taskData);
        toast.success('Task created');
      }

      loadTasks();
      closeModal();
    } catch (error) {
      console.error('Error saving task:', error);
      toast.error('Failed to save task');
    }
  };

  const handleStatusChange = async (taskId, newStatus) => {
    try {
      await updateDoc(doc(db, 'tasks', taskId), {
        status: newStatus,
        updatedAt: serverTimestamp(),
      });
      loadTasks();
      toast.success('Status updated');
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Failed to update status');
    }
  };

  const handleDelete = async (taskId) => {
    if (window.confirm('Delete this task?')) {
      try {
        await deleteDoc(doc(db, 'tasks', taskId));
        setTasks(tasks.filter(t => t.id !== taskId));
        toast.success('Task deleted');
      } catch (error) {
        console.error('Error deleting task:', error);
        toast.error('Failed to delete task');
      }
    }
  };

  const openModal = (task = null) => {
    if (task) {
      setEditingTask(task);
      setFormData({
        title: task.title,
        description: task.description || '',
        category: task.category,
        dueDate: task.dueDate || '',
        dueTime: task.dueTime || '',
        status: task.status,
        recurring: task.recurring || 'none',
        recurringInterval: task.recurringInterval || 1,
      });
    } else {
      setEditingTask(null);
      setFormData({
        title: '',
        description: '',
        category: '',
        dueDate: '',
        dueTime: '',
        status: 'pending',
        recurring: 'none',
        recurringInterval: 1,
      });
    }
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingTask(null);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
      case 'in-progress':
        return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
      default:
        return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400';
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-semibold mb-1">Tasks</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Stay organized and productive
          </p>
        </div>
        <button
          onClick={() => openModal()}
          className="flex items-center space-x-1.5 px-4 py-2 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 rounded text-sm font-medium hover:bg-gray-800 dark:hover:bg-gray-200"
        >
          <Plus className="w-4 h-4" />
          <span>New Task</span>
        </button>
      </div>

      {/* Filters */}
      <div className="card p-3 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search tasks..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-3 py-2 text-sm bg-transparent border border-gray-200 dark:border-gray-700 rounded outline-none focus:border-gray-400 dark:focus:border-gray-500"
            />
          </div>

          {/* Status Filter */}
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 text-sm bg-transparent border border-gray-200 dark:border-gray-700 rounded outline-none focus:border-gray-400 dark:focus:border-gray-500"
          >
            <option value="all">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="in-progress">In Progress</option>
            <option value="completed">Completed</option>
          </select>

          {/* Category Filter */}
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="px-3 py-2 text-sm bg-transparent border border-gray-200 dark:border-gray-700 rounded outline-none focus:border-gray-400 dark:focus:border-gray-500"
          >
            <option value="all">All Categories</option>
            {settings.taskCategories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Tasks List */}
      {filteredTasks.length === 0 ? (
        <div className="text-center py-12 card">
          <p className="text-sm text-gray-500 mb-4">
            {searchTerm || filterStatus !== 'all' || filterCategory !== 'all'
              ? 'No tasks found'
              : 'No tasks yet. Create one to get started!'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredTasks.map(task => (
            <div
              key={task.id}
              className="card p-4 hover-bg"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center flex-wrap gap-2 mb-2">
                    <h3 className="text-sm font-semibold">{task.title}</h3>
                    <span className={`text-[10px] px-2 py-0.5 rounded ${getStatusColor(task.status)}`}>
                      {task.status}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-800">
                      {task.category}
                    </span>
                    {task.recurring !== 'none' && (
                      <span className="text-[10px] px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 flex items-center space-x-0.5">
                        <RotateCw className="w-2.5 h-2.5" />
                        <span>{task.recurring}</span>
                      </span>
                    )}
                  </div>
                  {task.description && (
                    <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                      {task.description}
                    </p>
                  )}
                  {(task.dueDate || task.dueTime) && (
                    <div className="flex items-center space-x-3 text-xs text-gray-500">
                      {task.dueDate && <span>{task.dueDate}</span>}
                      {task.dueTime && <span>{task.dueTime}</span>}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center space-x-1">
                  {task.status !== 'completed' && (
                    <button
                      onClick={() => handleStatusChange(task.id, task.status === 'pending' ? 'in-progress' : 'completed')}
                      className="p-1.5 rounded hover:bg-green-100 dark:hover:bg-green-900/30 text-green-600"
                      title={task.status === 'pending' ? 'Start task' : 'Complete task'}
                    >
                      {task.status === 'pending' ? <Clock className="w-4 h-4" /> : <Check className="w-4 h-4" />}
                    </button>
                  )}
                  <button
                    onClick={() => openModal(task)}
                    className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(task.id)}
                    className="p-1.5 rounded hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-[#191919] rounded border border-gray-200 dark:border-gray-800 p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-semibold mb-4">
              {editingTask ? 'Edit Task' : 'New Task'}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-medium mb-1">Title</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded bg-white dark:bg-[#2c2c2c] border border-gray-200 dark:border-gray-700 outline-none focus:border-gray-400 dark:focus:border-gray-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium mb-1">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded bg-white dark:bg-[#2c2c2c] border border-gray-200 dark:border-gray-700 outline-none focus:border-gray-400 dark:focus:border-gray-500 min-h-[80px]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium mb-1">Category</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-3 py-2 text-sm rounded bg-white dark:bg-[#2c2c2c] border border-gray-200 dark:border-gray-700 outline-none focus:border-gray-400 dark:focus:border-gray-500"
                    required
                  >
                    <option value="">Select</option>
                    {settings.taskCategories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full px-3 py-2 text-sm rounded bg-white dark:bg-[#2c2c2c] border border-gray-200 dark:border-gray-700 outline-none focus:border-gray-400 dark:focus:border-gray-500"
                  >
                    <option value="pending">Pending</option>
                    <option value="in-progress">In Progress</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium mb-1">Due Date</label>
                  <input
                    type="date"
                    value={formData.dueDate}
                    onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                    className="w-full px-3 py-2 text-sm rounded bg-white dark:bg-[#2c2c2c] border border-gray-200 dark:border-gray-700 outline-none focus:border-gray-400 dark:focus:border-gray-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">Due Time</label>
                  <input
                    type="time"
                    value={formData.dueTime}
                    onChange={(e) => setFormData({ ...formData, dueTime: e.target.value })}
                    className="w-full px-3 py-2 text-sm rounded bg-white dark:bg-[#2c2c2c] border border-gray-200 dark:border-gray-700 outline-none focus:border-gray-400 dark:focus:border-gray-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium mb-1">Recurring</label>
                  <select
                    value={formData.recurring}
                    onChange={(e) => setFormData({ ...formData, recurring: e.target.value })}
                    className="w-full px-3 py-2 text-sm rounded bg-white dark:bg-[#2c2c2c] border border-gray-200 dark:border-gray-700 outline-none focus:border-gray-400 dark:focus:border-gray-500"
                  >
                    <option value="none">None</option>
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                  </select>
                </div>
                {formData.recurring !== 'none' && (
                  <div>
                    <label className="block text-xs font-medium mb-1">Every</label>
                    <input
                      type="number"
                      min="1"
                      value={formData.recurringInterval}
                      onChange={(e) => setFormData({ ...formData, recurringInterval: parseInt(e.target.value) })}
                      className="w-full px-3 py-2 text-sm rounded bg-white dark:bg-[#2c2c2c] border border-gray-200 dark:border-gray-700 outline-none focus:border-gray-400 dark:focus:border-gray-500"
                    />
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 text-sm rounded border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 rounded font-medium"
                >
                  {editingTask ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Tasks;