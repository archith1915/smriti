import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Plus, BookOpen, CheckSquare, Calendar as CalendarIcon } from 'lucide-react';
import StreakStats from '../components/StreakStats';
import StreakCalendar from '../components/StreakCalendar';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { db } from '../firebase/config';
import { format } from 'date-fns';

const Dashboard = () => {
  const [recentJournals, setRecentJournals] = useState([]);
  const [todayTasks, setTodayTasks] = useState([]);
  const [upcomingEvents, setUpcomingEvents] = useState([]);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      // Load recent journals
      const journalsRef = collection(db, 'journals');
      const journalsQuery = query(journalsRef, orderBy('createdAt', 'desc'), limit(3));
      const journalsSnapshot = await getDocs(journalsQuery);
      setRecentJournals(journalsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));

      // Load today's tasks
      const today = format(new Date(), 'yyyy-MM-dd');
      const tasksRef = collection(db, 'tasks');
      const tasksQuery = query(tasksRef, where('dueDate', '==', today), where('status', '!=', 'completed'));
      const tasksSnapshot = await getDocs(tasksQuery);
      setTodayTasks(tasksSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));

      // Load upcoming events
      const eventsRef = collection(db, 'events');
      const eventsQuery = query(eventsRef, where('date', '>=', today), orderBy('date'), limit(3));
      const eventsSnapshot = await getDocs(eventsQuery);
      setUpcomingEvents(eventsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold mb-2">Welcome back! 👋</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Here's what's happening with your journey today.
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

      {/* Streak Stats */}
      <StreakStats />

      {/* Streak Calendar */}
      <StreakCalendar />

      {/* Quick Overview Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Journals */}
        <div className="glass rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold flex items-center">
              <BookOpen className="w-5 h-5 mr-2 text-purple-500" />
              Recent Journals
            </h3>
            <Link to="/journals" className="text-sm text-purple-600 hover:text-purple-700">
              View all
            </Link>
          </div>
          {recentJournals.length === 0 ? (
            <p className="text-gray-500 text-sm">No journals yet. Start writing!</p>
          ) : (
            <div className="space-y-3">
              {recentJournals.map(journal => (
                <Link
                  key={journal.id}
                  to={`/journals/view/${journal.id}`}
                  className="block p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-all"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium truncate">{journal.title}</span>
                    <span className="text-xs">{journal.mood}</span>
                  </div>
                  <p className="text-xs text-gray-500">{journal.date}</p>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Today's Tasks */}
        <div className="glass rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold flex items-center">
              <CheckSquare className="w-5 h-5 mr-2 text-green-500" />
              Today's Tasks
            </h3>
            <Link to="/tasks" className="text-sm text-purple-600 hover:text-purple-700">
              View all
            </Link>
          </div>
          {todayTasks.length === 0 ? (
            <p className="text-gray-500 text-sm">No tasks for today! 🎉</p>
          ) : (
            <div className="space-y-3">
              {todayTasks.map(task => (
                <div
                  key={task.id}
                  className="p-3 rounded-lg bg-gray-50 dark:bg-gray-800"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="text-sm font-medium">{task.title}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {task.dueTime || 'No time set'}
                      </p>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      task.status === 'in-progress'
                        ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                        : 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                    }`}>
                      {task.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Upcoming Events */}
        <div className="glass rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold flex items-center">
              <CalendarIcon className="w-5 h-5 mr-2 text-blue-500" />
              Upcoming Events
            </h3>
            <Link to="/calendar" className="text-sm text-purple-600 hover:text-purple-700">
              View all
            </Link>
          </div>
          {upcomingEvents.length === 0 ? (
            <p className="text-gray-500 text-sm">No upcoming events.</p>
          ) : (
            <div className="space-y-3">
              {upcomingEvents.map(event => (
                <div
                  key={event.id}
                  className="p-3 rounded-lg bg-gray-50 dark:bg-gray-800"
                >
                  <p className="text-sm font-medium">{event.title}</p>
                  <p className="text-xs text-gray-500 mt-1">{event.date}</p>
                  <span className="text-xs px-2 py-1 rounded-full bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300 mt-2 inline-block">
                    {event.category}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;