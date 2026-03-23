'use client';

import { Sparkles, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';

export function LandingHeader() {
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <motion.header 
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="fixed top-0 left-0 right-0 z-[100] border-b border-white/5 bg-[#050505]/60 backdrop-blur-xl h-16 flex items-center"
    >
      <div className="max-w-7xl mx-auto px-6 w-full flex items-center justify-between">
        <div className="flex items-center gap-2 cursor-pointer font-bold text-lg text-white" onClick={scrollToTop}>
          <Sparkles className="h-5 w-5 text-indigo-500" />
          <span>QuestLog</span>
        </div>

        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-zinc-400">
          <button onClick={scrollToTop} className="hover:text-white transition-colors">Product</button>
          <button onClick={scrollToTop} className="hover:text-white transition-colors">Features</button>
          <button onClick={scrollToTop} className="hover:text-white transition-colors">Leaderboard</button>
          <button onClick={scrollToTop} className="hover:text-white transition-colors">Company</button>
        </nav>

        <div className="flex items-center gap-4">
          <button onClick={scrollToTop} className="hidden md:block text-sm font-medium text-zinc-300 hover:text-white transition-colors">
            Log in
          </button>
          <button 
            onClick={scrollToTop}
            className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 border border-white/10 transition-colors text-white text-xs font-bold px-4 py-2 rounded-full"
          >
            Enter Arena <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </motion.header>
  );
}
