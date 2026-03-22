'use client';

import { useState } from 'react';
import { useUserStore } from '@/store/userStore';
import { useGamificationStore } from '@/store/gamificationStore';
import { SHOP_ITEMS } from '@/constants/shop';
import { useTheme } from 'next-themes';
import { supabase } from '@/lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, CheckCircle2, ShoppingBag, Sparkles, User, Loader2, Palette } from 'lucide-react';

type Tab = 'themes' | 'emojis' | 'titles' | 'rings';

export default function ShopPage() {
  const user = useUserStore(state => state.user);
  const setUser = useUserStore(state => state.setUser);
  const gamification = useGamificationStore(state => state.data);
  const { theme, setTheme } = useTheme();
  
  const [activeTab, setActiveTab] = useState<Tab>('themes');
  const [isEquipping, setIsEquipping] = useState<string | null>(null);

  const level = gamification?.level || 1;

  const handleEquip = async (type: Tab, id: string, value?: string) => {
    if (type === 'themes') {
      setTheme(id);
      return;
    }

    if (!user) return;

    try {
      setIsEquipping(id);
      let updateData = {};
      
      if (type === 'emojis') {
        updateData = { avatar_url: value };
      } else if (type === 'titles') {
        updateData = { title: value };
      } else if (type === 'rings') {
        updateData = { ring: id };
      }

      const { error } = await supabase
        .from('users')
        .update(updateData)
        .eq('id', user.id);

      if (error) throw error;
      setUser({ ...user, ...updateData });
    } catch (err: unknown) {
      console.error(err);
      const message = err instanceof Error ? err.message : 'Unknown error';
      alert("Error equipping item: " + message);
    } finally {
      setIsEquipping(null);
    }
  };

  const isEquipped = (type: Tab, id: string, value?: string) => {
    if (type === 'themes') return theme === id;
    if (type === 'emojis') return user?.avatar_url === value;
    if (type === 'titles') return user?.title === value;
    if (type === 'rings') return user?.ring === id;
    return false;
  };

  const renderGrid = (items: { id: string; levelReq: number; name?: string; emoji?: string; cssClass?: string; borderClass?: string }[], type: Tab) => {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {items.map((item) => {
          const isUnlocked = level >= item.levelReq;
          const equipped = isEquipped(type, item.id, item.emoji || item.name);

          return (
            <motion.div
              key={item.id}
              whileHover={isUnlocked ? { scale: 1.05, y: -5 } : {}}
              className={`relative overflow-hidden group rounded-3xl border-2 transition-all p-6 flex flex-col items-center justify-center text-center ${
                isUnlocked 
                  ? equipped 
                    ? 'bg-indigo-50 border-indigo-500 dark:bg-indigo-500/10 dark:border-indigo-500 shadow-[0_0_30px_rgba(99,102,241,0.2)]'
                    : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 hover:border-indigo-300 dark:hover:border-indigo-700 shadow-xl shadow-zinc-200/20 dark:shadow-none'
                  : 'bg-zinc-100 dark:bg-zinc-900/50 border-zinc-200 dark:border-zinc-800/80 opacity-70 grayscale'
              }`}
            >
              {!isUnlocked && (
                <div className="absolute inset-0 bg-white/30 dark:bg-black/40 backdrop-blur-[3px] z-10 flex flex-col items-center justify-center transition-all group-hover:bg-white/40 dark:group-hover:bg-black/50">
                  <Lock className="w-10 h-10 text-zinc-600 dark:text-zinc-400 mb-3 drop-shadow-md" />
                  <p className="text-sm font-bold text-zinc-700 dark:text-zinc-300 bg-white/80 dark:bg-black/60 px-4 py-1.5 rounded-full shadow-lg">Unlocks at Level {item.levelReq}</p>
                </div>
              )}

              <div className="h-24 flex items-center justify-center">
                {type === 'themes' && (
                  <div className={`w-16 h-16 rounded-full rotate-45 shadow-2xl border-4 ${item.cssClass}`} />
                )}
                {type === 'emojis' && (
                  <div className="text-6xl drop-shadow-2xl hover:scale-110 transition-transform">{item.emoji}</div>
                )}
                {type === 'titles' && (
                  <div className="px-5 py-2.5 bg-gradient-to-r from-indigo-100 to-purple-100 dark:from-indigo-900/40 dark:to-purple-900/40 text-indigo-700 dark:text-indigo-300 rounded-xl text-sm font-black tracking-widest uppercase shadow-sm border border-indigo-200 dark:border-indigo-800">
                    {item.name}
                  </div>
                )}
                {type === 'rings' && (
                  <div className={`w-20 h-20 rounded-full border-[6px] flex items-center justify-center ${item.borderClass}`}>
                    <User className="text-zinc-400 w-8 h-8" />
                  </div>
                )}
              </div>

              <h3 className="font-extrabold text-lg text-zinc-900 dark:text-zinc-100 mt-2">
                {type === 'emojis' ? 'Avatar Lvl ' + item.levelReq : item.name}
              </h3>
              
              <div className="mt-6 w-full z-20">
                <button
                  disabled={!isUnlocked || isEquipping === item.id}
                  onClick={() => handleEquip(type, item.id, item.emoji || item.name)}
                  className={`w-full py-3 rounded-xl font-bold transition-all flex justify-center items-center ${
                    !isUnlocked
                      ? 'bg-zinc-200 dark:bg-zinc-800 text-zinc-400 cursor-not-allowed'
                      : equipped
                        ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30'
                        : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 active:scale-95'
                  }`}
                >
                  {isEquipping === item.id ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : equipped ? (
                    <><CheckCircle2 className="w-5 h-5 mr-2" /> Equipped</>
                  ) : (
                    <><Sparkles className="w-4 h-4 mr-2" /> Equip Loadout</>
                  )}
                </button>
              </div>
            </motion.div>
          );
        })}
      </div>
    );
  };

  const currentRingConfig = SHOP_ITEMS.rings.find(r => r.id === (user?.ring || 'basic-white'));

  return (
    <div className="space-y-8 pb-12 max-w-6xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 bg-gradient-to-r from-indigo-600 to-purple-600 p-8 rounded-[2rem] text-white shadow-2xl relative overflow-hidden">
        {/* Decorative Background blur */}
        <div className="absolute -top-20 -right-20 w-64 h-64 bg-white/10 blur-[50px] rounded-full pointer-events-none" />
        <div className="absolute -bottom-20 -left-20 w-80 h-80 bg-black/20 blur-[60px] rounded-full pointer-events-none" />
        
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md mb-4 text-sm font-bold">
            <ShoppingBag className="w-4 h-4" />
            The Reward Vault
          </div>
          <h1 className="text-4xl md:text-5xl font-black tracking-tight">
            Level up. Unlock. <br/>
            <span className="text-indigo-200">Flex.</span>
          </h1>
        </div>

        {/* Live Preview Box */}
        <div className="relative z-10 flex items-center gap-5 bg-black/30 backdrop-blur-xl p-5 rounded-2xl border border-white/10 shadow-2xl">
          <div className={`w-16 h-16 rounded-full border-[4px] flex items-center justify-center text-4xl shadow-xl bg-white/10 ${currentRingConfig?.borderClass}`}>
            {user?.avatar_url ? (
              user.avatar_url.startsWith('http') ? (
                <img src={user.avatar_url} alt="Avatar" className="w-full h-full object-cover rounded-full" />
              ) : (
                <span>{user.avatar_url}</span>
              )
            ) : (
              <span className="text-2xl font-bold">{user?.name?.charAt(0).toUpperCase()}</span>
            )}
          </div>
          <div>
            <div className="text-xs font-black text-indigo-300 tracking-wider uppercase mb-1 drop-shadow-md">
              Level {level} • {user?.title || 'Novice'}
            </div>
            <div className="font-bold text-lg text-white drop-shadow-lg">{user?.name || 'Gamer'}</div>
          </div>
        </div>
      </div>

      <div className="flex gap-3 overflow-x-auto pb-4 scrollbar-hide snap-x">
        {['themes', 'emojis', 'titles', 'rings'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab as Tab)}
            className={`px-8 py-3.5 rounded-2xl font-extrabold capitalize whitespace-nowrap transition-all snap-center flex items-center gap-2 ${
              activeTab === tab
                ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 shadow-xl scale-105'
                : 'bg-white text-zinc-500 hover:bg-zinc-100 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-800'
            }`}
          >
            {tab === 'themes' && <Palette className="w-5 h-5" />}
            {tab === 'emojis' && <User className="w-5 h-5" />}
            {tab === 'titles' && <Sparkles className="w-5 h-5" />}
            {tab === 'rings' && <CheckCircle2 className="w-5 h-5" />}
            {tab}
          </button>
        ))}
      </div>

      <div className="pt-2">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
          >
            {renderGrid(SHOP_ITEMS[activeTab], activeTab)}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
