import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, parseISO } from 'date-fns';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase/config';

const StreakCalendar = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [journalDates, setJournalDates] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadJournalData();
  }, [currentDate]);

  const loadJournalData = async () => {
    try {
      setLoading(true);
      const start = format(startOfMonth(currentDate), 'yyyy-MM-dd');
      const end = format(endOfMonth(currentDate), 'yyyy-MM-dd');

      const journalsRef = collection(db, 'journals');
      const q = query(journalsRef, where('date', '>=', start), where('date', '<=', end));
      const snapshot = await getDocs(q);

      const dates = {};
      snapshot.forEach(doc => {
        const data = doc.data();
        const journalDate = parseISO(data.date);
        const createdDate = data.createdAt?.toDate() || journalDate;
        
        // Check if written on time (same day) or delayed
        const isOnTime = format(journalDate, 'yyyy-MM-dd') === format(createdDate, 'yyyy-MM-dd');
        dates[data.date] = isOnTime ? 'on-time' : 'delayed';
      });

      setJournalDates(dates);
    } catch (error) {
      console.error('Error loading journal data:', error);
    } finally {
      setLoading(false);
    }
  };

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const firstDayOfWeek = monthStart.getDay();
  const emptyDays = Array(firstDayOfWeek).fill(null);

  const previousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
  };

  const getDateStatus = (date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const today = format(new Date(), 'yyyy-MM-dd');
    
    if (dateStr > today) return null; // Future dates
    if (journalDates[dateStr]) return journalDates[dateStr];
    return 'missed';
  };

  const getDateColor = (status) => {
    switch (status) {
      case 'on-time':
        return 'bg-green-500';
      case 'delayed':
        return 'bg-yellow-500';
      case 'missed':
        return 'bg-red-500';
      default:
        return 'bg-gray-300 dark:bg-gray-700';
    }
  };

  return (
    <div className="glass rounded-2xl p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold">Journal Streak Calendar</h3>
        <div className="flex items-center space-x-4">
          <button
            onClick={previousMonth}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-all"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <span className="font-medium min-w-[120px] text-center">
            {format(currentDate, 'MMMM yyyy')}
          </span>
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
          <div key={day} className="text-center text-xs font-medium text-gray-500 dark:text-gray-400">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-2">
        {emptyDays.map((_, idx) => (
          <div key={`empty-${idx}`} />
        ))}
        {daysInMonth.map(date => {
          const status = getDateStatus(date);
          const isCurrentDay = isToday(date);

          return (
            <div
              key={date.toString()}
              className={`aspect-square flex items-center justify-center rounded-lg text-sm relative ${
                isCurrentDay ? 'ring-2 ring-purple-500' : ''
              }`}
            >
              <div
                className={`w-full h-full flex items-center justify-center rounded-lg ${getDateColor(status)}`}
              >
                <span className={status ? 'text-white font-medium' : 'text-gray-600 dark:text-gray-400'}>
                  {format(date, 'd')}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center justify-center gap-4 mt-6 text-xs">
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 rounded bg-green-500" />
          <span>On Time</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 rounded bg-yellow-500" />
          <span>Delayed</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 rounded bg-red-500" />
          <span>Missed</span>
        </div>
      </div>
    </div>
  );
};

export default StreakCalendar;