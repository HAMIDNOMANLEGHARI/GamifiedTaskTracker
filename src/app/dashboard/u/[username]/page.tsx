'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useParams, useRouter } from 'next/navigation';
import { useUserStore } from '@/store/userStore';
import { Task } from '@/store/taskStore';
import { SHOP_ITEMS } from '@/constants/shop';
import { Users, Loader2, Target, Trophy, Flame, CheckCircle2, Circle, Crown } from 'lucide-react';
import { SocialListModal } from '@/components/SocialListModal';

interface PublicGuild {
  community_id: string;
  role: string;
  community_xp: number;
  sub_communities: {
    id: string;
    name: string;
    avatar_emoji: string;
  };
}

interface PublicProfile {
  id: string;
  name: string;
  username: string;
  avatar_url: string | null;
  title: string | null;
  ring: string | null;
  created_at: string;
}

interface GamificationStats {
  xp: number;
  level: number;
  streak_count: number;
}

export default function PublicProfilePage() {
  const params = useParams();
  const router = useRouter();
  const { user: currentUser } = useUserStore();
  const targetUsername = params.username as string;

  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [stats, setStats] = useState<GamificationStats | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  
  const [followersList, setFollowersList] = useState<string[]>([]);
  const [followingList, setFollowingList] = useState<string[]>([]);
  const [friendsList, setFriendsList] = useState<string[]>([]);
  const [rivalsList, setRivalsList] = useState<string[]>([]);
  const [guilds, setGuilds] = useState<PublicGuild[]>([]);
  
  const [isFollowing, setIsFollowing] = useState(false);
  const [isRival, setIsRival] = useState(false);

  const [modalConfig, setModalConfig] = useState({
    isOpen: false,
    title: '',
    userIds: [] as string[]
  });
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    loadProfile();
  }, [targetUsername, currentUser?.id]);

  const loadProfile = async () => {
    try {
      // 1. Fetch Profile
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .ilike('username', targetUsername)
        .single();

      if (userError || !userData) {
        setLoading(false);
        return;
      }
      setProfile(userData as PublicProfile);

      // 2. Fetch Stats
      const { data: gamifData } = await supabase
        .from('gamification')
        .select('xp, level, streak_count')
        .eq('user_id', userData.id)
        .single();
      
      if (gamifData) setStats(gamifData as GamificationStats);

      // 3. Fetch Follow & Rival Links
      const [{ data: myFollowers }, { data: imFollowing }, { data: myRivals }] = await Promise.all([
        supabase.from('follows').select('follower_id').eq('following_id', userData.id),
        supabase.from('follows').select('following_id').eq('follower_id', userData.id),
        supabase.from('rivals').select('rival_id').eq('user_id', userData.id)
      ]);
      const followers = myFollowers?.map(f => f.follower_id) || [];
      const following = imFollowing?.map(f => f.following_id) || [];
      const friends = followers.filter(id => following.includes(id));

      setFollowersList(followers);
      setFollowingList(following);
      setFriendsList(friends);
      setRivalsList(myRivals?.map(r => r.rival_id) || []);

      // 4. Fetch their tasks
      const { data: userTasks } = await supabase
        .from('tasks')
        .select('*')
        .eq('user_id', userData.id)
        .order('created_at', { ascending: false });
        
      if (userTasks) setTasks(userTasks as Task[]);

      // 5. Fetch guilds (separate queries — FK join doesn't work)
      const { data: memberRows } = await supabase
        .from('community_members')
        .select('community_id, role, community_xp')
        .eq('user_id', userData.id);
      const memberships = memberRows || [];
      if (memberships.length > 0) {
        const { data: commData } = await supabase
          .from('sub_communities')
          .select('id, name, avatar_emoji')
          .in('id', memberships.map(m => m.community_id));
        const commMap = Object.fromEntries((commData || []).map(c => [c.id, c]));
        setGuilds(memberships
          .filter(m => commMap[m.community_id])
          .map(m => ({
            community_id: m.community_id,
            role: m.role,
            community_xp: m.community_xp,
            sub_communities: commMap[m.community_id],
          })));
      } else {
        setGuilds([]);
      }

      // 4. Check if CURRENT user is following/rival
      if (currentUser && currentUser.id !== userData.id) {
        const { data: followStatus } = await supabase
          .from('follows')
          .select('follower_id')
          .eq('follower_id', currentUser.id)
          .eq('following_id', userData.id)
          .single();
        if (followStatus) setIsFollowing(true);

        const { data: rivalStatus } = await supabase
          .from('rivals')
          .select('user_id')
          .eq('user_id', currentUser.id)
          .eq('rival_id', userData.id)
          .single();
        if (rivalStatus) setIsRival(true);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleFollow = async () => {
    if (!currentUser || !profile || actionLoading) return;
    setActionLoading(true);
    try {
      if (isFollowing) {
        await supabase.from('follows').delete().eq('follower_id', currentUser.id).eq('following_id', profile.id);
        setIsFollowing(false);
        setFollowersList(prev => prev.filter(id => id !== currentUser.id));
        setFriendsList(prev => prev.filter(id => id !== currentUser.id));
      } else {
        await supabase.from('follows').insert({ follower_id: currentUser.id, following_id: profile.id });
        setIsFollowing(true);
        setFollowersList(prev => [...prev, currentUser.id]);
        if (followingList.includes(currentUser.id)) {
          setFriendsList(prev => [...prev, currentUser.id]);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleRival = async () => {
    if (!currentUser || !profile || actionLoading) return;
    setActionLoading(true);
    try {
      if (isRival) {
        await supabase.from('rivals').delete().eq('user_id', currentUser.id).eq('rival_id', profile.id);
        setIsRival(false);
        setRivalsList(prev => prev.filter(id => id !== currentUser.id));
      } else {
        await supabase.from('rivals').insert({ user_id: currentUser.id, rival_id: profile.id });
        setIsRival(true);
        setRivalsList(prev => [...prev, currentUser.id]);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="h-[60vh] flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-zinc-400" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] text-center space-y-4">
        <Users className="w-16 h-16 text-zinc-400 opacity-50" />
        <div>
          <h2 className="text-2xl font-bold">Player Not Found</h2>
          <p className="text-zinc-500">@{targetUsername} does not exist in the database.</p>
        </div>
        <button onClick={() => router.back()} className="px-4 py-2 bg-zinc-900 text-white rounded-lg font-bold">Go Back</button>
      </div>
    );
  }

  const isMe = currentUser?.id === profile.id;
  const ringClass = SHOP_ITEMS.rings.find(r => r.id === (profile.ring || 'basic-white'))?.borderClass || 'border-zinc-200 dark:border-zinc-700';

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12">
      {/* Banner & Profile Setup */}
      <div className="bg-white dark:bg-zinc-900 rounded-[2rem] border border-zinc-200 dark:border-zinc-800 shadow-xl overflow-hidden">
        {/* Abstract Banner Layer */}
        <div className="h-48 bg-gradient-to-r from-blue-600 to-indigo-600 relative overflow-hidden flex items-center justify-center">
           <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-20 Mix-blend-overlay"></div>
        </div>

        <div className="px-8 pb-8 relative">
          <div className="flex flex-col md:flex-row gap-6 items-start md:items-end -mt-16">
            <div className={`w-32 h-32 rounded-full border-[6px] shrink-0 bg-zinc-100 dark:bg-zinc-900 shadow-2xl flex items-center justify-center text-5xl overflow-hidden ${ringClass}`}>
              {profile.avatar_url ? (
                profile.avatar_url.startsWith('http') ? (
                  <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span>{profile.avatar_url}</span>
                )
              ) : (
                <span className="font-bold text-zinc-500">{profile.name.charAt(0).toUpperCase()}</span>
              )}
            </div>
            
            <div className="flex-1 space-y-1 mt-4 md:mt-0">
              <h1 className="text-3xl font-black text-zinc-900 dark:text-white flex items-center gap-3">
                {profile.name}
              </h1>
              <p className="text-zinc-500 font-bold tracking-wide">@{profile.username}</p>
              
              <div className="flex items-center gap-4 mt-4 pt-2">
                <div 
                  onClick={() => setModalConfig({ isOpen: true, title: 'Followers', userIds: followersList })}
                  className="flex flex-col cursor-pointer group"
                >
                  <span className="text-2xl font-black leading-none group-hover:text-indigo-400 transition-colors">{followersList.length}</span>
                  <span className="text-xs uppercase font-bold text-zinc-400 group-hover:text-zinc-300">Followers</span>
                </div>
                <div className="w-px h-8 bg-zinc-200 dark:bg-zinc-800"></div>
                <div 
                  onClick={() => setModalConfig({ isOpen: true, title: 'Following', userIds: followingList })}
                  className="flex flex-col cursor-pointer group"
                >
                  <span className="text-2xl font-black leading-none group-hover:text-pink-400 transition-colors">{followingList.length}</span>
                  <span className="text-xs uppercase font-bold text-zinc-400 group-hover:text-zinc-300">Following</span>
                </div>
                <div className="w-px h-8 bg-zinc-200 dark:bg-zinc-800"></div>
                <div 
                  onClick={() => setModalConfig({ isOpen: true, title: 'Mutual Friends', userIds: friendsList })}
                  className="flex flex-col cursor-pointer group"
                >
                  <span className="text-2xl font-black leading-none group-hover:text-green-400 transition-colors">{friendsList.length}</span>
                  <span className="text-xs uppercase font-bold text-zinc-400 group-hover:text-zinc-300">Friends</span>
                </div>
                <div className="w-px h-8 bg-zinc-200 dark:bg-zinc-800"></div>
                <div 
                  onClick={() => setModalConfig({ isOpen: true, title: 'Rivals', userIds: rivalsList })}
                  className="flex flex-col cursor-pointer group"
                >
                  <span className="text-2xl font-black leading-none group-hover:text-red-400 transition-colors">{rivalsList.length}</span>
                  <span className="text-xs uppercase font-bold text-zinc-400 group-hover:text-zinc-300">Rivals</span>
                </div>
              </div>
            </div>

            {!isMe && currentUser && (
              <div className="flex flex-col gap-3 w-full md:w-auto mt-6 md:mt-0 shrink-0">
                <button
                  onClick={handleToggleFollow}
                  disabled={actionLoading}
                  className={`px-8 py-3 rounded-xl font-bold transition-all shadow-md focus:scale-95 flex items-center justify-center gap-2 ${
                    isFollowing 
                    ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white border border-zinc-200 dark:border-zinc-700 hover:bg-red-50 hover:text-red-500 hover:border-red-200 dark:hover:border-red-900/50' 
                    : 'bg-indigo-600 text-white hover:bg-indigo-700 hover:shadow-indigo-500/25'
                  }`}
                >
                  {isFollowing ? 'Following' : 'Follow Player'}
                </button>
                <button
                  onClick={handleToggleRival}
                  disabled={actionLoading}
                  className={`px-8 py-2.5 rounded-xl font-bold border-2 transition-all flex justify-center items-center gap-2 ${
                    isRival
                    ? 'bg-red-50 text-red-600 border-red-200 dark:bg-red-900/20 dark:border-red-900/50 dark:text-red-400'
                    : 'bg-transparent text-zinc-600 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700 hover:border-red-400 hover:text-red-500'
                  }`}
                >
                  <Target className="w-4 h-4" />
                  {isRival ? 'Rival Declared' : 'Declare Rival'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="col-span-1 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 rounded-2xl p-6 shadow-sm">
          <div className="text-sm font-bold text-zinc-400 uppercase tracking-widest mb-4">Current Loadout</div>
          <div className="space-y-4">
            <div>
              <p className="text-xs text-zinc-400 mb-1 font-semibold">Title Status</p>
              <div className="inline-block px-3 py-1.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 font-bold uppercase tracking-wider text-sm rounded-lg border border-indigo-100 dark:border-indigo-800/50">
                {profile.title || 'Novice'}
              </div>
            </div>
          </div>
        </div>

        <div className="col-span-2 grid grid-cols-2 gap-4">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 flex flex-col items-center justify-center text-center shadow-sm relative overflow-hidden group">
            <Trophy className="w-10 h-10 text-yellow-500 mb-2 drop-shadow-md group-hover:scale-110 transition-transform" />
            <div className="text-4xl font-black">{stats?.level || 1}</div>
            <div className="text-sm font-bold text-zinc-500 uppercase tracking-widest mt-1">Player Level</div>
            <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-yellow-400 to-orange-500" />
          </div>
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 flex flex-col items-center justify-center text-center shadow-sm relative overflow-hidden group">
            <Flame className="w-10 h-10 text-red-500 mb-2 drop-shadow-md group-hover:scale-110 transition-transform" />
            <div className="text-4xl font-black">{stats?.streak_count || 0}</div>
            <div className="text-sm font-bold text-zinc-500 uppercase tracking-widest mt-1">Day Streak</div>
            <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-red-400 to-rose-500" />
          </div>
        </div>
      </div>

      {/* Guilds Section */}
      {guilds.length > 0 && (
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm p-6 lg:p-8">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <Users className="w-6 h-6 text-indigo-500" />
            Guilds
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {guilds.map((g) => (
              <div
                key={g.community_id}
                onClick={() => router.push(`/dashboard/community/${g.community_id}`)}
                className="flex items-center gap-3 p-4 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50 hover:border-indigo-300 dark:hover:border-indigo-700 cursor-pointer transition-all"
              >
                <div className="text-2xl">{g.sub_communities.avatar_emoji}</div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm truncate">{g.sub_communities.name}</p>
                  <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider flex items-center gap-1">
                    {g.community_xp} XP {g.role === 'admin' && <Crown className="w-3 h-3 text-yellow-500" />}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Task History Section */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm p-6 lg:p-8 mt-6">
        <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
          <CheckCircle2 className="w-6 h-6 text-indigo-500" />
          Recent Activity
        </h2>

        {tasks.length === 0 ? (
          <div className="text-center p-8 border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl">
             <p className="text-zinc-500 font-medium">This player hasn&apos;t logged any tasks yet.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {tasks.map(task => (
              <div 
                key={task.id}
                className={`p-5 rounded-xl border flex items-start gap-4 transition-colors ${
                  task.status === 'completed' 
                    ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-100 dark:border-emerald-900/50' 
                    : 'bg-zinc-50 dark:bg-zinc-800/50 border-zinc-200 dark:border-zinc-800'
                }`}
              >
                <div className="mt-0.5 shrink-0">
                  {task.status === 'completed' ? (
                     <CheckCircle2 className="w-6 h-6 text-emerald-500 drop-shadow-sm" />
                  ) : (
                     <Circle className="w-6 h-6 text-zinc-400" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`font-bold text-base truncate ${task.status === 'completed' ? 'text-zinc-900 dark:text-zinc-100 line-through opacity-75' : 'text-zinc-900 dark:text-zinc-100'}`}>
                    {task.title}
                  </p>
                  <div className="flex items-center gap-3 mt-2">
                    <span className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full ${
                      task.status === 'completed' 
                        ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400' 
                        : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300'
                    }`}>
                      {task.category}
                    </span>
                    <span className="text-xs text-zinc-500 font-semibold">
                      {new Date(task.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <SocialListModal 
        isOpen={modalConfig.isOpen} 
        onClose={() => setModalConfig({ ...modalConfig, isOpen: false })}
        title={modalConfig.title} 
        userIds={modalConfig.userIds} 
      />
    </div>
  );
}
