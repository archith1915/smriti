import React, { useState, useEffect } from 'react';
import { Flame, Trophy, Target } from 'lucide-react';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase/config';
import { format, parseISO, differenceInDays } from 'date-fns';

const StreakStats = () => {
  const [stats, setStats] = useState({
    currentStreak: 0,
    longestStreak: 0,
    totalJournals: 0,
    missedDays: 0,
  });

  useEffect(() => {
    calculateStats();
  }, []);

  const calculateStats = async () => {
    try {
      const journalsRef = collection(db, 'journals');
      const q = query(journalsRef, orderBy('date', 'desc'));
      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        return;
      }

      const journals = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));

      // Calculate current streak
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

      // Calculate longest streak
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

      // Calculate missed days (from first journal to today)
      const firstJournalDate = parseISO(sortedDates[sortedDates.length - 1]);
      const daysSinceFirst = differenceInDays(new Date(), firstJournalDate) + 1;
      const missedDays = daysSinceFirst - sortedDates.length;

      setStats({
        currentStreak,
        longestStreak,
        totalJournals: journals.length,
        missedDays: Math.max(0, missedDays),
      });
    } catch (error) {
      console.error('Error calculating stats:', error);
    }
  };

  const statCards = [
    {
      icon: Flame,
      label: 'Current Streak',
      value: stats.currentStreak,
      color: 'text-orange-500',
      bgColor: 'bg-orange-500/10',
    },
    {
      icon: Trophy,
      label: 'Longest Streak',
      value: stats.longestStreak,
      color: 'text-yellow-500',
      bgColor: 'bg-yellow-500/10',
    },
    {
      icon: Target,
      label: 'Total Journals',
      value: stats.totalJournals,
      color: 'text-purple-500',
      bgColor: 'bg-purple-500/10',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {statCards.map(({ icon: Icon, label, value, color, bgColor }) => (
        <div key={label} className="glass rounded-2xl p-6">
          <div className={`w-12 h-12 ${bgColor} rounded-xl flex items-center justify-center mb-4`}>
            <Icon className={`w-6 h-6 ${color}`} />
          </div>
          <div className="text-3xl font-bold mb-1">{value}</div>
          <div className="text-sm text-gray-600 dark:text-gray-400">{label}</div>
        </div>
      ))}
    </div>
  );
};

export default StreakStats;