'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { HomeIcon, Cog6ToothIcon, UserIcon } from '@heroicons/react/24/solid';

export default function BottomNav() {
  const pathname = usePathname();

  const isActive = (path) => pathname === path ? "text-[#0D9488]" : "text-slate-400";

  return (
    <div className="fixed bottom-0 left-0 w-full bg-white border-t border-slate-200 pb-6 pt-3 px-6 flex justify-around items-end z-50">
      <Link href="/dashboard" className={`flex flex-col items-center gap-1 ${isActive('/dashboard')}`}>
        <HomeIcon className="w-6 h-6" />
        <span className="text-[10px] font-bold">Search</span>
      </Link>
      
      <Link href="/settings" className={`flex flex-col items-center gap-1 ${isActive('/settings')}`}>
        <Cog6ToothIcon className="w-6 h-6" />
        <span className="text-[10px] font-bold">Settings</span>
      </Link>

      <div className={`flex flex-col items-center gap-1 text-slate-300`}>
        <UserIcon className="w-6 h-6" />
        <span className="text-[10px] font-bold">Account</span>
      </div>
    </div>
  );
}