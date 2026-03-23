'use client';

import { useState } from 'react';
import { useGamificationStore } from '@/store/gamificationStore';
import { useTaskStore } from '@/store/taskStore';
import { Trophy, Star, Shield, Flame, Target, Swords, Crown, Zap, Medal, Rocket, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CertificateGenerator } from '@/components/CertificateGenerator';
import { motion, AnimatePresence } from 'framer-motion';

// Static badge definitions matching the database
const BADGES = [
  // Tasks
  { id: 'first-task', name: 'First Task', icon: Star, criteria: 'Complete your first task', requirement: 1, type: 'tasks', rarity: 'common' },
  { id: 'novice-quester', name: 'Novice Quester', icon: Swords, criteria: 'Complete 10 tasks', requirement: 10, type: 'tasks', rarity: 'common' },
  { id: 'half-century', name: 'Half Century', icon: Medal, criteria: 'Complete 50 tasks', requirement: 50, type: 'tasks', rarity: 'rare' },
  { id: 'task-master', name: 'Task Master', icon: Target, criteria: 'Complete 100 tasks', requirement: 100, type: 'tasks', rarity: 'epic' },
  { id: 'task-grandmaster', name: 'Grandmaster', icon: Crown, criteria: 'Complete 500 tasks', requirement: 500, type: 'tasks', rarity: 'legendary' },

  // Streaks
  { id: 'warming-up', name: 'Warming Up', icon: Flame, criteria: 'Maintain a 3-day streak', requirement: 3, type: 'streak', rarity: 'common' },
  { id: 'week-warrior', name: 'Week Warrior', icon: Flame, criteria: 'Maintain a 7-day streak', requirement: 7, type: 'streak', rarity: 'rare' },
  { id: 'monthly-maestro', name: 'Monthly Maestro', icon: Clock, criteria: 'Maintain a 30-day streak', requirement: 30, type: 'streak', rarity: 'legendary' },

  // Levels
  { id: 'ascending', name: 'Ascending', icon: Rocket, criteria: 'Reach Level 3', requirement: 3, type: 'level', rarity: 'common' },
  { id: 'level-5', name: 'Level 5 Reached', icon: Shield, criteria: 'Reach Level 5', requirement: 5, type: 'level', rarity: 'rare' },
  { id: 'double-digits', name: 'Double Digits', icon: Zap, criteria: 'Reach Level 10', requirement: 10, type: 'level', rarity: 'epic' },
  { id: 'the-apex', name: 'The Apex Player', icon: Trophy, criteria: 'Reach Level 50', requirement: 50, type: 'level', rarity: 'legendary' },
];

const RARITY_STYLES = {
  common: { bg: 'bg-amber-100 dark:bg-amber-500/10', text: 'text-amber-600 dark:text-amber-500', border: 'border-amber-500/30' },
  rare: { bg: 'bg-slate-100 dark:bg-slate-400/10', text: 'text-slate-500 dark:text-slate-400', border: 'border-slate-400/30' },
  epic: { bg: 'bg-yellow-100 dark:bg-yellow-500/10', text: 'text-yellow-600 dark:text-yellow-500', border: 'border-yellow-500/30 shadow-[0_0_15px_rgba(234,179,8,0.2)]' },
  legendary: { bg: 'bg-cyan-100 dark:bg-cyan-500/10', text: 'text-cyan-600 dark:text-cyan-400', border: 'border-cyan-500/50 shadow-[0_0_20px_rgba(34,211,238,0.4)]' }
};

export default function AchievementsPage() {
  const gamification = useGamificationStore((state) => state.data);
  const tasks = useTaskStore((state) => state.tasks);
  const [showVault, setShowVault] = useState(false);

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

  const getProgressInfo = (badge: typeof BADGES[0]) => {
    let current = 0;
    if (badge.type === 'tasks') current = completedTasksCount;
    if (badge.type === 'streak') current = streak;
    if (badge.type === 'level') current = currentLevel;
    
    return {
      current: Math.min(current, badge.requirement),
      percentage: Math.min((current / badge.requirement) * 100, 100)
    };
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
              const rarityStyle = RARITY_STYLES[badge.rarity as keyof typeof RARITY_STYLES];
              const progress = getProgressInfo(badge);

              return (
                <motion.div 
                  whileHover={{ y: -5, scale: 1.02 }}
                  key={badge.id}
                  className={cn(
                    "relative p-6 rounded-2xl border flex flex-col items-center text-center transition-all duration-300",
                    unlocked 
                      ? `bg-white dark:bg-zinc-900 shadow-lg ${rarityStyle.border}`
                      : "bg-zinc-50 dark:bg-zinc-900/50 border-zinc-200 dark:border-zinc-800 opacity-70 grayscale"
                  )}
                >
                  <div className={cn(
                    "p-4 rounded-full mb-4",
                    unlocked ? `${rarityStyle.bg} ${rarityStyle.text}` : "bg-zinc-200 text-zinc-400 dark:bg-zinc-800"
                  )}>
                    <Icon className="h-8 w-8" />
                  </div>
                  <h3 className="font-bold">{badge.name}</h3>
                  <p className="text-xs text-zinc-500 mt-1 mb-4 flex-1">{badge.criteria}</p>
                  
                  {unlocked ? (
                    <div className={cn("mt-auto text-[10px] font-black uppercase tracking-widest", rarityStyle.text)}>
                      {badge.rarity}
                    </div>
                  ) : (
                    <div className="w-full mt-auto space-y-2">
                       <div className="flex justify-between text-[10px] font-medium text-zinc-500">
                         <span>Locked</span>
                         <span>{progress.current} / {badge.requirement}</span>
                       </div>
                       <div className="h-1.5 w-full bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
                         <div 
                           className="h-full bg-zinc-400 dark:bg-zinc-600 rounded-full transition-all duration-1000" 
                           style={{ width: `${progress.percentage}%` }}
                         />
                       </div>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Certificates Section */}
        <div className="md:col-span-3 pt-8 pb-12">
           <div className="flex flex-col items-center justify-center p-8 border border-zinc-200 dark:border-zinc-800 rounded-2xl bg-white dark:bg-zinc-900 shadow-sm text-center">
             <Trophy className="h-12 w-12 text-zinc-400 mb-4" />
             <h2 className="text-2xl font-bold tracking-tight mb-2">The Certificate Vault</h2>
             <p className="text-zinc-500 max-w-md mb-6">Unlock your official LevelUp productivity credentials. Prove your dedication to the world.</p>
             <button 
                onClick={() => setShowVault(!showVault)}
                className="px-6 py-3 bg-zinc-900 hover:bg-black dark:bg-white dark:hover:bg-zinc-200 dark:text-black text-white rounded-xl font-bold transition-colors flex items-center gap-2"
             >
               {showVault ? 'Close Vault' : 'Open Vault'}
             </button>
           </div>
           
           <AnimatePresence>
             {showVault && (
               <motion.div
                 initial={{ height: 0, opacity: 0 }}
                 animate={{ height: 'auto', opacity: 1 }}
                 exit={{ height: 0, opacity: 0 }}
                 className="overflow-hidden mt-6"
               >
                 <CertificateGenerator />
               </motion.div>
             )}
           </AnimatePresence>
        </div>

      </div>
    </div>
  );
}
