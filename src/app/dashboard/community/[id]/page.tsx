'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useUserStore } from '@/store/userStore';
import { useGamificationStore } from '@/store/gamificationStore';
import { SHOP_ITEMS } from '@/constants/shop';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';
import confetti from 'canvas-confetti';
import {
  Loader2, Trophy, Users, Plus, CheckCircle2, Circle, Clock, Search,
  ArrowLeft, Crown, UserPlus, X, ShieldAlert
} from 'lucide-react';

/* ─── Types ─── */
interface Community {
  id: string;
  name: string;
  description: string | null;
  creator_id: string;
  avatar_emoji: string;
  created_at: string;
}

interface Member {
  id: string;
  user_id: string;
  role: 'admin' | 'member';
  community_xp: number;
  users: {
    name: string;
    username: string;
    avatar_url: string | null;
    ring: string | null;
    title: string | null;
  };
}

interface CommunityTask {
  id: string;
  community_id: string;
  assigned_to: string;
  assigned_by: string;
  title: string;
  description: string | null;
  xp_reward: number;
  status: 'pending' | 'pending_approval' | 'approved' | 'rejected';
  created_at: string;
  completed_at: string | null;
  reviewed_at: string | null;
}

/* ─── Page ─── */
export default function CommunityDetailPage() {
  const params = useParams();
  const router = useRouter();
  const communityId = params.id as string;
  const { user } = useUserStore();

  const [community, setCommunity] = useState<Community | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [tasks, setTasks] = useState<CommunityTask[]>([]);
  const [loading, setLoading] = useState(true);

  // Admin actions
  const [showAddMember, setShowAddMember] = useState(false);
  const [showAddTask, setShowAddTask] = useState(false);

  const myMembership = members.find(m => m.user_id === user?.id);
  // Fallback: if user is the creator of the community, they're always admin
  const isAdmin = myMembership?.role === 'admin' || (community?.creator_id === user?.id);

  useEffect(() => {
    if (communityId) loadCommunity();
  }, [communityId]);

  const loadCommunity = async () => {
    try {
      // Fetch community
      const { data: commData, error: commError } = await supabase
        .from('sub_communities')
        .select('*')
        .eq('id', communityId)
        .single();
      if (commError) throw commError;
      setCommunity(commData as Community);

      // Fetch members (without join — FK points to auth.users, not public.users)
      const { data: rawMembers } = await supabase
        .from('community_members')
        .select('id, user_id, role, community_xp')
        .eq('community_id', communityId)
        .order('community_xp', { ascending: false });
      const memberRows = rawMembers || [];

      // Auto-repair: If the current user is the creator but not in the members list, auto-add
      const currentUserId = useUserStore.getState().user?.id;
      if (currentUserId && commData.creator_id === currentUserId) {
        const creatorInList = memberRows.some((m: { user_id: string }) => m.user_id === currentUserId);
        if (!creatorInList) {
          await supabase
            .from('community_members')
            .upsert(
              { community_id: communityId, user_id: currentUserId, role: 'admin', community_xp: 0 },
              { onConflict: 'community_id,user_id' }
            );
          // Re-fetch after self-add
          const { data: retryMembers } = await supabase
            .from('community_members')
            .select('id, user_id, role, community_xp')
            .eq('community_id', communityId)
            .order('community_xp', { ascending: false });
          memberRows.length = 0;
          (retryMembers || []).forEach((m: { id: string; user_id: string; role: string; community_xp: number }) => memberRows.push(m));
        }
      }

      // Now fetch user profiles separately
      const userIds = memberRows.map((m: { user_id: string }) => m.user_id);
      let usersMap: Record<string, { name: string; username: string; avatar_url: string | null; ring: string | null; title: string | null }> = {};
      if (userIds.length > 0) {
        const { data: usersData } = await supabase
          .from('users')
          .select('id, name, username, avatar_url, ring, title')
          .in('id', userIds);
        if (usersData) {
          usersMap = Object.fromEntries(usersData.map(u => [u.id, { name: u.name, username: u.username, avatar_url: u.avatar_url, ring: u.ring, title: u.title }]));
        }
      }

      // Combine into Member[] shape
      const combinedMembers: Member[] = memberRows
        .filter((m: { user_id: string }) => usersMap[m.user_id])
        .map((m: { id: string; user_id: string; role: string; community_xp: number }) => ({
          id: m.id,
          user_id: m.user_id,
          role: m.role as 'admin' | 'member',
          community_xp: m.community_xp,
          users: usersMap[m.user_id],
        }));
      setMembers(combinedMembers);

      // Fetch tasks
      const { data: tasksData } = await supabase
        .from('community_tasks')
        .select('*')
        .eq('community_id', communityId)
        .order('created_at', { ascending: false });
      setTasks((tasksData as CommunityTask[]) || []);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load community');
    } finally {
      setLoading(false);
    }
  };

  /* ─── Task Actions ─── */
  const handleMarkDone = async (taskId: string) => {
    try {
      const { error } = await supabase
        .from('community_tasks')
        .update({ status: 'pending_approval', completed_at: new Date().toISOString() })
        .eq('id', taskId);
      if (error) throw error;
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: 'pending_approval' as const, completed_at: new Date().toISOString() } : t));
      toast.success('Submitted for approval!', { icon: '📩' });
    } catch (err) {
      console.error(err);
      toast.error('Failed to submit task');
    }
  };

  const handleApproveTask = async (task: CommunityTask) => {
    try {
      // 1. Update task status
      const { error: taskError } = await supabase
        .from('community_tasks')
        .update({ status: 'approved', reviewed_at: new Date().toISOString() })
        .eq('id', task.id);
      if (taskError) throw taskError;

      // 2. Award community XP to the member
      const { error: xpError } = await supabase
        .from('community_members')
        .update({ community_xp: (members.find(m => m.user_id === task.assigned_to)?.community_xp || 0) + task.xp_reward })
        .eq('community_id', communityId)
        .eq('user_id', task.assigned_to);
      if (xpError) throw xpError;

      // 3. Also award global XP
      const { data: globalGamif } = await supabase
        .from('gamification')
        .select('xp, level')
        .eq('user_id', task.assigned_to)
        .single();

      if (globalGamif) {
        const newGlobalXP = globalGamif.xp + task.xp_reward;
        const newLevel = Math.floor(newGlobalXP / 100) + 1;
        await supabase
          .from('gamification')
          .update({ xp: newGlobalXP, level: newLevel })
          .eq('user_id', task.assigned_to);

        // If the approved task is for the current user, update local store
        if (task.assigned_to === user?.id) {
          useGamificationStore.getState().addXP(task.xp_reward);
        }
      }

      confetti({ particleCount: 60, spread: 50, origin: { y: 0.7 } });
      toast.success(`Approved! +${task.xp_reward} XP awarded`, { icon: '✅' });

      // Refresh
      loadCommunity();
    } catch (err) {
      console.error(err);
      toast.error('Failed to approve task');
    }
  };

  const handleRejectTask = async (taskId: string) => {
    try {
      const { error } = await supabase
        .from('community_tasks')
        .update({ status: 'rejected', reviewed_at: new Date().toISOString() })
        .eq('id', taskId);
      if (error) throw error;
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: 'rejected' as const } : t));
      toast('Task rejected', { icon: '❌' });
    } catch (err) {
      console.error(err);
    }
  };

  /* ─── Admin: Promote / Remove ─── */
  const handlePromote = async (memberId: string) => {
    try {
      const { error } = await supabase
        .from('community_members')
        .update({ role: 'admin' })
        .eq('id', memberId);
      if (error) throw error;
      setMembers(prev => prev.map(m => m.id === memberId ? { ...m, role: 'admin' as const } : m));
      toast.success('Promoted to Admin!', { icon: '👑' });
    } catch (err) {
      console.error(err);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    try {
      const { error } = await supabase
        .from('community_members')
        .delete()
        .eq('id', memberId);
      if (error) throw error;
      setMembers(prev => prev.filter(m => m.id !== memberId));
      toast.success('Member removed');
    } catch (err) {
      console.error(err);
    }
  };

  /* ─── Render ─── */
  if (loading) {
    return (
      <div className="h-[60vh] flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-zinc-400" />
      </div>
    );
  }

  if (!community) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] text-center space-y-4">
        <Users className="w-16 h-16 text-zinc-400 opacity-50" />
        <h2 className="text-2xl font-bold">Group Not Found</h2>
        <button onClick={() => router.back()} className="px-4 py-2 bg-zinc-900 text-white rounded-lg font-bold">Go Back</button>
      </div>
    );
  }

  const pendingApprovalTasks = tasks.filter(t => t.status === 'pending_approval');
  const sortedMembers = [...members].sort((a, b) => b.community_xp - a.community_xp);

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-12">
      {/* Back Button */}
      <button onClick={() => router.push('/dashboard/community')} className="flex items-center gap-2 text-sm font-bold text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back to Community
      </button>

      {/* Community Header */}
      <div className="relative overflow-hidden rounded-[2rem] p-8 bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 text-white shadow-2xl">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-20 mix-blend-overlay" />
        <div className="relative z-10 flex flex-col md:flex-row items-center gap-6">
          <div className="text-7xl shrink-0">
              {community.avatar_emoji.startsWith('http') ? (
                <img src={community.avatar_emoji} alt="" className="w-20 h-20 rounded-2xl object-cover shadow-lg" />
              ) : (
                community.avatar_emoji
              )}
            </div>
          <div className="flex-1 text-center md:text-left">
            <h1 className="text-4xl font-black tracking-tight">{community.name}</h1>
            {community.description && <p className="text-white/80 mt-2 text-lg">{community.description}</p>}
            <div className="flex flex-wrap items-center gap-4 mt-4 justify-center md:justify-start">
              <span className="bg-white/20 backdrop-blur-md px-3 py-1.5 rounded-full text-sm font-bold">{members.length} Members</span>
              <span className="bg-white/20 backdrop-blur-md px-3 py-1.5 rounded-full text-sm font-bold">{tasks.filter(t => t.status === 'approved').length} Tasks Completed</span>
              {isAdmin && <span className="bg-yellow-400/30 backdrop-blur-md px-3 py-1.5 rounded-full text-sm font-bold flex items-center gap-1"><Crown className="w-3 h-3" /> Admin</span>}
            </div>
          </div>
          {isAdmin && (
            <div className="flex flex-col gap-3 shrink-0">
              <button onClick={() => setShowAddMember(true)} className="flex items-center gap-2 px-5 py-2.5 bg-white/20 hover:bg-white/30 backdrop-blur-md rounded-xl font-bold text-sm transition-all">
                <UserPlus className="w-4 h-4" /> Add Member
              </button>
              <button onClick={() => setShowAddTask(true)} className="flex items-center gap-2 px-5 py-2.5 bg-white/20 hover:bg-white/30 backdrop-blur-md rounded-xl font-bold text-sm transition-all">
                <Plus className="w-4 h-4" /> Assign Task
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ─── Leaderboard ─── */}
        <div className="lg:col-span-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm overflow-hidden">
          <div className="p-5 border-b border-zinc-200 dark:border-zinc-800 flex items-center gap-3">
            <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-500 rounded-xl">
              <Trophy className="h-5 w-5" />
            </div>
            <h2 className="font-bold text-lg">Group Leaderboard</h2>
          </div>
          <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {sortedMembers.map((member, index) => {
              const ringClass = SHOP_ITEMS.rings.find(r => r.id === (member.users.ring || 'basic-white'))?.borderClass || 'border-zinc-200';
              return (
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  key={member.id}
                  onClick={() => router.push(`/dashboard/u/${member.users.username || 'unknown'}`)}
                  className={`p-4 flex items-center gap-3 cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors ${
                    member.user_id === user?.id ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''
                  }`}
                >
                  <div className="w-7 shrink-0 flex justify-center">
                    {index === 0 ? <span className="text-lg">🥇</span> :
                     index === 1 ? <span className="text-lg">🥈</span> :
                     index === 2 ? <span className="text-lg">🥉</span> :
                     <span className="font-bold text-zinc-400 text-sm">#{index + 1}</span>}
                  </div>
                  <div className={`h-9 w-9 rounded-full overflow-hidden flex items-center justify-center shrink-0 bg-zinc-100 dark:bg-zinc-800 border-[2px] ${ringClass}`}>
                    {member.users.avatar_url ? (
                      member.users.avatar_url.startsWith('http') ? (
                        <img src={member.users.avatar_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-sm">{member.users.avatar_url}</span>
                      )
                    ) : (
                      <span className="font-bold text-xs">{member.users.name?.charAt(0).toUpperCase()}</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm truncate flex items-center gap-1.5">
                      {member.users.name}
                      {member.role === 'admin' && <Crown className="w-3 h-3 text-yellow-500" />}
                    </p>
                    <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider">{member.users.title || 'Novice'}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-mono font-bold text-sm text-indigo-600 dark:text-indigo-400">{member.community_xp}</p>
                    <p className="text-[9px] text-zinc-400 font-bold uppercase">XP</p>
                  </div>
                </motion.div>
              );
            })}
            {members.length === 0 && (
              <div className="p-8 text-center text-zinc-500 text-sm">No members yet.</div>
            )}
          </div>

          {/* Admin: Member Management */}
          {isAdmin && members.length > 0 && (
            <div className="p-4 border-t border-zinc-200 dark:border-zinc-800">
              <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-3">Admin Controls</p>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {members.filter(m => m.user_id !== user?.id).map(member => (
                  <div key={member.id} className="flex items-center justify-between text-sm">
                    <span className="font-medium truncate flex-1">{member.users.name}</span>
                    <div className="flex gap-1 shrink-0">
                      {member.role !== 'admin' && (
                        <button onClick={() => handlePromote(member.id)} title="Promote to Admin" className="p-1.5 text-yellow-500 hover:bg-yellow-50 dark:hover:bg-yellow-500/10 rounded-lg transition-colors">
                          <Crown className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button onClick={() => handleRemoveMember(member.id)} title="Remove" className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ─── Tasks Section ─── */}
        <div className="lg:col-span-2 space-y-6">
          {/* Pending Approvals (Admin) */}
          {isAdmin && pendingApprovalTasks.length > 0 && (
            <div className="bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-200 dark:border-yellow-900/30 rounded-2xl p-6 shadow-sm">
              <h3 className="font-bold text-lg flex items-center gap-2 mb-4 text-yellow-800 dark:text-yellow-400">
                <ShieldAlert className="w-5 h-5" /> Pending Approvals ({pendingApprovalTasks.length})
              </h3>
              <div className="space-y-3">
                {pendingApprovalTasks.map(task => {
                  const assignedMember = members.find(m => m.user_id === task.assigned_to);
                  return (
                    <motion.div
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      key={task.id}
                      className="bg-white dark:bg-zinc-900 rounded-xl p-4 border border-zinc-200 dark:border-zinc-700 flex items-center gap-4"
                    >
                      <Clock className="w-5 h-5 text-yellow-500 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="font-bold truncate">{task.title}</p>
                        <p className="text-xs text-zinc-500">By: {assignedMember?.users.name || 'Unknown'} • +{task.xp_reward} XP</p>
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <button onClick={() => handleApproveTask(task)} className="px-3 py-1.5 bg-emerald-500 text-white rounded-lg text-sm font-bold hover:bg-emerald-600 transition-colors">Approve</button>
                        <button onClick={() => handleRejectTask(task.id)} className="px-3 py-1.5 bg-zinc-200 dark:bg-zinc-700 rounded-lg text-sm font-bold hover:bg-zinc-300 dark:hover:bg-zinc-600 transition-colors">Reject</button>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          )}

          {/* All Tasks */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm overflow-hidden">
            <div className="p-5 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
              <h2 className="font-bold text-lg flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-indigo-500" /> Group Tasks
              </h2>
              <span className="text-sm text-zinc-500 font-medium">{tasks.length} total</span>
            </div>
            <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {tasks.map(task => {
                const assignedMember = members.find(m => m.user_id === task.assigned_to);
                const isMyTask = task.assigned_to === user?.id;
                const statusConfig = {
                  pending: { label: 'Pending', color: 'bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300' },
                  pending_approval: { label: 'Awaiting Approval', color: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400' },
                  approved: { label: 'Approved', color: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400' },
                  rejected: { label: 'Rejected', color: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400' },
                };

                return (
                  <div key={task.id} className={`p-4 flex items-center gap-4 ${task.status === 'approved' ? 'opacity-60' : ''}`}>
                    <div className="shrink-0">
                      {task.status === 'approved' ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                      ) : task.status === 'pending_approval' ? (
                        <Clock className="w-5 h-5 text-yellow-500" />
                      ) : task.status === 'rejected' ? (
                        <X className="w-5 h-5 text-red-500" />
                      ) : (
                        <Circle className="w-5 h-5 text-zinc-400" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`font-bold truncate ${task.status === 'approved' ? 'line-through text-zinc-500' : ''}`}>{task.title}</p>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span className="text-xs text-zinc-500">→ {assignedMember?.users.name || 'Unknown'}</span>
                        <span className="text-xs font-bold text-indigo-500">+{task.xp_reward} XP</span>
                        <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${statusConfig[task.status].color}`}>
                          {statusConfig[task.status].label}
                        </span>
                      </div>
                    </div>
                    {isMyTask && task.status === 'pending' && (
                      <button onClick={() => handleMarkDone(task.id)} className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 transition-colors shrink-0">
                        Mark Done
                      </button>
                    )}
                  </div>
                );
              })}
              {tasks.length === 0 && (
                <div className="p-12 text-center text-zinc-500">
                  <CheckCircle2 className="w-12 h-12 mx-auto mb-3 opacity-20" />
                  <p>No tasks yet. {isAdmin ? 'Assign some tasks to your members!' : 'The admin will assign tasks soon.'}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ─── Add Member Modal ─── */}
      <AddMemberModal
        isOpen={showAddMember}
        onClose={() => setShowAddMember(false)}
        communityId={communityId}
        existingMemberIds={members.map(m => m.user_id)}
        onAdded={loadCommunity}
      />

      {/* ─── Assign Task Modal ─── */}
      <AssignTaskModal
        isOpen={showAddTask}
        onClose={() => setShowAddTask(false)}
        communityId={communityId}
        members={members}
        assignedBy={user?.id || ''}
        onAssigned={loadCommunity}
      />
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   ADD MEMBER MODAL
   ═══════════════════════════════════════════════════ */
function AddMemberModal({ isOpen, onClose, communityId, existingMemberIds, onAdded }: {
  isOpen: boolean; onClose: () => void; communityId: string; existingMemberIds: string[]; onAdded: () => void;
}) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<{ id: string; name: string; username: string; avatar_url: string | null }[]>([]);
  const [searching, setSearching] = useState(false);
  const [adding, setAdding] = useState<string | null>(null);

  useEffect(() => {
    if (!query.trim()) { setResults([]); return; }
    const timer = setTimeout(async () => {
      setSearching(true);
      const { data } = await supabase
        .from('users')
        .select('id, name, username, avatar_url')
        .ilike('username', `%${query.trim()}%`)
        .limit(8);
      setResults((data || []).filter(u => !existingMemberIds.includes(u.id)));
      setSearching(false);
    }, 400);
    return () => clearTimeout(timer);
  }, [query, existingMemberIds]);

  const handleAdd = async (userId: string) => {
    setAdding(userId);
    try {
      const { error } = await supabase
        .from('community_members')
        .insert({ community_id: communityId, user_id: userId, role: 'member', community_xp: 0 });
      if (error) throw error;
      toast.success('Member added!', { icon: '✅' });
      setResults(prev => prev.filter(r => r.id !== userId));
      onAdded();
    } catch (err) {
      console.error(err);
      toast.error('Failed to add member');
    } finally {
      setAdding(null);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-md bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]"
          >
            <div className="flex items-center justify-between p-4 border-b border-zinc-200 dark:border-zinc-800">
              <h2 className="text-lg font-bold">Add Member</h2>
              <button onClick={onClose} className="p-2 bg-zinc-100 dark:bg-zinc-800 rounded-full hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                <input
                  type="text"
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder="Search by username..."
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
            <div className="overflow-y-auto p-4 pt-0 flex-1">
              {searching && <div className="flex justify-center py-6"><Loader2 className="w-6 h-6 animate-spin text-zinc-400" /></div>}
              {!searching && results.length === 0 && query.trim() && <p className="text-center text-sm text-zinc-500 py-6">No players found</p>}
              <div className="space-y-2">
                {results.map(u => (
                  <div key={u.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors">
                    <div className="w-9 h-9 rounded-full bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center shrink-0 overflow-hidden">
                      {u.avatar_url ? (
                        u.avatar_url.startsWith('http') ? <img src={u.avatar_url} alt="" className="w-full h-full object-cover" /> : <span className="text-sm">{u.avatar_url}</span>
                      ) : (
                        <span className="text-xs font-bold">{u.name?.charAt(0).toUpperCase()}</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold truncate">{u.name}</p>
                      <p className="text-[10px] text-zinc-500">@{u.username}</p>
                    </div>
                    <button
                      onClick={() => handleAdd(u.id)}
                      disabled={adding === u.id}
                      className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                    >
                      {adding === u.id ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Add'}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

/* ═══════════════════════════════════════════════════
   ASSIGN TASK MODAL
   ═══════════════════════════════════════════════════ */
function AssignTaskModal({ isOpen, onClose, communityId, members, assignedBy, onAssigned }: {
  isOpen: boolean; onClose: () => void; communityId: string; members: Member[]; assignedBy: string; onAssigned: () => void;
}) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [xpReward, setXpReward] = useState(10);
  const [assignTo, setAssignTo] = useState('');
  const [creating, setCreating] = useState(false);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !assignTo) return;
    setCreating(true);
    try {
      if (assignTo === '__all__') {
        // Bulk assign to every member
        const rows = members.map(m => ({
          community_id: communityId,
          assigned_to: m.user_id,
          assigned_by: assignedBy,
          title: title.trim(),
          description: description.trim() || null,
          xp_reward: xpReward,
          status: 'pending' as const,
        }));
        const { error } = await supabase.from('community_tasks').insert(rows);
        if (error) throw error;
        toast.success(`Task assigned to all ${members.length} members!`, { icon: '📋' });
      } else {
        const { error } = await supabase
          .from('community_tasks')
          .insert({
            community_id: communityId,
            assigned_to: assignTo,
            assigned_by: assignedBy,
            title: title.trim(),
            description: description.trim() || null,
            xp_reward: xpReward,
            status: 'pending',
          });
        if (error) throw error;
        toast.success('Task assigned!', { icon: '📋' });
      }
      setTitle('');
      setDescription('');
      setXpReward(10);
      setAssignTo('');
      onAssigned();
      onClose();
    } catch (err) {
      console.error(err);
      toast.error('Failed to assign task');
    } finally {
      setCreating(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-[2rem] shadow-2xl overflow-hidden"
          >
            <div className="flex items-center justify-between p-6 border-b border-zinc-200 dark:border-zinc-800">
              <h2 className="text-lg font-bold">Assign a Quest</h2>
              <button onClick={onClose} className="p-2 bg-zinc-100 dark:bg-zinc-800 rounded-full hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"><X className="w-4 h-4" /></button>
            </div>
            <form onSubmit={handleCreate} className="p-6 space-y-5">
              <div className="space-y-2">
                <label className="text-sm font-bold text-zinc-500 uppercase tracking-wider">Task Title</label>
                <input type="text" required value={title} onChange={e => setTitle(e.target.value)} maxLength={100}
                  className="w-full px-4 py-3 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 focus:outline-none focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 font-medium"
                  placeholder="e.g., Complete chapter 5 exercises" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-zinc-500 uppercase tracking-wider">Description <span className="text-zinc-400 normal-case font-normal">(optional)</span></label>
                <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} maxLength={300}
                  className="w-full px-4 py-3 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 focus:outline-none focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 font-medium resize-none"
                  placeholder="Any extra details..." />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-zinc-500 uppercase tracking-wider">Assign To</label>
                  <select required value={assignTo} onChange={e => setAssignTo(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 focus:outline-none focus:ring-4 focus:ring-indigo-500/20 font-medium text-sm">
                    <option value="">Select member</option>
                    <option value="__all__">⚡ All Members ({members.length})</option>
                    {members.map(m => (
                      <option key={m.user_id} value={m.user_id}>{m.users.name}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-zinc-500 uppercase tracking-wider">XP Reward</label>
                  <input type="number" min={5} max={500} value={xpReward} onChange={e => setXpReward(Number(e.target.value))}
                    className="w-full px-4 py-3 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 focus:outline-none focus:ring-4 focus:ring-indigo-500/20 font-medium" />
                </div>
              </div>
              <button type="submit" disabled={creating || !title.trim() || !assignTo}
                className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-8 py-4 rounded-xl font-bold shadow-lg shadow-indigo-500/30 disabled:opacity-50 transition-all">
                {creating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
                {creating ? 'Assigning...' : 'Assign Quest'}
              </button>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
