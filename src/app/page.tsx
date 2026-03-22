'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, Sparkles, Trophy, Loader2, Zap, Flame, Brain, Users, Star, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useUserStore } from '@/store/userStore';
import { useRef } from 'react';
import { motion } from 'framer-motion';

export default function LandingPage() {
  const router = useRouter();
  const { setUser } = useUserStore();
  
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Track if we've already set a user to avoid overwriting profile-merged data
  const hasSetUser = useRef(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        // Only set raw auth user if we haven't already loaded this user
        const currentUser = useUserStore.getState().user;
        if (!currentUser || currentUser.id !== session.user.id) {
          setUser(session.user as never);
        }
        hasSetUser.current = true;
        router.push('/dashboard');
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        // Only set raw auth user if we haven't already loaded this user
        // This prevents overwriting profile-merged data from useAppData
        const currentUser = useUserStore.getState().user;
        if (!currentUser || currentUser.id !== session.user.id) {
          setUser(session.user as never);
        }
        hasSetUser.current = true;
        router.push('/dashboard');
      } else {
        setUser(null);
        hasSetUser.current = false;
      }
    });

    return () => subscription.unsubscribe();
  }, [router, setUser]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg('');

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: name,
              gamer_tag: name,
            }
          }
        });
        if (error) throw error;
        // If require email confirmation is ON in supabase, this might not log them in instantly.
        // Assuming default dev project behaviour here.
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Authentication failed';
      setErrorMsg(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#09090b] text-white selection:bg-indigo-500 overflow-x-hidden relative font-sans">
      
      {/* Background Glowing Orbs */}
      <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] bg-indigo-600/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-5%] w-[600px] h-[600px] bg-pink-600/20 rounded-full blur-[150px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-6 pt-20 pb-20 grid md:grid-cols-2 gap-16 items-center relative z-10">
        
        {/* Left Content */}
        <motion.div 
          initial={{ opacity: 0, x: -40 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="space-y-8"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 backdrop-blur-md text-sm font-bold text-indigo-300 shadow-xl">
            <Sparkles className="h-4 w-4 text-yellow-400" />
            <span>Actually get your life together rn 💀</span>
          </div>
          
          <h1 className="text-5xl md:text-7xl font-black tracking-tighter leading-[1.1] drop-shadow-2xl">
            Turn your to-do lists <br />
            <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              into epic quests.
            </span>
          </h1>
          
          <p className="text-xl text-zinc-400 font-medium leading-relaxed max-w-lg">
            Stop using boring corporate apps. Earn massive XP, complete AI-generated side quests, flex your heatmaps, and battle procrastination with friends. 🎮
          </p>

          {/* Gamified Bento Badges */}
          <div className="grid grid-cols-2 gap-4 pt-4">
            <motion.div whileHover={{ scale: 1.05 }} className="p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md flex items-center gap-4 shadow-lg">
              <div className="p-3 bg-yellow-500/10 rounded-xl"><Zap className="h-6 w-6 text-yellow-400" /></div>
              <div>
                <h3 className="font-bold text-white">Earn XP</h3>
                <p className="text-xs text-zinc-400">Level up your life</p>
              </div>
            </motion.div>
            <motion.div whileHover={{ scale: 1.05 }} className="p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md flex items-center gap-4 shadow-lg">
              <div className="p-3 bg-red-500/10 rounded-xl"><Flame className="h-6 w-6 text-red-400" /></div>
              <div>
                <h3 className="font-bold text-white">Build Streaks</h3>
                <p className="text-xs text-zinc-400">Don&apos;t break the chain</p>
              </div>
            </motion.div>
            <motion.div whileHover={{ scale: 1.05 }} className="p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md flex items-center gap-4 shadow-lg">
              <div className="p-3 bg-blue-500/10 rounded-xl"><Brain className="h-6 w-6 text-blue-400" /></div>
              <div>
                <h3 className="font-bold text-white">AI Quests</h3>
                <p className="text-xs text-zinc-400">Gemini breaks it down</p>
              </div>
            </motion.div>
            <motion.div whileHover={{ scale: 1.05 }} className="p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md flex items-center gap-4 shadow-lg">
              <div className="p-3 bg-emerald-500/10 rounded-xl"><Users className="h-6 w-6 text-emerald-400" /></div>
              <div>
                <h3 className="font-bold text-white">Co-op Mode</h3>
                <p className="text-xs text-zinc-400">Battle with friends</p>
              </div>
            </motion.div>
          </div>
        </motion.div>

        {/* Right Glassmorphism Auth Panel */}
        <motion.div 
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
          className="w-full max-w-md mx-auto relative"
        >
          {/* Floating Testimonial Pill */}
          <motion.div 
            animate={{ y: [0, -10, 0] }} 
            transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
            className="absolute -top-6 -right-6 md:-right-12 z-20 bg-white/10 backdrop-blur-xl border border-white/20 p-4 rounded-2xl shadow-2xl max-w-[200px]"
          >
            <div className="flex gap-1 mb-1">
              {[1,2,3,4,5].map(i => <Star key={i} className="h-3 w-3 fill-yellow-400 text-yellow-400" />)}
            </div>
            <p className="text-xs text-zinc-300 italic font-medium">&quot;Literally addicted to getting my life together rn tbh.&quot;</p>
          </motion.div>

          <div className="relative bg-black/40 backdrop-blur-2xl border border-white/10 p-8 rounded-[2rem] shadow-[0_0_50px_rgba(0,0,0,0.5)]">
            <div className="text-center space-y-2 mb-8">
              <h2 className="text-3xl font-extrabold tracking-tight text-white">
                {isLogin ? 'Welcome Back' : 'Join the Party'}
              </h2>
              <p className="text-sm text-zinc-400 font-medium">
                {isLogin ? 'Step back into the arena.' : 'Start your gamified productivity journey.'}
              </p>
            </div>

            <form onSubmit={handleAuth} className="space-y-5">
              {!isLogin && (
                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Gamer Tag</label>
                  <input 
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-white/10 bg-white/5 focus:bg-white/10 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-white placeholder:text-zinc-600"
                    placeholder="Enter display name"
                  />
                </div>
              )}
              <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Email Layer</label>
                <input 
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-white/10 bg-white/5 focus:bg-white/10 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-white placeholder:text-zinc-600"
                  placeholder="you@example.com"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Secret Key</label>
                <input 
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-white/10 bg-white/5 focus:bg-white/10 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-white placeholder:text-zinc-600"
                  placeholder="••••••••"
                />
              </div>

              {errorMsg && (
                <p className="text-sm text-red-400 font-bold bg-red-400/10 py-1 px-3 rounded-md">{errorMsg}</p>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full relative flex items-center justify-center gap-2 rounded-xl px-4 py-3.5 text-sm font-bold text-white transition-all bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 shadow-lg hover:shadow-indigo-500/25 disabled:opacity-50 disabled:cursor-not-allowed mt-2 group"
              >
                {isLoading && <Loader2 className="h-5 w-5 animate-spin flex-shrink-0" />}
                {!isLoading && (isLogin ? 'INITIALIZE LOGIN' : 'CREATE CHARACTER')}
                {!isLoading && <ArrowRight className="h-5 w-5 ml-1 group-hover:translate-x-1 group-hover:drop-shadow-[0_0_8px_rgba(255,255,255,0.8)] transition-all flex-shrink-0" />}
              </button>
            </form>

            <div className="text-center mt-6">
              <button
                onClick={() => {
                  setIsLogin(!isLogin);
                  setErrorMsg('');
                }}
                className="text-sm text-zinc-500 hover:text-white transition-colors font-medium"
              >
                {isLogin ? "No character yet? Sign Up" : "Already exist? Sign In"}
              </button>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Social / Testimonial Footer Strip */}
      <div className="relative z-10 w-full border-t border-white/10 bg-white/5 backdrop-blur-md py-8 mt-12 hidden md:block">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-6 opacity-60 hover:opacity-100 transition-opacity">
          <div className="font-bold flex items-center gap-2 text-zinc-400"><Trophy className="h-5 w-5 text-zinc-500" /> Over 10M+ Quests Completed</div>
          <div className="font-bold flex items-center gap-2 text-zinc-400"><Sparkles className="h-5 w-5 text-zinc-500" /> Powered by Gemini AI</div>
          <div className="font-bold flex items-center gap-2 text-zinc-400"><CheckCircle2 className="h-5 w-5 text-zinc-500" /> Supabase Edge Scaled</div>
        </div>
      </div>
    </div>
  );
}
