'use client';

import { useUserStore } from '@/store/userStore';
import { useGamificationStore } from '@/store/gamificationStore';
import { format } from 'date-fns';
import { Download } from 'lucide-react';

export function CertificateGenerator() {
  const { user } = useUserStore();
  const gamification = useGamificationStore((state) => state.data);

  if (!gamification || gamification.level < 5) {
    return (
      <div className="p-6 rounded-2xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-center opacity-70">
        <p className="text-zinc-500 font-medium">Reach Level 5 to unlock your first Productivity Certificate!</p>
      </div>
    );
  }

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Your Certificates</h2>
          <p className="text-zinc-500 text-sm">Download your hard-earned credentials.</p>
        </div>
        <button 
          onClick={handlePrint}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors print:hidden"
        >
          <Download className="h-4 w-4" />
          Save as PDF
        </button>
      </div>

      {/* The Printable Certificate */}
      <div className="relative p-6 md:p-12 overflow-hidden bg-white border-[8px] border-double border-zinc-200 shadow-sm print:shadow-none print:border-zinc-900 mx-auto max-w-3xl aspect-[1.414/1] flex flex-col items-center justify-center text-center print:aspect-auto print:bg-white print:text-black">
        
        {/* Decorative inner border */}
        <div className="absolute inset-4 border border-zinc-200 print:border-zinc-900" />
        
        <div className="relative z-10 space-y-8">
          <div className="space-y-2">
            <h3 className="text-blue-600 print:text-blue-800 font-bold uppercase tracking-widest text-sm">LevelUp Platform</h3>
            <h1 className="text-4xl md:text-5xl font-serif text-zinc-900 print:text-black">Certificate of Achievement</h1>
          </div>

          <div className="space-y-4">
            <p className="text-zinc-500 print:text-zinc-700 italic">This proudly certifies that</p>
            <p className="text-3xl font-bold text-zinc-900 print:text-black border-b border-zinc-300 print:border-zinc-900 pb-2 inline-block px-6 md:px-12">
              {user?.name || user?.email || 'Dedicated Achiever'}
            </p>
          </div>

          <div className="max-w-lg mx-auto text-zinc-600 print:text-zinc-800 leading-relaxed">
            <p>
              has successfully reached <strong>Level {gamification.level}</strong> and demonstrated 
              outstanding productivity, consistency, and dedication to their personal and professional goals.
            </p>
          </div>

          <div className="flex justify-between w-full max-w-md mx-auto pt-12">
            <div className="text-center">
              <div className="border-b border-zinc-300 print:border-zinc-900 w-32 pb-1 mb-2">
                <span className="font-serif italic text-xl">LevelUp Auth</span>
              </div>
              <p className="text-xs uppercase tracking-wider text-zinc-500 print:text-zinc-700">Official Signature</p>
            </div>
            <div className="text-center">
              <div className="border-b border-zinc-300 print:border-zinc-900 w-32 pb-1 mb-2">
                <span className="font-medium text-lg">{format(new Date(), 'MMM dd, yyyy')}</span>
              </div>
              <p className="text-xs uppercase tracking-wider text-zinc-500 print:text-zinc-700">Date Issued</p>
            </div>
          </div>
        </div>

        {/* Seal Placeholder */}
        <div className="absolute bottom-12 right-12 opacity-20 print:opacity-40 pointer-events-none">
          <div className="w-32 h-32 rounded-full border-4 border-dashed border-zinc-400 print:border-zinc-900 flex items-center justify-center">
            <span className="font-serif font-bold text-2xl text-zinc-400 print:text-zinc-900 rotate-[-15deg]">SEAL</span>
          </div>
        </div>
      </div>
    </div>
  );
}
