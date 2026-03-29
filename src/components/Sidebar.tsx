import React from 'react';
import { useAppContext } from '@/contexts/AppContext';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { PageView } from '@/types';
import { PLAN_LIMITS } from '@/lib/subscription';
import {
  LayoutDashboard, FileText, Receipt, Users, Camera, History,
  Settings, Ruler, ChevronLeft, ChevronRight, Crosshair, LogOut, Crown, Zap
} from 'lucide-react';

const navItems: { view: PageView; label: string; icon: React.ReactNode }[] = [
  { view: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={20} /> },
  { view: 'estimates', label: 'Estimates', icon: <FileText size={20} /> },
  { view: 'invoices', label: 'Invoices', icon: <Receipt size={20} /> },
  { view: 'customers', label: 'Customers', icon: <Users size={20} /> },
  { view: 'measure', label: 'Auto Measure', icon: <Camera size={20} /> },
  { view: 'calibration', label: 'Calibration', icon: <Crosshair size={20} /> },
  { view: 'history', label: 'History', icon: <History size={20} /> },
  { view: 'settings', label: 'Settings', icon: <Settings size={20} /> },
];

const Sidebar: React.FC = () => {
  const { sidebarOpen, toggleSidebar, currentView, setCurrentView, setEditingId } = useAppContext();
  const { user, signOut } = useAuth();
  const { plan } = useSubscription();

  const handleNav = (view: PageView) => { setCurrentView(view); setEditingId(null); };
  const handleLogout = async () => { await signOut(); };

  const userEmail = user?.email || '';
  const userInitial = userEmail ? userEmail[0].toUpperCase() : '?';
  const planInfo = PLAN_LIMITS[plan];

  const planColors: Record<string, string> = {
    free: 'bg-slate-600/20 text-slate-400 border-slate-600/30',
    pro: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
    enterprise: 'bg-violet-500/20 text-violet-400 border-violet-500/30',
  };

  const sidebarClass = 'fixed left-0 top-0 h-full z-40 bg-slate-900 border-r border-slate-700/50 transition-all duration-300 flex flex-col ' + (sidebarOpen ? 'w-64' : 'w-16');

  return (
    <aside className={sidebarClass}>
      <div className="flex items-center h-16 px-4 border-b border-slate-700/50">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center flex-shrink-0">
            <Ruler size={18} className="text-white" />
          </div>
          {sidebarOpen && (
            <div className="min-w-0">
              <h1 className="text-white font-bold text-lg leading-tight truncate">Esti-Mate</h1>
              <p className="text-slate-400 text-[10px] leading-tight">+ PixelMeasure</p>
            </div>
          )}
        </div>
      </div>

      {sidebarOpen && (
        <button onClick={() => handleNav('pricing')}
          className={'mx-3 mt-3 px-3 py-2 rounded-lg border text-left transition-colors hover:opacity-80 ' + planColors[plan]}>
          <div className="flex items-center gap-2">
            {plan === 'free' ? <Zap size={14} /> : <Crown size={14} />}
            <span className="text-xs font-semibold">{planInfo.label} Plan</span>
            {plan === 'free' && <span className="text-[10px] ml-auto opacity-70">Upgrade</span>}
          </div>
        </button>
      )}
      {!sidebarOpen && (
        <button onClick={() => handleNav('pricing')}
          className="mx-2 mt-3 p-2 rounded-lg hover:bg-slate-800 transition-colors"
          title={planInfo.label + ' Plan'}>
          {plan === 'free' ? <Zap size={18} className="text-slate-400" /> : <Crown size={18} className="text-orange-400" />}
        </button>
      )}

      <nav className="flex-1 py-3 px-2 space-y-1 overflow-y-auto">
        {navItems.map(item => {
          const active = currentView === item.view;
          const cls = 'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group ' +
            (active ? 'bg-orange-500/20 text-orange-400' : 'text-slate-400 hover:bg-slate-800 hover:text-white');
          return (
            <button key={item.view} onClick={() => handleNav(item.view)}
              className={cls}
              title={!sidebarOpen ? item.label : undefined}>
              <span className="flex-shrink-0">{item.icon}</span>
              {sidebarOpen && <span className="text-sm font-medium truncate">{item.label}</span>}
            </button>
          );
        })}
      </nav>

      <div className="p-2 border-t border-slate-700/50 space-y-1">
        {sidebarOpen && userEmail && (
          <div className="flex items-center gap-2 px-3 py-2">
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">{userInitial}</div>
            <span className="text-slate-400 text-xs truncate">{userEmail}</span>
          </div>
        )}
        <button onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-slate-400 hover:bg-red-500/10 hover:text-red-400 transition-colors"
          title={!sidebarOpen ? 'Sign Out' : undefined}>
          <LogOut size={18} className="flex-shrink-0" />
          {sidebarOpen && <span className="text-sm font-medium">Sign Out</span>}
        </button>
        <button onClick={toggleSidebar}
          className="w-full flex items-center justify-center py-2 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white transition-colors">
          {sidebarOpen ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
