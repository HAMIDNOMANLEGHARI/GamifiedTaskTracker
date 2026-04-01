'use client';
import { useState, useRef, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Loader2, Upload, ImageIcon, Save, Link2, Copy, Check, Megaphone, RefreshCw, ArrowRightLeft, Trash2, LogOut } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useRouter } from 'next/navigation';

interface Community {
  id: string;
  name: string;
  description: string | null;
  creator_id: string;
  avatar_emoji: string;
  pinned_announcement: string | null;
  invite_code: string | null;
}

interface Member {
  id: string;
  user_id: string;
  role: 'admin' | 'member';
  users: { name: string };
}

interface GroupSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  community: Community;
  members: Member[];
  currentUserId: string;
  onUpdated: () => void;
}

const EMOJI_OPTIONS = ['⚔️', '🏰', '🐉', '🔥', '⭐', '🎯', '🚀', '💎', '🎮', '👑', '🦁', '🌊', '⚡', '🏆', '🎪', '🗡️'];

function generateInviteCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let code = '';
  for (let i = 0; i < 8; i++) code += chars.charAt(Math.floor(Math.random() * chars.length));
  return code;
}

export function GroupSettingsModal({ isOpen, onClose, community, members, currentUserId, onUpdated }: GroupSettingsModalProps) {
  const router = useRouter();
  const [name, setName] = useState(community.name);
  const [description, setDescription] = useState(community.description || '');
  const [avatarEmoji, setAvatarEmoji] = useState(community.avatar_emoji);
  const [useCustomImage, setUseCustomImage] = useState(community.avatar_emoji.startsWith('http'));
  const [customImageUrl, setCustomImageUrl] = useState<string | null>(community.avatar_emoji.startsWith('http') ? community.avatar_emoji : null);
  const [announcement, setAnnouncement] = useState(community.pinned_announcement || '');
  const [inviteCode, setInviteCode] = useState(community.invite_code || '');
  const [transferTo, setTransferTo] = useState('');
  const [copied, setCopied] = useState(false);

  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [activeTab, setActiveTab] = useState<'general' | 'announce' | 'invite' | 'danger'>('general');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isCreator = community.creator_id === currentUserId;

  useEffect(() => {
    setName(community.name);
    setDescription(community.description || '');
    setAvatarEmoji(community.avatar_emoji);
    setUseCustomImage(community.avatar_emoji.startsWith('http'));
    setCustomImageUrl(community.avatar_emoji.startsWith('http') ? community.avatar_emoji : null);
    setAnnouncement(community.pinned_announcement || '');
    setInviteCode(community.invite_code || '');
  }, [community]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setIsUploading(true);
      if (!e.target.files || e.target.files.length === 0) return;
      const file = e.target.files[0];
      if (file.size > 2 * 1024 * 1024) { toast.error('Image must be under 2MB'); return; }

      const fileExt = file.name.split('.').pop();
      const fileName = `community_${community.id}_${Date.now()}.${fileExt}`;
      const filePath = `community/${fileName}`;

      const { error: uploadError } = await supabase.storage.from('materials').upload(filePath, file);
      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage.from('materials').getPublicUrl(filePath);
      setCustomImageUrl(publicUrlData.publicUrl);
      setUseCustomImage(true);
      toast.success('Image uploaded!', { icon: '📸' });
    } catch (error: unknown) {
      console.error(error);
      toast.error('Upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSaveGeneral = async () => {
    if (!name.trim()) return;
    setIsSaving(true);
    try {
      const avatarValue = useCustomImage && customImageUrl ? customImageUrl : avatarEmoji;
      const { error } = await supabase
        .from('sub_communities')
        .update({ name: name.trim(), description: description.trim() || null, avatar_emoji: avatarValue })
        .eq('id', community.id);
      if (error) throw error;
      toast.success('Group updated!', { icon: '✅' });
      onUpdated();
    } catch (err) {
      console.error(err);
      toast.error('Failed to save');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveAnnouncement = async () => {
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('sub_communities')
        .update({ pinned_announcement: announcement.trim() || null })
        .eq('id', community.id);
      if (error) throw error;
      toast.success(announcement.trim() ? 'Announcement pinned!' : 'Announcement removed!', { icon: '📌' });
      onUpdated();
    } catch (err) {
      console.error(err);
      toast.error('Failed to save announcement');
    } finally {
      setIsSaving(false);
    }
  };

  const handleGenerateInvite = async () => {
    const code = generateInviteCode();
    try {
      const { error } = await supabase
        .from('sub_communities')
        .update({ invite_code: code })
        .eq('id', community.id);
      if (error) throw error;
      setInviteCode(code);
      toast.success('Invite code generated!', { icon: '🔗' });
      onUpdated();
    } catch (err) {
      console.error(err);
      toast.error('Failed to generate code');
    }
  };

  const handleCopyLink = () => {
    const baseUrl = window.location.origin;
    const link = `${baseUrl}/dashboard/community/join/${inviteCode}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    toast.success('Invite link copied!');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleTransferOwnership = async () => {
    if (!transferTo) return;
    if (!confirm('Are you sure you want to transfer ownership? You will lose owner privileges.')) return;
    setIsSaving(true);
    try {
      // Make the target an admin first if not already
      const targetMember = members.find(m => m.user_id === transferTo);
      if (targetMember && targetMember.role !== 'admin') {
        await supabase.from('community_members').update({ role: 'admin' }).eq('id', targetMember.id);
      }
      // Transfer ownership
      const { error } = await supabase
        .from('sub_communities')
        .update({ creator_id: transferTo })
        .eq('id', community.id);
      if (error) throw error;
      toast.success('Ownership transferred!', { icon: '👑' });
      onUpdated();
      onClose();
    } catch (err) {
      console.error(err);
      toast.error('Failed to transfer ownership. You may need to update RLS policies.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteGroup = async () => {
    if (!confirm(`Are you sure you want to permanently delete "${community.name}"? All members, tasks, and messages will be lost. This cannot be undone.`)) return;
    setIsSaving(true);
    try {
      // Delete in order: tasks, messages, join requests, members, then the community
      await supabase.from('community_tasks').delete().eq('community_id', community.id);
      await supabase.from('community_messages').delete().eq('community_id', community.id);
      await supabase.from('community_join_requests').delete().eq('community_id', community.id);
      await supabase.from('community_members').delete().eq('community_id', community.id);
      const { error } = await supabase.from('sub_communities').delete().eq('id', community.id);
      if (error) throw error;
      toast.success('Group deleted', { icon: '🗑️' });
      onClose();
      router.push('/dashboard/community');
    } catch (err) {
      console.error(err);
      toast.error('Failed to delete group');
    } finally {
      setIsSaving(false);
    }
  };

  const handleLeaveGroup = async () => {
    if (isCreator) {
      toast.error('You are the owner. Transfer ownership before leaving.');
      return;
    }
    if (!confirm('Are you sure you want to leave this group?')) return;
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('community_members')
        .delete()
        .eq('community_id', community.id)
        .eq('user_id', currentUserId);
      if (error) throw error;
      toast.success('You left the group', { icon: '👋' });
      onClose();
      router.push('/dashboard/community');
    } catch (err) {
      console.error(err);
      toast.error('Failed to leave group');
    } finally {
      setIsSaving(false);
    }
  };

  // All members except current user (for transfer)
  const otherMembers = members.filter(m => m.user_id !== currentUserId);

  const tabs = [
    { id: 'general' as const, label: 'General', icon: '⚙️' },
    { id: 'announce' as const, label: 'Announce', icon: '📢' },
    { id: 'invite' as const, label: 'Invite', icon: '🔗' },
    { id: 'danger' as const, label: 'Danger Zone', icon: '⚠️' },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-[2rem] shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-zinc-200 dark:border-zinc-800">
              <h2 className="text-lg font-black tracking-tight">Group Settings</h2>
              <button onClick={onClose} className="p-2 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-full transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex gap-1.5 p-3 border-b border-zinc-200 dark:border-zinc-800 overflow-x-auto">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                    activeTab === tab.id
                      ? tab.id === 'danger' ? 'bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400' : 'bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400'
                      : 'text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                  }`}
                >
                  <span>{tab.icon}</span> {tab.label}
                </button>
              ))}
            </div>

            {/* Content */}
            <div className="overflow-y-auto flex-1 p-6">
              {/* ─── General Tab ─── */}
              {activeTab === 'general' && (
                <div className="space-y-5">
                  <div className="space-y-3">
                    <label className="text-sm font-bold text-zinc-500 uppercase tracking-wider">Group Photo</label>
                    <div className="flex gap-2 mb-3">
                      <button type="button" onClick={() => setUseCustomImage(false)}
                        className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all ${!useCustomImage ? 'bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 border-2 border-indigo-400' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 border-2 border-transparent'}`}>
                        🎨 Emoji
                      </button>
                      <button type="button" onClick={() => setUseCustomImage(true)}
                        className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${useCustomImage ? 'bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 border-2 border-indigo-400' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 border-2 border-transparent'}`}>
                        <ImageIcon className="w-3 h-3" /> Custom
                      </button>
                    </div>
                    {!useCustomImage ? (
                      <div className="flex flex-wrap gap-2">
                        {EMOJI_OPTIONS.map((e) => (
                          <button key={e} type="button" onClick={() => setAvatarEmoji(e)}
                            className={`w-10 h-10 text-xl rounded-xl border-2 flex items-center justify-center transition-all hover:scale-110 ${avatarEmoji === e && !useCustomImage ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-500/10' : 'border-zinc-200 dark:border-zinc-700'}`}>
                            {e}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {customImageUrl ? (
                          <div className="relative group flex justify-center">
                            <img src={customImageUrl} alt="Group" className="w-20 h-20 rounded-2xl object-cover border-2 border-indigo-500 shadow-lg" />
                            <button type="button" onClick={() => fileInputRef.current?.click()} className="absolute -bottom-2 right-1/2 translate-x-1/2 p-1.5 bg-indigo-600 text-white rounded-full text-xs shadow-lg">
                              <Upload className="w-3 h-3" />
                            </button>
                          </div>
                        ) : (
                          <button type="button" onClick={() => fileInputRef.current?.click()} disabled={isUploading}
                            className="w-full py-6 border-2 border-dashed border-zinc-300 dark:border-zinc-700 rounded-2xl flex flex-col items-center gap-2 text-zinc-500 hover:border-indigo-400 hover:text-indigo-500 transition-all cursor-pointer">
                            {isUploading ? <Loader2 className="w-6 h-6 animate-spin" /> : <><Upload className="w-6 h-6" /><span className="text-xs font-bold">Upload image (max 2MB)</span></>}
                          </button>
                        )}
                        <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-bold text-zinc-500 uppercase tracking-wider">Group Name</label>
                    <input type="text" value={name} onChange={e => setName(e.target.value)} maxLength={40}
                      className="w-full px-4 py-3 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 focus:outline-none focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 font-medium text-sm" />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-bold text-zinc-500 uppercase tracking-wider">Description</label>
                    <textarea value={description} onChange={e => setDescription(e.target.value)} maxLength={200} rows={3}
                      className="w-full px-4 py-3 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 focus:outline-none focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 font-medium text-sm resize-none" />
                  </div>

                  <button onClick={handleSaveGeneral} disabled={isSaving || !name.trim()}
                    className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-3 rounded-xl font-bold shadow-lg shadow-indigo-500/25 disabled:opacity-50 transition-all">
                    {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    Save Changes
                  </button>
                </div>
              )}

              {/* ─── Announcement Tab ─── */}
              {activeTab === 'announce' && (
                <div className="space-y-5">
                  <div className="flex items-center gap-3 text-zinc-500 mb-1">
                    <Megaphone className="w-5 h-5 text-orange-500" />
                    <p className="text-sm">Pin an announcement visible at the top of your group page.</p>
                  </div>
                  <textarea value={announcement} onChange={e => setAnnouncement(e.target.value)} maxLength={300} rows={4}
                    placeholder="Type your announcement here..."
                    className="w-full px-4 py-3 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 focus:outline-none focus:ring-4 focus:ring-orange-500/20 focus:border-orange-500 font-medium text-sm resize-none" />
                  <button onClick={handleSaveAnnouncement} disabled={isSaving}
                    className="w-full flex items-center justify-center gap-2 bg-orange-500 text-white py-3 rounded-xl font-bold shadow-lg shadow-orange-500/25 disabled:opacity-50 transition-all hover:bg-orange-600">
                    {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Megaphone className="w-4 h-4" />}
                    {announcement.trim() ? 'Pin Announcement' : 'Remove Announcement'}
                  </button>
                </div>
              )}

              {/* ─── Invite Link Tab ─── */}
              {activeTab === 'invite' && (
                <div className="space-y-5">
                  <div className="flex items-center gap-3 text-zinc-500 mb-1">
                    <Link2 className="w-5 h-5 text-blue-500" />
                    <p className="text-sm">Generate a shareable invite link anyone can use to join.</p>
                  </div>
                  {inviteCode ? (
                    <div className="space-y-4">
                      <div className="p-4 bg-zinc-50 dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700">
                        <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-2">Invite Code</p>
                        <p className="text-2xl font-mono font-black tracking-[0.3em] text-indigo-600 dark:text-indigo-400 text-center">{inviteCode}</p>
                      </div>
                      <div className="flex gap-3">
                        <button onClick={handleCopyLink}
                          className="flex-1 flex items-center justify-center gap-2 bg-indigo-600 text-white py-3 rounded-xl font-bold shadow-lg shadow-indigo-500/25 transition-all hover:bg-indigo-700">
                          {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                          {copied ? 'Copied!' : 'Copy Invite Link'}
                        </button>
                        <button onClick={handleGenerateInvite}
                          className="px-4 py-3 bg-zinc-200 dark:bg-zinc-700 rounded-xl font-bold transition-all hover:bg-zinc-300 dark:hover:bg-zinc-600" title="Reset code">
                          <RefreshCw className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button onClick={handleGenerateInvite}
                      className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-4 rounded-xl font-bold shadow-lg shadow-blue-500/25 transition-all hover:shadow-blue-500/40">
                      <Link2 className="w-5 h-5" /> Generate Invite Link
                    </button>
                  )}
                </div>
              )}

              {/* ─── Danger Zone Tab ─── */}
              {activeTab === 'danger' && (
                <div className="space-y-6">
                  {/* Leave Group */}
                  <div className="p-5 border border-zinc-200 dark:border-zinc-700 rounded-2xl space-y-3">
                    <div className="flex items-center gap-3">
                      <LogOut className="w-5 h-5 text-orange-500" />
                      <div>
                        <p className="font-bold text-sm">Leave Group</p>
                        <p className="text-xs text-zinc-500">You will lose your XP and rank in this group.</p>
                      </div>
                    </div>
                    <button onClick={handleLeaveGroup} disabled={isSaving}
                      className="w-full flex items-center justify-center gap-2 bg-orange-100 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 py-2.5 rounded-xl font-bold text-sm disabled:opacity-50 transition-all hover:bg-orange-200 dark:hover:bg-orange-900/30">
                      <LogOut className="w-4 h-4" /> Leave this Group
                    </button>
                  </div>

                  {/* Transfer Ownership (creator only) */}
                  {isCreator && (
                    <div className="p-5 border border-zinc-200 dark:border-zinc-700 rounded-2xl space-y-3">
                      <div className="flex items-center gap-3">
                        <ArrowRightLeft className="w-5 h-5 text-amber-500" />
                        <div>
                          <p className="font-bold text-sm">Transfer Ownership</p>
                          <p className="text-xs text-zinc-500">Make another member the owner of this group.</p>
                        </div>
                      </div>
                      {otherMembers.length === 0 ? (
                        <p className="text-xs text-zinc-400 text-center py-2">No other members to transfer to.</p>
                      ) : (
                        <>
                          <select value={transferTo} onChange={e => setTransferTo(e.target.value)}
                            className="w-full px-4 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-amber-500/20 font-medium text-sm">
                            <option value="">Select new owner...</option>
                            {otherMembers.map(m => (
                              <option key={m.user_id} value={m.user_id}>{m.users.name} {m.role === 'admin' ? '(Admin)' : ''}</option>
                            ))}
                          </select>
                          <button onClick={handleTransferOwnership} disabled={!transferTo || isSaving}
                            className="w-full flex items-center justify-center gap-2 bg-amber-500 text-white py-2.5 rounded-xl font-bold text-sm disabled:opacity-50 transition-all hover:bg-amber-600">
                            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRightLeft className="w-4 h-4" />}
                            Transfer Ownership
                          </button>
                        </>
                      )}
                    </div>
                  )}

                  {/* Delete Group (creator only) */}
                  {isCreator && (
                    <div className="p-5 border-2 border-red-200 dark:border-red-900/50 rounded-2xl space-y-3 bg-red-50/50 dark:bg-red-900/5">
                      <div className="flex items-center gap-3">
                        <Trash2 className="w-5 h-5 text-red-500" />
                        <div>
                          <p className="font-bold text-sm text-red-600 dark:text-red-400">Delete Group</p>
                          <p className="text-xs text-zinc-500">Permanently delete this group, all messages, tasks, and members. <strong>This cannot be undone.</strong></p>
                        </div>
                      </div>
                      <button onClick={handleDeleteGroup} disabled={isSaving}
                        className="w-full flex items-center justify-center gap-2 bg-red-600 text-white py-2.5 rounded-xl font-bold text-sm disabled:opacity-50 transition-all hover:bg-red-700">
                        {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                        Permanently Delete Group
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
