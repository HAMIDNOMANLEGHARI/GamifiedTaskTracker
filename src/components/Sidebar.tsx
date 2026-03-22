'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, CheckSquare, Trophy, User as UserIcon, LogOut, Users, ShoppingBag, Menu, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import { useUserStore } from '@/store/userStore';
import { SHOP_ITEMS } from '@/constants/shop';
import { PlayerSearch } from '@/components/PlayerSearch';

const navItems = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Tasks', href: '/dashboard/tasks', icon: CheckSquare },
  { name: 'Community', href: '/dashboard/community', icon: Users },
  { name: 'Achievements', href: '/dashboard/achievements', icon: Trophy },
  { name: 'The Vault', href: '/dashboard/shop', icon: ShoppingBag },
  { name: 'Profile', href: '/dashboard/profile', icon: UserIcon },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user, clearUser } = useUserStore();
  const [isOpen, setIsOpen] = useState(false);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    clearUser();
    window.location.href = '/';
  };

  const sidebarContent = (
    <>
      <div className="p-6">
        <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-violet-600 bg-clip-text text-transparent">
          LevelUp
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">Gamified Productivity</p>
      </div>

      <div className="px-2 pb-2">
        <PlayerSearch />
      </div>

      <nav className="flex-1 space-y-1 p-4 pt-1">
        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setIsOpen(false)}
              className={cn(
                'flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-200'
                  : 'text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800/50'
              )}
            >
              <item.icon className="h-5 w-5" />
              {item.name}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50">
        <div className="mb-4 flex items-center gap-3 px-2">
           <div className={`w-10 h-10 rounded-full border-[3px] flex items-center justify-center bg-white dark:bg-black shadow-sm ${SHOP_ITEMS.rings.find(r => r.id === user?.ring)?.borderClass || 'border-zinc-200 dark:border-zinc-700'}`}>
              {user?.avatar_url ? (
                user.avatar_url.startsWith('http') ? (
                   <img src={user.avatar_url} alt="Avatar" className="w-full h-full object-cover rounded-full" />
                ) : (
                   <span className="text-lg">{user.avatar_url}</span>
                )
              ) : (
                 <span className="font-bold text-zinc-600 dark:text-zinc-400">{user?.name?.charAt(0).toUpperCase()}</span>
              )}
           </div>
           <div className="flex-1 min-w-0">
             <div className="text-sm font-bold truncate text-zinc-900 dark:text-white">{user?.name || 'Gamer'}</div>
             <div className="text-[10px] font-black tracking-widest uppercase text-indigo-500 dark:text-indigo-400">{user?.title || 'Novice'}</div>
           </div>
        </div>
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
        >
          <LogOut className="h-5 w-5" />
          Logout
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile hamburger button */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed top-4 left-4 z-50 md:hidden p-2 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-lg"
        aria-label="Open menu"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Mobile sidebar (slide-in drawer) */}
      <div
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-64 flex flex-col border-r bg-white/95 dark:bg-zinc-900/95 backdrop-blur-xl transition-transform duration-300 md:hidden',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <button
          onClick={() => setIsOpen(false)}
          className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          aria-label="Close menu"
        >
          <X className="h-5 w-5" />
        </button>
        {sidebarContent}
      </div>

      {/* Desktop sidebar (always visible) */}
      <div className="hidden md:flex h-screen w-64 flex-col border-r bg-white/50 dark:bg-zinc-900/50 backdrop-blur-xl">
        {sidebarContent}
      </div>
    </>
  );
}
