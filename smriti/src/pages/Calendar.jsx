import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Plus, Trash2, Edit2 } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, parseISO, addMonths, subMonths, addDays, addWeeks, isWithinInterval } from 'date-fns';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, query, where } from 'firebase/firestore';
import { db } from '../firebase/config';
import toast from 'react-hot-toast';
import { useSettings } from '../context/SettingsContext';
import { useAuth } from '../context/AuthContext';

const Calendar = () => {
  const { currentUser } = useAuth();
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
    recurring: 'none',
    recurringInterval: 1,
    recurringEndDate: '',
  });

  useEffect(() => {
    if (currentUser) {
      loadData();
    }
  }, [currentDate, currentUser]);

  const loadData = async () => {
    try {
      const userId = currentUser.uid;

      // Load events
      const eventsRef = collection(db, 'events');
      const eventsQuery = query(eventsRef, where('userId', '==', userId));
      const eventsSnapshot = await getDocs(eventsQuery);
      const eventsList = eventsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        type: 'event',
      }));
      setEvents(eventsList);

      // Load tasks with dates
      const tasksRef = collection(db, 'tasks');
      const tasksQuery = query(tasksRef, where('userId', '==', userId));
      const tasksSnapshot = await getDocs(tasksQuery);
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

  const getRecurringEventDates = (event, targetMonth) => {
    if (event.recurring === 'none') {
      return [event.date];
    }

    const dates = [];
    const startDate = parseISO(event.date);
    const monthStart = startOfMonth(targetMonth);
    const monthEnd = endOfMonth(targetMonth);
    const endDate = event.recurringEndDate ? parseISO(event.recurringEndDate) : monthEnd;

    let currentEventDate = startDate;
    
    while (currentEventDate <= endDate && currentEventDate <= monthEnd) {
      if (isWithinInterval(currentEventDate, { start: monthStart, end: monthEnd })) {
        dates.push(format(currentEventDate, 'yyyy-MM-dd'));
      }

      // Calculate next occurrence
      if (event.recurring === 'daily') {
        currentEventDate = addDays(currentEventDate, event.recurringInterval || 1);
      } else if (event.recurring === 'weekly') {
        currentEventDate = addWeeks(currentEventDate, event.recurringInterval || 1);
      } else if (event.recurring === 'monthly') {
        const nextMonth = currentEventDate.getMonth() + (event.recurringInterval || 1);
        currentEventDate = new Date(currentEventDate.getFullYear(), nextMonth, currentEventDate.getDate());
      }
    }

    return dates;
  };

  const getItemsForDate = (date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const dateTasks = tasks.filter(t => t.dueDate === dateStr);
    
    const dateEvents = events.flatMap(event => {
      const eventDates = getRecurringEventDates(event, currentDate);
      return eventDates.includes(dateStr) ? [event] : [];
    });

    return [...dateEvents, ...dateTasks];
  };

  const handleDateClick = (date) => {
    setSelectedDate(date);
  };

  const openModal = (event = null, date = null) => {
    if (event && event.type === 'event') {
      setEditingEvent(event);
      setFormData({
        title: event.title,
        description: event.description || '',
        date: event.date,
        time: event.time || '',
        category: event.category,
        recurring: event.recurring || 'none',
        recurringInterval: event.recurringInterval || 1,
        recurringEndDate: event.recurringEndDate || '',
      });
    } else {
      setEditingEvent(null);
      setFormData({
        title: '',
        description: '',
        date: date ? format(date, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'),
        time: '',
        category: '',
        recurring: 'none',
        recurringInterval: 1,
        recurringEndDate: '',
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
        recurring: formData.recurring,
        recurringInterval: formData.recurringInterval,
        recurringEndDate: formData.recurringEndDate,
        userId: currentUser.uid,
        updatedAt: serverTimestamp(),
      };

      if (editingEvent) {
        await updateDoc(doc(db, 'events', editingEvent.id), eventData);
        toast.success('Event updated');
      } else {
        eventData.createdAt = serverTimestamp();
        await addDoc(collection(db, 'events'), eventData);
        toast.success('Event created');
      }

      loadData();
      closeModal();
    } catch (error) {
      console.error('Error saving event:', error);
      toast.error('Failed to save event');
    }
  };

  const handleDelete = async (item) => {
    if (window.confirm(`Delete this ${item.type}?`)) {
      try {
        if (item.type === 'event') {
          await deleteDoc(doc(db, 'events', item.id));
          toast.success('Event deleted');
        } else {
          await deleteDoc(doc(db, 'tasks', item.id));
          toast.success('Task deleted');
        }
        loadData();
        setSelectedDate(null);
      } catch (error) {
        console.error('Error deleting item:', error);
        toast.error('Failed to delete item');
      }
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold">Calendar</h1>
        <button
          onClick={() => openModal(null, selectedDate)}
          className="flex items-center space-x-1.5 px-4 py-2 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 rounded text-sm font-medium hover:bg-gray-800 dark:hover:bg-gray-200"
        >
          <Plus className="w-4 h-4" />
          <span>New Event</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar */}
        <div className="lg:col-span-2 card p-4">
          {/* Calendar Header */}
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold">
              {format(currentDate, 'MMMM yyyy')}
            </h2>
            <div className="flex items-center space-x-2">
              <button
                onClick={previousMonth}
                className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setCurrentDate(new Date())}
                className="px-3 py-1.5 text-xs rounded hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                Today
              </button>
              <button
                onClick={nextMonth}
                className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Weekday headers */}
          <div className="grid grid-cols-7 gap-1 mb-1">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} className="text-center text-xs font-medium text-gray-500 dark:text-gray-400 py-2">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-1">
            {emptyDays.map((_, idx) => (
              <div key={`empty-${idx}`} className="aspect-square" />
            ))}
            {daysInMonth.map(date => {
              const items = getItemsForDate(date);
              const isCurrentDay = isSameDay(date, new Date());
              const isSelected = selectedDate && isSameDay(date, selectedDate);

              return (
                <button
                  key={date.toString()}
                  onClick={() => handleDateClick(date)}
                  className={`aspect-square p-1 rounded text-xs transition-colors relative ${
                    isCurrentDay
                      ? 'bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 font-semibold'
                      : isSelected
                      ? 'bg-gray-100 dark:bg-gray-800 font-medium'
                      : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'
                  }`}
                >
                  <div className="flex flex-col items-center justify-center h-full">
                    <span>{format(date, 'd')}</span>
                    {items.length > 0 && (
                      <div className="flex gap-0.5 mt-0.5">
                        {items.slice(0, 3).map((item, idx) => (
                          <div
                            key={idx}
                            className={`w-1 h-1 rounded-full ${
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
        </div>

        {/* Selected Date Details */}
        <div className="space-y-3">
          <div className="card p-4">
            <h3 className="text-sm font-semibold mb-3">
              {selectedDate
                ? format(selectedDate, 'EEEE, MMMM d')
                : 'Select a date'}
            </h3>

            {selectedDate && (
              <>
                {getItemsForDate(selectedDate).length === 0 ? (
                  <p className="text-xs text-gray-500 mb-3">No events or tasks</p>
                ) : (
                  <div className="space-y-2 mb-3">
                    {getItemsForDate(selectedDate).map((item, idx) => (
                      <div
                        key={`${item.id}-${idx}`}
                        className="card p-2"
                      >
                        <div className="flex items-start justify-between mb-1">
                          <div className="flex-1 min-w-0">
                            <h4 className="text-xs font-medium truncate">{item.title}</h4>
                            {(item.time || item.dueTime) && (
                              <p className="text-[10px] text-gray-500 mt-0.5">
                                {item.time || item.dueTime}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center space-x-1 ml-2">
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
                              className="p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800">
                          {item.category}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                <button
                  onClick={() => openModal(null, selectedDate)}
                  className="w-full flex items-center justify-center space-x-1 px-3 py-2 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 rounded text-xs font-medium"
                >
                  <Plus className="w-3 h-3" />
                  <span>Add Event</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-[#191919] rounded border border-gray-200 dark:border-gray-800 p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-semibold mb-4">
              {editingEvent ? 'Edit Event' : 'New Event'}
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
                  className="w-full px-3 py-2 text-sm rounded bg-white dark:bg-[#2c2c2c] border border-gray-200 dark:border-gray-700 outline-none focus:border-gray-400 dark:focus:border-gray-500 min-h-[60px]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium mb-1">Date</label>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full px-3 py-2 text-sm rounded bg-white dark:bg-[#2c2c2c] border border-gray-200 dark:border-gray-700 outline-none focus:border-gray-400 dark:focus:border-gray-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">Time</label>
                  <input
                    type="time"
                    value={formData.time}
                    onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                    className="w-full px-3 py-2 text-sm rounded bg-white dark:bg-[#2c2c2c] border border-gray-200 dark:border-gray-700 outline-none focus:border-gray-400 dark:focus:border-gray-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium mb-1">Category</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded bg-white dark:bg-[#2c2c2c] border border-gray-200 dark:border-gray-700 outline-none focus:border-gray-400 dark:focus:border-gray-500"
                  required
                >
                  <option value="">Select category</option>
                  {settings.eventCategories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
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

              {formData.recurring !== 'none' && (
                <div>
                  <label className="block text-xs font-medium mb-1">End Date (Optional)</label>
                  <input
                    type="date"
                    value={formData.recurringEndDate}
                    onChange={(e) => setFormData({ ...formData, recurringEndDate: e.target.value })}
                    className="w-full px-3 py-2 text-sm rounded bg-white dark:bg-[#2c2c2c] border border-gray-200 dark:border-gray-700 outline-none focus:border-gray-400 dark:focus:border-gray-500"
                  />
                </div>
              )}

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
                  {editingEvent ? 'Update' : 'Create'}
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