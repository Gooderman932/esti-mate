import React, { useState, useRef } from 'react';
import { useAppContext } from '@/contexts/AppContext';
import {
  Plus, Trash2, Edit, Check, ChevronRight, ChevronLeft,
  Save, Star, ArrowLeft
} from 'lucide-react';


interface Point { x: number; y: number }

const CalibrationWizard: React.FC = () => {
  const {
    calibrationProfiles, activeProfile, addCalibrationProfile,
    updateCalibrationProfile, deleteCalibrationProfile, setActiveProfile,
    setCurrentView
  } = useAppContext();

  const [wizardOpen, setWizardOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [profileName, setProfileName] = useState('');
  const [refWidth, setRefWidth] = useState(21.6);
  const [refHeight, setRefHeight] = useState(27.9);
  const [calDistance, setCalDistance] = useState(100);
  const [points, setPoints] = useState<Point[]>([]);
  const [computedFocal, setComputedFocal] = useState<number | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [editingProfile, setEditingProfile] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  const startWizard = () => {
    setWizardOpen(true);
    setStep(1);
    setProfileName('');
    setRefWidth(21.6);
    setRefHeight(27.9);
    setCalDistance(100);
    setPoints([]);
    setComputedFocal(null);
  };

  const startCamera = async () => {
    try {
      let ms: MediaStream;
      try {
        // Try rear camera first (preferred for calibration)
        ms = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } }
        });
      } catch {
        // Fallback to any available camera
        ms = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1280 }, height: { ideal: 720 } }
        });
      }
      setStream(ms);
      if (videoRef.current) {
        videoRef.current.srcObject = ms;
        setCameraReady(true);
      }
    } catch {
      setCameraReady(false);
    }
  };

  const stopCamera = () => {
    stream?.getTracks().forEach(t => t.stop());
    setStream(null);
    setCameraReady(false);
  };

  const goToStep = (s: number) => {
    if (s === 3) startCamera();
    else stopCamera();
    setStep(s);
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current || points.length >= 2) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const newPoints = [...points, { x, y }];
    setPoints(newPoints);

    if (newPoints.length === 2) {
      const dx = newPoints[1].x - newPoints[0].x;
      const dy = newPoints[1].y - newPoints[0].y;
      const pxWidth = Math.sqrt(dx * dx + dy * dy);
      // F = (W_px × D) / W_ref
      const focal = (pxWidth * calDistance) / refWidth;
      setComputedFocal(Math.round(focal));
    }
  };

  // Draw overlay for calibration
  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || step !== 3) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const draw = () => {
      const container = containerRef.current;
      if (!container) return;
      canvas.width = container.clientWidth;
      canvas.height = container.clientHeight;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      points.forEach((p, i) => {
        ctx.fillStyle = i === 0 ? '#f97316' : '#10b981';
        ctx.beginPath(); ctx.arc(p.x, p.y, 10, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(p.x, p.y, 10, 0, Math.PI * 2); ctx.stroke();
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 12px monospace';
        ctx.fillText(i === 0 ? 'A' : 'B', p.x + 14, p.y + 4);
      });

      if (points.length === 2) {
        ctx.strokeStyle = '#f97316';
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 3]);
        ctx.beginPath();
        ctx.moveTo(points[0].x, points[0].y);
        ctx.lineTo(points[1].x, points[1].y);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      requestAnimationFrame(draw);
    };
    const id = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(id);
  }, [points, step]);

  const saveProfile = () => {
    if (!profileName.trim() || !computedFocal) return;
    addCalibrationProfile({
      name: profileName,
      focalLength: computedFocal,
      referenceWidth: refWidth,
      referenceHeight: refHeight,
      calibrationDistance: calDistance,
    });
    stopCamera();
    setWizardOpen(false);
  };

  const handleRename = (id: string) => {
    if (editName.trim()) {
      updateCalibrationProfile(id, { name: editName });
    }
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
          <h2 className="text-2xl font-bold text-white">Calibration Profiles</h2>
          <p className="text-slate-400 text-sm">Manage camera calibration for accurate measurements</p>
        </div>
        <div className="flex-1" />
        <button onClick={startWizard}
          className="px-4 py-2.5 bg-gradient-to-r from-orange-500 to-amber-500 text-white font-semibold rounded-xl hover:from-orange-600 hover:to-amber-600 transition-all shadow-lg shadow-orange-500/25 flex items-center gap-2">
          <Plus size={18} /> New Profile
        </button>
      </div>

      {/* Existing Profiles */}
      <div className="grid md:grid-cols-2 gap-4">
        {calibrationProfiles.map(p => (
          <div key={p.id} className={`bg-slate-800/50 border rounded-xl p-5 transition-colors ${
            p.isActive ? 'border-orange-500/50 bg-orange-500/5' : 'border-slate-700/50 hover:bg-slate-800'
          }`}>
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                {p.isActive && <Star size={16} className="text-orange-400 fill-orange-400" />}
                {editingProfile === p.id ? (
                  <div className="flex items-center gap-2">
                    <input value={editName} onChange={e => setEditName(e.target.value)}
                      className="px-2 py-1 bg-slate-900 border border-slate-700 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                      onKeyDown={e => e.key === 'Enter' && handleRename(p.id)} autoFocus />
                    <button onClick={() => handleRename(p.id)} className="p-1 text-green-400 hover:text-green-300"><Check size={14} /></button>
                  </div>
                ) : (
                  <h4 className="text-white font-semibold">{p.name}</h4>
                )}
              </div>
              <div className="flex gap-1">
                <button onClick={() => { setEditingProfile(p.id); setEditName(p.name); }}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-700 transition-colors"><Edit size={14} /></button>
                <button onClick={() => deleteCalibrationProfile(p.id)}
                  className="p-1.5 text-red-400 hover:text-red-300 rounded-lg hover:bg-red-500/10 transition-colors"><Trash2 size={14} /></button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="bg-slate-900/50 rounded-lg p-2">
                <p className="text-slate-500 text-[10px]">FOCAL LENGTH</p>
                <p className="text-white font-mono">{p.focalLength}px</p>
              </div>
              <div className="bg-slate-900/50 rounded-lg p-2">
                <p className="text-slate-500 text-[10px]">REF WIDTH</p>
                <p className="text-white font-mono">{p.referenceWidth}cm</p>
              </div>
              <div className="bg-slate-900/50 rounded-lg p-2">
                <p className="text-slate-500 text-[10px]">REF HEIGHT</p>
                <p className="text-white font-mono">{p.referenceHeight}cm</p>
              </div>
              <div className="bg-slate-900/50 rounded-lg p-2">
                <p className="text-slate-500 text-[10px]">CAL DISTANCE</p>
                <p className="text-white font-mono">{p.calibrationDistance}cm</p>
              </div>
            </div>
            {!p.isActive && (
              <button onClick={() => setActiveProfile(p.id)}
                className="w-full mt-3 px-3 py-2 bg-orange-500/10 text-orange-400 rounded-lg text-sm hover:bg-orange-500/20 transition-colors font-medium">
                Set as Active
              </button>
            )}
            {p.isActive && (
              <div className="mt-3 px-3 py-2 bg-orange-500/20 text-orange-400 rounded-lg text-sm text-center font-medium">
                Active Profile
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Wizard Modal */}
      {wizardOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            {/* Steps indicator */}
            <div className="p-6 border-b border-slate-700">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-white font-semibold text-lg">Calibration Wizard</h3>
                <button onClick={() => { setWizardOpen(false); stopCamera(); }}
                  className="text-slate-400 hover:text-white text-sm">Cancel</button>
              </div>
              <div className="flex items-center gap-2">
                {[1, 2, 3, 4].map(s => (
                  <React.Fragment key={s}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                      step >= s ? 'bg-orange-500 text-white' : 'bg-slate-700 text-slate-400'
                    }`}>{s}</div>
                    {s < 4 && <div className={`flex-1 h-0.5 ${step > s ? 'bg-orange-500' : 'bg-slate-700'}`} />}
                  </React.Fragment>
                ))}
              </div>
              <div className="flex justify-between mt-2 text-[10px] text-slate-500">
                <span>Name</span><span>Reference</span><span>Camera</span><span>Save</span>
              </div>
            </div>

            <div className="p-6">
              {/* Step 1: Name */}
              {step === 1 && (
                <div className="space-y-4">
                  <h4 className="text-white font-medium">Step 1: Profile Name</h4>
                  <p className="text-slate-400 text-sm">Choose a descriptive name for this calibration profile.</p>
                  <input value={profileName} onChange={e => setProfileName(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50 text-lg"
                    placeholder="e.g. Indoor - Standard" />
                  <div className="flex flex-wrap gap-2">
                    {['Indoor', 'Outdoor', 'Vehicle', 'Close-Up', 'Custom'].map(preset => (
                      <button key={preset} onClick={() => setProfileName(preset)}
                        className="px-3 py-1.5 bg-slate-700 text-slate-300 rounded-lg text-sm hover:bg-slate-600 transition-colors">
                        {preset}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Step 2: Reference */}
              {step === 2 && (
                <div className="space-y-4">
                  <h4 className="text-white font-medium">Step 2: Reference Object</h4>
                  <p className="text-slate-400 text-sm">Enter the real-world dimensions of your reference object and the distance at which you'll calibrate.</p>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-slate-400 text-sm block mb-1">Reference Width (cm)</label>
                      <input type="number" value={refWidth} onChange={e => setRefWidth(parseFloat(e.target.value) || 0)} step="0.1"
                        className="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50" />
                    </div>
                    <div>
                      <label className="text-slate-400 text-sm block mb-1">Reference Height (cm)</label>
                      <input type="number" value={refHeight} onChange={e => setRefHeight(parseFloat(e.target.value) || 0)} step="0.1"
                        className="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50" />
                    </div>
                  </div>
                  <div>
                    <label className="text-slate-400 text-sm block mb-1">Calibration Distance (cm)</label>
                    <input type="number" value={calDistance} onChange={e => setCalDistance(parseFloat(e.target.value) || 0)} step="1"
                      className="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50" />
                    <p className="text-slate-500 text-xs mt-1">Distance from camera to the reference object</p>
                  </div>
                  <div className="bg-slate-900/50 rounded-lg p-3">
                    <p className="text-slate-400 text-xs">Common reference objects:</p>
                    <div className="flex flex-wrap gap-2 mt-2">
                      <button onClick={() => { setRefWidth(21.6); setRefHeight(27.9); }}
                        className="px-2 py-1 bg-slate-700 text-slate-300 rounded text-xs hover:bg-slate-600">A4 Paper (21.6×27.9cm)</button>
                      <button onClick={() => { setRefWidth(21.6); setRefHeight(27.9); }}
                        className="px-2 py-1 bg-slate-700 text-slate-300 rounded text-xs hover:bg-slate-600">Letter (21.6×27.9cm)</button>
                      <button onClick={() => { setRefWidth(8.56); setRefHeight(5.4); }}
                        className="px-2 py-1 bg-slate-700 text-slate-300 rounded text-xs hover:bg-slate-600">Credit Card (8.56×5.4cm)</button>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 3: Camera */}
              {step === 3 && (
                <div className="space-y-4">
                  <h4 className="text-white font-medium">Step 3: Mark Reference Object</h4>
                  <p className="text-slate-400 text-sm">
                    Place your reference object at {calDistance}cm from the camera. Tap the left and right edges of the object.
                  </p>
                  <div ref={containerRef} className="relative bg-black rounded-xl overflow-hidden aspect-video">
                    <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover"
                      onLoadedMetadata={() => videoRef.current?.play()} />
                    <canvas ref={canvasRef} className="absolute inset-0 w-full h-full cursor-crosshair"
                      onClick={handleCanvasClick} />
                    {points.length === 0 && (
                      <div className="absolute bottom-3 left-3 right-3 bg-black/60 backdrop-blur-sm rounded-lg p-3">
                        <p className="text-white text-sm text-center">Tap the left edge of the reference object</p>
                      </div>
                    )}
                  </div>
                  {points.length === 2 && computedFocal && (
                    <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4 text-center">
                      <p className="text-green-400 font-medium">Focal Length Computed</p>
                      <p className="text-white text-3xl font-bold font-mono mt-1">{computedFocal}px</p>
                      <p className="text-slate-400 text-xs mt-1">F = (W<sub>px</sub> × D) / W<sub>ref</sub></p>
                    </div>
                  )}
                  <button onClick={() => setPoints([])}
                    className="px-3 py-1.5 bg-slate-700 text-slate-300 rounded-lg text-sm hover:bg-slate-600 transition-colors">
                    Reset Points
                  </button>
                </div>
              )}

              {/* Step 4: Save */}
              {step === 4 && (
                <div className="space-y-4 text-center">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-green-500/20 to-emerald-500/20 border border-green-500/30 flex items-center justify-center mx-auto">
                    <Check size={32} className="text-green-400" />
                  </div>
                  <h4 className="text-white font-medium text-lg">Ready to Save</h4>
                  <div className="bg-slate-900/50 rounded-xl p-4 text-left space-y-2 max-w-sm mx-auto">
                    <div className="flex justify-between"><span className="text-slate-400 text-sm">Name</span><span className="text-white text-sm">{profileName}</span></div>
                    <div className="flex justify-between"><span className="text-slate-400 text-sm">Focal Length</span><span className="text-white text-sm font-mono">{computedFocal}px</span></div>
                    <div className="flex justify-between"><span className="text-slate-400 text-sm">Ref Width</span><span className="text-white text-sm">{refWidth}cm</span></div>
                    <div className="flex justify-between"><span className="text-slate-400 text-sm">Ref Height</span><span className="text-white text-sm">{refHeight}cm</span></div>
                    <div className="flex justify-between"><span className="text-slate-400 text-sm">Cal Distance</span><span className="text-white text-sm">{calDistance}cm</span></div>
                  </div>
                </div>
              )}
            </div>

            {/* Navigation */}
            <div className="p-6 border-t border-slate-700 flex justify-between">
              <button onClick={() => step > 1 ? goToStep(step - 1) : setWizardOpen(false)}
                className="px-4 py-2.5 bg-slate-700 text-slate-300 rounded-xl hover:bg-slate-600 transition-colors flex items-center gap-2">
                <ChevronLeft size={16} /> {step === 1 ? 'Cancel' : 'Back'}
              </button>
              {step < 4 ? (
                <button onClick={() => goToStep(step + 1)}
                  disabled={(step === 1 && !profileName.trim()) || (step === 3 && !computedFocal)}

                  className="px-4 py-2.5 bg-gradient-to-r from-orange-500 to-amber-500 text-white font-semibold rounded-xl hover:from-orange-600 hover:to-amber-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2">
                  Next <ChevronRight size={16} />
                </button>
              ) : (
                <button onClick={saveProfile}
                  className="px-4 py-2.5 bg-gradient-to-r from-green-500 to-emerald-500 text-white font-semibold rounded-xl hover:from-green-600 hover:to-emerald-600 transition-all flex items-center gap-2">
                  <Save size={16} /> Save Profile
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CalibrationWizard;
