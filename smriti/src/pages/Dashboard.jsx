import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Plus } from 'lucide-react';
import StreakStats from '../components/StreakStats';
import StreakCalendar from '../components/StreakCalendar';
import { collection, query, where, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase/config';
import { format } from 'date-fns';
import { useAuth } from '../context/AuthContext';
import Loader from '../components/Loader';

const formatStatus = (status = '') => {
    return status
      .replace('-', ' ')
      .replace(/\b\w/g, char => char.toUpperCase());
  };

const Dashboard = () => {
  const { currentUser } = useAuth();
  const [recentJournals, setRecentJournals] = useState([]);
  const [todayTasks, setTodayTasks] = useState([]);
  const [upcomingEvents, setUpcomingEvents] = useState([]);
  
  // Loading State tracking
  const [loading, setLoading] = useState(true);
  const [loadStatus, setLoadStatus] = useState({ journals: false, tasks: false, events: false });

  useEffect(() => {
    // Check if all parts are loaded
    if (loadStatus.journals && loadStatus.tasks && loadStatus.events) {
      setLoading(false);
    }
  }, [loadStatus]);

  useEffect(() => {
    if (!currentUser) return;

    const userId = currentUser.uid;
    const today = format(new Date(), 'yyyy-MM-dd');

    // 1. Live Recent Journals
    const journalsRef = collection(db, 'journals');
    const journalsQuery = query(
      journalsRef,
      where('userId', '==', userId),
      orderBy('createdAt', 'desc'),
      limit(5)
    );
    const unsubJournals = onSnapshot(journalsQuery, (snapshot) => {
      setRecentJournals(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoadStatus(prev => ({ ...prev, journals: true }));
    });

    // 2. Live Today's Tasks
    const tasksRef = collection(db, 'tasks');
    const tasksQuery = query(
      tasksRef,
      where('userId', '==', userId),
      where('dueDate', '==', today),
      where('status', '!=', 'completed')
    );
    const unsubTasks = onSnapshot(tasksQuery, (snapshot) => {
      setTodayTasks(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoadStatus(prev => ({ ...prev, tasks: true }));
    });

    // 3. Live Upcoming Events
    const eventsRef = collection(db, 'events');
    const eventsQuery = query(
      eventsRef,
      where('userId', '==', userId),
      where('date', '>=', today),
      orderBy('date'),
      limit(3)
    );
    const unsubEvents = onSnapshot(eventsQuery, (snapshot) => {
      setUpcomingEvents(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoadStatus(prev => ({ ...prev, events: true }));
    });

    // Cleanup all listeners
    return () => {
      unsubJournals();
      unsubTasks();
      unsubEvents();
    };
  }, [currentUser]);

  if (loading) return <Loader />;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 animate-in fade-in duration-500">
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Main Content */}
        <div className="flex-1 space-y-6">
          {/* Header */}
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-semibold mb-1">Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 18 ? 'afternoon' : 'evening'}.</h1>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {format(new Date(), 'EEEE, MMMM d, yyyy')}
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

          {/* Recent Journals */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold">Recent Journals</h2>
              <Link to="/journals" className="text-xs text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100">
                View all
              </Link>
            </div>
            {recentJournals.length === 0 ? (
              <div className="card p-8 text-center">
                <p className="text-sm text-gray-500 mb-3">No journals yet. Start writing!</p>
                <Link
                  to="/journals/new"
                  className="inline-flex items-center space-x-1.5 px-4 py-2 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 rounded text-sm font-medium"
                >
                  <Plus className="w-4 h-4" />
                  <span>Create First Journal</span>
                </Link>
              </div>
            ) : (
              <div className="space-y-2">
                {recentJournals.map(journal => (
                  <Link
                    key={journal.id}
                    to={`/journals/view/${journal.id}`}
                    className="block card p-3 hover-bg"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-medium truncate mb-1">{journal.title}</h3>
                        <p className="text-xs text-gray-500">{journal.date}</p>
                      </div>
                      <div className="flex items-center space-x-2 ml-3">
                        <span className="text-xs px-2 py-0.5 rounded" style={{
                          backgroundColor: journal.mood === '😊 Happy' ? '#dcfce7' :
                                           journal.mood === '😌 Calm' ? '#dbeafe' :
                                           journal.mood === '😔 Sad' ? '#fef3c7' :
                                           journal.mood === '😰 Anxious' ? '#fee2e2' :
                                           '#f3f4f6',
                          color: '#000'
                        }}>
                          {journal.mood?.split(' ')[0]}
                        </span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Today's Tasks */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold">Today's Tasks</h2>
              <Link to="/tasks" className="text-xs text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100">
                View all
              </Link>
            </div>
            {todayTasks.length === 0 ? (
              <div className="card p-4 text-center">
                <p className="text-sm text-gray-500">No tasks for today</p>
              </div>
            ) : (
              <div className="space-y-2">
                {todayTasks.map(task => (
                  <div key={task.id} className="card p-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="text-sm font-medium">{task.title}</p>
                        <p className="text-xs text-gray-500 mt-1">{task.dueTime || 'No time set'}</p>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded" style={{
                        backgroundColor: task.status === 'in-progress' ? '#dbeafe' : '#f3f4f6',
                        color: '#000'
                      }}>
                        {formatStatus(task.status)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Upcoming Events */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold">Upcoming Events</h2>
              <Link to="/calendar" className="text-xs text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100">
                View all
              </Link>
            </div>
            {upcomingEvents.length === 0 ? (
              <div className="card p-4 text-center">
                <p className="text-sm text-gray-500">No upcoming events</p>
              </div>
            ) : (
              <div className="space-y-2">
                {upcomingEvents.map(event => (
                  <div key={event.id} className="card p-3">
                    <p className="text-sm font-medium">{event.title}</p>
                    <p className="text-xs text-gray-500 mt-1">{event.date} {event.time && `• ${event.time}`}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Sidebar - Widgets */}
        <div className="lg:w-64 space-y-4">
          <StreakStats />
          <StreakCalendar />
        </div>
      </div>
    </div>
  );
};

export default Dashboard;