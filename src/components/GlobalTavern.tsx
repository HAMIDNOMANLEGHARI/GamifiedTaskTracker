'use client';
import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useUserStore } from '@/store/userStore';
import { SHOP_ITEMS } from '@/constants/shop';
import { Send, MessageSquare, Loader2, Heart } from 'lucide-react';
import { motion } from 'framer-motion';

interface Like {
  id: string;
  name: string;
}

interface Message {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
  likes: { id: string; name: string }[];
  users: {
    name: string;
    email: string;
    avatar_url: string | null;
    title: string | null;
    ring: string | null;
  };
}

export function GlobalTavern() {
  const user = useUserStore((state) => state.user);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchMessages();
    
    // Subscribe to real-time new messages
    const channel = supabase
      .channel('public:messages')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'messages' },
        async (payload) => {
          if (payload.eventType === 'INSERT') {
            const newMsgId = payload.new.id;
            
            // Instantly fetch the full joined message with user flex details
            const { data } = await supabase
              .from('messages')
              .select(`
                id, user_id, content, created_at, likes,
                users ( name, email, avatar_url, title, ring )
              `)
              .eq('id', newMsgId)
              .single();
              
            if (data) {
               setMessages(prev => [...prev, data as unknown as Message]);
            }
          } else if (payload.eventType === 'UPDATE') {
            // Instantly sync reactions across all browsers
            const updatedMsg = payload.new;
            setMessages(prev => prev.map(m => m.id === updatedMsg.id ? { ...m, likes: updatedMsg.likes || [] } : m));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    // auto-scroll to bottom of chat
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchMessages = async () => {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select(`
          id, user_id, content, created_at, likes,
          users!inner ( name, email, avatar_url, title, ring )
        `)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error && error.code !== '42P01') throw error; 
      if (data) setMessages(data.reverse() as unknown as Message[]);
    } catch (err) {
      console.error('Error fetching messages:', err);
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
        .from('messages')
        .insert({
          user_id: user.id,
          content: newMessage.trim(),
        });
      
      if (error) {
        if (error.code === '42P01') {
          alert("The 'messages' table hasn't been created in Supabase yet!");
        }
        throw error;
      }
      setNewMessage('');
    } catch (err) {
      console.error('Failed to send:', err);
    } finally {
      setIsSending(false);
    }
  };

  const handleToggleLike = async (msgId: string, currentLikes: Like[]) => {
    if (!user) return;
    const likesList = currentLikes || [];
    const hasLiked = likesList.some(l => (typeof l === 'string' ? l : l?.id) === user.id);
    const newLikes = hasLiked 
      ? likesList.filter(l => (typeof l === 'string' ? l : l?.id) !== user.id) 
      : [...likesList, { id: user.id, name: user.name || 'Gamer' }];

    // Optimistic UI update (feels instant)
    setMessages(prev => prev.map(m => m.id === msgId ? { ...m, likes: newLikes } : m));

    try {
      await supabase.from('messages').update({ likes: newLikes }).eq('id', msgId);
    } catch (err) {
      console.error('Failed to react:', err);
    }
  };

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm flex flex-col h-[600px] overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-xl">
            <MessageSquare className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-bold text-zinc-900 dark:text-zinc-100">Global Tavern</h2>
            <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> Live Area
            </p>
          </div>
        </div>
      </div>

      {/* Messages Window */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-zinc-300 dark:scrollbar-thumb-zinc-700">
        {loading ? (
          <div className="h-full flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-zinc-400" />
          </div>
        ) : messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-zinc-400">
            <MessageSquare className="w-12 h-12 mb-3 opacity-20" />
            <p className="font-medium text-sm">Quiet in the tavern today...</p>
            <p className="text-xs">Be the first to speak!</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.user_id === user?.id;
            const ringClass = SHOP_ITEMS.rings.find(r => r.id === (msg.users?.ring || 'basic-white'))?.borderClass || 'border-zinc-200';
            const likesCount = (msg.likes || []).length;
            const hasLiked = (msg.likes || []).some((l: Like | string) => (typeof l === 'string' ? l : l?.id) === user?.id);
            
            return (
              <motion.div 
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                key={msg.id}
                className={`flex gap-3 max-w-[85%] group ${isMe ? 'ml-auto flex-row-reverse' : ''}`}
              >
                <div className={`w-10 h-10 rounded-full shrink-0 flex items-center justify-center bg-zinc-100 dark:bg-zinc-800 border-[2px] ${ringClass} shadow-sm overflow-hidden`}>
                  {msg.users?.avatar_url ? (
                    msg.users.avatar_url.startsWith('http') ? (
                      <img src={msg.users.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-lg">{msg.users.avatar_url}</span>
                    )
                  ) : (
                    <span className="font-bold text-zinc-500 text-sm">{(msg.users?.name || msg.users?.email || 'N').charAt(0).toUpperCase()}</span>
                  )}
                </div>
                
                <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                  <div className={`flex items-baseline gap-2 mb-1`}>
                    <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300">{msg.users?.name || msg.users?.email?.split('@')[0]}</span>
                    <span className={`text-[9px] font-black uppercase tracking-wider ${isMe ? 'text-indigo-400' : 'text-zinc-500 dark:text-zinc-400'}`}>
                      {msg.users?.title || 'Novice'}
                    </span>
                  </div>
                  
                  <div className={`px-4 py-2.5 rounded-2xl text-sm relative ${
                    isMe 
                    ? 'bg-indigo-600 text-white rounded-tr-sm shadow-md shadow-indigo-600/20' 
                    : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 rounded-tl-sm border border-zinc-200 dark:border-zinc-700'
                  }`}>
                    {msg.content}

                    {/* Reaction Bar */}
                    <div className={`absolute ${isMe ? '-left-8 -bottom-2' : '-right-8 -bottom-2'} flex items-center group/react`}>
                      <button 
                        onClick={() => handleToggleLike(msg.id, msg.likes)}
                        className={`flex items-center gap-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 px-1.5 py-1 rounded-full shadow-sm transition-all hover:scale-110 ${
                          hasLiked ? 'text-red-500' : 'text-zinc-400 hover:text-red-500'
                        } ${likesCount > 0 ? 'opacity-100 scale-100' : 'opacity-0 scale-50 group-hover:opacity-100 group-hover:scale-100'}`}
                      >
                        <Heart className={`w-3 h-3 ${hasLiked ? 'fill-red-500' : ''}`} />
                        {likesCount > 0 && <span className="text-[10px] font-bold px-0.5">{likesCount}</span>}
                      </button>

                      {likesCount > 0 && (
                        <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 hidden group-hover/react:block bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-[10px] font-bold px-2.5 py-1 rounded-md whitespace-nowrap z-50 shadow-xl pointer-events-none origin-bottom animate-in fade-in zoom-in duration-100">
                          {msg.likes.map((l: Like | string) => typeof l === 'string' ? 'A Gamer' : l.name).join(', ')}
                          <div className="absolute left-1/2 -translate-x-1/2 top-full border-[4px] border-transparent border-t-zinc-900 dark:border-t-zinc-100" />
                        </div>
                      )}
                    </div>
                  </div>
                  <span className="text-[10px] text-zinc-400 mt-1">
                    {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </motion.div>
            );
          })
        )}
        <div ref={messagesEndRef} className="h-1" />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50">
        <form onSubmit={handleSend} className="relative">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message to the global tavern..."
            className="w-full bg-white dark:bg-black border border-zinc-200 dark:border-zinc-800 rounded-xl pl-4 pr-12 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
            maxLength={500}
            disabled={!user || isSending}
          />
          <button 
            type="submit" 
            disabled={!newMessage.trim() || !user || isSending}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:bg-zinc-400 transition-colors"
          >
            {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </form>
      </div>
    </div>
  );
}
