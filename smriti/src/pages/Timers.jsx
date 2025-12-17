import React, { useState, useEffect } from 'react';
import { Play, Pause, RotateCcw, Plus, Trash2, X, Clock } from 'lucide-react';
import { collection, query, where, onSnapshot, addDoc, deleteDoc, doc, serverTimestamp, orderBy } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from '../context/AuthContext';
import { format, isPast } from 'date-fns';
import toast from 'react-hot-toast';
import Loader from '../components/Loader';

// --- SUB-COMPONENT: TIMER ---
const TimerTab = () => {
  const [time, setTime] = useState(0); // in seconds
  const [isActive, setIsActive] = useState(false);
  const [inputHours, setInputHours] = useState(0);
  const [inputMinutes, setInputMinutes] = useState(5);
  const [inputSeconds, setInputSeconds] = useState(0);

  useEffect(() => {
    let interval = null;
    if (isActive && time > 0) {
      interval = setInterval(() => setTime((t) => t - 1), 1000);
    } else if (time === 0 && isActive) {
      setIsActive(false);
      new Audio('https://actions.google.com/sounds/v1/alarms/beep_short.ogg').play().catch(() => {});
      toast('Timer Finished!', { icon: '⏰' });
    }
    return () => clearInterval(interval);
  }, [isActive, time]);

  const startTimer = () => {
    if (time === 0) {
      const total = (parseInt(inputHours) * 3600) + (parseInt(inputMinutes) * 60) + parseInt(inputSeconds);
      if (total > 0) setTime(total);
    }
    setIsActive(true);
  };

  const formatTime = (seconds) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex flex-col items-center justify-center py-8 sm:py-12 space-y-8 w-full">
      {/* Responsive Text Size */}
      <div className="text-5xl sm:text-7xl font-mono font-bold tracking-wider text-gray-900 dark:text-gray-100 text-center transition-all duration-300">
        {formatTime(time)}
      </div>
      
      {!isActive && time === 0 && (
        <div className="flex gap-2 sm:gap-4 text-center justify-center w-full">
          <div className="flex flex-col items-center">
            <input 
              type="number" min="0" value={inputHours} onChange={e => setInputHours(e.target.value)} 
              className="w-16 sm:w-20 p-3 text-xl text-center rounded-lg border bg-gray-50 dark:bg-[#252525] border-gray-200 dark:border-gray-700 focus:ring-2 ring-gray-900 dark:ring-gray-100 outline-none transition-all" 
            />
            <span className="text-xs mt-2 text-gray-500 uppercase tracking-wide">Hrs</span>
          </div>
          <div className="flex flex-col items-center">
            <input 
              type="number" min="0" value={inputMinutes} onChange={e => setInputMinutes(e.target.value)} 
              className="w-16 sm:w-20 p-3 text-xl text-center rounded-lg border bg-gray-50 dark:bg-[#252525] border-gray-200 dark:border-gray-700 focus:ring-2 ring-gray-900 dark:ring-gray-100 outline-none transition-all" 
            />
            <span className="text-xs mt-2 text-gray-500 uppercase tracking-wide">Mins</span>
          </div>
          <div className="flex flex-col items-center">
            <input 
              type="number" min="0" value={inputSeconds} onChange={e => setInputSeconds(e.target.value)} 
              className="w-16 sm:w-20 p-3 text-xl text-center rounded-lg border bg-gray-50 dark:bg-[#252525] border-gray-200 dark:border-gray-700 focus:ring-2 ring-gray-900 dark:ring-gray-100 outline-none transition-all" 
            />
            <span className="text-xs mt-2 text-gray-500 uppercase tracking-wide">Secs</span>
          </div>
        </div>
      )}

      <div className="flex space-x-6">
        <button 
          onClick={isActive ? () => setIsActive(false) : startTimer} 
          className="w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center rounded-full bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 shadow-lg hover:scale-105 active:scale-95 transition-transform"
        >
          {isActive ? <Pause className="w-8 h-8" /> : <Play className="w-8 h-8 ml-1" />}
        </button>
        <button 
          onClick={() => { setIsActive(false); setTime(0); }} 
          className="w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
        >
          <RotateCcw className="w-7 h-7" />
        </button>
      </div>
    </div>
  );
};

