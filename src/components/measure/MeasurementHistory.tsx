import React, { useState, useMemo, useRef } from 'react';
import { useAppContext } from '@/contexts/AppContext';
import { Measurement } from '@/types';
import {
  History, Search, ArrowUpDown, Trash2, Download, Upload,
  FileText, FileJson, ArrowLeft, BarChart3, X
} from 'lucide-react';
import { toast } from 'sonner';

const MeasurementHistory: React.FC = () => {
  const {
    measurements, deleteMeasurement, clearMeasurements, importMeasurements,
    measurementStats, settings, setCurrentView
  } = useAppContext();

  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'date' | 'distance' | 'confidence'>('date');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(() => {
    let result = [...measurements];
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(m =>
        m.note.toLowerCase().includes(q) ||
        m.profileName.toLowerCase().includes(q) ||
        m.distance.toString().includes(q)
      );
    }
    result.sort((a, b) => {
      let cmp = 0;
      if (sortBy === 'date') cmp = new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
      else if (sortBy === 'distance') cmp = a.distance - b.distance;
      else cmp = a.confidence - b.confidence;
      return sortDir === 'desc' ? -cmp : cmp;
    });
    return result;
  }, [measurements, search, sortBy, sortDir]);

  const toggleSort = (field: typeof sortBy) => {
    if (sortBy === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortBy(field); setSortDir('desc'); }
  };

  // CSV Export
  const exportCSV = () => {
    const headers = ['ID', 'Distance', 'Unit', 'Confidence', 'Profile', 'Pixel Width', 'Reference Width', 'Timestamp', 'Note'];
    const escapeCSV = (val: string) => {
      if (val.includes(',') || val.includes('"') || val.includes('\n')) {
        return `"${val.replace(/"/g, '""')}"`;
      }
      return val;
    };
    const rows = measurements.map(m => [
      m.id, m.distance.toString(), m.unit, m.confidence.toString(),
      escapeCSV(m.profileName), m.pixelWidth.toString(), m.referenceWidth.toString(),
      m.timestamp, escapeCSV(m.note)
    ].join(','));
    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `measurements_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('CSV exported successfully');
  };

  // JSON Export
  const exportJSON = () => {
    const data = {
      exportedAt: new Date().toISOString(),
      version: '1.0.0',
      count: measurements.length,
      measurements,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `measurements_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('JSON exported successfully');
  };

  // Import
  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const content = ev.target?.result as string;
        if (file.name.endsWith('.json')) {
          const parsed = JSON.parse(content);
          const ms: Measurement[] = Array.isArray(parsed) ? parsed : parsed.measurements || [];
          if (!Array.isArray(ms) || ms.length === 0) throw new Error('No measurements found');
          ms.forEach(m => {
            if (typeof m.distance !== 'number' || !m.id) throw new Error('Invalid measurement data');
          });
          importMeasurements(ms);
        } else if (file.name.endsWith('.csv')) {
          const lines = content.split('\n').filter(l => l.trim());
          if (lines.length < 2) throw new Error('CSV file is empty');
          const ms: Measurement[] = [];
          for (let i = 1; i < lines.length; i++) {
            // Simple CSV parser supporting quoted fields
            const fields: string[] = [];
            let current = '';
            let inQuotes = false;
            for (const char of lines[i]) {
              if (char === '"') { inQuotes = !inQuotes; continue; }
              if (char === ',' && !inQuotes) { fields.push(current.trim()); current = ''; continue; }
              current += char;
            }
            fields.push(current.trim());
            if (fields.length >= 9) {
              const dist = parseFloat(fields[1]);
              const conf = parseFloat(fields[3]);
              const pxW = parseFloat(fields[5]);
              const refW = parseFloat(fields[6]);
              if (isNaN(dist) || isNaN(conf)) continue;
              ms.push({
                id: fields[0] || `imp-${i}`,
                distance: dist,
                unit: (fields[2] as 'metric' | 'imperial') || 'metric',
                confidence: conf,
                profileId: '',
                profileName: fields[4] || 'Unknown',
                pixelWidth: isNaN(pxW) ? 0 : pxW,
                referenceWidth: isNaN(refW) ? 0 : refW,
                timestamp: fields[7] || new Date().toISOString(),
                note: fields[8] || '',
              });
            }
          }
          if (ms.length === 0) throw new Error('No valid measurements in CSV');
          importMeasurements(ms);
        } else {
          throw new Error('Unsupported file format. Use .csv or .json');
        }
      } catch (err: any) {
        toast.error(`Import failed: ${err.message}`);
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const confColor = (c: number) => c >= 90 ? 'text-green-400' : c >= 70 ? 'text-yellow-400' : 'text-red-400';
  const confBg = (c: number) => c >= 90 ? 'bg-green-500/20' : c >= 70 ? 'bg-yellow-500/20' : 'bg-red-500/20';

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => setCurrentView('dashboard')}
          className="p-2 rounded-lg bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors">
          <ArrowLeft size={20} />
        </button>
        <div>
          <h2 className="text-2xl font-bold text-white">Measurement History</h2>
          <p className="text-slate-400 text-sm">{measurements.length} measurements recorded</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total', value: measurementStats.count, suffix: '' },
          { label: 'Average', value: measurementStats.average.toFixed(2), suffix: settings.unitSystem === 'metric' ? ' m' : ' ft' },
          { label: 'Min', value: measurementStats.min.toFixed(2), suffix: settings.unitSystem === 'metric' ? ' m' : ' ft' },
          { label: 'Max', value: measurementStats.max.toFixed(2), suffix: settings.unitSystem === 'metric' ? ' m' : ' ft' },
        ].map((s, i) => (
          <div key={i} className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4 text-center">
            <p className="text-slate-400 text-xs">{s.label}</p>
            <p className="text-white font-bold text-xl font-mono">{s.value}{s.suffix}</p>
          </div>
        ))}
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input type="text" placeholder="Search measurements..." value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50" />
        </div>
        <div className="flex gap-2 flex-wrap">
          {(['date', 'distance', 'confidence'] as const).map(f => (
            <button key={f} onClick={() => toggleSort(f)}
              className={`px-3 py-2.5 rounded-xl text-sm font-medium transition-colors flex items-center gap-1 ${
                sortBy === f ? 'bg-orange-500/20 text-orange-400' : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}>
              {f.charAt(0).toUpperCase() + f.slice(1)}
              {sortBy === f && <ArrowUpDown size={12} />}
            </button>
          ))}
        </div>
      </div>

      {/* Export/Import */}
      <div className="flex flex-wrap gap-2">
        <button onClick={exportCSV}
          className="px-3 py-2 bg-slate-800 text-slate-300 rounded-lg text-sm hover:bg-slate-700 transition-colors flex items-center gap-2 border border-slate-700">
          <FileText size={14} /> Export CSV
        </button>
        <button onClick={exportJSON}
          className="px-3 py-2 bg-slate-800 text-slate-300 rounded-lg text-sm hover:bg-slate-700 transition-colors flex items-center gap-2 border border-slate-700">
          <FileJson size={14} /> Export JSON
        </button>
        <button onClick={() => fileInputRef.current?.click()}
          className="px-3 py-2 bg-slate-800 text-slate-300 rounded-lg text-sm hover:bg-slate-700 transition-colors flex items-center gap-2 border border-slate-700">
          <Upload size={14} /> Import
        </button>
        <input ref={fileInputRef} type="file" accept=".csv,.json" onChange={handleImport} className="hidden" />
        {measurements.length > 0 && (
          <button onClick={clearMeasurements}
            className="px-3 py-2 bg-red-500/10 text-red-400 rounded-lg text-sm hover:bg-red-500/20 transition-colors flex items-center gap-2 border border-red-500/20 ml-auto">
            <Trash2 size={14} /> Clear All
          </button>
        )}
      </div>

      {/* Table */}
      <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-700/50">
                <th className="text-left text-slate-400 font-medium px-4 py-3 text-xs">Distance</th>
                <th className="text-left text-slate-400 font-medium px-4 py-3 text-xs">Confidence</th>
                <th className="text-left text-slate-400 font-medium px-4 py-3 text-xs hidden md:table-cell">Profile</th>
                <th className="text-left text-slate-400 font-medium px-4 py-3 text-xs hidden lg:table-cell">Px Width</th>
                <th className="text-left text-slate-400 font-medium px-4 py-3 text-xs">Note</th>
                <th className="text-left text-slate-400 font-medium px-4 py-3 text-xs hidden md:table-cell">Date</th>
                <th className="text-right text-slate-400 font-medium px-4 py-3 text-xs"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-500">
                    <History size={32} className="mx-auto mb-2 opacity-50" />
                    No measurements found
                  </td>
                </tr>
              ) : (
                filtered.map(m => (
                  <tr key={m.id} className="border-b border-slate-700/30 hover:bg-slate-800/50 transition-colors">
                    <td className="px-4 py-3">
                      <span className="text-white font-mono font-semibold">
                        {m.distance.toFixed(2)} <span className="text-slate-400 text-xs">{m.unit === 'metric' ? 'm' : 'ft'}</span>
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${confBg(m.confidence)} ${confColor(m.confidence)}`}>
                        {m.confidence}%
                      </span>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <span className="text-slate-300 text-xs">{m.profileName}</span>
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <span className="text-slate-400 font-mono text-xs">{m.pixelWidth}px</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-slate-300 text-xs truncate max-w-[150px] block">{m.note || '—'}</span>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <span className="text-slate-500 text-xs">{new Date(m.timestamp).toLocaleDateString()}</span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => deleteMeasurement(m.id)}
                        className="p-1 text-red-400 hover:text-red-300 transition-colors">
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default MeasurementHistory;
