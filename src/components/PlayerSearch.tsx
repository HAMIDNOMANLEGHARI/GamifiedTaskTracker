'use client';
import { useState, useEffect, useRef } from 'react';
import { Search, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { SHOP_ITEMS } from '@/constants/shop';

interface SearchResult {
  id: string;
  name: string;
  username: string;
  avatar_url: string | null;
  ring: string | null;
  title: string | null;
}

export function PlayerSearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Close dropdown if clicked outside
    function handleClickOutside(event: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setIsSearching(false);
      return;
    }

    const delayDebounceFn = setTimeout(async () => {
      setIsSearching(true);
      try {
        const { data, error } = await supabase
          .from('users')
          .select('id, name, username, avatar_url, ring, title')
          .ilike('username', `%${query.trim()}%`)
          .limit(5);

        if (!error && data) {
          setResults(data as SearchResult[]);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setIsSearching(false);
      }
    }, 400); // 400ms debounce

    return () => clearTimeout(delayDebounceFn);
  }, [query]);

  return (
    <div className="relative px-4 py-2" ref={searchRef}>
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-4 w-4 text-zinc-400" />
        </div>
        <input
          type="text"
          className="w-full bg-zinc-100 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 text-sm rounded-xl pl-9 pr-4 py-2 text-zinc-900 dark:text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
          placeholder="Search gamers..."
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
        />
        {isSearching && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
            <Loader2 className="h-4 w-4 text-zinc-400 animate-spin" />
          </div>
        )}
      </div>

      <AnimatePresence>
        {isOpen && query.trim() && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute top-full left-4 right-4 mt-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl shadow-2xl overflow-hidden z-50"
          >
            {results.length === 0 && !isSearching ? (
              <div className="p-4 text-sm text-center text-zinc-500">
                No players found matching &quot;{query}&quot;
              </div>
            ) : (
              <div className="max-h-64 overflow-y-auto">
                {results.map((user) => {
                  const ringClass = SHOP_ITEMS.rings.find(r => r.id === (user.ring || 'basic-white'))?.borderClass || 'border-zinc-200 dark:border-zinc-700';
                  
                  return (
                    <div
                      key={user.id}
                      onClick={() => {
                        setIsOpen(false);
                        setQuery('');
                        router.push(`/dashboard/u/${user.username}`);
                      }}
                      className="flex items-center gap-3 p-3 hover:bg-zinc-50 dark:hover:bg-zinc-800 cursor-pointer transition-colors border-b border-zinc-100 dark:border-zinc-800 last:border-0"
                    >
                      <div className={`w-8 h-8 rounded-full border-[2px] flex items-center justify-center shrink-0 overflow-hidden bg-zinc-100 dark:bg-black ${ringClass}`}>
                        {user.avatar_url ? (
                          user.avatar_url.startsWith('http') ? (
                            <img src={user.avatar_url} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-sm">{user.avatar_url}</span>
                          )
                        ) : (
                          <span className="text-xs font-bold">{user.name?.charAt(0).toUpperCase()}</span>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold text-zinc-900 dark:text-white truncate">{user.name}</p>
                        <p className="text-[10px] text-zinc-500 truncate">@{user.username || 'unknown'}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
