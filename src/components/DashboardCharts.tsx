'use client';

import { useTaskStore } from '@/store/taskStore';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';
import { useMemo } from 'react';
import { format, subDays } from 'date-fns';

export function DashboardCharts() {
  const { tasks } = useTaskStore();

  const data = useMemo(() => {
    // Generate last 7 days data
    const days = Array.from({ length: 7 }).map((_, i) => {
      const date = subDays(new Date(), 6 - i);
      return {
        dateStr: format(date, 'yyyy-MM-dd'),
        display: format(date, 'EEE'), // Mon, Tue
        Tasks_Completed: 0,
      };
    });

    tasks.forEach(task => {
      if (task.status === 'completed') {
        // Use updated_at (when the task was completed) instead of created_at
        const completedDate = task.updated_at || task.created_at;
        const dStr = format(new Date(completedDate), 'yyyy-MM-dd');
        const day = days.find(d => d.dateStr === dStr);
        if (day) {
          day.Tasks_Completed += 1;
        }
      }
    });

    return days;
  }, [tasks]);

  return (
    <div className="h-full w-full min-h-[250px] flex flex-col pt-4">
      <h3 className="text-sm font-semibold text-zinc-500 mb-4 px-2">Task Activity (Last 7 Days)</h3>
      <div className="flex-1">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.2} />
            <XAxis dataKey="display" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} dy={10} />
            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12 }} dx={-10} allowDecimals={false} />
            <Tooltip 
              cursor={{ fill: 'transparent' }}
              contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
            />
            <Bar dataKey="Tasks_Completed" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={40} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
