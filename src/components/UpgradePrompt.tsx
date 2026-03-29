// ============================================================
// ESTI-MATE — Upgrade Prompt Modal
// Shown when a free user hits a limit
// ============================================================

import React from 'react';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { PLAN_LIMITS } from '@/lib/subscription';
import { Crown, Lock, Zap, X, ArrowRight } from 'lucide-react';

interface UpgradePromptProps {
  feature: string;
  description: string;
  onClose: () => void;
  onUpgrade: () => void;
}

const UpgradePrompt: React.FC<UpgradePromptProps> = ({ feature, description, onClose, onUpgrade }) => {
  const { plan, getUsage } = useSubscription();
  const usage = getUsage();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 w-full max-w-md">
        <div className="flex items-center justify-between mb-4">
          <div className="w-12 h-12 rounded-xl bg-orange-500/20 flex items-center justify-center">
            <Lock size={24} className="text-orange-400" />
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-white">
            <X size={20} />
          </button>
        </div>

        <h3 className="text-xl font-bold text-white mb-2">Upgrade Required</h3>
        <p className="text-slate-400 text-sm mb-4">{description}</p>

        <div className="bg-slate-900/50 rounded-xl p-4 mb-4 space-y-2">
          <p className="text-slate-500 text-xs font-medium uppercase">Your {PLAN_LIMITS[plan].label} Plan Usage</p>
          {[
            { label: 'Estimates', used: usage.estimates.used, limit: usage.estimates.limit },
            { label: 'Invoices', used: usage.invoices.used, limit: usage.invoices.limit },
            { label: 'Measurements', used: usage.measurements.used, limit: usage.measurements.limit },
          ].map(item => (
            <div key={item.label} className="flex items-center justify-between">
              <span className="text-slate-300 text-sm">{item.label}</span>
              <span className={`text-sm font-mono ${item.used >= item.limit && item.limit !== Infinity ? 'text-red-400' : 'text-slate-400'}`}>
                {item.used}/{item.limit === Infinity ? '\u221e' : item.limit}
              </span>
            </div>
          ))}
        </div>

        <div className="bg-gradient-to-r from-orange-500/10 to-amber-500/10 border border-orange-500/20 rounded-xl p-4 mb-4">
          <div className="flex items-center gap-2 mb-2">
            <Crown size={16} className="text-orange-400" />
            <span className="text-white font-semibold text-sm">Pro Plan — $29/month</span>
          </div>
          <ul className="text-slate-300 text-sm space-y-1">
            <li className="flex items-center gap-2"><Zap size={12} className="text-orange-400" /> Unlimited estimates & invoices</li>
            <li className="flex items-center gap-2"><Zap size={12} className="text-orange-400" /> Unlimited measurements</li>
            <li className="flex items-center gap-2"><Zap size={12} className="text-orange-400" /> PDF export with company branding</li>
            <li className="flex items-center gap-2"><Zap size={12} className="text-orange-400" /> Unlimited customers</li>
          </ul>
        </div>

        <div className="flex gap-3">
          <button onClick={onClose}
            className="flex-1 px-4 py-2.5 bg-slate-700 text-slate-300 rounded-xl hover:bg-slate-600 transition-colors text-sm">
            Not Now
          </button>
          <button onClick={onUpgrade}
            className="flex-1 px-4 py-2.5 bg-gradient-to-r from-orange-500 to-amber-500 text-white font-semibold rounded-xl hover:from-orange-600 hover:to-amber-600 transition-all shadow-lg shadow-orange-500/25 flex items-center justify-center gap-2 text-sm">
            Upgrade <ArrowRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default UpgradePrompt;
