'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { clearAuth, getAuth } from '@/lib/auth';
import { motion } from 'framer-motion';
import {
  LayoutDashboard, Camera, Package, ArrowLeftRight,
  History, LogOut, Pill, ChevronRight
} from 'lucide-react';

const links = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/scan', label: 'Escanear', icon: Camera },
  { href: '/products', label: 'Productos', icon: Package },
  { href: '/movements', label: 'Movimientos', icon: ArrowLeftRight },
  { href: '/history', label: 'Historial', icon: History },
];

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const auth = getAuth();

  const handleLogout = () => {
    clearAuth();
    router.push('/login');
  };

  return (
    <>
      {/* Sidebar de escritorio */}
      <aside className="hidden md:flex flex-col fixed left-0 top-0 h-screen w-60 bg-white border-r border-slate-200/80 z-50">
        {/* Logo */}
        <div className="px-6 py-5 border-b border-slate-200/80">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 gradient-primary rounded-lg flex items-center justify-center">
              <Pill size={16} className="text-white" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900">MediStock</p>
              <p className="text-xs text-slate-400">Inventario AI</p>
            </div>
          </div>
        </div>

        {/* Navegación */}
        <nav className="flex-1 px-3 py-4 space-y-0.5">
          {links.map(({ href, label, icon: Icon }) => {
            const active = pathname === href;
            return (
              <Link key={href} href={href}>
                <div className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 group ${
                  active
                    ? 'bg-indigo-50 text-indigo-600'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}>
                  <Icon size={18} className={active ? 'text-indigo-600' : 'text-slate-400 group-hover:text-slate-600'} />
                  {label}
                  {active && <ChevronRight size={14} className="ml-auto text-indigo-400" />}
                </div>
              </Link>
            );
          })}
        </nav>

        {/* Usuario */}
        <div className="px-3 py-4 border-t border-slate-200/80">
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-50 transition-colors">
            <div className="w-8 h-8 gradient-primary rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
              {auth?.name?.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-900 truncate">{auth?.name}</p>
              <p className="text-xs text-slate-400 capitalize">{auth?.role}</p>
            </div>
            <button onClick={handleLogout} className="text-slate-400 hover:text-red-500 transition-colors p-1">
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      {/* Barra superior en móvil */}
      <header className="md:hidden bg-white/80 backdrop-blur-sm border-b border-slate-200/80 px-4 py-3.5 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 gradient-primary rounded-lg flex items-center justify-center">
            <Pill size={14} className="text-white" />
          </div>
          <span className="text-sm font-bold text-slate-900">MediStock</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-400 font-medium">{auth?.name}</span>
          <button onClick={handleLogout} className="p-1.5 text-slate-400 hover:text-red-500 transition-colors">
            <LogOut size={16} />
          </button>
        </div>
      </header>

      {/* Navegación inferior en móvil */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-sm border-t border-slate-200/80 z-50 px-2 pb-safe">
        <div className="flex">
          {links.map(({ href, label, icon: Icon }) => {
            const active = pathname === href;
            return (
              <Link key={href} href={href} className="flex-1">
                <div className={`flex flex-col items-center py-2.5 gap-1 transition-all duration-150 relative ${
                  active ? 'text-indigo-600' : 'text-slate-400'
                }`}>
                  {active && (
                    <motion.div
                      layoutId="activeTab"
                      className="absolute h-0.5 w-8 bg-indigo-600 rounded-full -top-px"
                    />
                  )}
                  <Icon size={20} strokeWidth={active ? 2.5 : 1.8} />
                  <span className="text-[10px] font-medium">{label}</span>
                </div>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
