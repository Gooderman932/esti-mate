import React, { useState } from 'react';
import { useAppContext } from '@/contexts/AppContext';
import {
  Settings as SettingsIcon, ArrowLeft, Ruler, Grid3X3, Crosshair,
  ChevronDown, ChevronUp, Info, Star, Trash2, Edit, Check
} from 'lucide-react';

const Settings: React.FC = () => {
  const {
    settings, updateSettings, calibrationProfiles, activeProfile,
    setActiveProfile, deleteCalibrationProfile, updateCalibrationProfile,
    setCurrentView
  } = useAppContext();

  const [howItWorksOpen, setHowItWorksOpen] = useState(false);
  const [editingProfile, setEditingProfile] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  const handleRename = (id: string) => {
    if (editName.trim()) updateCalibrationProfile(id, { name: editName });
    setEditingProfile(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => setCurrentView('dashboard')}
          className="p-2 rounded-lg bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors">
          <ArrowLeft size={20} />
        </button>
        <div>
          <h2 className="text-2xl font-bold text-white">Settings</h2>
          <p className="text-slate-400 text-sm">Configure units, overlays, and calibration</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Unit System */}
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6">
          <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
            <Ruler size={18} className="text-orange-400" /> Unit System
          </h3>
          <div className="flex gap-3">
            <button
              onClick={() => updateSettings({ unitSystem: 'metric' })}
              className={`flex-1 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                settings.unitSystem === 'metric'
                  ? 'bg-orange-500/20 text-orange-400 border-2 border-orange-500/50'
                  : 'bg-slate-900 text-slate-400 border-2 border-slate-700 hover:border-slate-600'
              }`}
            >
              <p className="font-semibold">Metric</p>
              <p className="text-xs opacity-70 mt-1">Meters, centimeters</p>
            </button>
            <button
              onClick={() => updateSettings({ unitSystem: 'imperial' })}
              className={`flex-1 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                settings.unitSystem === 'imperial'
                  ? 'bg-orange-500/20 text-orange-400 border-2 border-orange-500/50'
                  : 'bg-slate-900 text-slate-400 border-2 border-slate-700 hover:border-slate-600'
              }`}
            >
              <p className="font-semibold">Imperial</p>
              <p className="text-xs opacity-70 mt-1">Feet, inches</p>
            </button>
          </div>
        </div>

        {/* Camera Overlays */}
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6">
          <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
            <Grid3X3 size={18} className="text-orange-400" /> Camera Overlays
          </h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Grid3X3 size={16} className="text-slate-400" />
                <div>
                  <p className="text-white text-sm font-medium">Grid Overlay</p>
                  <p className="text-slate-500 text-xs">Show alignment grid on camera</p>
                </div>
              </div>
              <button
                onClick={() => updateSettings({ showGrid: !settings.showGrid })}
                className={`w-12 h-6 rounded-full transition-colors relative ${
                  settings.showGrid ? 'bg-orange-500' : 'bg-slate-700'
                }`}
              >
                <div className={`w-5 h-5 rounded-full bg-white absolute top-0.5 transition-transform ${
                  settings.showGrid ? 'translate-x-6' : 'translate-x-0.5'
                }`} />
              </button>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Crosshair size={16} className="text-slate-400" />
                <div>
                  <p className="text-white text-sm font-medium">Guide Lines</p>
                  <p className="text-slate-500 text-xs">Show crosshair guides</p>
                </div>
              </div>
              <button
                onClick={() => updateSettings({ showGuides: !settings.showGuides })}
                className={`w-12 h-6 rounded-full transition-colors relative ${
                  settings.showGuides ? 'bg-orange-500' : 'bg-slate-700'
                }`}
              >
                <div className={`w-5 h-5 rounded-full bg-white absolute top-0.5 transition-transform ${
                  settings.showGuides ? 'translate-x-6' : 'translate-x-0.5'
                }`} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Calibration Profiles */}
      <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-white font-semibold flex items-center gap-2">
            <Crosshair size={18} className="text-orange-400" /> Calibration Profiles
          </h3>
          <button onClick={() => setCurrentView('calibration')}
            className="text-orange-400 text-sm hover:text-orange-300">Manage Profiles</button>
        </div>
        <div className="space-y-3">
          {calibrationProfiles.map(p => (
            <div key={p.id} className={`flex items-center justify-between p-3 rounded-lg transition-colors ${
              p.isActive ? 'bg-orange-500/10 border border-orange-500/30' : 'bg-slate-900/50 border border-slate-700/30'
            }`}>
              <div className="flex items-center gap-3 min-w-0">
                {p.isActive && <Star size={14} className="text-orange-400 fill-orange-400 flex-shrink-0" />}
                {editingProfile === p.id ? (
                  <div className="flex items-center gap-2">
                    <input value={editName} onChange={e => setEditName(e.target.value)}
                      className="px-2 py-1 bg-slate-800 border border-slate-700 rounded text-white text-sm focus:outline-none"
                      onKeyDown={e => e.key === 'Enter' && handleRename(p.id)} autoFocus />
                    <button onClick={() => handleRename(p.id)} className="text-green-400"><Check size={14} /></button>
                  </div>
                ) : (
                  <span className="text-white text-sm truncate">{p.name}</span>
                )}
                <span className="text-slate-500 text-xs flex-shrink-0">F={p.focalLength}px</span>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                {!p.isActive && (
                  <button onClick={() => setActiveProfile(p.id)}
                    className="px-2 py-1 text-orange-400 text-xs hover:bg-orange-500/10 rounded transition-colors">
                    Activate
                  </button>
                )}
                <button onClick={() => { setEditingProfile(p.id); setEditName(p.name); }}
                  className="p-1 text-slate-400 hover:text-white"><Edit size={12} /></button>
                <button onClick={() => deleteCalibrationProfile(p.id)}
                  className="p-1 text-red-400 hover:text-red-300"><Trash2 size={12} /></button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* How It Works */}
      <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl overflow-hidden">
        <button
          onClick={() => setHowItWorksOpen(!howItWorksOpen)}
          className="w-full flex items-center justify-between p-6 text-left hover:bg-slate-800/80 transition-colors"
        >
          <h3 className="text-white font-semibold flex items-center gap-2">
            <Info size={18} className="text-orange-400" /> How It Works — Pinhole Camera Model
          </h3>
          {howItWorksOpen ? <ChevronUp size={20} className="text-slate-400" /> : <ChevronDown size={20} className="text-slate-400" />}
        </button>
        {howItWorksOpen && (
          <div className="px-6 pb-6 space-y-4">
            <div className="bg-slate-900/50 rounded-xl p-4">
              <h4 className="text-white font-medium mb-2">The Pinhole Camera Model</h4>
              <p className="text-slate-400 text-sm leading-relaxed">
                The pinhole camera model is a simplified mathematical model that describes the relationship between a 3D point in the real world and its 2D projection on the camera sensor. It assumes light passes through a single point (the pinhole) to form an image.
              </p>
            </div>
            <div className="bg-slate-900/50 rounded-xl p-4">
              <h4 className="text-white font-medium mb-2">Key Formula</h4>
              <div className="text-center py-4">
                <p className="text-orange-400 text-2xl font-mono font-bold">D = (W<sub>ref</sub> × F) / W<sub>px</sub></p>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-orange-400 font-mono">D</span> <span className="text-slate-400">= Real-world distance</span></div>
                <div><span className="text-orange-400 font-mono">W<sub>ref</sub></span> <span className="text-slate-400">= Reference object width</span></div>
                <div><span className="text-orange-400 font-mono">F</span> <span className="text-slate-400">= Focal length (pixels)</span></div>
                <div><span className="text-orange-400 font-mono">W<sub>px</sub></span> <span className="text-slate-400">= Object width in pixels</span></div>
              </div>
            </div>
            <div className="bg-slate-900/50 rounded-xl p-4">
              <h4 className="text-white font-medium mb-2">Calibration</h4>
              <p className="text-slate-400 text-sm leading-relaxed">
                During calibration, you measure a known reference object at a known distance. The app computes the focal length:
              </p>
              <p className="text-center text-orange-400 font-mono mt-2">F = (W<sub>px</sub> × D) / W<sub>ref</sub></p>
              <p className="text-slate-400 text-sm mt-2 leading-relaxed">
                Once calibrated, the app can estimate the distance to any object by measuring its pixel width in the camera view.
              </p>
            </div>
            <div className="bg-slate-900/50 rounded-xl p-4">
              <h4 className="text-white font-medium mb-2">Usage Tips</h4>
              <ul className="text-slate-400 text-sm space-y-2 list-disc list-inside">
                <li>Keep the camera perpendicular to the surface being measured</li>
                <li>Calibrate at a distance similar to your typical measurement distance</li>
                <li>Use a flat, well-lit reference object for best results</li>
                <li>Higher pixel spans (closer objects) yield more accurate measurements</li>
                <li>Re-calibrate when switching between indoor and outdoor environments</li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Settings;
