'use client';

import { Sparkles } from 'lucide-react';

export function LandingFooter() {
  return (
    <footer className="w-full bg-[#050505] border-t border-white/5 pt-24 pb-12 px-6 relative z-10">
      <div className="max-w-7xl mx-auto flex flex-col gap-16">
        
        {/* Multi-column Top */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-10">
          <div className="col-span-2 md:col-span-2 space-y-4">
            <div className="flex items-center gap-2 font-bold text-lg text-white">
              <Sparkles className="h-5 w-5 text-indigo-500" />
              <span>QuestLog</span>
            </div>
            <p className="text-zinc-500 text-sm max-w-xs">
              Gamifying actual human potential. Turn your boring tasks into an addictive real-world MMO experience.
            </p>
          </div>
          
          <div className="space-y-4">
            <h4 className="text-white text-sm font-bold tracking-tight">Product</h4>
            <div className="flex flex-col gap-3 text-sm text-zinc-500 font-medium">
              <a href="#" className="hover:text-white transition-colors">Features</a>
              <a href="#" className="hover:text-white transition-colors">Pricing</a>
              <a href="#" className="hover:text-white transition-colors">Changelog</a>
              <a href="#" className="hover:text-white transition-colors">Documentation</a>
            </div>
          </div>
          
          <div className="space-y-4">
            <h4 className="text-white text-sm font-bold tracking-tight">Company</h4>
            <div className="flex flex-col gap-3 text-sm text-zinc-500 font-medium">
              <a href="#" className="hover:text-white transition-colors">About Us</a>
              <a href="#" className="hover:text-white transition-colors">Careers</a>
              <a href="#" className="hover:text-white transition-colors">Blog</a>
              <a href="#" className="hover:text-white transition-colors">Contact</a>
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="text-white text-sm font-bold tracking-tight">Legal</h4>
            <div className="flex flex-col gap-3 text-sm text-zinc-500 font-medium">
              <a href="#" className="hover:text-white transition-colors">Privacy Policy</a>
              <a href="#" className="hover:text-white transition-colors">Terms of Service</a>
              <a href="#" className="hover:text-white transition-colors">Cookie Policy</a>
            </div>
          </div>
        </div>

        {/* Bottom Strip */}
        <div className="flex flex-col md:flex-row items-center justify-between pt-8 border-t border-white/5 gap-4">
          <p className="text-zinc-500 text-xs font-medium">
            &copy; {new Date().getFullYear()} QuestLog Inc. All rights reserved.
          </p>

          <p className="text-white text-sm font-bold tracking-widest uppercase">
            Powered by HNL
          </p>
        </div>
      </div>
    </footer>
  );
}
