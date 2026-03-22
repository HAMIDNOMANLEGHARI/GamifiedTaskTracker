'use client';

import { useUserStore } from '@/store/userStore';
import { useGamificationStore } from '@/store/gamificationStore';
import { useTaskStore } from '@/store/taskStore';
import { DashboardCharts } from '@/components/DashboardCharts';
import { RivalWidget } from '@/components/RivalWidget';
import { Quote, Loader2, Activity } from 'lucide-react';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { ActivityCalendar } from 'react-activity-calendar';
import { format, subDays, eachDayOfInterval, startOfToday } from 'date-fns';
import { useTheme } from 'next-themes';

export default function DashboardPage() {
  const { user } = useUserStore();
  const gamification = useGamificationStore((state) => state.data);
  const tasks = useTaskStore((state) => state.tasks);
  const { theme } = useTheme();

  const pendingTasks = tasks.filter(t => t.status === 'pending');
  
  const [activities, setActivities] = useState<{ date: string; count: number; level: 0|1|2|3|4 }[]>(() => {
    return eachDayOfInterval({ start: subDays(startOfToday(), 365), end: startOfToday() }).map(day => ({
      date: format(day, 'yyyy-MM-dd'),
      count: 0,
      level: 0 as 0|1|2|3|4
    }));
  });
  const [isLoadingActivity, setIsLoadingActivity] = useState(true);
  
  const [quote, setQuote] = useState({ text: "The secret of getting ahead is getting started.", author: "Mark Twain" });

  useEffect(() => {
    const quotes = [
      { text: "The secret of getting ahead is getting started.", author: "Mark Twain" },
      { text: "It always seems impossible until it's done.", author: "Nelson Mandela" },
      { text: "Don't watch the clock; do what it does. Keep going.", author: "Sam Levenson" },
      { text: "Quality is not an act, it is a habit.", author: "Aristotle" },
      { text: "You don't have to be great to start, but you have to start to be great.", author: "Zig Ziglar" }
    ];
    setQuote(quotes[Math.floor(Math.random() * quotes.length)]);
  }, []);

  useEffect(() => {
    if (user) {
      fetchActivity();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const fetchActivity = async () => {
    try {
      if (!user) return;
      
      const { data, error } = await supabase
        .from('tasks')
        .select('updated_at')
        .eq('status', 'completed')
        .eq('user_id', user.id);

      if (error) throw error;

      const today = startOfToday();
      const lastYear = subDays(today, 365);
      const days = eachDayOfInterval({ start: lastYear, end: today });
      
      const activityMap = new Map();
      days.forEach(day => {
        activityMap.set(format(day, 'yyyy-MM-dd'), 0);
      });

      if (data) {
        data.forEach((task: { updated_at: string | null }) => {
          if (!task.updated_at) return;
          const dateStr = format(new Date(task.updated_at), 'yyyy-MM-dd');
          if (activityMap.has(dateStr)) {
            activityMap.set(dateStr, activityMap.get(dateStr) + 1);
          }
        });
      }

      const formattedActivities = Array.from(activityMap.entries()).map(([dateStr, count]) => {
        let level: 0|1|2|3|4 = 0;
        if (count >= 7) level = 4;
        else if (count >= 5) level = 3;
        else if (count >= 3) level = 2;
        else if (count >= 1) level = 1;

        return { date: dateStr, count, level };
      });

      setActivities(formattedActivities);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingActivity(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Welcome back, {user?.name || user?.email?.split('@')[0]}! 👋</h1>
        <p className="text-zinc-500 mt-1 text-lg">Here&apos;s your progress for today.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Core Stats */}
        <div className="p-6 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm">
          <h3 className="text-sm font-medium text-zinc-500">Current Level</h3>
          <p className="text-3xl font-bold text-blue-600 mt-2">{gamification?.level || 1}</p>
          <div className="mt-4 h-2 w-full bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
            <div 
              className="h-full bg-blue-500 rounded-full" 
              style={{ width: `${(gamification?.xp || 0) % 100}%` }} 
            />
          </div>
          <p className="text-xs text-zinc-500 mt-2">{(gamification?.xp || 0) % 100} / 100 XP to next level</p>
        </div>

        <div className="p-6 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm">
          <h3 className="text-sm font-medium text-zinc-500">Day Streak</h3>
          <p className="text-3xl font-bold text-orange-500 mt-2">{gamification?.streak_count || 0} 🔥</p>
          <p className="text-xs text-zinc-500 mt-2">Keep it up! Login tomorrow for bonus XP.</p>
        </div>

        <div className="p-6 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm">
          <h3 className="text-sm font-medium text-zinc-500">Pending Tasks</h3>
          <p className="text-3xl font-bold text-emerald-500 mt-2">{pendingTasks.length}</p>
          <p className="text-xs text-zinc-500 mt-2">Finish them to earn {(pendingTasks.length) * 10} XP</p>
        </div>
      </div>

      {/* Charts & Recent Tasks & Quotes */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Quote Plate */}
        <div className="col-span-1 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 rounded-2xl p-6 shadow-sm flex flex-col justify-center items-center text-center">
          <Quote className="h-8 w-8 text-blue-500 mb-4 opacity-50" />
          <p className="text-lg font-medium text-zinc-700 dark:text-zinc-300 italic mb-4">&quot;{quote.text}&quot;</p>
          <p className="text-sm font-bold text-zinc-400">— {quote.author}</p>
        </div>

        <div className="p-6 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm col-span-1 lg:col-span-2">
          <DashboardCharts />
        </div>
      </div>

      {/* Rivalry System */}
      <RivalWidget />

      {/* Productivity Heatmap */}
      <div className="p-8 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-4">
        <h2 className="text-xl font-semibold text-zinc-800 dark:text-zinc-200 flex items-center gap-2">
          <Activity className="h-5 w-5 text-emerald-500" />
          Productivity Heatmap
        </h2>
        <p className="text-sm text-zinc-500">Your task completion history over the last 365 days.</p>
        
        <div className="pt-4 overflow-x-auto pb-4">
          {isLoadingActivity ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-zinc-300" />
            </div>
          ) : (
            <div className="min-w-[700px]">
              <ActivityCalendar 
                data={activities} 
                theme={{
                  light: ['#f4f4f5', '#d1fae5', '#34d399', '#10b981', '#059669'],
                  dark: ['#18181b', '#064e3b', '#047857', '#10b981', '#34d399']
                }}
                colorScheme={theme === 'dark' ? 'dark' : 'light'}
                labels={{
                  legend: {
                    less: 'Less',
                    more: 'More'
                  },
                  months: [
                    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
                  ],
                  totalCount: '{{count}} tasks completed in the last year'
                }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
