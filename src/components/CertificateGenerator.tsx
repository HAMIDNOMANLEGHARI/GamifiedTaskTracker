'use client';

import { useRef, useState, useEffect } from 'react';
import { useUserStore } from '@/store/userStore';
import { useGamificationStore } from '@/store/gamificationStore';
import { format } from 'date-fns';
import { Download, Loader2, Award } from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

export function CertificateGenerator() {
  const { user } = useUserStore();
  const gamification = useGamificationStore((state) => state.data);
  const printRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [scale, setScale] = useState(1);

  // Dynamically calculate scale based on available container width
  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current) {
        const availableWidth = containerRef.current.clientWidth - 48; // 24px padding on each side
        if (availableWidth < 1000) {
          setScale(availableWidth / 1000);
        } else {
          setScale(1);
        }
      }
    };
    
    handleResize(); // Initial measurement
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  if (!gamification || gamification.level < 5) {
    return (
      <div className="p-6 rounded-2xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-center opacity-70">
        <p className="text-zinc-500 font-medium">Reach Level 5 to unlock your first Productivity Certificate!</p>
      </div>
    );
  }

  const handleDownloadPdf = async () => {
    const element = printRef.current;
    if (!element) return;
    
    setIsDownloading(true);
    try {
      // Temporarily ensure the element is visible and styled correctly for the canvas capture
      const canvas = await html2canvas(element, {
        scale: 3, // High resolution
        useCORS: true,
        backgroundColor: '#fcfcf9',
        onclone: (document) => {
          // Remove the responsive CSS scale exclusively for the PDF capture
          const el = document.getElementById('printable-certificate');
          if (el) {
            el.style.transform = 'none';
          }
        }
      });
      const data = canvas.toDataURL('image/png');
      
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'px',
        format: [canvas.width, canvas.height]
      });
      
      pdf.addImage(data, 'PNG', 0, 0, canvas.width, canvas.height);
      pdf.save(`LevelUp_Certificate_${user?.name || 'Achiever'}.pdf`);
    } catch (error) {
      console.error('Failed to generate PDF', error);
      alert('Failed to generate PDF. Please try again. Ensure ad-blockers are disabled.');
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="space-y-6 flex flex-col items-center w-full">
      <div className="flex flex-col sm:flex-row justify-between items-center w-full max-w-4xl gap-4">
        <div className="text-center sm:text-left">
          <h2 className="text-xl font-bold tracking-tight">Official Credentials</h2>
          <p className="text-zinc-500 text-sm">Valid proof of your elite productivity.</p>
        </div>
        <button 
          onClick={handleDownloadPdf}
          disabled={isDownloading}
          className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-6 py-2.5 rounded-xl font-bold transition-all disabled:opacity-50 shadow-lg shadow-blue-500/20"
        >
          {isDownloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
          {isDownloading ? 'Generating HQ PDF...' : 'Download HD PDF'}
        </button>
      </div>

      {/* The Printable Certificate Container */}
      {/* Dynamically scales visually but retains 1000px DOM structure for perfect PDF export */}
      <div 
        ref={containerRef}
        className="w-full overflow-hidden flex justify-center bg-zinc-100 dark:bg-zinc-800/20 rounded-2xl py-8 transition-all duration-300"
        style={{ height: `${700 * scale + 64}px` }}
      >
        {/* Fixed Wrapper for Canvas target guaranteeing HD quality */}
        <div 
          id="printable-certificate"
          ref={printRef}
          className="relative bg-[#fcfcf9] w-[1000px] h-[700px] flex flex-col items-center justify-center text-center text-black p-8 shadow-2xl shrink-0 origin-top transition-transform duration-300"
          style={{ 
            transform: `scale(${scale})`,
            backgroundImage: 'radial-gradient(#e5e7eb 1px, transparent 1px)', 
            backgroundSize: '40px 40px' 
          }}
        >
          {/* Outer Border */}
          <div className="absolute inset-0 m-6 border-[12px] border-[#1e3a8a] rounded-sm pointer-events-none" />
          {/* Inner Gold Border */}
          <div className="absolute inset-0 m-[32px] border-[3px] border-[#b45309] rounded-sm pointer-events-none opacity-80" />
          {/* Corner accents */}
          <div className="absolute top-[30px] left-[30px] w-4 h-4 border-t-4 border-l-4 border-[#1e3a8a] pointer-events-none" />
          <div className="absolute top-[30px] right-[30px] w-4 h-4 border-t-4 border-r-4 border-[#1e3a8a] pointer-events-none" />
          <div className="absolute bottom-[30px] left-[30px] w-4 h-4 border-b-4 border-l-4 border-[#1e3a8a] pointer-events-none" />
          <div className="absolute bottom-[30px] right-[30px] w-4 h-4 border-b-4 border-r-4 border-[#1e3a8a] pointer-events-none" />
          
          <div className="relative z-10 flex flex-col items-center justify-between h-full w-full py-12 px-16">
            
            {/* Header */}
            <div className="space-y-4">
              <div className="mx-auto w-16 h-16 rounded-full bg-[#1e3a8a] flex items-center justify-center mb-6 shadow-md border-2 border-white">
                <Award className="h-8 w-8 text-[#fbbf24]" />
              </div>
              <h3 className="text-[#b45309] font-bold uppercase tracking-[0.3em] text-sm">LevelUp Global Vanguard</h3>
              <h1 className="text-5xl font-serif text-[#1e3a8a] uppercase tracking-wide">Certificate of Excellence</h1>
            </div>

            {/* Body */}
            <div className="space-y-6 w-full max-w-3xl mt-12">
              <p className="text-zinc-500 font-serif italic text-xl text-[#4b5563]">This prestigious honor is hereby awarded to</p>
              
              <div className="py-2">
                <h2 className="text-5xl font-serif font-bold text-black border-b border-[#b45309]/30 pb-4 px-12 inline-block">
                  {user?.name || user?.email || 'Dedicated Achiever'}
                </h2>
              </div>
              
              <p className="text-[#374151] font-serif leading-relaxed text-lg mt-6 px-12">
                for demonstrating unparalleled dedication, consistency, and mastery in personal productivity. <br/>
                Having successfully breached <strong className="text-[#1e3a8a]">Level {gamification.level}</strong>, the recipient has proven their capacity to conquer daily quests and forge an elite path forward.
              </p>
            </div>

            {/* Footer Signatures */}
            <div className="flex justify-between w-full mt-auto pt-12 px-12">
              <div className="text-center w-56">
                <div className="border-b-2 border-slate-300 pb-2 mb-2 relative">
                  <span className="font-serif italic text-3xl text-[#1e3a8a]" style={{ fontFamily: "'Brush Script MT', cursive, serif" }}>Alexander Sterling</span>
                </div>
                <p className="text-[10px] uppercase tracking-widest text-[#4b5563] font-bold">Chief Executive Officer</p>
              </div>
              
              {/* Gold Seal */}
              <div className="relative flex items-center justify-center translate-y-8">
                <div className="w-36 h-36 rounded-full flex items-center justify-center bg-gradient-to-br from-[#fbbf24] via-[#f59e0b] to-[#b45309] shadow-2xl text-white relative">
                  {/* Outer Ridge */}
                  <div className="absolute inset-2 rounded-full border border-white/30" />
                  <div className="absolute inset-1 rounded-full border border-black/10" />
                  <div className="w-28 h-28 rounded-full border-[2px] border-white/60 flex items-center justify-center">
                    <div className="text-center">
                      <div className="text-[10px] uppercase tracking-widest font-bold opacity-90 mb-1">Official</div>
                      <div className="text-4xl font-serif font-bold my-1 drop-shadow-md">SEAL</div>
                      <div className="text-[10px] font-medium opacity-80 mt-1">Authentic</div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="text-center w-56">
                <div className="border-b-2 border-slate-300 pb-2 mb-2 mt-4">
                  <span className="font-serif text-2xl text-black">{format(new Date(), 'MMMM dd, yyyy')}</span>
                </div>
                <p className="text-[10px] uppercase tracking-widest text-[#4b5563] font-bold">Date of Issuance</p>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
