import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isToday, parseISO } from 'date-fns';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from '../context/AuthContext';

const StreakCalendar = () => {
  const { currentUser } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [journalDates, setJournalDates] = useState({});

  useEffect(() => {
    if (currentUser) {
      loadJournalData();
    }
  }, [currentDate, currentUser]);

  const loadJournalData = async () => {
    try {
      const start = format(startOfMonth(currentDate), 'yyyy-MM-dd');
      const end = format(endOfMonth(currentDate), 'yyyy-MM-dd');

      const journalsRef = collection(db, 'journals');
      const q = query(
        journalsRef,
        where('userId', '==', currentUser.uid),
        where('date', '>=', start),
        where('date', '<=', end)
      );
      const snapshot = await getDocs(q);

      const dates = {};
      snapshot.forEach(doc => {
        const data = doc.data();
        const journalDate = parseISO(data.date);
        const createdDate = data.createdAt?.toDate() || journalDate;
        
        const isOnTime = format(journalDate, 'yyyy-MM-dd') === format(createdDate, 'yyyy-MM-dd');
        dates[data.date] = isOnTime ? 'on-time' : 'delayed';
      });

      setJournalDates(dates);
    } catch (error) {
      console.error('Error loading journal data:', error);
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
    
    if (dateStr > today) return null;
    if (journalDates[dateStr]) return journalDates[dateStr];
    return 'missed';
  };

  // const getDateColor = (status) => {
  //   switch (status) {
  //     case 'on-time':
  //       return 'bg-green-500';
  //     case 'delayed':
  //       return 'bg-yellow-500';
  //     case 'missed':
  //       return 'bg-red-500';
  //     default:
  //       return 'bg-gray-200 dark:bg-gray-700';
  //   }
  // };


  const getDateColor = (status) => {
  switch (status) {
    case 'on-time':
      return 'bg-green-100 text-green-800 dark:bg-green-500/30 dark:text-green-300';

    case 'delayed':
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-500/30 dark:text-yellow-300';

    case 'missed':
      return 'bg-red-100 text-red-800 dark:bg-red-700/30 dark:text-red-300';

    default:
      return 'bg-[#f3f3f1] text-gray-700 dark:bg-[#1f1f1f] dark:text-gray-300';
  }
};

//Colors with borders


// const getDateColor = (status) => {
//   switch (status) {
//     case 'on-time':
//       return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 border border-green-600';

//     case 'delayed':
//       return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300 border dark:border-yellow-600';

//     case 'missed':
//       return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 border border-red-900';

//     default:
//       return 'bg-[#f3f3f1] text-gray-700 dark:bg-[#1f1f1f] dark:text-gray-300';
//   }
// };


  return (
    <div className="bg-white dark:bg-[#191919] border border-gray-300 dark:border-gray-800 rounded p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold">Journal Calendar</h3>
        <div className="flex items-center space-x-2">
          <button
            onClick={previousMonth}
            className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-xs font-medium min-w-[100px] text-center">
            {format(currentDate, 'MMM yyyy')}
          </span>
          <button
            onClick={nextMonth}
            className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 gap-1 mb-1">
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, idx) => (
          <div key={idx} className="text-center text-[10px] font-medium text-gray-500 dark:text-gray-400 py-1">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1">
        {emptyDays.map((_, idx) => (
          <div key={`empty-${idx}`} />
        ))}
        {daysInMonth.map(date => {
          const status = getDateStatus(date);
          const isCurrentDay = isToday(date);

          return (
            <div
              key={date.toString()}
              className={`aspect-square flex items-center justify-center rounded text-[11px] relative ${
                isCurrentDay ? 'ring-1 ring-gray-400 dark:ring-gray-500' : ''
              }`}
            >
              <div
                className={`w-full h-full flex items-center justify-center rounded ${getDateColor(status)}`}
              >
                <span className={status ? 'font-medium' : 'text-gray-600 dark:text-gray-400'}>
                  {format(date, 'd')}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-3 mt-4 text-[10px]">
        <div className="flex items-center space-x-1">
          <div className="w-2 h-2 rounded-full bg-green-500" />
          <span className="text-gray-600 dark:text-gray-400">On Time</span>
        </div>
        <div className="flex items-center space-x-1">
          <div className="w-2 h-2 rounded-full bg-yellow-500" />
          <span className="text-gray-600 dark:text-gray-400">Delayed</span>
        </div>
        <div className="flex items-center space-x-1">
          <div className="w-2 h-2 rounded-full bg-red-500" />
          <span className="text-gray-600 dark:text-gray-400">Missed</span>
        </div>
      </div>
    </div>
  );
};

export default StreakCalendar;
