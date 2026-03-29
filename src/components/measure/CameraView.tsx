import React, { useRef, useState, useEffect, useCallback } from 'react';
import { useAppContext } from '@/contexts/AppContext';
import {
  Camera, CameraOff, RotateCcw, Grid3X3, Crosshair, Save,
  ArrowLeft, SwitchCamera, Info
} from 'lucide-react';

interface Point { x: number; y: number }

const CameraView: React.FC = () => {
  const {
    activeProfile, settings, addMeasurement, applyMeasurement,
    autoMeasureTarget, setAutoMeasureTarget, setCurrentView
  } = useAppContext();

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [showGrid, setShowGrid] = useState(settings.showGrid);
  const [showGuides, setShowGuides] = useState(settings.showGuides);
  const [points, setPoints] = useState<Point[]>([]);
  const [distance, setDistance] = useState<number | null>(null);
  const [confidence, setConfidence] = useState<number>(0);
  const [pixelWidth, setPixelWidth] = useState<number>(0);
  const [note, setNote] = useState('');
  const [showResult, setShowResult] = useState(false);

  const startCamera = useCallback(async () => {
    try {
      // Stop existing stream first
      if (stream) {
        stream.getTracks().forEach(t => t.stop());
        setStream(null);
      }
      
      let mediaStream: MediaStream;
      try {
        // Try with preferred facing mode first
        mediaStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: facingMode }, width: { ideal: 1280 }, height: { ideal: 720 } }
        });
      } catch {
        // Fallback: request any available camera
        mediaStream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1280 }, height: { ideal: 720 } }
        });
      }
      
      setStream(mediaStream);
      setCameraError(null);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err: any) {
      setCameraError(err.message || 'Camera access denied. Please allow camera permissions.');
    }
  }, [facingMode]);

  // Start camera on mount and when facingMode changes
  useEffect(() => {
    startCamera();
    return () => {
      // Stream cleanup handled separately
    };
  }, [startCamera]);

  // Cleanup stream on unmount
  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(t => t.stop());
      }
    };
  }, [stream]);


  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (points.length < 2) {
      const newPoints = [...points, { x, y }];
      setPoints(newPoints);

      if (newPoints.length === 2) {
        calculateDistance(newPoints);
      }
    }
  };

  const calculateDistance = (pts: Point[]) => {
    if (!activeProfile || pts.length < 2) return;

    const dx = pts[1].x - pts[0].x;
    const dy = pts[1].y - pts[0].y;
    const pxWidth = Math.sqrt(dx * dx + dy * dy);
    setPixelWidth(pxWidth);

    // Pinhole camera model: D = (W_ref × F) / W_px
    const dist = (activeProfile.referenceWidth * activeProfile.focalLength) / pxWidth;
    
    // Convert to cm then to meters
    const distMeters = dist / 100;
    setDistance(distMeters);

    // Confidence based on pixel span and calibration quality
    const conf = Math.min(98, Math.max(50, 100 - (1000 / pxWidth) - Math.abs(distMeters - activeProfile.calibrationDistance / 100) * 2));
    setConfidence(Math.round(conf));
    setShowResult(true);
  };

  const resetMeasurement = () => {
    setPoints([]);
    setDistance(null);
    setConfidence(0);
    setPixelWidth(0);
    setShowResult(false);
    setNote('');
  };

  const handleSave = () => {
    if (distance === null || !activeProfile) return;
    const finalDist = settings.unitSystem === 'imperial' ? distance * 3.28084 : distance;
    
    addMeasurement({
      distance: parseFloat(finalDist.toFixed(3)),
      unit: settings.unitSystem,
      confidence,
      profileId: activeProfile.id,
      profileName: activeProfile.name,
      pixelWidth: Math.round(pixelWidth),
      referenceWidth: activeProfile.referenceWidth,
      note,
    });

    if (autoMeasureTarget) {
      applyMeasurement(distance);
    }
    resetMeasurement();
  };

  const handleApplyAndClose = () => {
    if (distance === null) return;
    handleSave();
    setCurrentView('dashboard');
  };

  // Draw overlay
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const draw = () => {
      const container = containerRef.current;
      if (!container) return;
      canvas.width = container.clientWidth;
      canvas.height = container.clientHeight;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Grid
      if (showGrid) {
        ctx.strokeStyle = 'rgba(255,255,255,0.1)';
        ctx.lineWidth = 1;
        const gridSize = 60;
        for (let x = 0; x < canvas.width; x += gridSize) {
          ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
        }
        for (let y = 0; y < canvas.height; y += gridSize) {
          ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
        }
      }

      // Guides / crosshair
      if (showGuides) {
        ctx.strokeStyle = 'rgba(249,115,22,0.3)';
        ctx.lineWidth = 1;
        ctx.setLineDash([8, 4]);
        const cx = canvas.width / 2;
        const cy = canvas.height / 2;
        ctx.beginPath(); ctx.moveTo(cx, 0); ctx.lineTo(cx, canvas.height); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, cy); ctx.lineTo(canvas.width, cy); ctx.stroke();
        ctx.setLineDash([]);
        // Center circle
        ctx.beginPath(); ctx.arc(cx, cy, 20, 0, Math.PI * 2); ctx.stroke();
      }

      // Points
      points.forEach((p, i) => {
        ctx.fillStyle = i === 0 ? '#f97316' : '#10b981';
        ctx.beginPath(); ctx.arc(p.x, p.y, 8, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(p.x, p.y, 8, 0, Math.PI * 2); ctx.stroke();
        // Label
        ctx.fillStyle = '#fff';
        ctx.font = '12px monospace';
        ctx.fillText(i === 0 ? 'A' : 'B', p.x + 12, p.y + 4);
      });

      // Line between points
      if (points.length === 2) {
        ctx.strokeStyle = '#f97316';
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 3]);
        ctx.beginPath();
        ctx.moveTo(points[0].x, points[0].y);
        ctx.lineTo(points[1].x, points[1].y);
        ctx.stroke();
        ctx.setLineDash([]);

        // Midpoint label
        const mx = (points[0].x + points[1].x) / 2;
        const my = (points[0].y + points[1].y) / 2;
        if (distance !== null) {
          const displayDist = settings.unitSystem === 'imperial' ? distance * 3.28084 : distance;
          const unit = settings.unitSystem === 'imperial' ? 'ft' : 'm';
          const text = `${displayDist.toFixed(2)} ${unit}`;
          ctx.fillStyle = 'rgba(0,0,0,0.7)';
          const tw = ctx.measureText(text).width;
          ctx.fillRect(mx - tw / 2 - 8, my - 22, tw + 16, 28);
          ctx.fillStyle = '#f97316';
          ctx.font = 'bold 14px monospace';
          ctx.fillText(text, mx - tw / 2, my);
        }
      }

      requestAnimationFrame(draw);
    };
    const id = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(id);
  }, [points, distance, showGrid, showGuides, settings.unitSystem]);

  const displayDistance = distance !== null
    ? settings.unitSystem === 'imperial' ? distance * 3.28084 : distance
    : null;
  const unit = settings.unitSystem === 'imperial' ? 'ft' : 'm';

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <button onClick={() => {
          setAutoMeasureTarget(null);
          setCurrentView('dashboard');
        }} className="p-2 rounded-lg bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors">
          <ArrowLeft size={20} />
        </button>
        <div>
          <h2 className="text-2xl font-bold text-white">Auto Measure</h2>
          <p className="text-slate-400 text-sm">
            {autoMeasureTarget ? 'Measure and apply to line item' : 'Camera-based distance measurement'}
          </p>
        </div>
        {autoMeasureTarget && (
          <span className="px-3 py-1 bg-orange-500/20 text-orange-400 rounded-full text-xs font-medium">
            Measuring for line item
          </span>
        )}
      </div>

      {/* Profile info */}
      {!activeProfile && (
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4">
          <p className="text-yellow-400 text-sm font-medium">No calibration profile active</p>
          <p className="text-yellow-400/70 text-xs mt-1">Please set an active calibration profile in Settings or Calibration.</p>
          <button onClick={() => setCurrentView('calibration')}
            className="mt-2 px-3 py-1.5 bg-yellow-500/20 text-yellow-400 rounded-lg text-sm hover:bg-yellow-500/30 transition-colors">
            Go to Calibration
          </button>
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-4">
        {/* Camera */}
        <div className="lg:col-span-2">
          <div ref={containerRef} className="relative bg-black rounded-xl overflow-hidden aspect-video">
            {cameraError ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900">
                <CameraOff size={48} className="text-slate-600 mb-3" />
                <p className="text-slate-400 text-sm text-center px-4">{cameraError}</p>
                <button onClick={startCamera}
                  className="mt-3 px-4 py-2 bg-orange-500/20 text-orange-400 rounded-lg text-sm hover:bg-orange-500/30 transition-colors">
                  Retry
                </button>
              </div>
            ) : (
              <>
                <video ref={videoRef} autoPlay playsInline muted
                  className="w-full h-full object-cover"
                  onLoadedMetadata={() => videoRef.current?.play()} />
                <canvas ref={canvasRef}
                  className="absolute inset-0 w-full h-full cursor-crosshair"
                  onClick={handleCanvasClick} />
              </>
            )}

            {/* Camera controls */}
            <div className="absolute top-3 right-3 flex gap-2">
              <button onClick={() => setShowGrid(g => !g)}
                className={`p-2 rounded-lg backdrop-blur-sm transition-colors ${showGrid ? 'bg-orange-500/30 text-orange-400' : 'bg-black/40 text-white/70 hover:text-white'}`}>
                <Grid3X3 size={18} />
              </button>
              <button onClick={() => setShowGuides(g => !g)}
                className={`p-2 rounded-lg backdrop-blur-sm transition-colors ${showGuides ? 'bg-orange-500/30 text-orange-400' : 'bg-black/40 text-white/70 hover:text-white'}`}>
                <Crosshair size={18} />
              </button>
              <button onClick={() => setFacingMode(f => f === 'environment' ? 'user' : 'environment')}
                className="p-2 rounded-lg bg-black/40 text-white/70 hover:text-white backdrop-blur-sm transition-colors">
                <SwitchCamera size={18} />
              </button>
            </div>

            {/* Instructions */}
            {points.length === 0 && (
              <div className="absolute bottom-3 left-3 right-3 bg-black/60 backdrop-blur-sm rounded-lg p-3">
                <p className="text-white text-sm text-center">Tap two points to measure the distance between them</p>
              </div>
            )}
            {points.length === 1 && (
              <div className="absolute bottom-3 left-3 right-3 bg-orange-500/20 backdrop-blur-sm rounded-lg p-3 border border-orange-500/30">
                <p className="text-orange-400 text-sm text-center">Point A set. Now tap the second point (B)</p>
              </div>
            )}
          </div>

          {/* Reset */}
          <div className="flex gap-2 mt-3">
            <button onClick={resetMeasurement}
              className="px-4 py-2 bg-slate-800 text-slate-300 rounded-lg hover:bg-slate-700 transition-colors flex items-center gap-2 text-sm">
              <RotateCcw size={14} /> Reset Points
            </button>
          </div>
        </div>

        {/* Results Panel */}
        <div className="space-y-4">
          {/* Active Profile */}
          <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
            <h4 className="text-slate-400 text-xs font-medium mb-2">ACTIVE PROFILE</h4>
            {activeProfile ? (
              <div>
                <p className="text-white font-semibold">{activeProfile.name}</p>
                <p className="text-slate-500 text-xs mt-1">F = {activeProfile.focalLength}px | Ref: {activeProfile.referenceWidth}cm</p>
              </div>
            ) : (
              <p className="text-slate-500 text-sm">None selected</p>
            )}
          </div>

          {/* Measurement Result */}
          {showResult && distance !== null && (
            <div className="bg-slate-800/50 border border-orange-500/30 rounded-xl p-4">
              <h4 className="text-orange-400 text-xs font-medium mb-3">MEASUREMENT RESULT</h4>
              <div className="text-center mb-4">
                <p className="text-4xl font-bold text-white font-mono">
                  {displayDistance?.toFixed(2)}
                </p>
                <p className="text-slate-400 text-sm">{unit === 'ft' ? 'feet' : 'meters'}</p>
              </div>
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-slate-900/50 rounded-lg p-2 text-center">
                  <p className="text-slate-500 text-[10px]">CONFIDENCE</p>
                  <p className={`font-bold text-lg ${confidence >= 90 ? 'text-green-400' : confidence >= 70 ? 'text-yellow-400' : 'text-red-400'}`}>
                    {confidence}%
                  </p>
                </div>
                <div className="bg-slate-900/50 rounded-lg p-2 text-center">
                  <p className="text-slate-500 text-[10px]">PIXEL SPAN</p>
                  <p className="text-white font-bold text-lg">{Math.round(pixelWidth)}</p>
                </div>
              </div>
              <div className="mb-3">
                <label className="text-slate-400 text-xs block mb-1">Note (optional)</label>
                <input value={note} onChange={e => setNote(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                  placeholder="e.g. Wall length" />
              </div>
              <div className="space-y-2">
                <button onClick={handleSave}
                  className="w-full px-4 py-2.5 bg-gradient-to-r from-orange-500 to-amber-500 text-white font-semibold rounded-lg hover:from-orange-600 hover:to-amber-600 transition-all flex items-center justify-center gap-2">
                  <Save size={16} /> Save to History
                </button>
                {autoMeasureTarget && (
                  <button onClick={handleApplyAndClose}
                    className="w-full px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white font-semibold rounded-lg hover:from-emerald-600 hover:to-emerald-700 transition-all flex items-center justify-center gap-2">
                    <Crosshair size={16} /> Apply & Return
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Info */}
          <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <Info size={14} className="text-slate-400" />
              <h4 className="text-slate-400 text-xs font-medium">HOW IT WORKS</h4>
            </div>
            <p className="text-slate-500 text-xs leading-relaxed">
              Using the pinhole camera model, the app calculates real-world distance from the pixel distance between two points:
            </p>
            <p className="text-orange-400 text-xs font-mono mt-2 text-center">
              D = (W<sub>ref</sub> × F) / W<sub>px</sub>
            </p>
            <p className="text-slate-500 text-xs mt-2 leading-relaxed">
              Where D is distance, W<sub>ref</sub> is reference width, F is focal length, and W<sub>px</sub> is pixel width.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CameraView;
