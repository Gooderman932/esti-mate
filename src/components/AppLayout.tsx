import React from 'react';
import { useAppContext } from '@/contexts/AppContext';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { useIsMobile } from '@/hooks/use-mobile';
import Sidebar from './Sidebar';
import Dashboard from './Dashboard';
import EstimateList from './estimates/EstimateList';
import EstimateEditor from './estimates/EstimateEditor';
import InvoiceList from './invoices/InvoiceList';
import InvoiceEditor from './invoices/InvoiceEditor';
import CustomerList from './customers/CustomerList';
import CameraView from './measure/CameraView';
import CalibrationWizard from './measure/CalibrationWizard';
import MeasurementHistory from './measure/MeasurementHistory';
import Settings from './Settings';
import PricingPage from './PricingPage';
import {
  LayoutDashboard, FileText, Receipt, Users, Camera, History,
  Settings as SettingsIcon, Crosshair, Menu, X, Ruler, Loader2, LogOut, Crown
} from 'lucide-react';

const MobileNav: React.FC = () => {
  const { currentView, setCurrentView, setEditingId, sidebarOpen, toggleSidebar } = useAppContext();
  const { user, signOut } = useAuth();
  const { plan } = useSubscription();
  const navItems = [
    { view: 'dashboard' as const, label: 'Home', icon: <LayoutDashboard size={18} /> },
    { view: 'estimates' as const, label: 'Estimates', icon: <FileText size={18} /> },
    { view: 'invoices' as const, label: 'Invoices', icon: <Receipt size={18} /> },
    { view: 'customers' as const, label: 'Customers', icon: <Users size={18} /> },
    { view: 'measure' as const, label: 'Measure', icon: <Camera size={18} /> },
    { view: 'calibration' as const, label: 'Calibrate', icon: <Crosshair size={18} /> },
    { view: 'history' as const, label: 'History', icon: <History size={18} /> },
    { view: 'settings' as const, label: 'Settings', icon: <SettingsIcon size={18} /> },
  ];

  return (
    <>
      <div className="fixed top-0 left-0 right-0 h-14 bg-slate-900 border-b border-slate-700/50 z-50 flex items-center px-4 gap-3">
        <button onClick={toggleSidebar} className="p-1.5 text-slate-400 hover:text-white">
          {sidebarOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center">
            <Ruler size={14} className="text-white" />
          </div>
          <span className="text-white font-bold">Esti-Mate</span>
        </div>
        <div className="flex-1" />
        <button onClick={() => { setCurrentView('pricing'); if (sidebarOpen) toggleSidebar(); }}
          className="px-2 py-1 rounded-full text-[10px] font-bold bg-orange-500/20 text-orange-400 border border-orange-500/30">
          {plan === 'free' ? 'FREE' : plan.toUpperCase()}
        </button>
      </div>
      {sidebarOpen && (
        <div className="fixed inset-0 z-40">
          <div className="absolute inset-0 bg-black/50" onClick={toggleSidebar} />
          <div className="absolute left-0 top-14 bottom-0 w-64 bg-slate-900 border-r border-slate-700/50 p-4 overflow-y-auto flex flex-col">
            <div className="flex-1 space-y-1">
              {navItems.map(item => {
                const cls = 'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ' +
                  (currentView === item.view ? 'bg-orange-500/20 text-orange-400' : 'text-slate-400 hover:bg-slate-800 hover:text-white');
                return (
                  <button key={item.view}
                    onClick={() => { setCurrentView(item.view); setEditingId(null); toggleSidebar(); }}
                    className={cls}>
                    {item.icon}
                    <span className="text-sm font-medium">{item.label}</span>
                  </button>
                );
              })}
              <button onClick={() => { setCurrentView('pricing'); setEditingId(null); toggleSidebar(); }}
                className={'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ' +
                  (currentView === 'pricing' ? 'bg-orange-500/20 text-orange-400' : 'text-slate-400 hover:bg-slate-800 hover:text-white')}>
                <Crown size={18} />
                <span className="text-sm font-medium">Plans & Pricing</span>
              </button>
            </div>
            <div className="border-t border-slate-700/50 pt-3 mt-3">
              {user?.email && <p className="text-slate-500 text-xs px-3 mb-2 truncate">{user.email}</p>}
              <button onClick={() => signOut()}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-400 hover:bg-red-500/10 hover:text-red-400 transition-colors">
                <LogOut size={18} />
                <span className="text-sm font-medium">Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

const AppLayout: React.FC = () => {
  const { sidebarOpen, currentView, dataLoading, setCurrentView } = useAppContext();
  const isMobile = useIsMobile();
  const { subscription } = useSubscription();

  if (dataLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center">
        <Loader2 size={32} className="text-orange-400 animate-spin mb-3" />
        <p className="text-slate-400 text-sm">Loading your data...</p>
      </div>
    );
  }

  const renderView = () => {
    switch (currentView) {
      case 'dashboard': return <Dashboard />;
      case 'estimates': return <EstimateList />;
      case 'estimate-editor': return <EstimateEditor />;
      case 'invoices': return <InvoiceList />;
      case 'invoice-editor': return <InvoiceEditor />;
      case 'customers': return <CustomerList />;
      case 'measure': return <CameraView />;
      case 'calibration': return <CalibrationWizard />;
      case 'history': return <MeasurementHistory />;
      case 'settings': return <Settings />;
      case 'pricing': return <PricingPage subscription={subscription} onBack={() => setCurrentView('dashboard')} />;
      default: return <Dashboard />;
    }
  };

  if (isMobile) {
    return (
      <div className="min-h-screen bg-slate-950">
        <MobileNav />
        <main className="pt-14 px-4 pb-8"><div className="py-4">{renderView()}</div></main>
      </div>
    );
  }

  const mainClass = 'transition-all duration-300 ' + (sidebarOpen ? 'ml-64' : 'ml-16');

  return (
    <div className="min-h-screen bg-slate-950">
      <Sidebar />
      <main className={mainClass}>
        <div className="p-6 lg:p-8 max-w-7xl">{renderView()}</div>
      </main>
    </div>
  );
};

export default AppLayout;