// --- SUB-COMPONENT: STOPWATCH ---
const StopwatchTab = () => {
  const [time, setTime] = useState(0); // milliseconds
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    let interval = null;
    if (isActive) {
      interval = setInterval(() => setTime((t) => t + 10), 10);
    }
    return () => clearInterval(interval);
  }, [isActive]);

  const formatTime = (ms) => {
    const m = Math.floor((ms / 60000) % 60);
    const s = Math.floor((ms / 1000) % 60);
    const cs = Math.floor((ms / 10) % 100);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${cs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex flex-col items-center justify-center py-8 sm:py-12 space-y-8 w-full">
      <div className="text-5xl sm:text-7xl font-mono font-bold tracking-wider text-gray-900 dark:text-gray-100 text-center transition-all duration-300">
        {formatTime(time)}
      </div>
      <div className="flex space-x-6">
        <button 
          onClick={() => setIsActive(!isActive)} 
          className="w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center rounded-full bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 shadow-lg hover:scale-105 active:scale-95 transition-transform"
        >
          {isActive ? <Pause className="w-8 h-8" /> : <Play className="w-8 h-8 ml-1" />}
        </button>
        <button 
          onClick={() => { setIsActive(false); setTime(0); }} 
          className="w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
        >
          <RotateCcw className="w-7 h-7" />
        </button>
      </div>
    </div>
  );
};

