import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, orderBy, where } from 'firebase/firestore';
import { db } from '../firebase/config';
import { format, parseISO, differenceInDays } from 'date-fns';
import { useAuth } from '../context/AuthContext';

const StreakStats = () => {
  const { currentUser } = useAuth();
  const [stats, setStats] = useState({
    currentStreak: 0,
    longestStreak: 0,
    totalJournals: 0,
  });

  useEffect(() => {
    if (currentUser) {
      calculateStats();
    }
  }, [currentUser]);

  const calculateStats = async () => {
    try {
      const journalsRef = collection(db, 'journals');
      const q = query(
        journalsRef, 
        where('userId', '==', currentUser.uid),
        orderBy('date', 'desc')
      );
      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        return;
      }

      const journals = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));

      let currentStreak = 0;
      const today = format(new Date(), 'yyyy-MM-dd');
      const sortedDates = [...new Set(journals.map(j => j.date))].sort().reverse();

      if (sortedDates[0] === today || sortedDates[0] === format(new Date(Date.now() - 86400000), 'yyyy-MM-dd')) {
        let checkDate = new Date();
        for (let i = 0; i < sortedDates.length; i++) {
          const expectedDate = format(checkDate, 'yyyy-MM-dd');
          if (sortedDates[i] === expectedDate) {
            currentStreak++;
            checkDate = new Date(checkDate.getTime() - 86400000);
          } else {
            break;
          }
        }
      }

      let longestStreak = 0;
      let tempStreak = 1;
      for (let i = 0; i < sortedDates.length - 1; i++) {
        const diff = differenceInDays(parseISO(sortedDates[i]), parseISO(sortedDates[i + 1]));
        if (diff === 1) {
          tempStreak++;
          longestStreak = Math.max(longestStreak, tempStreak);
        } else {
          tempStreak = 1;
        }
      }
      longestStreak = Math.max(longestStreak, tempStreak, currentStreak);

      setStats({
        currentStreak,
        longestStreak,
        totalJournals: journals.length,
      });
    } catch (error) {
      console.error('Error calculating stats:', error);
    }
  };

  const statCards = [
    {
      label: 'Current Streak',
      value: stats.currentStreak,
      color: 'text-orange-600 dark:text-orange-400',
    },
    {
      label: 'Longest Streak',
      value: stats.longestStreak,
      color: 'text-blue-600 dark:text-blue-400',
    },
    {
      label: 'Total Journals',
      value: stats.totalJournals,
      color: 'text-purple-600 dark:text-purple-400',
    },
  ];

  return (
    <div className="space-y-2">
      {statCards.map(({ label, value, color }) => (
        <div key={label} className="bg-white dark:bg-[#191919] border border-gray-300 dark:border-gray-800 rounded p-3">
          <div className={`text-2xl font-semibold mb-0.5 ${color}`}>{value}</div>
          <div className="text-xs text-gray-600 dark:text-gray-400">{label}</div>
        </div>
      ))}
    </div>
  );
};

export default StreakStats;
