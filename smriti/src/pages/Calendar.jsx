import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Plus, Trash2, Edit2, Download } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, parseISO, addMonths, subMonths, addDays, addWeeks, isWithinInterval } from 'date-fns';
import { collection, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase/config';
import toast from 'react-hot-toast';
import { useSettings } from '../context/SettingsContext';
import { useAuth } from '../context/AuthContext';
import { jsPDF } from 'jspdf';
import Loader from '../components/Loader';

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

  const [jumpMonth, setJumpMonth] = useState(currentDate.getMonth());
  const [jumpYear, setJumpYear] = useState(currentDate.getFullYear());

  // --- LOADER STATE ---
  const [loading, setLoading] = useState(true);
  const [loadStatus, setLoadStatus] = useState({ events: false, tasks: false });

  useEffect(() => {
    if (loadStatus.events && loadStatus.tasks) {
      setLoading(false);
    }
  }, [loadStatus]);

  // --- LIVE DATA LISTENERS ---
  useEffect(() => {
    if (!currentUser) return;

    const userId = currentUser.uid;

    // 1. Events Listener
    const eventsQuery = query(collection(db, 'events'), where('userId', '==', userId));
    const unsubEvents = onSnapshot(eventsQuery, (snapshot) => {
      const list = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        type: 'event',
      }));
      setEvents(list);
      setLoadStatus(prev => ({ ...prev, events: true }));
    }, (error) => {
      console.error("Events sync error:", error);
      setLoadStatus(prev => ({ ...prev, events: true }));
    });

    // 2. Tasks Listener
    const tasksQuery = query(collection(db, 'tasks'), where('userId', '==', userId));
    const unsubTasks = onSnapshot(tasksQuery, (snapshot) => {
      const list = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data(), type: 'task' }))
        .filter(task => task.dueDate); 
      setTasks(list);
      setLoadStatus(prev => ({ ...prev, tasks: true }));
    }, (error) => {
      console.error("Tasks sync error:", error);
      setLoadStatus(prev => ({ ...prev, tasks: true }));
    });

    // Cleanup
    return () => {
      unsubEvents();
      unsubTasks();
    };
  }, [currentUser]); 

  // Sync Jump controls
  useEffect(() => {
    setJumpMonth(currentDate.getMonth());
    setJumpYear(currentDate.getFullYear());
  }, [currentDate]);

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const firstDayOfWeek = monthStart.getDay();
  const emptyDays = Array(firstDayOfWeek).fill(null);

  const previousMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));

  const handleJump = () => {
    const newDate = new Date(jumpYear, jumpMonth, 1);
    setCurrentDate(newDate);
  };

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

      if (event.recurring === 'daily') {
        currentEventDate = addDays(currentEventDate, event.recurringInterval || 1);
      } else if (event.recurring === 'weekly') {
        currentEventDate = addWeeks(currentEventDate, event.recurringInterval || 1);
      } else if (event.recurring === 'monthly') {
        const nextMonth = currentEventDate.getMonth() + (event.recurringInterval || 1);
        currentEventDate = new Date(currentEventDate.getFullYear(), nextMonth, currentEventDate.getDate());
      } else if (event.recurring === 'yearly') {
        currentEventDate = new Date(
          currentEventDate.getFullYear() + (event.recurringInterval || 1),
          currentEventDate.getMonth(),
          currentEventDate.getDate()
        );
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

  // 🎨 PDF GENERATOR
  const downloadPDF = () => {
    if (!selectedDate) return;

    try {
      const doc = new jsPDF();
      const items = getItemsForDate(selectedDate);
      const dateStr = format(selectedDate, 'EEEE, MMMM d, yyyy');

      // --- HEADER ---
      doc.setFillColor(15, 15, 15); // Almost Black
      doc.rect(0, 0, 210, 30, 'F');
      
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(20);
      doc.setFont("helvetica", "bold");
      doc.text("Daily Schedule", 15, 18);
      
      doc.setFontSize(12);
      doc.setFont("helvetica", "normal");
      doc.text(dateStr, 15, 25);
      
      doc.setFontSize(10);
      doc.setTextColor(200, 200, 200);
      doc.text("Smriti App", 180, 18);

      // --- CONTENT ---
      let yPos = 45;
      const pageHeight = doc.internal.pageSize.height;
      const margin = 15;
      const cardWidth = 180;

      if (items.length === 0) {
        doc.setTextColor(100);
        doc.setFontSize(12);
        doc.text("No events or tasks scheduled for this day.", margin, yPos);
      } else {
        items.sort((a, b) => {
            const timeA = a.time || a.dueTime || '00:00';
            const timeB = b.time || b.dueTime || '00:00';
            return timeA.localeCompare(timeB);
        });

        items.forEach((item) => {
          const isTask = item.type === 'task';
          const title = item.title;
          const time = item.time || item.dueTime || 'All Day';
          const category = (item.category || 'General').toUpperCase();
          const desc = item.description || 'No description provided.';
          
          doc.setFontSize(10);
          const descLines = doc.splitTextToSize(desc, cardWidth - 10);
          const cardHeight = 25 + (descLines.length * 5);

          if (yPos + cardHeight > pageHeight - 20) {
            doc.addPage();
            yPos = 20;
          }

          if (isTask) {
             doc.setFillColor(66, 48, 20);
             doc.setDrawColor(245, 158, 11); 
          } else {
             doc.setFillColor(20, 40, 70);
             doc.setDrawColor(59, 130, 246);
          }

          doc.roundedRect(margin, yPos, cardWidth, cardHeight, 2, 2, 'FD');

          doc.setFillColor(isTask ? 245 : 59, isTask ? 158 : 130, isTask ? 11 : 246);
          doc.rect(margin, yPos, 2, cardHeight, 'F');

          doc.setTextColor(200, 200, 200);
          doc.setFontSize(9);
          doc.setFont("helvetica", "bold");
          doc.text(time, margin + 6, yPos + 8);

          doc.setFontSize(8);
          doc.setFont("helvetica", "normal");
          doc.text(category, margin + cardWidth - 5, yPos + 8, { align: 'right' });

          doc.setTextColor(255, 255, 255);
          doc.setFontSize(13);
          doc.setFont("helvetica", "bold");
          doc.text(title, margin + 6, yPos + 16);

          doc.setTextColor(180, 180, 180);
          doc.setFontSize(10);
          doc.setFont("helvetica", "normal");
          doc.text(descLines, margin + 6, yPos + 22);

          yPos += cardHeight + 8;
        });
      }

      doc.save(`Schedule_${format(selectedDate, 'yyyy-MM-dd')}.pdf`);
      toast.success('Schedule downloaded');
    } catch (error) {
      console.error('Error downloading PDF:', error);
      toast.error('Failed to download PDF');
    }
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
        notificationSent: false,
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
      } catch (error) {
        console.error('Error deleting item:', error);
        toast.error('Failed to delete item');
      }
    }
  };

  if (loading) return <Loader />;

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
          <div className="mb-4 space-y-2">
            <h2 className="text-base font-semibold">
              {format(currentDate, 'MMMM yyyy')}
            </h2>

            <div className="flex items-center justify-center gap-1 bg-white/60 dark:bg-[#191919] rounded-lg p-1 mx-auto">
              <button
                onClick={previousMonth}
                className="flex items-center justify-center w-9 h-9 rounded-md hover:bg-white dark:hover:bg-black/40 transition"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>

              <button
                onClick={() => setCurrentDate(new Date())}
                className="flex items-center justify-center h-9 px-4 text-sm font-medium rounded-md hover:bg-white dark:hover:bg-black/40 transition"
              >
                Current month
              </button>

              <button
                onClick={nextMonth}
                className="flex items-center justify-center w-9 h-9 rounded-md hover:bg-white dark:hover:bg-black/40 transition"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>

            <div className="flex items-center gap-2">
              <select
                value={jumpMonth}
                onChange={(e) => setJumpMonth(Number(e.target.value))}
                className="flex-1 text-xs px-2.5 py-1.5 rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#191919] focus:outline-none"
              >
                {Array.from({ length: 12 }).map((_, i) => (
                  <option key={i} value={i}>
                    {format(new Date(2025, i, 1), 'MMM')}
                  </option>
                ))}
              </select>

              <input
                type="number"
                value={jumpYear}
                onChange={(e) => setJumpYear(Number(e.target.value))}
                className="w-24 text-xs px-2.5 py-1.5 rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#191919] focus:outline-none"
              />

              <button
                onClick={handleJump}
                className="px-3 py-1.5 text-xs rounded bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900"
              >
                Go
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
              const eventItems = items.filter(i => i.type === 'event');
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
                    {eventItems.length > 0 && (
                      <div className="flex gap-0.5 mt-0.5">
                        {eventItems.slice(0, 3).map((item, idx) => (
                          <div
                            key={idx}
                            className="w-1 h-1 rounded-full bg-blue-500"
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
            <div className="flex justify-between items-start mb-3">
              <h3 className="text-sm font-semibold">
                {selectedDate
                  ? format(selectedDate, 'EEEE, MMMM d')
                  : 'Select a date'}
              </h3>
              {selectedDate && (
                <button 
                  onClick={downloadPDF}
                  className="p-1.5 text-gray-500 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors"
                  title="Download Schedule as PDF"
                >
                  <Download className="w-4 h-4" />
                </button>
              )}
            </div>

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
                        <div className="flex items-center gap-2 mt-1">
                          {item.type === 'task' && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 font-medium border border-amber-200 dark:border-amber-800">
                              Task
                            </span>
                          )}
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800">
                            {item.category}
                          </span>
                        </div>
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
                    className="w-full px-3 py-2 text-sm rounded bg-white dark:bg-[#2c2c2c] border border-gray-200 dark:border-gray-700 outline-none focus:border-gray-400 dark:focus:border-gray-500 dark:[color-scheme:dark]"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">Time</label>
                  <input
                    type="time"
                    value={formData.time}
                    onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                    className="w-full px-3 py-2 text-sm rounded bg-white dark:bg-[#2c2c2c] border border-gray-200 dark:border-gray-700 outline-none focus:border-gray-400 dark:focus:border-gray-500 dark:[color-scheme:dark]"
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
                    <option value="yearly">Yearly</option>
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
                    className="w-full px-3 py-2 text-sm rounded bg-white dark:bg-[#2c2c2c] border border-gray-200 dark:border-gray-700 outline-none focus:border-gray-400 dark:focus:border-gray-500 dark:[color-scheme:dark]"
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