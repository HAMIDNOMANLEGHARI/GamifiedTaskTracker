'use client';

import { useState } from 'react';
import { Sparkles, Loader2, Target, Check } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useUserStore } from '@/store/userStore';
import { useTaskStore, Task } from '@/store/taskStore';

interface GeneratedTask {
  title: string;
  deadline_days_offset: number;
}

export function SmartQuestGenerator() {
  const { user } = useUserStore();
  const { addTask } = useTaskStore();
  
  const [goal, setGoal] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedTasks, setGeneratedTasks] = useState<GeneratedTask[]>([]);
  const [error, setError] = useState('');
  const [isAccepting, setIsAccepting] = useState(false);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!goal.trim()) return;
    setIsGenerating(true);
    setError('');
    setGeneratedTasks([]);

    try {
      const res = await fetch('/api/generate-quest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ goal })
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || 'Failed to generate quest');
      }

      setGeneratedTasks(data.tasks);
    } catch (err) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const error = err as any;
      setError(error.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAcceptQuest = async () => {
    if (!user || generatedTasks.length === 0) return;
    setIsAccepting(true);

    try {
      // Create promises for all tasks
      const promises = generatedTasks.map(t => {
        const deadline = new Date();
        deadline.setDate(deadline.getDate() + t.deadline_days_offset);
        
        return supabase.from('tasks').insert({
          user_id: user.id,
          title: t.title,
          category: 'Personal', // Default AI tasks to Personal
          deadline: deadline.toISOString(),
          status: 'pending',
          progress: 0,
        }).select().single();
      });

      const results = await Promise.all(promises);
      
      // Update global store
      results.forEach(res => {
        if (res.data && !res.error) {
          addTask(res.data as Task);
        }
      });

      // Reset UI
      setGoal('');
      setGeneratedTasks([]);
    } catch (err) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const error = err as any;
      console.error(error);
      setError("Failed to accept quest into your database.");
    } finally {
      setIsAccepting(false);
    }
  };

  return (
    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-2xl p-6 border border-blue-100 dark:border-blue-900/50 mb-8">
      <div className="flex items-start gap-4">
        <div className="p-3 bg-blue-600 rounded-xl text-white shadow-lg shadow-blue-500/20 shrink-0 mt-1">
          <Sparkles className="h-6 w-6" />
        </div>
        
        <div className="flex-1 min-w-0 space-y-4">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-blue-900 dark:text-blue-100">AI Quest Generator</h2>
            <p className="text-blue-700/80 dark:text-blue-300">Enter a big goal and let our AI break it down into an actionable quest.</p>
          </div>

          <form onSubmit={handleGenerate} className="flex flex-col sm:flex-row gap-3">
            <input 
              type="text" 
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              placeholder="e.g. Learn Next.js or Run a Marathon"
              className="flex-1 min-w-0 w-full px-4 py-2.5 rounded-lg border-0 ring-1 ring-blue-200 dark:ring-blue-800 bg-white/80 dark:bg-black/50 outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium"
            />
            <button 
              disabled={isGenerating || !goal.trim()}
              type="submit"
              className="w-full sm:w-auto px-6 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold transition-colors disabled:opacity-50 flex justify-center items-center gap-2"
            >
              {isGenerating ? <Loader2 className="h-5 w-5 animate-spin" /> : <Target className="h-5 w-5" />}
              Generate
            </button>
          </form>

          {error && (
            <div className="text-sm font-medium text-red-500 bg-red-50 dark:bg-red-500/10 p-3 rounded-lg border border-red-200 dark:border-red-900/50">
              {error}
            </div>
          )}

          {generatedTasks.length > 0 && (
            <div className="pt-4 space-y-4">
              <h3 className="font-semibold text-blue-900 dark:text-blue-100 uppercase tracking-wider text-sm flex items-center gap-2">
                <Check className="h-4 w-4" /> Proposed Quest Line
              </h3>
              <ul className="space-y-2">
                {generatedTasks.map((t, idx) => (
                  <li key={idx} className="flex items-center gap-3 bg-white dark:bg-zinc-900 p-3 rounded-lg border border-blue-100 dark:border-zinc-800 shadow-sm">
                    <div className="h-6 w-6 rounded-full bg-blue-100 dark:bg-zinc-800 text-blue-700 dark:text-zinc-400 flex items-center justify-center text-xs font-bold font-mono">
                      {idx + 1}
                    </div>
                    <span className="flex-1 font-medium">{t.title}</span>
                    <span className="text-xs text-zinc-500 bg-zinc-100 dark:bg-zinc-800 px-2 py-1 rounded">
                      Due in {t.deadline_days_offset} days
                    </span>
                  </li>
                ))}
              </ul>
              <button 
                onClick={handleAcceptQuest}
                disabled={isAccepting}
                className="w-full py-3 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white font-bold tracking-wide transition-colors flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 disabled:opacity-50"
              >
                {isAccepting ? <Loader2 className="h-5 w-5 animate-spin" /> : <Sparkles className="h-5 w-5" />}
                Accept Quest!
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
