'use client';

import { Sidebar } from '@/components/Sidebar';
import { useAppData } from '@/hooks/useAppData';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { motion } from 'framer-motion';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  useAppData();

  return (
    <div className="flex h-screen overflow-hidden bg-zinc-50 dark:bg-black">
      <Sidebar />
      <main className="flex-1 overflow-y-auto p-8">
        <ErrorBoundary fallbackMessage="Something went wrong loading this page. Check your connection and try again.">
          <motion.div
            initial={{ opacity: 0, scale: 0.98, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="h-full"
          >
            {children}
          </motion.div>
        </ErrorBoundary>
      </main>
    </div>
  );
}
