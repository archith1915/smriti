import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Plus, Trash2, Edit2 } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, isSameDay, parseISO, addMonths, subMonths } from 'date-fns';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, query, where } from 'firebase/firestore';
import { db } from '../firebase/config';
import toast from 'react-hot-toast';
import { useSettings } from '../context/SettingsContext';

const Calendar = () => {
  const { settings } = useSettings();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [selectedDate, setSelectedDate] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    date: '',
    time: '',
    category: '',
    type: 'event',
  });

  useEffect(() => {
    loadData();
  }, [currentDate]);

  const loadData = async () => {
    try {
      // Load events
      const eventsRef = collection(db, 'events');
      const eventsSnapshot = await getDocs(eventsRef);
      const eventsList = eventsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        type: 'event',
      }));
      setEvents(eventsList);

      // Load tasks with dates
      const tasksRef = collection(db, 'tasks');
      const tasksSnapshot = await getDocs(tasksRef);
      const tasksList = tasksSnapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data(), type: 'task' }))
        .filter(task => task.dueDate);
      setTasks(tasksList);
    } catch (error) {
      console.error('Error loading calendar data:', error);
      toast.error('Failed to load calendar data');
    }
  };

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const firstDayOfWeek = monthStart.getDay();
  const emptyDays = Array(firstDayOfWeek).fill(null);

  const previousMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));

  const getItemsForDate = (date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const dateEvents = events.filter(e => e.date === dateStr);
    const dateTasks = tasks.filter(t => t.dueDate === dateStr);
    return [...dateEvents, ...dateTasks];
  };

  const handleDateClick = (date) => {
    setSelectedDate(date);
  };

  const openModal = (event = null, date = null) => {
    if (event) {
      setEditingEvent(event);
      setFormData({
        title: event.title,
        description: event.description || '',
        date: event.date || event.dueDate,
        time: event.time || event.dueTime || '',
        category: event.category,
        type: event.type,
      });
    } else {
      setEditingEvent(null);
      setFormData({
        title: '',
        description: '',
        date: date ? format(date, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'),
        time: '',
        category: '',
        type: 'event',
      });
    }
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingEvent(null);
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
      const eventData = {
        title: formData.title,
        description: formData.description,
        date: formData.date,
        time: formData.time,
        category: formData.category,
        updatedAt: serverTimestamp(),
      };

      if (editingEvent && editingEvent.type === 'event') {
        await updateDoc(doc(db, 'events', editingEvent.id), eventData);
        toast.success('Event updated successfully! 📅');
      } else if (!editingEvent) {
        eventData.createdAt = serverTimestamp();
        await addDoc(collection(db, 'events'), eventData);
        toast.success('Event created successfully! 🎉');
      }

      loadData();
      closeModal();
    } catch (error) {
      console.error('Error saving event:', error);
      toast.error('Failed to save event');
    }
  };

  const handleDelete = async (item) => {
    if (window.confirm(`Are you sure you want to delete this ${item.type}?`)) {
      try {
        if (item.type === 'event') {
          await deleteDoc(doc(db, 'events', item.id));
          toast.success('Event deleted successfully');
        } else {
          await deleteDoc(doc(db, 'tasks', item.id));
          toast.success('Task deleted successfully');
        }
        loadData();
      } catch (error) {
        console.error('Error deleting item:', error);
        toast.error('Failed to delete item');
      }
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Calendar 📅</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Manage your events and view scheduled tasks
          </p>
        </div>
        <button
          onClick={() => openModal(null, selectedDate)}
          className="flex items-center space-x-2 px-6 py-3 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-all shadow-lg hover:shadow-xl"
        >
          <Plus className="w-5 h-5" />
          <span>New Event</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar */}
        <div className="lg:col-span-2 glass rounded-2xl p-6">
          {/* Calendar Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold">
              {format(currentDate, 'MMMM yyyy')}
            </h2>
            <div className="flex items-center space-x-2">
              <button
                onClick={previousMonth}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-all"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={() => setCurrentDate(new Date())}
                className="px-4 py-2 text-sm rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-all"
              >
                Today
              </button>
              <button
                onClick={nextMonth}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-all"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Weekday headers */}
          <div className="grid grid-cols-7 gap-2 mb-2">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} className="text-center text-sm font-medium text-gray-500 dark:text-gray-400 py-2">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-2">
            {emptyDays.map((_, idx) => (
              <div key={`empty-${idx}`} className="aspect-square" />
            ))}
            {daysInMonth.map(date => {
              const items = getItemsForDate(date);
              const isCurrentDay = isToday(date);
              const isSelected = selectedDate && isSameDay(date, selectedDate);

              return (
                <button
                  key={date.toString()}
                  onClick={() => handleDateClick(date)}
                  className={`aspect-square p-2 rounded-lg text-sm transition-all relative ${
                    isCurrentDay
                      ? 'bg-purple-600 text-white font-bold'
                      : isSelected
                      ? 'bg-purple-100 dark:bg-purple-900 font-semibold'
                      : 'hover:bg-gray-100 dark:hover:bg-gray-800'
                  }`}
                >
                  <div className="flex flex-col items-center justify-center h-full">
                    <span>{format(date, 'd')}</span>
                    {items.length > 0 && (
                      <div className="flex gap-1 mt-1">
                        {items.slice(0, 3).map((item, idx) => (
                          <div
                            key={idx}
                            className={`w-1.5 h-1.5 rounded-full ${
                              item.type === 'event'
                                ? 'bg-blue-500'
                                : 'bg-green-500'
                            }`}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex items-center justify-center gap-6 mt-6 text-xs">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 rounded-full bg-blue-500" />
              <span>Event</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 rounded-full bg-green-500" />
              <span>Task</span>
            </div>
          </div>
        </div>

        {/* Selected Date Details */}
        <div className="space-y-4">
          <div className="glass rounded-2xl p-6">
            <h3 className="text-lg font-semibold mb-4">
              {selectedDate
                ? format(selectedDate, 'EEEE, MMMM d')
                : 'Select a date'}
            </h3>

            {selectedDate && (
              <>
                {getItemsForDate(selectedDate).length === 0 ? (
                  <p className="text-sm text-gray-500">No events or tasks for this day.</p>
                ) : (
                  <div className="space-y-3">
                    {getItemsForDate(selectedDate).map(item => (
                      <div
                        key={item.id}
                        className={`p-4 rounded-lg ${
                          item.type === 'event'
                            ? 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800'
                            : 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
                        }`}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <h4 className="font-medium text-sm">{item.title}</h4>
                            {(item.time || item.dueTime) && (
                              <p className="text-xs text-gray-500 mt-1">
                                🕐 {item.time || item.dueTime}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center space-x-1">
                            {item.type === 'event' && (
                              <button
                                onClick={() => openModal(item)}
                                className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700"
                              >
                                <Edit2 className="w-3 h-3" />
                              </button>
                            )}
                            <button
                              onClick={() => handleDelete(item)}
                              className="p-1 rounded hover:bg-red-100 dark:hover:bg-red-900 text-red-600"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                        <span className="text-xs px-2 py-1 rounded-full bg-white/50 dark:bg-black/30">
                          {item.category}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                <button
                  onClick={() => openModal(null, selectedDate)}
                  className="w-full mt-4 flex items-center justify-center space-x-2 px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-all"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Event</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="glass rounded-2xl p-6 w-full max-w-lg">
            <h2 className="text-2xl font-bold mb-6">
              {editingEvent ? 'Edit Event' : 'New Event'}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Title */}
              <div>
                <label className="block text-sm font-medium mb-2">Title *</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-4 py-3 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 outline-none focus:ring-2 focus:ring-purple-500"
                  required
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium mb-2">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-4 py-3 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 outline-none focus:ring-2 focus:ring-purple-500 min-h-[80px]"
                />
              </div>

              {/* Date and Time */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Date *</label>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full px-4 py-3 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 outline-none focus:ring-2 focus:ring-purple-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Time</label>
                  <input
                    type="time"
                    value={formData.time}
                    onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                    className="w-full px-4 py-3 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>

              {/* Category */}
              <div>
                <label className="block text-sm font-medium mb-2">Category *</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-4 py-3 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 outline-none focus:ring-2 focus:ring-purple-500"
                  required
                >
                  <option value="">Select category</option>
                  {settings.eventCategories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              {/* Buttons */}
              <div className="flex items-center justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-6 py-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-all"
                >
                  {editingEvent ? 'Update' : 'Create'} Event
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Calendar;