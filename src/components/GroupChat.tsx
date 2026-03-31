'use client';
import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useUserStore } from '@/store/userStore';
import { Send, MessageSquare, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';

interface ChatMessage {
  id: string;
  community_id: string;
  user_id: string;
  content: string;
  created_at: string;
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
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchMessages();

    // Subscribe to real-time messages for this community
    const channel = supabase
      .channel(`community-chat:${communityId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'community_messages', filter: `community_id=eq.${communityId}` },
        async (payload) => {
          const newMsgRaw = payload.new as { id: string; community_id: string; user_id: string; content: string; created_at: string };
          // Fetch user details
          const { data: userData } = await supabase
            .from('users')
            .select('name, avatar_url')
            .eq('id', newMsgRaw.user_id)
            .single();

          const msg: ChatMessage = {
            id: newMsgRaw.id,
            community_id: newMsgRaw.community_id,
            user_id: newMsgRaw.user_id,
            content: newMsgRaw.content,
            created_at: newMsgRaw.created_at,
            user_name: userData?.name || 'Unknown',
            user_avatar: userData?.avatar_url || null,
          };
          setMessages(prev => {
            // Avoid duplicate
            if (prev.some(m => m.id === msg.id)) return prev;
            return [...prev, msg];
          });
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
      // Fetch messages
      const { data: msgData, error } = await supabase
        .from('community_messages')
        .select('id, community_id, user_id, content, created_at')
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

      // Fetch user profiles
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

    try {
      const { error } = await supabase
        .from('community_messages')
        .insert({
          community_id: communityId,
          user_id: user.id,
          content: newMessage.trim(),
        });
      if (error) throw error;
      setNewMessage('');
    } catch (err) {
      console.error('Failed to send:', err);
    } finally {
      setIsSending(false);
    }
  };

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm overflow-hidden flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center gap-3">
        <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-xl">
          <MessageSquare className="h-5 w-5" />
        </div>
        <div>
          <h3 className="font-bold">Group Chat</h3>
          <p className="text-xs text-zinc-500">{messages.length} messages</p>
        </div>
      </div>

      {/* Messages */}
      <div className="h-80 overflow-y-auto p-4 space-y-3 bg-zinc-50/50 dark:bg-zinc-950/50">
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
            return (
              <motion.div
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                key={msg.id}
                className={`flex gap-2.5 ${isMe ? 'flex-row-reverse' : ''}`}
              >
                {/* Avatar */}
                <div className="w-8 h-8 rounded-full bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center shrink-0 overflow-hidden text-xs font-bold">
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

                {/* Bubble */}
                <div className={`max-w-[75%] ${isMe ? 'items-end' : 'items-start'}`}>
                  {!isMe && (
                    <p className="text-[10px] font-bold text-zinc-500 mb-1 px-1">{msg.user_name}</p>
                  )}
                  <div className={`px-3.5 py-2 rounded-2xl text-sm ${
                    isMe
                      ? 'bg-indigo-600 text-white rounded-br-sm'
                      : 'bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-bl-sm'
                  }`}>
                    {msg.content}
                  </div>
                  <p className={`text-[9px] text-zinc-400 mt-0.5 px-1 ${isMe ? 'text-right' : ''}`}>
                    {formatTime(msg.created_at)}
                  </p>
                </div>
              </motion.div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSend} className="p-3 border-t border-zinc-200 dark:border-zinc-800 flex items-center gap-2">
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Type a message..."
          maxLength={500}
          className="flex-1 px-4 py-2.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
        />
        <button
          type="submit"
          disabled={!newMessage.trim() || isSending}
          className="p-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shrink-0"
        >
          {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </button>
      </form>
    </div>
  );
}
