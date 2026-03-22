'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useUserStore } from '@/store/userStore';
import { useGamificationStore } from '@/store/gamificationStore';
import { Swords, Loader2, Zap } from 'lucide-react';
import { motion } from 'framer-motion';
import Link from 'next/link';

interface RivalData {
  id: string;
  name: string;
  username: string;
  avatar_url: string | null;
  ring: string | null;
  xp: number;
  level: number;
}

export function RivalWidget() {
  const { user } = useUserStore();
  const gamification = useGamificationStore((state) => state.data);
  const [rivals, setRivals] = useState<RivalData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchRivals();
    }
  }, [user]);

  const fetchRivals = async () => {
    try {
      if (!user) return;

      // 1. Fetch rival IDs
      const { data: rivalRelations } = await supabase
        .from('rivals')
        .select('rival_id')
        .eq('user_id', user.id);

      if (!rivalRelations || rivalRelations.length === 0) {
        setRivals([]);
        setLoading(false);
        return;
      }

      const rivalIds = rivalRelations.map((r: { rival_id: string }) => r.rival_id);

      // 2. Fetch User profiles
      const { data: usersData } = await supabase
        .from('users')
        .select('id, name, username, avatar_url, ring')
        .in('id', rivalIds);

      // 3. Fetch Gamification stats
      const { data: statsData } = await supabase
        .from('gamification')
        .select('user_id, xp, level')
        .in('user_id', rivalIds);

      if (!usersData || !statsData) return;

      // 4. Combine
      const combined = usersData.map(u => {
        const stat = statsData.find(s => s.user_id === u.id);
        return {
          ...u,
          xp: stat?.xp || 0,
          level: stat?.level || 1
        };
      });

      // Sort by XP highest first
      setRivals(combined.sort((a, b) => b.xp - a.xp));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm flex justify-center items-center">
        <Loader2 className="w-8 h-8 animate-spin text-zinc-300" />
      </div>
    );
  }

  if (rivals.length === 0) {
    return null; // Don't show the widget if they haven't declared any rivals
  }

  const myXp = gamification?.xp || 0;

  return (
    <div className="p-6 md:p-8 rounded-[2rem] bg-gradient-to-br from-zinc-900 to-black border border-zinc-800 shadow-2xl relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-red-600/10 rounded-full blur-[80px] pointer-events-none" />
      
      <div className="relative z-10">
        <div className="flex items-center gap-3 mb-8">
          <div className="p-3 bg-red-500/20 rounded-xl text-red-500">
            <Swords className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-black text-white tracking-wide uppercase">Active Rivalries</h2>
            <p className="text-sm text-zinc-400 font-medium">Head-to-head XP battles.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {rivals.map(rival => {
            const isWinning = myXp >= rival.xp;
            const xpDiff = Math.abs(myXp - rival.xp);
            
            // Calculate progress bar percentages (scale to highest XP)
            const maxVal = Math.max(myXp, rival.xp, 100);
            const myPercent = (myXp / maxVal) * 100;
            const rivalPercent = (rival.xp / maxVal) * 100;

            return (
              <motion.div 
                whileHover={{ scale: 1.02 }}
                key={rival.id} 
                className="bg-zinc-800/50 backdrop-blur-md border border-zinc-700/50 rounded-2xl p-6 relative overflow-hidden"
              >
                {/* Winner Glow */}
                {isWinning && <div className="absolute -top-10 -right-10 w-32 h-32 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />}
                {!isWinning && <div className="absolute -top-10 -left-10 w-32 h-32 bg-red-500/20 rounded-full blur-3xl pointer-events-none" />}

                <div className="flex justify-between items-end mb-6">
                  <div className="text-center w-1/3">
                    <div className="text-sm font-bold text-white mb-1 truncate">You</div>
                    <div className="text-2xl font-black text-indigo-400">{myXp}</div>
                    <div className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold">XP</div>
                  </div>
                  
                  <div className="text-center flex flex-col items-center justify-center pb-2 w-1/3">
                    <Zap className={`w-8 h-8 ${isWinning ? 'text-indigo-500' : 'text-red-500'} mb-1`} />
                    <div className="text-[10px] font-black uppercase tracking-widest text-zinc-400">
                      {isWinning ? `LEADS BY ${xpDiff}` : `TRAILS BY ${xpDiff}`}
                    </div>
                  </div>

                  <Link href={`/dashboard/u/${rival.username}`} className="text-center w-1/3 block hover:opacity-80 transition-opacity">
                    <div className="text-sm font-bold text-white mb-1 truncate">@{rival.username}</div>
                    <div className="text-2xl font-black text-red-400">{rival.xp}</div>
                    <div className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold">XP</div>
                  </Link>
                </div>

                <div className="space-y-4">
                  {/* My Bar */}
                  <div className="relative h-4 bg-zinc-900 rounded-full overflow-hidden shadow-inner flex justify-end">
                    <motion.div 
                       initial={{ width: 0 }}
                       animate={{ width: `${myPercent}%` }}
                       className="h-full bg-gradient-to-l from-indigo-500 to-blue-600 rounded-full"
                    />
                  </div>
                  
                  {/* Rival Bar */}
                  <div className="relative h-4 bg-zinc-900 rounded-full overflow-hidden shadow-inner">
                    <motion.div 
                       initial={{ width: 0 }}
                       animate={{ width: `${rivalPercent}%` }}
                       className="h-full bg-gradient-to-r from-red-500 to-rose-600 rounded-full"
                    />
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
