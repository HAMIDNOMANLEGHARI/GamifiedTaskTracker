'use client';
import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useUserStore } from '@/store/userStore';
import { Send, MessageSquare, Loader2, Smile } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const QUICK_REACTIONS = ['❤️', '😂', '👍', '🔥', '😮', '😢', '🎉', '💯'];
const EMOJI_KEYBOARD = [
  ['😀','😁','😂','🤣','😃','😄','😅','😆'],
  ['😉','😊','😋','😎','😍','🤩','😘','😗'],
  ['🤔','🤫','🤭','🙄','😏','😶','😐','😑'],
  ['👍','👎','👏','🙌','🤝','💪','✌️','🤞'],
  ['❤️','🧡','💛','💚','💙','💜','🖤','💔'],
  ['🔥','⭐','💯','✅','🎉','🏆','🚀','💎'],
];

interface ChatMessage {
  id: string;
  community_id: string;
  user_id: string;
  content: string;
  created_at: string;
  reactions: Record<string, string[]>; // emoji -> array of user_ids
  user_name: string;
  user_avatar: string | null;
}

interface GroupChatProps {
  communityId: string;
}

export function GroupChat({ communityId }: GroupChatProps) {
  const user = useUserStore((state) => state.user);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [reactionPickerMsgId, setReactionPickerMsgId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchMessages();

    const channel = supabase
      .channel(`community-chat:${communityId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'community_messages', filter: `community_id=eq.${communityId}` },
        async (payload) => {
          const raw = payload.new as { id: string; community_id: string; user_id: string; content: string; created_at: string; reactions: Record<string, string[]> | null };
          // Fetch user details
          const { data: userData } = await supabase
            .from('users')
            .select('name, avatar_url')
            .eq('id', raw.user_id)
            .single();

          const msg: ChatMessage = {
            id: raw.id,
            community_id: raw.community_id,
            user_id: raw.user_id,
            content: raw.content,
            created_at: raw.created_at,
            reactions: raw.reactions || {},
            user_name: userData?.name || 'Unknown',
            user_avatar: userData?.avatar_url || null,
          };
          setMessages(prev => {
            if (prev.some(m => m.id === msg.id)) return prev;
            return [...prev, msg];
          });
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'community_messages', filter: `community_id=eq.${communityId}` },
        (payload) => {
          const updated = payload.new as { id: string; reactions: Record<string, string[]> | null };
          setMessages(prev => prev.map(m => m.id === updated.id ? { ...m, reactions: updated.reactions || {} } : m));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [communityId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchMessages = async () => {
    try {
      const { data: msgData, error } = await supabase
        .from('community_messages')
        .select('id, community_id, user_id, content, created_at, reactions')
        .eq('community_id', communityId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error && error.code !== '42P01') throw error;
      const rawMessages = (msgData || []).reverse();

      if (rawMessages.length === 0) {
        setMessages([]);
        setLoading(false);
        return;
      }

      const userIds = Array.from(new Set(rawMessages.map(m => m.user_id)));
      const { data: usersData } = await supabase
        .from('users')
        .select('id, name, avatar_url')
        .in('id', userIds);
      const usersMap = Object.fromEntries((usersData || []).map(u => [u.id, u]));

      const combined: ChatMessage[] = rawMessages.map(m => ({
        id: m.id,
        community_id: m.community_id,
        user_id: m.user_id,
        content: m.content,
        created_at: m.created_at,
        reactions: (m.reactions as Record<string, string[]>) || {},
        user_name: usersMap[m.user_id]?.name || 'Unknown',
        user_avatar: usersMap[m.user_id]?.avatar_url || null,
      }));
      setMessages(combined);
    } catch (err) {
      console.error('Error fetching group messages:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user || isSending) return;
    setIsSending(true);

    // Optimistic add
    const tempId = `temp_${Date.now()}`;
    const optimisticMsg: ChatMessage = {
      id: tempId,
      community_id: communityId,
      user_id: user.id,
      content: newMessage.trim(),
      created_at: new Date().toISOString(),
      reactions: {},
      user_name: user.name || 'You',
      user_avatar: user.avatar_url || null,
    };
    setMessages(prev => [...prev, optimisticMsg]);
    setNewMessage('');

    try {
      const { error } = await supabase
        .from('community_messages')
        .insert({
          community_id: communityId,
          user_id: user.id,
          content: optimisticMsg.content,
        });
      if (error) throw error;
    } catch (err) {
      console.error('Failed to send:', err);
      // Remove optimistic message on error
      setMessages(prev => prev.filter(m => m.id !== tempId));
    } finally {
      setIsSending(false);
    }
  };

  const handleReaction = async (msgId: string, emoji: string) => {
    if (!user) return;
    setReactionPickerMsgId(null);
    const msg = messages.find(m => m.id === msgId);
    if (!msg) return;

    const reactions = { ...msg.reactions };
    const userList = reactions[emoji] || [];
    const hasReacted = userList.includes(user.id);

    if (hasReacted) {
      reactions[emoji] = userList.filter(uid => uid !== user.id);
      if (reactions[emoji].length === 0) delete reactions[emoji];
    } else {
      reactions[emoji] = [...userList, user.id];
    }

    // Optimistic update
    setMessages(prev => prev.map(m => m.id === msgId ? { ...m, reactions } : m));

    try {
      await supabase.from('community_messages').update({ reactions }).eq('id', msgId);
    } catch (err) {
      console.error('Failed to react:', err);
    }
  };

  const insertEmoji = (emoji: string) => {
    setNewMessage(prev => prev + emoji);
    setShowEmojiPicker(false);
    inputRef.current?.focus();
  };

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  };

  // Group messages by date
  const getDateLabel = (dateStr: string) => {
    const d = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (d.toDateString() === today.toDateString()) return 'Today';
    if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  };

  let lastDateLabel = '';

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm overflow-hidden flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center gap-3">
        <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-xl">
          <MessageSquare className="h-5 w-5" />
        </div>
        <div>
          <h3 className="font-bold">Group Chat</h3>
          <p className="text-xs text-zinc-500">{messages.length} messages</p>
        </div>
      </div>

      {/* Messages */}
      <div className="h-96 overflow-y-auto p-4 space-y-1 bg-[#f0f2f5] dark:bg-zinc-950/70" onClick={() => { setReactionPickerMsgId(null); setShowEmojiPicker(false); }}>
        {loading ? (
          <div className="flex justify-center items-center h-full">
            <Loader2 className="w-6 h-6 animate-spin text-zinc-400" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-zinc-400">
            <MessageSquare className="w-10 h-10 mb-2 opacity-30" />
            <p className="text-sm font-medium">No messages yet</p>
            <p className="text-xs">Be the first to say something!</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.user_id === user?.id;
            const dateLabel = getDateLabel(msg.created_at);
            let showDate = false;
            if (dateLabel !== lastDateLabel) {
              showDate = true;
              lastDateLabel = dateLabel;
            }
            const reactionEntries = Object.entries(msg.reactions || {}).filter(([, users]) => users.length > 0);

            return (
              <div key={msg.id}>
                {/* Date divider */}
                {showDate && (
                  <div className="flex justify-center my-3">
                    <span className="text-[10px] font-bold text-zinc-500 bg-white dark:bg-zinc-800 px-3 py-1 rounded-full shadow-sm border border-zinc-200 dark:border-zinc-700">{dateLabel}</span>
                  </div>
                )}
                <motion.div
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex gap-2 mb-1 ${isMe ? 'flex-row-reverse' : ''}`}
                >
                  {/* Avatar */}
                  {!isMe && (
                    <div className="w-7 h-7 rounded-full bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center shrink-0 overflow-hidden text-xs font-bold mt-1">
                      {msg.user_avatar ? (
                        msg.user_avatar.startsWith('http') ? (
                          <img src={msg.user_avatar} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <span>{msg.user_avatar}</span>
                        )
                      ) : (
                        <span>{msg.user_name?.charAt(0).toUpperCase()}</span>
                      )}
                    </div>
                  )}

                  {/* Bubble */}
                  <div className={`max-w-[75%] group relative ${isMe ? 'items-end' : 'items-start'}`}>
                    {!isMe && (
                      <p className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 mb-0.5 px-2">{msg.user_name}</p>
                    )}
                    <div
                      className={`relative px-3 py-2 rounded-2xl text-sm shadow-sm ${
                        isMe
                          ? 'bg-[#dcf8c6] dark:bg-emerald-900/40 text-zinc-900 dark:text-zinc-100 rounded-tr-sm'
                          : 'bg-white dark:bg-zinc-800 rounded-tl-sm'
                      }`}
                      onDoubleClick={(e) => { e.stopPropagation(); setReactionPickerMsgId(msg.id); }}
                    >
                      <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                      <p className={`text-[9px] mt-0.5 ${isMe ? 'text-emerald-700/60 dark:text-emerald-400/50 text-right' : 'text-zinc-400'}`}>
                        {formatTime(msg.created_at)}
                      </p>

                      {/* Reaction picker trigger (hover) */}
                      <button
                        onClick={(e) => { e.stopPropagation(); setReactionPickerMsgId(msg.id === reactionPickerMsgId ? null : msg.id); }}
                        className={`absolute ${isMe ? '-left-7' : '-right-7'} top-1 opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-full`}
                      >
                        <Smile className="w-3.5 h-3.5 text-zinc-400" />
                      </button>
                    </div>

                    {/* Reactions display */}
                    {reactionEntries.length > 0 && (
                      <div className={`flex flex-wrap gap-1 mt-0.5 px-1 ${isMe ? 'justify-end' : ''}`}>
                        {reactionEntries.map(([emoji, users]) => (
                          <button
                            key={emoji}
                            onClick={(e) => { e.stopPropagation(); handleReaction(msg.id, emoji); }}
                            className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-xs border transition-all ${
                              users.includes(user?.id || '')
                                ? 'bg-indigo-100 dark:bg-indigo-900/30 border-indigo-300 dark:border-indigo-700'
                                : 'bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-700'
                            }`}
                          >
                            <span>{emoji}</span>
                            <span className="text-[10px] font-bold text-zinc-500">{users.length}</span>
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Reaction picker popup */}
                    <AnimatePresence>
                      {reactionPickerMsgId === msg.id && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.8 }}
                          onClick={(e) => e.stopPropagation()}
                          className={`absolute z-50 ${isMe ? 'right-0' : 'left-0'} -top-10 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-full shadow-lg px-2 py-1 flex gap-1`}
                        >
                          {QUICK_REACTIONS.map(emoji => (
                            <button
                              key={emoji}
                              onClick={() => handleReaction(msg.id, emoji)}
                              className="hover:scale-125 transition-transform text-lg p-0.5"
                            >
                              {emoji}
                            </button>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </motion.div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Emoji Keyboard */}
      <AnimatePresence>
        {showEmojiPicker && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 overflow-hidden"
          >
            <div className="p-3 grid gap-1">
              {EMOJI_KEYBOARD.map((row, i) => (
                <div key={i} className="flex gap-1 justify-center">
                  {row.map(emoji => (
                    <button key={emoji} onClick={() => insertEmoji(emoji)} className="w-9 h-9 text-xl rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors flex items-center justify-center">
                      {emoji}
                    </button>
                  ))}
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input */}
      <form onSubmit={handleSend} className="p-3 border-t border-zinc-200 dark:border-zinc-800 flex items-center gap-2 bg-white dark:bg-zinc-900">
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); setShowEmojiPicker(!showEmojiPicker); }}
          className={`p-2.5 rounded-full transition-colors shrink-0 ${showEmojiPicker ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600' : 'hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400'}`}
        >
          <Smile className="w-5 h-5" />
        </button>
        <input
          ref={inputRef}
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Type a message..."
          maxLength={500}
          className="flex-1 px-4 py-2.5 rounded-full bg-zinc-100 dark:bg-zinc-800 border-0 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
        <button
          type="submit"
          disabled={!newMessage.trim() || isSending}
          className="p-2.5 bg-emerald-500 text-white rounded-full hover:bg-emerald-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shrink-0"
        >
          {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </button>
      </form>
    </div>
  );
}
