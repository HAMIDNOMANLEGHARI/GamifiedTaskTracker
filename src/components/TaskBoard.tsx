'use client';

import { useState, useEffect } from 'react';
import { useTaskStore, Task } from '@/store/taskStore';
import { useUserStore } from '@/store/userStore';
import { useGamificationStore } from '@/store/gamificationStore';
import { supabase } from '@/lib/supabase';
import { useTheme } from 'next-themes';
import { Plus, CheckCircle2, Circle, Clock, Trash2, Loader2, Link as LinkIcon, FileText, ChevronDown, ChevronUp, Save } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import confetti from 'canvas-confetti';
import { motion, AnimatePresence } from 'framer-motion';
import dynamic from 'next/dynamic';
import rehypeSanitize from "rehype-sanitize";
import { toast } from 'react-hot-toast';

const MDEditor = dynamic(
  () => import("@uiw/react-md-editor").then((mod) => mod.default),
  { ssr: false }
);

export function TaskBoard() {
  const { user } = useUserStore();
  const { tasks, addTask, updateTask, deleteTask, isLoading } = useTaskStore();
  const { addXP } = useGamificationStore();
  
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskCategory, setNewTaskCategory] = useState('Personal');
  const [newTaskDeadline, setNewTaskDeadline] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [expandedTask, setExpandedTask] = useState<string | null>(null);

  const categories = ['Work', 'Study', 'Personal'];

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim() || !user) return;
    setIsAdding(true);

    try {
      const { data, error } = await supabase
        .from('tasks')
        .insert({
          user_id: user.id,
          title: newTaskTitle,
          category: newTaskCategory,
          deadline: newTaskDeadline ? new Date(newTaskDeadline).toISOString() : null,
          status: 'pending',
          progress: 0,
        })
        .select()
        .single();
      
      if (error) throw error;
      
      addTask(data as Task);
      setNewTaskTitle('');
      setNewTaskDeadline('');
    } catch (err: unknown) {
      console.error('Error adding task:', err);
      const message = err instanceof Error ? err.message : 'Failed to add task to database';
      alert('Error: ' + message);
    } finally {
      setIsAdding(false);
    }
  };

  const handleToggleTask = async (task: Task) => {
    const newStatus = task.status === 'completed' ? 'pending' : 'completed';
    const newProgress = newStatus === 'completed' ? 100 : 0;
    
    updateTask(task.id, { status: newStatus, progress: newProgress });
    
    if (newStatus === 'completed') {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });

      // Calculate completed task count to check for milestone
      const completedCount = tasks.filter(t => t.id !== task.id && t.status === 'completed').length + 1;
      const isMilestone = completedCount > 0 && completedCount % 10 === 0;
      const earnedXP = isMilestone ? 30 : 10; // 10 base + 20 bonus
      
      if (isMilestone) {
        toast.success(`Milestone Reached! 10 Tasks Completed. +30 Total XP!`, { icon: '🎉' });
      } else {
        toast.success(`Task Completed! +10 XP`, { icon: '✨' });
      }

      addXP(earnedXP);
      
      const currentGamification = useGamificationStore.getState().data;
      if (currentGamification) {
        const newTotalXP = currentGamification.xp + earnedXP;
        const newLevel = Math.floor(newTotalXP / 100) + 1;

        // Direct Supabase update instead of broken RPC
        const { error: xpError } = await supabase
          .from('gamification')
          .update({ xp: newTotalXP, level: newLevel })
          .eq('user_id', user?.id);
          
        if (xpError) {
          console.error("XP update error", xpError);
          addXP(-earnedXP); // Roll back local XP
          toast.error("Failed to save XP. Rolling back.");
        }
      }
    }

    try {
      const { error } = await supabase
        .from('tasks')
        .update({ status: newStatus, progress: newProgress, updated_at: new Date().toISOString() })
        .eq('id', task.id);
        
      if (error) {
        updateTask(task.id, { status: task.status, progress: task.progress });
        throw error;
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Network Error';
      console.error('Error updating task:', message);
      alert('Error updating task: ' + message);
    }
  };

  const handleDelete = async (id: string) => {
    deleteTask(id);
    try {
      await supabase.from('tasks').delete().eq('id', id);
    } catch (err) {
      console.error('Error deleting task', err);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-zinc-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <motion.form 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        onSubmit={handleAddTask} 
        className="flex flex-col md:flex-row gap-4 md:items-end bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm"
      >
        <div className="flex-1 min-w-[200px] space-y-2">
          <label className="text-sm font-medium text-zinc-500">I need to...</label>
          <input 
            type="text" 
            value={newTaskTitle}
            onChange={(e) => setNewTaskTitle(e.target.value)}
            className="w-full bg-transparent text-lg border-b border-zinc-200 dark:border-zinc-800 focus:border-blue-500 pb-2 outline-none transition-colors placeholder:text-zinc-300 dark:placeholder:text-zinc-700"
            placeholder="e.g., Read chapter 4 of Biology..."
          />
        </div>
        <div className="w-full md:w-40 space-y-2">
          <label className="text-sm font-medium text-zinc-500">Deadline</label>
          <input 
            aria-label="Task Deadline"
            type="date"
            value={newTaskDeadline}
            onChange={(e) => setNewTaskDeadline(e.target.value)}
            className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          />
        </div>
        <div className="w-full md:w-32 space-y-2">
          <label className="text-sm font-medium text-zinc-500">Category</label>
          <select 
            aria-label="Task Category"
            value={newTaskCategory}
            onChange={(e) => setNewTaskCategory(e.target.value)}
            className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          >
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <button 
          disabled={isAdding || !newTaskTitle.trim()}
          type="submit" 
          className="w-full md:w-auto h-[38px] px-6 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium flex items-center justify-center gap-2 disabled:opacity-50 transition-colors"
        >
          {isAdding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          Add
        </button>
      </motion.form>

      <div className="space-y-3">
        <AnimatePresence mode="popLayout">
          {tasks.map((task) => (
            <motion.div 
              layout
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
              key={task.id} 
              className={cn(
                "flex flex-col p-4 rounded-xl border bg-white dark:bg-zinc-900 transition-all",
                task.status === 'completed' 
                  ? "border-zinc-100 dark:border-zinc-800 opacity-60" 
                  : "border-zinc-200 dark:border-zinc-700 hover:border-blue-300"
              )}
            >
              <div className="flex items-center gap-4">
                <button 
                  onClick={() => handleToggleTask(task)}
                  className="flex-shrink-0 text-zinc-400 hover:text-blue-500 transition-colors"
                >
                  {task.status === 'completed' 
                    ? <CheckCircle2 className="h-6 w-6 text-emerald-500" /> 
                    : <Circle className="h-6 w-6" />
                  }
                </button>
                <div className="flex-1 min-w-0">
                  <p className={cn(
                    "text-lg font-medium truncate",
                    task.status === 'completed' && "line-through text-zinc-500"
                  )}>
                    {task.title}
                  </p>
                  <div className="flex flex-wrap gap-4 mt-1">
                    <span className="inline-flex items-center text-xs font-medium text-zinc-500">
                      <div className={cn(
                        "w-2 h-2 rounded-full mr-2",
                        task.category === 'Work' && "bg-orange-500",
                        task.category === 'Study' && "bg-blue-500",
                        task.category === 'Personal' && "bg-fuchsia-500"
                      )} />
                      {task.category}
                    </span>
                    {task.deadline && (
                      <span className={cn(
                        "inline-flex items-center text-xs",
                        new Date(task.deadline) < new Date() && task.status !== 'completed' 
                          ? "text-red-500 font-medium" 
                          : "text-zinc-400"
                      )}>
                        <Clock className="w-3 h-3 mr-1" />
                        Due: {format(new Date(task.deadline), 'MMM d, yyyy')}
                      </span>
                    )}
                  </div>
                </div>
                
                <button 
                  onClick={() => setExpandedTask(expandedTask === task.id ? null : task.id)}
                  className="p-2 text-zinc-400 hover:text-blue-500 rounded-lg transition-colors"
                  title="Attach Material"
                >
                  {expandedTask === task.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>

                <button 
                  aria-label="Delete Task"
                  onClick={() => handleDelete(task.id)}
                  className="p-2 text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>

              {/* Expandable Materials Section */}
              <AnimatePresence>
                {expandedTask === task.id && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="pt-4 mt-2 border-t border-zinc-100 dark:border-zinc-800 space-y-8 pb-4">
                      {/* Notion-style Markdown Editor */}
                      <TaskNotes taskId={task.id} initialNotes={task.notes || ''} />
                      
                      {/* Attachments & Links */}
                      <TaskMaterials taskId={task.id} />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </AnimatePresence>
        
        {tasks.length === 0 && !isLoading && (
          <div className="text-center py-12 text-zinc-500">
            <CheckCircle2 className="mx-auto h-12 w-12 opacity-20 mb-4" />
            <p>You have no tasks yet. Start creating!</p>
          </div>
        )}
      </div>
    </div>
  );
}

function TaskNotes({ taskId, initialNotes }: { taskId: string, initialNotes: string }) {
  const [value, setValue] = useState(initialNotes);
  const [isSaving, setIsSaving] = useState(false);
  const { updateTask } = useTaskStore();
  const { theme } = useTheme();

  const handleSaveNotes = async () => {
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('tasks')
        .update({ notes: value, updated_at: new Date().toISOString() })
        .eq('id', taskId);
      
      if (error) throw error;
      updateTask(taskId, { notes: value });
    } catch (err) {
      console.error("Failed to save notes", err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-3" data-color-mode={theme === 'dark' ? 'dark' : 'light'}>
      <div className="flex justify-between items-center">
        <h4 className="text-sm font-medium flex items-center gap-2 text-zinc-700 dark:text-zinc-300">
          <FileText className="h-4 w-4 text-zinc-400" />
          Study Notes (Markdown)
        </h4>
        <button 
          onClick={handleSaveNotes}
          disabled={isSaving || value === initialNotes}
          className="text-xs px-3 py-1.5 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 disabled:opacity-50 text-zinc-700 dark:text-zinc-300 font-medium rounded transition-colors flex items-center gap-2"
        >
          {isSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
          {isSaving ? "Saving..." : "Save Notes"}
        </button>
      </div>
      
      <div className="rounded-lg overflow-hidden border border-zinc-200 dark:border-zinc-700">
        <MDEditor
          value={value}
          onChange={(val) => setValue(val || '')}
          previewOptions={{
            rehypePlugins: [[rehypeSanitize]],
          }}
          height={300}
          className="w-full"
        />
      </div>
    </div>
  );
}

interface Material {
  id: string;
  task_id: string;
  file_url: string;
  type: string;
}

function TaskMaterials({ taskId }: { taskId: string }) {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [link, setLink] = useState('');
  const [addingLink, setAddingLink] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    supabase.from('materials').select('*').eq('task_id', taskId)
      .then(({ data }) => setMaterials(data || []));
  }, [taskId]);

  const handleAddLink = async () => {
    if (!link.trim()) return;
    setAddingLink(true);
    const { data, error } = await supabase.from('materials').insert({
      task_id: taskId,
      file_url: link,
      type: 'link'
    }).select().single();

    if (!error && data) {
      setMaterials([data, ...materials]);
      setLink('');
    }
    setAddingLink(false);
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true);
      if (!event.target.files || event.target.files.length === 0) return;
      const file = event.target.files[0];
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `${taskId}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('materials')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage
        .from('materials')
        .getPublicUrl(filePath);

      const fileType = file.type === 'application/pdf' ? 'pdf' : 'note';

      const { data: insertData, error: insertError } = await supabase.from('materials').insert({
        task_id: taskId,
        file_url: publicUrlData.publicUrl,
        type: fileType
      }).select().single();

      if (insertError) throw insertError;
      if (insertData) {
        setMaterials([insertData, ...materials]);
      }
    } catch (error) {
      console.error('Error uploading file:', error);
      alert('Error uploading file. Make sure the "materials" storage bucket is created.');
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteMaterial = async (id: string, file_url: string) => {
    await supabase.from('materials').delete().eq('id', id);
    setMaterials(materials.filter(m => m.id !== id));
    
    // Attempt to delete from storage if it's a generated Supabase URL 
    if (file_url.includes('supabase.co/storage')) {
      const pathMatches = file_url.match(/materials\/(.+)$/);
      if (pathMatches && pathMatches[1]) {
        await supabase.storage.from('materials').remove([pathMatches[1]]);
      }
    }
  };

  return (
    <div className="space-y-4">
      <h4 className="text-sm font-medium flex items-center gap-2 text-zinc-700 dark:text-zinc-300">
        <FileText className="h-4 w-4 text-zinc-400" />
        Course Materials & Attachments
      </h4>
      <div className="flex flex-col gap-3">
        <div className="flex gap-2">
          <input 
            type="url" 
            value={link}
            onChange={e => setLink(e.target.value)}
            placeholder="https://example.com/notes"
            className="flex-1 text-sm px-3 py-1.5 rounded bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 outline-none"
          />
          <button onClick={handleAddLink} disabled={addingLink} className="px-3 py-1.5 min-w-[80px] bg-zinc-200 dark:bg-zinc-700 rounded text-sm font-medium hover:bg-zinc-300 dark:hover:bg-zinc-600 transition-colors">
            {addingLink ? 'Adding...' : 'Add Link'}
          </button>
        </div>
        
        <div className="flex items-center gap-2">
          <label className="flex items-center justify-center px-4 py-2 border-2 border-dashed border-zinc-300 dark:border-zinc-700 rounded-lg cursor-pointer hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-colors text-sm w-full font-medium text-zinc-600 dark:text-zinc-400">
            {uploading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
            {uploading ? 'Uploading...' : 'Upload PDF / Note File'}
            <input 
              type="file" 
              className="hidden" 
              accept=".pdf,.doc,.docx,.txt,image/*"
              onChange={handleFileUpload}
              disabled={uploading}
            />
          </label>
        </div>
      </div>
      {materials.length > 0 && (
        <ul className="space-y-2 mt-4">
          {materials.map(m => (
            <li key={m.id} className="flex items-center justify-between text-sm p-2 rounded bg-zinc-50 dark:bg-zinc-800/50">
              <a href={m.file_url} target="_blank" rel="noreferrer" className="text-blue-500 hover:underline flex items-center gap-2 truncate">
                <LinkIcon className="h-4 w-4 shrink-0" />
                <span className="truncate">{m.type === 'pdf' ? 'PDF Document' : m.file_url}</span>
              </a>
              <button title="Delete Item" onClick={() => handleDeleteMaterial(m.id, m.file_url)} className="text-zinc-400 hover:text-red-500 shrink-0 ml-4">
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
