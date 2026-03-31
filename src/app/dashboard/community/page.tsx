'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Trophy, Loader2, Plus, Users, Crown } from 'lucide-react';
import { motion } from 'framer-motion';
import { useUserStore } from '@/store/userStore';
import { SHOP_ITEMS } from '@/constants/shop';
import { GlobalTavern } from '@/components/GlobalTavern';
import { CreateCommunityModal } from '@/components/CreateCommunityModal';
import { useRouter } from 'next/navigation';

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
    username: string;
  };
}

interface MyCommunity {
  community_id: string;
  role: string;
  community_xp: number;
  sub_communities: {
    id: string;
    name: string;
    avatar_emoji: string;
    description: string | null;
    creator_id: string;
  };
}

export default function CommunityPage() {
  const router = useRouter();
  const { user } = useUserStore();
  const [leaders, setLeaders] = useState<LeaderboardEntry[]>([]);
  const [myCommunities, setMyCommunities] = useState<MyCommunity[]>([]);
  const [communityMemberCounts, setCommunityMemberCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [communitiesLoading, setCommunitiesLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    fetchLeaderboard();
    if (user?.id) fetchMyCommunities();
  }, [user?.id]);

  const fetchLeaderboard = async () => {
    try {
      const { data, error } = await supabase
        .from('gamification')
        .select(`
          user_id, xp, level,
          users!inner ( name, email, avatar_url, title, ring, username )
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

  const fetchMyCommunities = async () => {
    setCommunitiesLoading(true);
    try {
      // Fetch membership rows (no join — FK issues with PostgREST)
      const { data: membershipData, error } = await supabase
        .from('community_members')
        .select('community_id, role, community_xp')
        .eq('user_id', user!.id);

      if (error && error.code !== '42P01') throw error;
      const memberships = membershipData || [];

      if (memberships.length === 0) {
        setMyCommunities([]);
        setCommunitiesLoading(false);
        return;
      }

      // Fetch community details separately
      const communityIds = memberships.map(m => m.community_id);
      const { data: commData } = await supabase
        .from('sub_communities')
        .select('id, name, avatar_emoji, description, creator_id')
        .in('id', communityIds);

      const commMap = Object.fromEntries((commData || []).map(c => [c.id, c]));

      // Combine
      const communities: MyCommunity[] = memberships
        .filter(m => commMap[m.community_id])
        .map(m => ({
          community_id: m.community_id,
          role: m.role,
          community_xp: m.community_xp,
          sub_communities: commMap[m.community_id],
        }));
      setMyCommunities(communities);

      // Fetch member counts for each community
      const counts: Record<string, number> = {};
      for (const cid of communityIds) {
        const { count } = await supabase
          .from('community_members')
          .select('*', { count: 'exact', head: true })
          .eq('community_id', cid);
        counts[cid] = count || 0;
      }
      setCommunityMemberCounts(counts);
    } catch (err) {
      console.error(err);
    } finally {
      setCommunitiesLoading(false);
    }
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Community</h1>
          <p className="text-zinc-500">Compete on the leaderboard, join groups, and tackle Co-op Quests with friends.</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-bold shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 transition-all hover:scale-105"
        >
          <Plus className="w-4 h-4" /> Create Group
        </button>
      </div>

      {/* Your Guilds */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold tracking-tight flex items-center gap-2">
          <Users className="w-5 h-5 text-indigo-500" /> Your Groups
        </h2>
        {communitiesLoading ? (
          <div className="flex justify-center p-8">
            <Loader2 className="w-6 h-6 animate-spin text-zinc-400" />
          </div>
        ) : myCommunities.length === 0 ? (
          <div className="p-8 text-center border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl">
            <Users className="w-12 h-12 text-zinc-400 mx-auto mb-3 opacity-30" />
            <p className="text-zinc-500 font-medium">You haven&apos;t joined any groups yet.</p>
            <p className="text-zinc-400 text-sm mt-1">Create one or get invited by a friend!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {myCommunities.map((mc) => (
              <motion.div
                whileHover={{ scale: 1.03, y: -3 }}
                key={mc.community_id}
                onClick={() => router.push(`/dashboard/community/${mc.community_id}`)}
                className="cursor-pointer p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm hover:shadow-lg transition-all"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="text-3xl shrink-0">
                    {mc.sub_communities.avatar_emoji.startsWith('http') ? (
                      <img src={mc.sub_communities.avatar_emoji} alt="" className="w-10 h-10 rounded-lg object-cover" />
                    ) : (
                      mc.sub_communities.avatar_emoji
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold truncate">{mc.sub_communities.name}</h3>
                    <p className="text-xs text-zinc-500 flex items-center gap-1">
                      {communityMemberCounts[mc.community_id] || '?'} members
                      {mc.role === 'admin' && <Crown className="w-3 h-3 text-yellow-500 ml-1" />}
                    </p>
                  </div>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-zinc-400 font-medium">Your XP</span>
                  <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">{mc.community_xp}</span>
                </div>
              </motion.div>
            ))}
          </div>
        )}
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
                    onClick={() => router.push(`/dashboard/u/${leader.users.username || 'unknown'}`)}
                    className={`p-4 flex items-center gap-4 cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors ${
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

        {/* Co-op Section */}
        <div className="space-y-6">
          <GlobalTavern />
        </div>

      </div>

      <CreateCommunityModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreated={fetchMyCommunities}
      />
    </div>
  );
}
