import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useUserStore } from '@/store/userStore';
import { useTaskStore, Task } from '@/store/taskStore';
import { useGamificationStore, GamificationData } from '@/store/gamificationStore';

export function useAppData() {
  const user = useUserStore((state) => state.user);
  const setUser = useUserStore((state) => state.setUser);
  const { setTasks, setLoading: setTasksLoading } = useTaskStore();
  const { setData: setGamificationData, setLoading: setGamificationLoading } = useGamificationStore();

  useEffect(() => {
    const userId = user?.id;
    if (!userId) return;

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
          if (gamificationData) {
            setGamificationData(gamificationData as GamificationData);
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
