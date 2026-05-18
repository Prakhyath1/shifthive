import React, { useState } from 'react';
import {
  LayoutDashboard, Users, FileText, CalendarDays,
  ArrowLeftRight, CheckCircle2, History,
  Menu, X, Settings, LogOut, User
} from 'lucide-react';

const navItems = [
  { name: 'Dashboard', icon: LayoutDashboard },
  { name: 'Roster Builder', icon: Users },
  { name: 'Shift Definitions', icon: FileText },
  { name: 'Employee Calendar', icon: CalendarDays },
  { name: 'Swap Requests', icon: ArrowLeftRight },
  { name: 'Swap Approval', icon: CheckCircle2 },
  { name: 'Shift History', icon: History },
];

export default function Sidebar() {
  const [isOpen, setIsOpen] = useState(false);
  const [active, setActive] = useState('Dashboard');

  const handleNavClick = (name) => {
    setActive(name);
    if (window.innerWidth < 1024) setIsOpen(false);
  };

  return (
    <>
      {/* Mobile Overlay */}
      <div
        className={`fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity duration-300 lg:hidden ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={() => setIsOpen(false)}
      />

      {/* Mobile Toggle */}
      <button
        className="fixed top-4 left-4 z-50 flex h-10 w-10 items-center justify-center rounded-xl bg-[#090B10]/90 border border-white/10 text-slate-400 backdrop-blur-md shadow-lg transition-all hover:bg-white/10 hover:text-white lg:hidden"
        onClick={() => setIsOpen(true)}
        aria-label="Open navigation"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Sidebar Container */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-72 border-r border-white/10 bg-[#090B10]/85 backdrop-blur-2xl transition-transform duration-300 ease-out lg:translate-x-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <div className="flex h-full flex-col">
          {/* Logo Header */}
          <div className="flex h-16 items-center justify-between border-b border-white/10 px-6">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 shadow-[0_0_20px_rgba(37,99,235,0.4)]">
                <LayoutDashboard className="h-4 w-4 text-white" />
              </div>
              <span className="text-lg font-bold tracking-tight text-white">
                Shift<span className="text-blue-500">Sense</span>
              </span>
            </div>
            <button
              className="rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-white transition-colors lg:hidden"
              onClick={() => setIsOpen(false)}
              aria-label="Close navigation"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto px-3 py-6 space-y-1">
            {navItems.map((item) => {
              const isActive = active === item.name;
              return (
                <button
                  key={item.name}
                  onClick={() => handleNavClick(item.name)}
                  className={`group relative flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? 'bg-white/8 text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)]'
                      : 'text-slate-400 hover:bg-white/5 hover:text-slate-100'
                  }`}
                >
                  {isActive && (
                    <span className="absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-blue-500" />
                  )}
                  <item.icon className={`h-4 w-4 transition-colors ${isActive ? 'text-blue-400' : 'text-slate-500 group-hover:text-slate-300'}`} />
                  <span className="truncate">{item.name}</span>
                  {isActive && (
                    <span className="ml-auto h-1.5 w-1.5 rounded-full bg-blue-400 shadow-[0_0_8px_rgba(59,130,246,0.6)]" />
                  )}
                </button>
              );
            })}
          </nav>

          {/* Bottom User Profile */}
          <div className="border-t border-white/10 p-4">
            <div className="group flex items-center gap-3 rounded-xl bg-white/5 border border-white/10 p-3 transition-all duration-200 hover:bg-white/10 hover:border-blue-500/30 cursor-pointer">
              <div className="relative h-9 w-9 shrink-0 rounded-full bg-gradient-to-br from-violet-600 to-blue-500 flex items-center justify-center text-xs font-bold text-white ring-2 ring-[#090B10]">
                JD
              </div>
              <div className="flex-1 min-w-0">
                <p className="truncate text-sm font-semibold text-slate-200 group-hover:text-white transition-colors">Jordan Davis</p>
                <p className="truncate text-xs text-slate-500">Workforce Lead</p>
              </div>
              <div className="flex items-center gap-1 text-slate-500">
                <Settings className="h-4 w-4 transition-transform duration-300 group-hover:rotate-90" />
                <LogOut className="h-4 w-4 hover:text-amber-400 transition-colors" />
              </div>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}