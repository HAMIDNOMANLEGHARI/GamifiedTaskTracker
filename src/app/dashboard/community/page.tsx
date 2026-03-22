'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Trophy, Users, UserPlus, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { useUserStore } from '@/store/userStore';
import { SHOP_ITEMS } from '@/constants/shop';
import { GlobalTavern } from '@/components/GlobalTavern';

interface LeaderboardEntry {
  user_id: string;
  xp: number;
  level: number;
  users: {
    name: string;
    email: string;
    avatar_url: string | null;
    title: string | null;
    ring: string | null;
  };
}

export default function CommunityPage() {
  const { user } = useUserStore();
  const [leaders, setLeaders] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [friendEmail, setFriendEmail] = useState('');
  const [friendStatus, setFriendStatus] = useState({ message: '', error: false });

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  const fetchLeaderboard = async () => {
    try {
      const { data, error } = await supabase
        .from('gamification')
        .select(`
          user_id, xp, level,
          users!inner ( name, email, avatar_url, title, ring )
        `)
        .order('xp', { ascending: false })
        .limit(10);

      if (error) throw error;
      setLeaders(data as unknown as LeaderboardEntry[]);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddFriend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!friendEmail.trim() || !user) return;
    setFriendStatus({ message: 'Searching...', error: false });

    try {
      // Find the user by email
      const { data: friendData, error: friendError } = await supabase
        .from('users')
        .select('id')
        .eq('email', friendEmail)
        .single();

      if (friendError || !friendData) {
        throw new Error("Could not find a user with that email address.");
      }

      if (friendData.id === user.id) {
        throw new Error("You cannot add yourself as a friend!");
      }

      // Add to friendships table
      const { error: insertError } = await supabase
        .from('friendships')
        .insert({
          user_id: user.id,
          friend_id: friendData.id,
          status: 'pending'
        });

      if (insertError) {
        if (insertError.code === '23505') throw new Error("Friend request already sent.");
        throw insertError;
      }

      setFriendStatus({ message: 'Friend request sent successfully!', error: false });
      setFriendEmail('');
    } catch (err) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const error = err as any;
      setFriendStatus({ message: error.message || "Failed to add friend", error: true });
    }
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Community</h1>
        <p className="text-zinc-500">Compete on the leaderboard and tackle Co-op Quests with friends.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Global Leaderboard Section */}
        <div className="md:col-span-2 space-y-4">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-sm">
            <div className="p-6 border-b border-zinc-200 dark:border-zinc-800 flex items-center gap-3">
              <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-500 rounded-xl">
                <Trophy className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold">Global Leaderboard</h2>
                <p className="text-sm text-zinc-500">Top 10 most productive members</p>
              </div>
            </div>

            {loading ? (
              <div className="p-12 flex justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-zinc-400" />
              </div>
            ) : (
              <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {leaders.map((leader, index) => (
                  <motion.div 
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    key={leader.user_id}
                    className={`p-4 flex items-center gap-4 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors ${
                      user?.id === leader.user_id ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''
                    }`}
                  >
                    <div className="w-8 shrink-0 flex justify-center">
                      {index === 0 ? <span className="text-2xl">🥇</span> : 
                       index === 1 ? <span className="text-2xl">🥈</span> : 
                       index === 2 ? <span className="text-2xl">🥉</span> : 
                       <span className="font-bold text-zinc-400">#{index + 1}</span>}
                    </div>
                    <div className={`h-12 w-12 rounded-full overflow-hidden flex items-center justify-center text-2xl font-bold shrink-0 shadow-md border-[3px] bg-zinc-100 dark:bg-zinc-800 ${
                      SHOP_ITEMS.rings.find(r => r.id === (leader.users.ring || 'basic-white'))?.borderClass || 'border-zinc-200 dark:border-zinc-700'
                    }`}>
                      {leader.users.avatar_url ? (
                        leader.users.avatar_url.startsWith('http') ? (
                          <img src={leader.users.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                        ) : (
                          <span>{leader.users.avatar_url}</span>
                        )
                      ) : (
                        <span className="text-zinc-500 dark:text-zinc-400">{(leader.users.name || leader.users.email).substring(0, 1).toUpperCase()}</span>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-zinc-900 dark:text-zinc-100 truncate flex items-center gap-2">
                        {leader.users.name || leader.users.email.split('@')[0]}
                        {user?.id === leader.user_id && <span className="text-[10px] bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 px-2 py-0.5 rounded-full tracking-wider uppercase">You</span>}
                      </p>
                      <p className="text-xs font-bold text-zinc-500 tracking-wider">
                        LVL {leader.level} <span className="mx-1">•</span> <span className="text-indigo-500 dark:text-indigo-400 uppercase">{leader.users.title || 'NOVICE'}</span>
                      </p>
                    </div>

                    <div className="text-right shrink-0">
                      <p className="font-mono font-bold text-lg text-blue-600 dark:text-blue-400">{leader.xp} XP</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Friends & Co-op Section */}
        <div className="space-y-6">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <Users className="h-5 w-5 text-zinc-400" />
              <h2 className="font-semibold">Add Friends</h2>
            </div>
            <form onSubmit={handleAddFriend} className="space-y-3">
              <input 
                aria-label="Friend Email Address"
                type="email"
                required
                value={friendEmail}
                onChange={(e) => setFriendEmail(e.target.value)}
                placeholder="friend@example.com"
                className="w-full text-sm px-4 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium"
              />
              <button 
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm px-4 py-2 rounded-lg flex items-center justify-center gap-2 transition-colors"
              >
                <UserPlus className="h-4 w-4" /> Send Request
              </button>
            </form>
            {friendStatus.message && (
              <p className={`mt-3 text-xs font-medium text-center ${friendStatus.error ? 'text-red-500' : 'text-emerald-500'}`}>
                {friendStatus.message}
              </p>
            )}
          </div>

          <GlobalTavern />
        </div>

      </div>
    </div>
  );
}
