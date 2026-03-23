'use client';

import { useTaskStore } from '@/store/taskStore';
import { useMemo, useState } from 'react';
import { format, subDays, startOfWeek, addDays, getMonth } from 'date-fns';

export function DashboardCharts() {
  const { tasks } = useTaskStore();
  const [hoveredCell, setHoveredCell] = useState<{ date: Date; count: number; x: number; y: number } | null>(null);

  const { weeks, totalCount } = useMemo(() => {
    const today = new Date();
    const startOfCurrentWeek = startOfWeek(today, { weekStartsOn: 0 }); // 0 = Sunday
    // Go back exactly 51 weeks from the start of the current week to have exactly 52 columns including current week
    const startDate = subDays(startOfCurrentWeek, 357); 

    const dayMap = new Map<string, number>();
    let total = 0;

    tasks.forEach(task => {
      if (task.status === 'completed') {
        const completedDate = task.updated_at || task.created_at;
        const compDateObj = new Date(completedDate);
        if (compDateObj >= startDate && compDateObj <= today) {
          const dStr = format(compDateObj, 'yyyy-MM-dd');
          dayMap.set(dStr, (dayMap.get(dStr) || 0) + 1);
          total++;
        }
      }
    });

    const generatedWeeks: { date: Date; count: number; dateStr: string; inFuture: boolean }[][] = [];
    
    let currentDate = startDate;
    for (let w = 0; w < 52; w++) {
      const week: { date: Date; count: number; dateStr: string; inFuture: boolean }[] = [];
      for (let d = 0; d < 7; d++) {
        const dateStr = format(currentDate, 'yyyy-MM-dd');
        const count = dayMap.get(dateStr) || 0;
        
        week.push({ 
          date: currentDate, 
          count, 
          dateStr,
          inFuture: currentDate > today
        });
        currentDate = addDays(currentDate, 1);
      }
      generatedWeeks.push(week);
    }

    return { weeks: generatedWeeks, totalCount: total };
  }, [tasks]);

  const getColorClass = (count: number, inFuture: boolean) => {
    if (inFuture) return 'bg-transparent';
    if (count === 0) return 'bg-zinc-100 dark:bg-zinc-800/80 outline outline-1 outline-black/5 dark:outline-white/5 -outline-offset-1';
    
    if (count === 1) return 'bg-[#9be9a8] dark:bg-[#0e4429] outline outline-1 outline-black/5 dark:outline-transparent -outline-offset-1';
    if (count === 2) return 'bg-[#40c463] dark:bg-[#006d32] outline outline-1 outline-black/5 dark:outline-transparent -outline-offset-1';
    if (count >= 3 && count <= 4) return 'bg-[#30a14e] dark:bg-[#26a641] outline outline-1 outline-black/5 dark:outline-transparent -outline-offset-1';
    return 'bg-[#216e39] dark:bg-[#39d353] outline outline-1 outline-black/5 dark:outline-transparent -outline-offset-1';
  };

  const monthLabels = [];
  let currentMonth = -1;
  for (let w = 0; w < weeks.length; w++) {
    const firstDayOfWeek = weeks[w][0].date;
    const m = getMonth(firstDayOfWeek);
    if (m !== currentMonth) {
      // Only push labels if there's enough room to avoid crowding the start
      if (w > 0 || weeks.length === 52) {
        monthLabels.push({ month: format(firstDayOfWeek, 'MMM'), index: w });
      }
      currentMonth = m;
    }
  }

  return (
    <div className="w-full flex flex-col p-6 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-[2rem] shadow-sm relative overflow-hidden">
      <h3 className="text-zinc-600 dark:text-zinc-400 mb-6 font-medium">
        {totalCount} contributions in the last year
      </h3>
      
      <div className="relative flex w-full overflow-x-auto pb-6 hide-scrollbar">
        <div className="flex flex-col min-w-max">
          <div className="flex text-xs text-zinc-500 mb-2 pl-8 relative h-4">
            {monthLabels.map((label, i) => (
              <div 
                key={i} 
                className="absolute"
                style={{ left: `calc(2rem + ${label.index * 16}px)` }} // 14px cell + 2px gap = 16px
              >
                {label.month}
              </div>
            ))}
          </div>

          <div className="flex">
            <div className="flex flex-col gap-[2px] text-xs text-zinc-500 pr-2 pt-[2px]">
              <div className="h-[14px]"></div>
              <div className="h-[14px] leading-[14px]">Mon</div>
              <div className="h-[14px]"></div>
              <div className="h-[14px] leading-[14px]">Wed</div>
              <div className="h-[14px]"></div>
              <div className="h-[14px] leading-[14px]">Fri</div>
              <div className="h-[14px]"></div>
            </div>

            <div className="flex gap-[2px]" onMouseLeave={() => setHoveredCell(null)}>
              {weeks.map((week, wIndex) => (
                <div key={wIndex} className="flex flex-col gap-[2px]">
                  {week.map((day) => (
                    <div
                      key={day.dateStr}
                      onMouseEnter={(e) => {
                         if (day.inFuture) return;
                         const rect = e.currentTarget.getBoundingClientRect();
                         setHoveredCell({
                           date: day.date,
                           count: day.count,
                           x: rect.left + rect.width / 2,
                           y: rect.top - 10
                         });
                      }}
                      className={`w-[14px] h-[14px] rounded-[2px] transition-colors duration-200 ${day.inFuture ? '' : 'cursor-pointer'} ${getColorClass(day.count, day.inFuture)}`}
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>
          
          <div className="flex items-center justify-end gap-2 text-xs text-zinc-500 mt-4 mr-2">
            <span>Less</span>
            <div className="flex gap-[2px]">
              <div className="w-[14px] h-[14px] rounded-[2px] bg-zinc-100 dark:bg-zinc-800/80 outline outline-1 outline-black/5 dark:outline-white/5 -outline-offset-1" />
              <div className="w-[14px] h-[14px] rounded-[2px] bg-[#9be9a8] dark:bg-[#0e4429] outline outline-1 outline-black/5 dark:outline-transparent -outline-offset-1" />
              <div className="w-[14px] h-[14px] rounded-[2px] bg-[#40c463] dark:bg-[#006d32] outline outline-1 outline-black/5 dark:outline-transparent -outline-offset-1" />
              <div className="w-[14px] h-[14px] rounded-[2px] bg-[#30a14e] dark:bg-[#26a641] outline outline-1 outline-black/5 dark:outline-transparent -outline-offset-1" />
              <div className="w-[14px] h-[14px] rounded-[2px] bg-[#216e39] dark:bg-[#39d353] outline outline-1 outline-black/5 dark:outline-transparent -outline-offset-1" />
            </div>
            <span>More</span>
          </div>
          
          <div className="mt-4 text-xs text-zinc-500/60 pl-8">
            Learn how we count contributions
          </div>
        </div>
      </div>

      {hoveredCell && (
        <div 
          className="fixed z-[100] px-3 py-2 bg-zinc-900 border border-zinc-700 text-white text-xs font-medium rounded-lg shadow-xl pointer-events-none transform -translate-x-1/2 -translate-y-full flex flex-col items-center whitespace-nowrap"
          style={{ left: hoveredCell.x, top: hoveredCell.y }}
        >
          <span>
            <strong className="text-zinc-100">{hoveredCell.count === 0 ? 'No' : hoveredCell.count} contributions</strong> on {format(hoveredCell.date, 'MMMM do')}
          </span>
          <div className="absolute -bottom-[5px] left-1/2 -translate-x-1/2 w-0 h-0 border-l-[6px] border-r-[6px] border-t-[6px] border-transparent border-t-zinc-900"></div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{__html: `
        .hide-scrollbar::-webkit-scrollbar {
            display: none;
        }
        .hide-scrollbar {
            -ms-overflow-style: none;
            scrollbar-width: none;
        }
      `}} />
    </div>
  );
}
