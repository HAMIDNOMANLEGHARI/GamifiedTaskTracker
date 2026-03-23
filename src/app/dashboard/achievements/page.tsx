'use client';

import { useGamificationStore } from '@/store/gamificationStore';
import { useTaskStore } from '@/store/taskStore';
import { Trophy, Star, Shield, Flame, Target } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CertificateGenerator } from '@/components/CertificateGenerator';

// Static badge definitions matching the database
const BADGES = [
  { id: 'first-task', name: 'First Task', icon: Star, criteria: 'Complete your very first task!', requirement: 1, type: 'tasks' },
  { id: 'week-warrior', name: 'Week Warrior', icon: Flame, criteria: 'Maintain a 7-day streak', requirement: 7, type: 'streak' },
  { id: 'level-5', name: 'Level 5 Reached', icon: Shield, criteria: 'Reach Level 5', requirement: 5, type: 'level' },
  { id: 'task-master', name: 'Task Master', icon: Target, criteria: 'Complete 100 tasks', requirement: 100, type: 'tasks' },
];

export default function AchievementsPage() {
  const gamification = useGamificationStore((state) => state.data);
  const tasks = useTaskStore((state) => state.tasks);

  const completedTasksCount = tasks.filter(t => t.status === 'completed').length;
  const currentLevel = gamification?.level || 1;
  const streak = gamification?.streak_count || 0;

  // Simple client-side unocking logic
  const isUnlocked = (badge: typeof BADGES[0]) => {
    if (badge.type === 'tasks') return completedTasksCount >= badge.requirement;
    if (badge.type === 'streak') return streak >= badge.requirement;
    if (badge.type === 'level') return currentLevel >= badge.requirement;
    return false;
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Achievements</h1>
        <p className="text-zinc-500">Your earned badges, certificates, and level progression.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Summary Card */}
        <div className="px-6 py-8 rounded-2xl bg-gradient-to-br from-indigo-900 to-violet-900 text-white shadow-xl md:col-span-3 flex flex-col md:flex-row items-center gap-8 border border-white/10">
          <div className="h-32 w-32 shrink-0 rounded-full border-4 border-white/20 bg-white/10 flex items-center justify-center text-5xl font-bold shadow-inner relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/30" />
            <span className="relative z-10">{gamification?.level || 1}</span>
          </div>
          <div className="flex-1 w-full space-y-4">
            <div>
              <h2 className="text-2xl font-bold">Level {gamification?.level || 1} Achiever</h2>
              <p className="text-violet-200">You are doing a fantastic job.</p>
            </div>
            
            <div className="space-y-1 w-full max-w-lg">
              <div className="flex justify-between text-sm font-medium text-violet-200">
                <span>XP Progress</span>
                <span>{(gamification?.xp || 0) % 100} / 100 XP</span>
              </div>
              <div className="h-3 w-full bg-black/40 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-violet-400 to-fuchsia-400 rounded-full" 
                  style={{ width: `${((gamification?.xp || 0) % 100)}%` }} 
                />
              </div>
            </div>
          </div>
          <div className="w-full md:w-auto shrink-0 text-center bg-black/20 p-4 rounded-xl backdrop-blur-sm border border-white/10">
            <Trophy className="h-10 w-10 text-yellow-500 mx-auto mb-2" />
            <p className="text-sm font-medium text-violet-200">Badges Earned</p>
            <p className="text-2xl font-bold">{BADGES.filter(isUnlocked).length}</p>
          </div>
        </div>

        {/* Badges Grid */}
        <div className="md:col-span-3">
          <h2 className="text-xl font-bold tracking-tight mb-4">Badges Collection</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {BADGES.map(badge => {
              const unlocked = isUnlocked(badge);
              const Icon = badge.icon;
              return (
                <div 
                  key={badge.id}
                  className={cn(
                    "relative p-6 rounded-2xl border flex flex-col items-center text-center transition-all",
                    unlocked 
                      ? "bg-white dark:bg-zinc-900 border-yellow-500/30 dark:border-yellow-500/20 shadow-sm"
                      : "bg-zinc-50 dark:bg-zinc-900/50 border-zinc-200 dark:border-zinc-800 opacity-60 grayscale"
                  )}
                >
                  <div className={cn(
                    "p-4 rounded-full mb-4",
                    unlocked ? "bg-yellow-100 text-yellow-600 dark:bg-yellow-500/10 dark:text-yellow-500" : "bg-zinc-200 text-zinc-400 dark:bg-zinc-800"
                  )}>
                    <Icon className="h-8 w-8" />
                  </div>
                  <h3 className="font-bold">{badge.name}</h3>
                  <p className="text-xs text-zinc-500 mt-1 flex-1">{badge.criteria}</p>
                  
                  {!unlocked && (
                    <div className="mt-4 text-[10px] font-medium uppercase tracking-wider text-zinc-400 bg-zinc-200/50 dark:bg-zinc-800 px-2 py-1 rounded">
                      Locked
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Certificates Section */}
        <div className="md:col-span-3 pt-8 pb-12">
          <CertificateGenerator />
        </div>

      </div>
    </div>
  );
}
