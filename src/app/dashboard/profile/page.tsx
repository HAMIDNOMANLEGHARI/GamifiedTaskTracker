'use client';

import { useState, useEffect } from 'react';
import { useUserStore } from '@/store/userStore';
import { useGamificationStore } from '@/store/gamificationStore';
import { supabase } from '@/lib/supabase';
import { useTheme } from 'next-themes';
import { Loader2, Palette, Save, Shield, Zap, User, Upload, Lock } from 'lucide-react';
import { motion } from 'framer-motion';
import { SHOP_ITEMS } from '@/constants/shop';

export default function ProfilePage() {
  const { user, setUser } = useUserStore();
  const gamification = useGamificationStore((state) => state.data);
  const { theme, setTheme } = useTheme();

  const [name, setName] = useState(user?.name || '');
  const [avatarUrl, setAvatarUrl] = useState(user?.avatar_url || '');
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const userLevel = gamification?.level || 1;

  const [isSaving, setIsSaving] = useState(false);
  const [success, setSuccess] = useState('');
  
  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setAvatarUrl(user.avatar_url || '');
    }
  }, [user]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setIsSaving(true);
    setSuccess('');

    try {
      const { error } = await supabase
        .from('users')
        .update({ name, avatar_url: avatarUrl })
        .eq('id', user.id);
      
      if (error) throw error;
      
      setUser({ ...user, name, avatar_url: avatarUrl });
      setSuccess('Profile updated successfully!');
    } catch (err: unknown) {
      console.error(err);
      const message = err instanceof Error ? err.message : 'Unknown error';
      alert("Error saving profile: " + message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setIsUploadingAvatar(true);
      if (!e.target.files || e.target.files.length === 0) return;
      const file = e.target.files[0];
      const fileExt = file.name.split('.').pop();
      const fileName = `avatar_${user?.id}_${Math.random()}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('materials')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage
        .from('materials')
        .getPublicUrl(filePath);

      setAvatarUrl(publicUrlData.publicUrl);
    } catch (error: unknown) {
      console.error(error);
      const message = error instanceof Error ? error.message : 'Unknown error';
      alert('Error uploading avatar: ' + message);
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  return (
    <div className="space-y-8 max-w-3xl mx-auto pb-12">
      {/* Gamer Player Card Hero */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-[2rem] p-8 text-white shadow-2xl"
      >
        {/* Animated Background Gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-500 via-purple-600 to-pink-500 opacity-90" />
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-20 mix-blend-overlay" />
        
        <div className="relative z-10 flex flex-col md:flex-row items-center gap-8">
          {/* Avatar Ring */}
          <div className="relative">
            <div className="w-32 h-32 rounded-full overflow-hidden bg-white/20 backdrop-blur-md border-[4px] border-white/40 flex items-center justify-center text-7xl shadow-[0_0_30px_rgba(255,255,255,0.3)]">
              {avatarUrl ? (
                avatarUrl.startsWith('http') ? (
                  <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <span>{avatarUrl}</span>
                )
              ) : (
                <span className="text-5xl font-bold">{user?.name?.charAt(0).toUpperCase() || <User className="w-12 h-12" />}</span>
              )}
            </div>
            <motion.div  
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 12, ease: "linear" }}
              className="absolute -inset-3 border border-white/30 rounded-full border-dashed"
            />
            <div className="absolute -bottom-2 -right-2 bg-yellow-400 text-yellow-900 font-bold px-3 py-1 rounded-full text-sm border-2 border-white/50 shadow-lg flex items-center gap-1">
              <Shield className="w-3 h-3" /> LVL {gamification?.level || 1}
            </div>
          </div>
          
          <div className="flex-1 text-center md:text-left">
            <h1 className="text-4xl font-extrabold tracking-tight drop-shadow-lg mb-3">
              {user?.name || 'Player One'}
            </h1>
            <span className="text-white/90 font-medium tracking-wide bg-black/20 px-4 py-1.5 rounded-full inline-block backdrop-blur-md shadow-sm">
              <Zap className="w-4 h-4 inline mr-1 text-yellow-300" />
              {gamification?.xp || 0} Total XP <span className="mx-2 opacity-50">•</span> {gamification?.streak_count || 0} Day Streak
            </span>
          </div>
        </div>
      </motion.div>

      <motion.form 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        onSubmit={handleSave} 
        className="p-8 rounded-[2rem] bg-white/60 dark:bg-zinc-900/60 backdrop-blur-xl border border-zinc-200/50 dark:border-zinc-800/50 shadow-xl space-y-8"
      >
        <div>
          <h2 className="text-xl font-bold tracking-tight mb-6 text-zinc-800 dark:text-zinc-200">Player Details</h2>
          
          <div className="space-y-5">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-zinc-500 uppercase tracking-wider">Email Connection</label>
              <input 
                aria-label="Email Address"
                title="Email Address"
                placeholder="Email Address"
                type="email"
                disabled
                value={user?.email || ''}
                className="w-full px-5 py-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-100/50 dark:bg-zinc-950/50 text-zinc-400 cursor-not-allowed font-medium"
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-semibold text-zinc-500 uppercase tracking-wider">Display Name</label>
              <input 
                aria-label="Display Name"
                title="Display Name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-5 py-3 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 focus:outline-none focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 font-medium transition-all shadow-sm"
                placeholder="Enter your gamer tag"
              />
            </div>
          </div>
        </div>

        <div className="pt-6 border-t border-zinc-200 dark:border-zinc-800">
          <h2 className="text-xl font-bold tracking-tight mb-4 text-zinc-800 dark:text-zinc-200">Gamer Avatar</h2>
          <div className="flex flex-wrap gap-3 mb-4">
            {SHOP_ITEMS.emojis.map(item => {
              const isUnlocked = userLevel >= item.levelReq;
              return (
                <button
                  key={item.id}
                  type="button"
                  disabled={!isUnlocked}
                  onClick={() => isUnlocked && setAvatarUrl(item.emoji)}
                  className={`relative w-14 h-14 text-3xl rounded-2xl border-2 flex items-center justify-center transition-all ${
                    !isUnlocked
                      ? 'opacity-40 grayscale cursor-not-allowed border-zinc-200 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800/50'
                      : avatarUrl === item.emoji
                        ? 'bg-indigo-100 border-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.3)] hover:scale-110'
                        : 'bg-white/50 dark:bg-zinc-800/50 border-zinc-200 dark:border-zinc-700 hover:scale-110'
                  }`}
                  title={isUnlocked ? item.emoji : `Unlock at Level ${item.levelReq} (The Vault)`}
                >
                  {item.emoji}
                  {!isUnlocked && (
                    <div className="absolute inset-0 flex items-center justify-center bg-white/60 dark:bg-black/50 rounded-2xl">
                      <Lock className="w-4 h-4 text-zinc-500" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
          <div className="flex items-center gap-4">
            <label className="flex items-center justify-center px-4 py-2.5 bg-white dark:bg-zinc-800 border-2 border-dashed border-zinc-300 dark:border-zinc-700 rounded-xl cursor-pointer hover:border-indigo-500 hover:text-indigo-600 transition-colors text-sm font-bold text-zinc-600 dark:text-zinc-400 shadow-sm">
              {isUploadingAvatar ? <Loader2 className="w-4 h-4 animate-spin mr-2"/> : <Upload className="w-4 h-4 mr-2"/>}
              {isUploadingAvatar ? 'Uploading...' : 'Custom Image'}
              <input type="file" className="hidden" accept="image/*" onChange={handleFileUpload} disabled={isUploadingAvatar} />
            </label>
            {avatarUrl && (
              <button type="button" onClick={() => setAvatarUrl('')} className="text-sm text-red-500 hover:text-red-400 font-bold px-3 py-2 rounded-xl hover:bg-red-500/10 transition-colors">
                Remove Avatar
              </button>
            )}
          </div>
        </div>

        <div className="pt-6 border-t border-zinc-200 dark:border-zinc-800">
          <h2 className="text-xl font-bold tracking-tight mb-6 text-zinc-800 dark:text-zinc-200 flex items-center gap-2">
            <Palette className="h-5 w-5 text-indigo-500" /> Aesthetic Theme
          </h2>
          
          <div className="flex gap-4">
            {['light', 'dark', 'system'].map((t) => (
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                key={t}
                type="button"
                onClick={() => setTheme(t)}

                className={`flex-1 capitalize py-3 px-4 rounded-xl border-2 font-bold transition-all ${
                  theme === t 
                    ? 'bg-indigo-50 border-indigo-500 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400 shadow-[0_0_15px_rgba(99,102,241,0.2)]' 
                    : 'bg-white border-zinc-200 text-zinc-500 hover:border-zinc-300 dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-400 dark:hover:border-zinc-700'
                }`}
              >
                {t}
              </motion.button>
            ))}
          </div>
        </div>

        <div className="pt-8 border-t border-zinc-200 dark:border-zinc-800 flex justify-end items-center gap-4">
          {success && (
            <motion.span 
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="text-sm text-emerald-500 font-bold bg-emerald-50 dark:bg-emerald-500/10 px-3 py-1.5 rounded-lg"
            >
              {success}
            </motion.span>
          )}
          <motion.button 
            whileHover={!isSaving ? { scale: 1.05 } : {}}
            whileTap={!isSaving ? { scale: 0.95 } : {}}
            type="submit"
            disabled={isSaving}
            className="flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-8 py-3.5 rounded-xl font-bold shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {isSaving ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
            Save Loadout
          </motion.button>
        </div>
      </motion.form>
    </div>
  );
}
