import React from 'react';
import { useAppContext } from '@/contexts/AppContext';
import {
  FileText, Receipt, Users, Camera, TrendingUp, Clock,
  ArrowRight, Ruler, Eye, Target, Zap
} from 'lucide-react';

const Dashboard: React.FC = () => {
  const {
    estimates, invoices, customers, measurements, measurementStats,
    activeProfile, setCurrentView, setEditingId
  } = useAppContext();

  const totalRevenue = invoices.filter(i => i.status === 'paid').reduce((s, i) => s + i.total, 0);
  const pendingEstimates = estimates.filter(e => e.status === 'sent' || e.status === 'draft').length;
  const overdueInvoices = invoices.filter(i => i.status === 'overdue').length;

  const stats = [
    { label: 'Total Estimates', value: estimates.length, icon: <FileText size={22} />, color: 'from-blue-500 to-blue-600', onClick: () => setCurrentView('estimates') },
    { label: 'Active Invoices', value: invoices.length, icon: <Receipt size={22} />, color: 'from-emerald-500 to-emerald-600', onClick: () => setCurrentView('invoices') },
    { label: 'Customers', value: customers.length, icon: <Users size={22} />, color: 'from-violet-500 to-violet-600', onClick: () => setCurrentView('customers') },
    { label: 'Measurements', value: measurements.length, icon: <Camera size={22} />, color: 'from-orange-500 to-amber-500', onClick: () => setCurrentView('history') },
    { label: 'Revenue Collected', value: `$${totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 0 })}`, icon: <TrendingUp size={22} />, color: 'from-green-500 to-green-600', onClick: () => setCurrentView('invoices') },
    { label: 'Pending Estimates', value: pendingEstimates, icon: <Clock size={22} />, color: 'from-yellow-500 to-yellow-600', onClick: () => setCurrentView('estimates') },
  ];

  const recentEstimates = estimates.slice(0, 4);
  const recentMeasurements = measurements.slice(0, 5);

  return (
    <div className="space-y-8">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-800 via-slate-900 to-slate-800 border border-slate-700/50">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-orange-500/10 via-transparent to-transparent" />
        <div className="absolute top-0 right-0 w-96 h-96 bg-orange-500/5 rounded-full blur-3xl" />
        <div className="relative p-8 lg:p-12">
          <div className="grid lg:grid-cols-2 gap-8 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-500/20 text-orange-400 text-xs font-medium mb-4">
                <Zap size={12} /> Construction Estimating + Camera Measurement
              </div>
              <h1 className="text-3xl lg:text-4xl font-bold text-white mb-4 leading-tight">
                Estimate, Measure, <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-amber-400">
                  Invoice — All in One
                </span>
              </h1>
              <p className="text-slate-400 text-lg mb-6 max-w-lg">
                Professional estimating and invoicing with integrated camera-based distance measurement. 
                Take measurements in the field and push them directly into your line items.
              </p>
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => { setCurrentView('estimate-editor'); setEditingId(null); }}
                  className="px-6 py-3 bg-gradient-to-r from-orange-500 to-amber-500 text-white font-semibold rounded-xl hover:from-orange-600 hover:to-amber-600 transition-all shadow-lg shadow-orange-500/25 flex items-center gap-2"
                >
                  <FileText size={18} /> New Estimate
                </button>
                <button
                  onClick={() => setCurrentView('measure')}
                  className="px-6 py-3 bg-slate-700/50 text-white font-semibold rounded-xl hover:bg-slate-700 transition-all border border-slate-600 flex items-center gap-2"
                >
                  <Camera size={18} /> Auto Measure
                </button>
              </div>
            </div>
            {/* Quick Measure Widget */}
            <div className="bg-slate-800/80 backdrop-blur rounded-xl border border-slate-700/50 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-white font-semibold flex items-center gap-2">
                  <Ruler size={18} className="text-orange-400" /> Quick Measure
                </h3>
                <button
                  onClick={() => setCurrentView('measure')}
                  className="text-orange-400 text-sm hover:text-orange-300 flex items-center gap-1"
                >
                  Open <ArrowRight size={14} />
                </button>
              </div>
              <div className="bg-slate-900/50 rounded-lg p-3 mb-4">
                <p className="text-slate-400 text-xs mb-1">Active Profile</p>
                <p className="text-white font-medium">{activeProfile?.name || 'No profile set'}</p>
                {activeProfile && (
                  <p className="text-slate-500 text-xs mt-1">Focal Length: {activeProfile.focalLength}px</p>
                )}
              </div>
              <p className="text-slate-400 text-xs mb-2">Recent Measurements</p>
              {recentMeasurements.length === 0 ? (
                <p className="text-slate-500 text-sm">No measurements yet</p>
              ) : (
                <div className="space-y-2">
                  {recentMeasurements.slice(0, 3).map(m => (
                    <div key={m.id} className="flex items-center justify-between bg-slate-900/30 rounded-lg px-3 py-2">
                      <span className="text-slate-300 text-sm truncate mr-2">{m.note || 'Unnamed'}</span>
                      <span className="text-orange-400 font-mono text-sm font-medium whitespace-nowrap">
                        {m.distance.toFixed(2)} {m.unit === 'metric' ? 'm' : 'ft'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {stats.map((stat, i) => (
          <button
            key={i}
            onClick={stat.onClick}
            className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4 hover:bg-slate-800 transition-all group text-left"
          >
            <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${stat.color} flex items-center justify-center text-white mb-3`}>
              {stat.icon}
            </div>
            <p className="text-2xl font-bold text-white">{stat.value}</p>
            <p className="text-slate-400 text-xs mt-1">{stat.label}</p>
          </button>
        ))}
      </div>

      {/* Recent Estimates + Measurement Stats */}
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-slate-800/50 border border-slate-700/50 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-white font-semibold text-lg">Recent Estimates</h3>
            <button onClick={() => setCurrentView('estimates')} className="text-orange-400 text-sm hover:text-orange-300 flex items-center gap-1">
              View All <ArrowRight size={14} />
            </button>
          </div>
          <div className="space-y-3">
            {recentEstimates.map(est => (
              <button
                key={est.id}
                onClick={() => { setCurrentView('estimate-editor'); setEditingId(est.id); }}
                className="w-full flex items-center justify-between bg-slate-900/50 rounded-lg p-4 hover:bg-slate-900/80 transition-colors text-left"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-white font-medium truncate">{est.title}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                      est.status === 'approved' ? 'bg-green-500/20 text-green-400' :
                      est.status === 'sent' ? 'bg-blue-500/20 text-blue-400' :
                      est.status === 'invoiced' ? 'bg-purple-500/20 text-purple-400' :
                      est.status === 'rejected' ? 'bg-red-500/20 text-red-400' :
                      'bg-slate-600/20 text-slate-400'
                    }`}>
                      {est.status}
                    </span>
                  </div>
                  <p className="text-slate-400 text-sm">{est.customerName} &middot; {est.number}</p>
                </div>
                <span className="text-white font-semibold ml-4">${est.total.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Measurement Stats */}
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6">
          <h3 className="text-white font-semibold text-lg mb-4">Measurement Stats</h3>
          <div className="space-y-4">
            {[
              { label: 'Total Measurements', value: measurementStats.count, suffix: '' },
              { label: 'Average Distance', value: measurementStats.average.toFixed(2), suffix: ' m' },
              { label: 'Min Distance', value: measurementStats.min.toFixed(2), suffix: ' m' },
              { label: 'Max Distance', value: measurementStats.max.toFixed(2), suffix: ' m' },
            ].map((s, i) => (
              <div key={i} className="bg-slate-900/50 rounded-lg p-3">
                <p className="text-slate-400 text-xs">{s.label}</p>
                <p className="text-white font-bold text-xl">{s.value}{s.suffix}</p>
              </div>
            ))}
          </div>
          {overdueInvoices > 0 && (
            <div className="mt-4 bg-red-500/10 border border-red-500/30 rounded-lg p-3">
              <p className="text-red-400 text-sm font-medium">{overdueInvoices} overdue invoice{overdueInvoices > 1 ? 's' : ''}</p>
              <button onClick={() => setCurrentView('invoices')} className="text-red-300 text-xs hover:text-red-200 mt-1">
                View now
              </button>
            </div>
          )}
        </div>
      </div>

      {/* How It Works */}
      <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-8">
        <h3 className="text-white font-semibold text-xl mb-6 text-center">How Auto Measure Works</h3>
        <div className="grid md:grid-cols-3 gap-6">
          {[
            { step: '1', title: 'Calibrate', desc: 'Set up a calibration profile by measuring a known reference object. The app calculates your camera\'s focal length using the pinhole camera model.', icon: <Target size={28} /> },
            { step: '2', title: 'Measure', desc: 'Point your camera at any object and tap two points. The app calculates real-world distance using: Distance = (Reference Width × Focal Length) / Pixel Width', icon: <Eye size={28} /> },
            { step: '3', title: 'Apply', desc: 'Push measurements directly into your estimate line items. No more manual entry — measure on-site and build your estimate simultaneously.', icon: <Zap size={28} /> },
          ].map(item => (
            <div key={item.step} className="text-center">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-500/20 to-amber-500/20 border border-orange-500/30 flex items-center justify-center text-orange-400 mx-auto mb-4">
                {item.icon}
              </div>
              <div className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-orange-500 text-white text-xs font-bold mb-2">
                {item.step}
              </div>
              <h4 className="text-white font-semibold mb-2">{item.title}</h4>
              <p className="text-slate-400 text-sm leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
        <div className="mt-6 bg-slate-900/50 rounded-lg p-4 text-center">
          <p className="text-slate-400 text-sm font-mono">
            D = (W<sub>ref</sub> × F) / W<sub>px</sub>
          </p>
          <p className="text-slate-500 text-xs mt-1">Pinhole Camera Model: Distance = (Reference Width × Focal Length) / Pixel Width</p>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
