import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useUserStore } from '@/store/userStore';
import { useTaskStore, Task } from '@/store/taskStore';
import { useGamificationStore, GamificationData } from '@/store/gamificationStore';
import { useEngagementStore } from '@/store/engagementStore';
import { toast } from 'react-hot-toast';

export function useAppData() {
  const user = useUserStore((state) => state.user);
  const setUser = useUserStore((state) => state.setUser);
  const { setTasks, setLoading: setTasksLoading } = useTaskStore();
  const { setData: setGamificationData, setLoading: setGamificationLoading } = useGamificationStore();
  const { setUserId, processDailyLogin, consumeStreakFreeze } = useEngagementStore();

  useEffect(() => {
    const userId = user?.id;
    if (!userId) return;
    setUserId(userId);

    let isMounted = true;

    async function loadData() {
      setTasksLoading(true);
      setGamificationLoading(true);

      try {
        // Fetch Tasks
        const { data: tasksData, error: tasksError } = await supabase
          .from('tasks')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false });
        
        if (tasksError) throw tasksError;

        // Fetch Gamification — handle missing row gracefully (PGRST116 = no rows)
        const { data: gamificationData, error: gamificationError } = await supabase
          .from('gamification')
          .select('*')
          .eq('user_id', userId)
          .single();
        
        if (gamificationError && gamificationError.code !== 'PGRST116') {
          console.error('Error loading gamification data:', gamificationError);
        }

        let finalGamificationData = gamificationData as GamificationData | null;
        if (finalGamificationData) {
          const today = new Date().toISOString().split('T')[0];
          const lastActiveStr = finalGamificationData.last_active_date;
          const lastActiveDate = lastActiveStr ? lastActiveStr.split('T')[0] : null;

          // Process Local Engagement Decay Patterns (Pets, Chests)
          const yesterdayDate = new Date();
          yesterdayDate.setDate(yesterdayDate.getDate() - 1);
          const yesterdayStr = yesterdayDate.toISOString().split('T')[0];
          
          processDailyLogin(today, yesterdayStr);

          if (lastActiveDate !== today) {
            let newStreakCount = finalGamificationData.streak_count || 0;

            // Process Streak Missing Rules
            if (lastActiveDate && lastActiveDate !== yesterdayStr && lastActiveDate !== today) {
              const freezeUsed = consumeStreakFreeze();
              if (freezeUsed) {
                setTimeout(() => toast('Streak Freeze Activated! Your streak was saved.', { icon: '❄️' }), 2000);
                newStreakCount += 1; // Protected! Continue streak
              } else {
                // If they have no freezes, their actual backend streak would ideally reset here.
                setTimeout(() => toast.error('You missed a day and lost your streak!'), 2000);
                newStreakCount = 1; // Reset streak
              }
            } else if (lastActiveDate === yesterdayStr) {
               newStreakCount += 1; // Consecutive login!
            } else if (!lastActiveDate) {
               newStreakCount = 1; // First day!
            }

            const newXP = finalGamificationData.xp + 5;
            const newLevel = Math.floor(newXP / 100) + 1;
            const newDate = new Date().toISOString();

            const { error: updateError } = await supabase
              .from('gamification')
              .update({ xp: newXP, level: newLevel, last_active_date: newDate, streak_count: newStreakCount })
              .eq('user_id', userId);

            if (!updateError) {
              finalGamificationData = {
                ...finalGamificationData,
                xp: newXP,
                level: newLevel,
                last_active_date: newDate,
                streak_count: newStreakCount
              };
              
              // Add a slight delay to ensure toast shows after DOM paints
              setTimeout(() => {
                toast.success('Congratulations! 5 XP free reward for login', { 
                  duration: 5000,
                  icon: '🏆'
                });
              }, 1000);
            }
          }
        }

        // Fetch User Profile
        const { data: userProfile, error: userError } = await supabase
          .from('users')
          .select('name, username, avatar_url, title, ring')
          .eq('id', userId)
          .single();
        
        if (userError && userError.code !== 'PGRST116') {
          console.error('Error loading user profile:', userError);
        }

        if (isMounted) {
          setTasks(tasksData as Task[]);
          if (finalGamificationData) {
            setGamificationData(finalGamificationData);
          }
          if (userProfile && user) {
            setUser({ ...user, ...userProfile });
          }
        }
      } catch (error) {
        console.error('Error loading app data:', error);
      } finally {
        if (isMounted) {
          setTasksLoading(false);
          setGamificationLoading(false);
        }
      }
    }

    loadData();

    return () => {
      isMounted = false;
    };
  }, [user?.id, setTasks, setTasksLoading, setGamificationData, setGamificationLoading, setUser]);
}
