import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { PLAN_LIMITS, PlanType, Subscription } from '@/lib/subscription';
import { supabase } from '@/lib/supabase';
import { Check, X, Zap, Crown, Building2, ArrowLeft, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface PricingPageProps {
  subscription: Subscription | null;
  onBack: () => void;
}

const isNativeApp = (): boolean => typeof (window as any).Capacitor !== 'undefined';

const PricingPage: React.FC<PricingPageProps> = ({ subscription, onBack }) => {
  const { user } = useAuth();
  const [loading, setLoading] = React.useState<PlanType | null>(null);
  const currentPlan = subscription?.plan || 'free';

  const handleUpgrade = async (plan: PlanType) => {
    if (!user || plan === 'free' || plan === currentPlan) return;
    if (isNativeApp()) {
      toast.info('To upgrade, please contact admin@poordudeholdings.com');
      return;
    }
    setLoading(plan);
    try {
      const { data, error } = await supabase.functions.invoke('em-stripe-checkout', {
        body: { plan, returnUrl: window.location.origin },
      });
      if (error) throw error;
      if (data?.url) { window.location.href = data.url; }
      else { toast.error(data?.detail || data?.error || 'Failed to create checkout session'); }
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || 'Failed to start checkout.');
    } finally { setLoading(null); }
  };

  const plans: { key: PlanType; icon: React.ReactNode; cta: string }[] = [
    { key: 'free', icon: <Zap size={24} />, cta: 'Current Plan' },
    { key: 'pro', icon: <Crown size={24} />, cta: isNativeApp() ? 'Contact to Upgrade' : 'Upgrade to Pro' },
    { key: 'enterprise', icon: <Building2 size={24} />, cta: isNativeApp() ? 'Contact to Upgrade' : 'Go Enterprise' },
  ];

  const features = [
    { label: 'Estimates per month', key: 'estimatesPerMonth' as const },
    { label: 'Invoices per month', key: 'invoicesPerMonth' as const },
    { label: 'Measurements per month', key: 'measurementsPerMonth' as const },
    { label: 'Customers', key: 'customers' as const },
    { label: 'PDF export', key: 'pdfExport' as const },
    { label: 'Company branding on PDFs', key: 'companyBranding' as const },
    { label: 'Priority support', key: 'prioritySupport' as const },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={onBack} className="p-2 rounded-lg bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors">
          <ArrowLeft size={20} />
        </button>
        <div>
          <h2 className="text-2xl font-bold text-white">Plans & Pricing</h2>
          <p className="text-slate-400 text-sm">Choose the plan that fits your business</p>
        </div>
      </div>

      {isNativeApp() && (
        <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
          <p className="text-blue-400 text-sm">To upgrade your plan, contact us at <span className="font-semibold">admin@poordudeholdings.com</span></p>
        </div>
      )}

      <div className="grid md:grid-cols-3 gap-6">
        {plans.map(({ key, icon, cta }) => {
          const limits = PLAN_LIMITS[key];
          const isCurrent = currentPlan === key;
          const isPopular = key === 'pro';
          return (
            <div key={key} className={`relative bg-slate-800/50 border rounded-2xl p-6 transition-all ${isPopular ? 'border-orange-500/50 ring-1 ring-orange-500/20' : isCurrent ? 'border-green-500/50' : 'border-slate-700/50'}`}>
              {isPopular && <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-gradient-to-r from-orange-500 to-amber-500 rounded-full text-white text-xs font-bold">MOST POPULAR</div>}
              {isCurrent && <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-green-500 rounded-full text-white text-xs font-bold">CURRENT PLAN</div>}
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${key === 'free' ? 'bg-slate-700 text-slate-300' : key === 'pro' ? 'bg-orange-500/20 text-orange-400' : 'bg-violet-500/20 text-violet-400'}`}>{icon}</div>
              <h3 className="text-white font-bold text-xl">{limits.label}</h3>
              <div className="mt-2 mb-6">
                <span className="text-3xl font-bold text-white">${limits.price}</span>
                {limits.price > 0 && <span className="text-slate-400 text-sm">/month</span>}
              </div>
              <div className="space-y-3 mb-6">
                {features.map(f => {
                  const value = limits[f.key];
                  const isBoolean = typeof value === 'boolean';
                  const isInfinity = value === Infinity;
                  return (
                    <div key={f.key} className="flex items-center gap-2 text-sm">
                      {isBoolean ? (value ? <Check size={16} className="text-green-400 flex-shrink-0" /> : <X size={16} className="text-slate-600 flex-shrink-0" />) : <Check size={16} className="text-green-400 flex-shrink-0" />}
                      <span className={isBoolean && !value ? 'text-slate-600' : 'text-slate-300'}>
                        {isBoolean ? f.label : isInfinity ? `Unlimited ${f.label.toLowerCase()}` : `${value} ${f.label.toLowerCase()}`}
                      </span>
                    </div>
                  );
                })}
              </div>
              <button onClick={() => handleUpgrade(key)} disabled={isCurrent || key === 'free' || loading !== null}
                className={`w-full py-3 rounded-xl font-semibold transition-all flex items-center justify-center gap-2 ${isCurrent ? 'bg-slate-700 text-slate-400 cursor-default' : key === 'free' ? 'bg-slate-700 text-slate-400 cursor-default' : key === 'pro' ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white hover:from-orange-600 hover:to-amber-600 shadow-lg shadow-orange-500/25' : 'bg-gradient-to-r from-violet-500 to-purple-600 text-white hover:from-violet-600 hover:to-purple-700 shadow-lg shadow-violet-500/25'} disabled:opacity-50 disabled:cursor-not-allowed`}>
                {loading === key ? <Loader2 size={18} className="animate-spin" /> : isCurrent ? 'Current Plan' : cta}
              </button>
            </div>
          );
        })}
      </div>

      {subscription && (
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6">
          <h3 className="text-white font-semibold mb-3">Your Usage This Month</h3>
          <div className="grid sm:grid-cols-3 gap-4">
            {[
              { label: 'Estimates', used: subscription.estimatesThisMonth, limit: PLAN_LIMITS[currentPlan].estimatesPerMonth },
              { label: 'Invoices', used: subscription.invoicesThisMonth, limit: PLAN_LIMITS[currentPlan].invoicesPerMonth },
              { label: 'Measurements', used: subscription.measurementsThisMonth, limit: PLAN_LIMITS[currentPlan].measurementsPerMonth },
            ].map(item => (
              <div key={item.label} className="bg-slate-900/50 rounded-lg p-3">
                <p className="text-slate-400 text-xs mb-1">{item.label}</p>
                <p className="text-white font-bold text-lg">{item.used} / {item.limit === Infinity ? '\u221e' : item.limit}</p>
                {item.limit !== Infinity && (
                  <div className="mt-2 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all ${item.used / item.limit > 0.8 ? 'bg-red-500' : item.used / item.limit > 0.5 ? 'bg-yellow-500' : 'bg-green-500'}`}
                      style={{ width: `${Math.min(100, (item.used / item.limit) * 100)}%` }} />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default PricingPage;