// --- SUB-COMPONENT: COUNTDOWNS ---
const CountdownCard = ({ countdown, onDelete }) => {
  const [timeLeft, setTimeLeft] = useState(calculateTimeLeft(new Date(countdown.targetDate)));
  const [isExpired, setIsExpired] = useState(false);

  // Update countdown every second
  useEffect(() => {
    const interval = setInterval(() => {
      const newTimeLeft = calculateTimeLeft(new Date(countdown.targetDate));
      setTimeLeft(newTimeLeft);
      
      if (newTimeLeft.expired && !isExpired) {
        setIsExpired(true);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [countdown.targetDate, isExpired]);

  // Check initial expired state
  useEffect(() => {
    const initialExpired = isPast(new Date(countdown.targetDate));
    setIsExpired(initialExpired);
  }, [countdown.targetDate]);

  const targetDate = new Date(countdown.targetDate);

  return (
    <div className={`card p-5 relative overflow-hidden group transition-all duration-300 ${
      isExpired 
        ? 'border-red-200 dark:border-red-800/50 bg-gradient-to-br from-red-50/50 to-transparent dark:from-red-900/10 dark:to-transparent animate-pulse' 
        : 'hover:border-gray-300 dark:hover:border-gray-600'
    }`}>
      {isExpired && (
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-red-100/10 to-transparent dark:from-transparent dark:via-red-900/10 dark:to-transparent animate-shimmer" />
      )}
      
      <div className="flex justify-between items-start mb-4 relative z-10">
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-lg truncate pr-8 text-gray-900 dark:text-gray-100">{countdown.title}</h3>
          <div className="flex items-center gap-2 mt-1">
            <Clock className="w-3 h-3 text-gray-400" />
            <span className="text-xs text-gray-500">
              {format(targetDate, 'MMM d, yyyy • h:mm a')}
            </span>
          </div>
        </div>
        <button 
          onClick={() => onDelete(countdown.id)} 
          className="text-gray-400 hover:text-red-500 absolute top-0 right-0 p-2 transition-colors"
          title="Delete"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
      
      {isExpired ? (
        <div className="text-center py-6 relative z-10">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-red-100 dark:bg-red-900/30 rounded-full animate-bounce">
            <span className="text-red-600 dark:text-red-400 font-bold">Expired</span>
            <span className="text-red-500 animate-ping">!</span>
          </div>
          <p className="text-sm text-gray-500 mt-2">This countdown has ended</p>
        </div>
      ) : (
        <div className="space-y-4 relative z-10">
          <div className="grid grid-cols-4 gap-3">
            <div className="text-center p-3 rounded-lg bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-900/20 dark:to-blue-800/10 border border-blue-100 dark:border-blue-800/30">
              <div className="text-2xl sm:text-3xl font-bold text-blue-600 dark:text-blue-400 font-mono">
                {timeLeft.days}
              </div>
              <div className="text-xs text-blue-500 dark:text-blue-300 mt-1 uppercase tracking-wider">Days</div>
            </div>
            <div className="text-center p-3 rounded-lg bg-gradient-to-br from-purple-50 to-purple-100/50 dark:from-purple-900/20 dark:to-purple-800/10 border border-purple-100 dark:border-purple-800/30">
              <div className="text-2xl sm:text-3xl font-bold text-purple-600 dark:text-purple-400 font-mono">
                {timeLeft.hours.toString().padStart(2, '0')}
              </div>
              <div className="text-xs text-purple-500 dark:text-purple-300 mt-1 uppercase tracking-wider">Hours</div>
            </div>
            <div className="text-center p-3 rounded-lg bg-gradient-to-br from-green-50 to-green-100/50 dark:from-green-900/20 dark:to-green-800/10 border border-green-100 dark:border-green-800/30">
              <div className="text-2xl sm:text-3xl font-bold text-green-600 dark:text-green-400 font-mono">
                {timeLeft.minutes.toString().padStart(2, '0')}
              </div>
              <div className="text-xs text-green-500 dark:text-green-300 mt-1 uppercase tracking-wider">Mins</div>
            </div>
            <div className="text-center p-3 rounded-lg bg-gradient-to-br from-amber-50 to-amber-100/50 dark:from-amber-900/20 dark:to-amber-800/10 border border-amber-100 dark:border-amber-800/30">
              <div className="text-2xl sm:text-3xl font-bold text-amber-600 dark:text-amber-400 font-mono">
                {timeLeft.seconds.toString().padStart(2, '0')}
              </div>
              <div className="text-xs text-amber-500 dark:text-amber-300 mt-1 uppercase tracking-wider">Secs</div>
            </div>
          </div>
          
          <div className="pt-2">
            <div className="h-1.5 w-full bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full transition-all duration-1000"
                style={{ 
                  width: `${Math.max(0.5, (100 - ((timeLeft.days * 100) / 365)))}%` 
                }}
              />
            </div>
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>{timeLeft.days} days left</span>
              <span>{(timeLeft.days / 365 * 100).toFixed(1)}% of year</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Helper function for countdown calculation
const calculateTimeLeft = (targetDate) => {
  const now = new Date();
  const diff = targetDate - now;
  
  if (diff <= 0) return { expired: true };
  
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);
  
  return {
    expired: false,
    days,
    hours,
    minutes,
    seconds
  };
};

// --- SUB-COMPONENT: COUNTDOWNS TAB ---
const CountdownsTab = () => {
  const { currentUser } = useAuth();
  const [countdowns, setCountdowns] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [events, setEvents] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);
  
  // Modal State
  const [sourceType, setSourceType] = useState('custom'); 
  const [selectedSourceId, setSelectedSourceId] = useState('');
  const [customTitle, setCustomTitle] = useState('');
  const [customDate, setCustomDate] = useState('');
  const [customTime, setCustomTime] = useState('');

  useEffect(() => {
    if (!currentUser) return;
    const userId = currentUser.uid;

    const unsubCountdowns = onSnapshot(
      query(
        collection(db, 'countdowns'), 
        where('userId', '==', userId), 
        orderBy('targetDate')
      ), 
      (snap) => {
        setCountdowns(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        setLoading(false);
      },
      (error) => {
        console.error('Countdowns error:', error);
        setLoading(false);
      }
    );

    const unsubTasks = onSnapshot(
      query(
        collection(db, 'tasks'), 
        where('userId', '==', userId), 
        where('status', '!=', 'completed')
      ), 
      (snap) => {
        setTasks(snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(t => t.dueDate));
      }
    );

    const unsubEvents = onSnapshot(
      query(
        collection(db, 'events'), 
        where('userId', '==', userId)
      ), 
      (snap) => {
        setEvents(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      }
    );

    return () => { 
      unsubCountdowns(); 
      unsubTasks(); 
      unsubEvents(); 
    };
  }, [currentUser]);

  const handleCreate = async (e) => {
    e.preventDefault();
    let title = customTitle;
    let targetDateStr = '';

    if (sourceType === 'custom') {
      if (!customDate) return toast.error('Date is required');
      targetDateStr = `${customDate}T${customTime || '00:00'}`;
    } else if (sourceType === 'task') {
      const task = tasks.find(t => t.id === selectedSourceId);
      if (!task) return toast.error('Please select a task');
      title = task.title;
      targetDateStr = `${task.dueDate}T${task.dueTime || '00:00'}`;
    } else if (sourceType === 'event') {
      const event = events.find(e => e.id === selectedSourceId);
      if (!event) return toast.error('Please select an event');
      title = event.title;
      targetDateStr = `${event.date}T${event.time || '00:00'}`;
    }

    try {
      await addDoc(collection(db, 'countdowns'), {
        userId: currentUser.uid,
        title,
        targetDate: targetDateStr,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      toast.success('Countdown created successfully!');
      setShowModal(false);
      setCustomTitle('');
      setCustomDate('');
      setCustomTime('');
      setSelectedSourceId('');
    } catch (error) {
      console.error('Error creating countdown:', error);
      toast.error('Failed to create countdown');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this countdown?')) {
      try {
        await deleteDoc(doc(db, 'countdowns', id));
        toast.success('Countdown deleted');
      } catch (error) {
        toast.error('Failed to delete countdown');
      }
    }
  };

  if (loading) return <Loader />;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Your Countdowns</h2>
          <p className="text-sm text-gray-500 mt-1">Track important dates and deadlines</p>
        </div>
        <button 
          onClick={() => setShowModal(true)} 
          className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-gray-900 to-gray-800 dark:from-gray-100 dark:to-gray-200 text-white dark:text-gray-900 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity shadow-md"
        >
          <Plus className="w-4 h-4" />
          <span>Add Countdown</span>
        </button>
      </div>

      {countdowns.length === 0 ? (
        <div className="card p-8 text-center">
          <div className="w-16 h-16 mx-auto mb-4 flex items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
            <Clock className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium mb-2 text-gray-900 dark:text-gray-100">No countdowns yet</h3>
          <p className="text-gray-500 mb-4">Create your first countdown to track important dates</p>
          <button 
            onClick={() => setShowModal(true)} 
            className="flex items-center space-x-2 px-5 py-2.5 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 rounded-lg font-medium mx-auto hover:opacity-90 transition-opacity"
          >
            <Plus className="w-4 h-4" />
            <span>Create Countdown</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {countdowns.map(cd => (
            <CountdownCard 
              key={cd.id} 
              countdown={cd} 
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {/* Create Countdown Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#191919] rounded-xl border border-gray-200 dark:border-gray-800 p-6 w-full max-w-md shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">Create Countdown</h3>
              <button 
                onClick={() => setShowModal(false)} 
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            
            <form onSubmit={handleCreate} className="space-y-5">
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Source Type</label>
                <div className="grid grid-cols-3 gap-2 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
                  {['custom', 'task', 'event'].map(type => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => {
                        setSourceType(type);
                        setSelectedSourceId('');
                      }}
                      className={`text-sm py-2.5 rounded-md font-medium capitalize transition-all ${
                        sourceType === type 
                          ? 'bg-white dark:bg-[#2c2c2c] text-gray-900 dark:text-white shadow-sm ring-1 ring-gray-200 dark:ring-gray-700' 
                          : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              {sourceType === 'custom' && (
                <>
                  <div>
                    <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Title</label>
                    <input 
                      type="text" 
                      placeholder="e.g., Final Exam, Vacation, Project Deadline" 
                      value={customTitle} 
                      onChange={e => setCustomTitle(e.target.value)} 
                      className="w-full p-3 rounded-lg border bg-white dark:bg-[#252525] border-gray-300 dark:border-gray-700 outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-100 focus:border-transparent transition-all"
                      required 
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Date</label>
                      <input 
                        type="date" 
                        value={customDate} 
                        onChange={e => setCustomDate(e.target.value)} 
                        className="w-full p-3 rounded-lg border bg-white dark:bg-[#252525] border-gray-300 dark:border-gray-700 outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-100 focus:border-transparent transition-all"
                        required 
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Time (Optional)</label>
                      <input 
                        type="time" 
                        value={customTime} 
                        onChange={e => setCustomTime(e.target.value)} 
                        className="w-full p-3 rounded-lg border bg-white dark:bg-[#252525] border-gray-300 dark:border-gray-700 outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-100 focus:border-transparent transition-all"
                      />
                    </div>
                  </div>
                </>
              )}

              {sourceType === 'task' && (
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Select Task</label>
                  <select 
                    value={selectedSourceId} 
                    onChange={e => setSelectedSourceId(e.target.value)} 
                    className="w-full p-3 rounded-lg border bg-white dark:bg-[#252525] border-gray-300 dark:border-gray-700 outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-100 focus:border-transparent transition-all"
                    required
                  >
                    <option value="">Choose a task...</option>
                    {tasks.map(t => (
                      <option key={t.id} value={t.id}>
                        {t.title} (Due: {format(new Date(t.dueDate), 'MMM d, yyyy')})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {sourceType === 'event' && (
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Select Event</label>
                  <select 
                    value={selectedSourceId} 
                    onChange={e => setSelectedSourceId(e.target.value)} 
                    className="w-full p-3 rounded-lg border bg-white dark:bg-[#252525] border-gray-300 dark:border-gray-700 outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-100 focus:border-transparent transition-all"
                    required
                  >
                    <option value="">Choose an event...</option>
                    {events.map(e => (
                      <option key={e.id} value={e.id}>
                        {e.title} ({format(new Date(e.date), 'MMM d, yyyy')})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="pt-4">
                <button 
                  type="submit" 
                  className="w-full py-3 bg-gradient-to-r from-gray-900 to-gray-800 dark:from-gray-100 dark:to-gray-200 text-white dark:text-gray-900 rounded-lg font-bold text-sm hover:opacity-90 transition-opacity shadow-md"
                >
                  Create Countdown
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

// --- MAIN PAGE ---
const Timers = () => {
  const [activeTab, setActiveTab] = useState('timer');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    const timer = setTimeout(() => {
      setLoading(false);
    }, 300);

    return () => clearTimeout(timer);
  }, [activeTab]);

  if (loading) return <Loader />;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">Time Management</h1>
        <p className="text-gray-600 dark:text-gray-400">Timer, stopwatch, and countdowns for productivity</p>
      </div>
      
      {/* Responsive Tabs Navigation */}
      <div className="flex flex-wrap gap-2 mb-8">
        {[
          { id: 'timer', label: 'Timer', icon: Clock },
          { id: 'stopwatch', label: 'Stopwatch', icon: Clock },
          { id: 'countdowns', label: 'Countdowns', icon: Clock }
        ].map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center space-x-2 px-5 py-3 rounded-xl text-sm font-medium transition-all ${
                activeTab === tab.id 
                  ? 'bg-gradient-to-r from-gray-900 to-gray-800 dark:from-gray-100 dark:to-gray-200 text-white dark:text-gray-900 shadow-lg' 
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      <div className="card p-4 sm:p-8 min-h-[500px]">
        {activeTab === 'timer' && <TimerTab />}
        {activeTab === 'stopwatch' && <StopwatchTab />}
        {activeTab === 'countdowns' && <CountdownsTab />}
      </div>
    </div>
  );
};

export default Timers;