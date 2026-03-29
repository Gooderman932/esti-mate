// ============================================================
// ESTI-MATE — App Context (Supabase-backed)
// All CRUD operations persist to Supabase em_ tables
// ============================================================

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import {
  Customer, Estimate, Invoice, CalibrationProfile, Measurement,
  LineItem, AppSettings, PageView, MeasurementStats
} from '@/types';
import {
  fetchCustomers, insertCustomer, updateCustomerDb, deleteCustomerDb,
  fetchEstimates, insertEstimate, updateEstimateDb, deleteEstimateDb,
  fetchInvoices, insertInvoice, updateInvoiceDb, deleteInvoiceDb,
  fetchCalibrationProfiles, insertCalibrationProfile, updateCalibrationProfileDb,
  deleteCalibrationProfileDb, setActiveCalibrationProfile,
  fetchMeasurements, insertMeasurement, deleteMeasurementDb, clearMeasurementsDb,
  fetchSettings, upsertSettings, LimitExceededError,
} from '@/lib/database';

interface AppContextType {
  dataLoading: boolean;
  sidebarOpen: boolean;
  toggleSidebar: () => void;
  currentView: PageView;
  setCurrentView: (view: PageView) => void;
  editingId: string | null;
  setEditingId: (id: string | null) => void;
  customers: Customer[];
  addCustomer: (c: Omit<Customer, 'id' | 'createdAt'>) => void;
  updateCustomer: (id: string, c: Partial<Customer>) => void;
  deleteCustomer: (id: string) => void;
  estimates: Estimate[];
  addEstimate: (e: Omit<Estimate, 'id' | 'number' | 'createdAt' | 'updatedAt' | 'subtotal' | 'taxAmount' | 'total'>) => void;
  updateEstimate: (id: string, e: Partial<Estimate>) => void;
  deleteEstimate: (id: string) => void;
  convertToInvoice: (estimateId: string) => void;
  invoices: Invoice[];
  addInvoice: (i: Omit<Invoice, 'id' | 'number' | 'createdAt' | 'updatedAt' | 'subtotal' | 'taxAmount' | 'total'>) => void;
  updateInvoice: (id: string, i: Partial<Invoice>) => void;
  deleteInvoice: (id: string) => void;
  calibrationProfiles: CalibrationProfile[];
  activeProfile: CalibrationProfile | null;
  addCalibrationProfile: (p: Omit<CalibrationProfile, 'id' | 'createdAt' | 'isActive'>) => void;
  updateCalibrationProfile: (id: string, p: Partial<CalibrationProfile>) => void;
  deleteCalibrationProfile: (id: string) => void;
  setActiveProfile: (id: string) => void;
  measurements: Measurement[];
  addMeasurement: (m: Omit<Measurement, 'id' | 'timestamp'>) => void;
  deleteMeasurement: (id: string) => void;
  clearMeasurements: () => void;
  importMeasurements: (ms: Measurement[]) => void;
  measurementStats: MeasurementStats;
  settings: AppSettings;
  updateSettings: (s: Partial<AppSettings>) => void;
  autoMeasureTarget: { estimateId?: string; invoiceId?: string; lineItemId: string; field: string } | null;
  setAutoMeasureTarget: (target: { estimateId?: string; invoiceId?: string; lineItemId: string; field: string } | null) => void;
  applyMeasurement: (distance: number) => void;
}

const defaultSettings: AppSettings = {
  unitSystem: 'imperial',
  showGrid: true,
  showGuides: true,
  darkMode: true,
};

const AppContext = createContext<AppContextType>({} as AppContextType);
export const useAppContext = () => useContext(AppContext);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const userId = user?.id || '';

  const [dataLoading, setDataLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(() => typeof window !== 'undefined' ? window.innerWidth >= 768 : true);
  const [currentView, setCurrentView] = useState<PageView>('dashboard');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [estimates, setEstimates] = useState<Estimate[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [calibrationProfiles, setCalibrationProfiles] = useState<CalibrationProfile[]>([]);
  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);
  const [autoMeasureTarget, setAutoMeasureTarget] = useState<AppContextType['autoMeasureTarget']>(null);

  // Load all data from Supabase on auth
  useEffect(() => {
    if (!userId) { setDataLoading(false); return; }
    let cancelled = false;
    const loadAll = async () => {
      setDataLoading(true);
      try {
        const [cust, est, inv, cal, meas, sett] = await Promise.all([
          fetchCustomers(), fetchEstimates(), fetchInvoices(),
          fetchCalibrationProfiles(), fetchMeasurements(), fetchSettings(userId),
        ]);
        if (cancelled) return;
        setCustomers(cust);
        setEstimates(est);
        setInvoices(inv);
        setCalibrationProfiles(cal);
        setMeasurements(meas);
        if (sett) setSettings(sett);
      } catch (err) {
        console.error('Failed to load data:', err);
        toast.error('Failed to load your data. Please refresh.');
      } finally {
        if (!cancelled) setDataLoading(false);
      }
    };
    loadAll();
    return () => { cancelled = true; };
  }, [userId]);

  const toggleSidebar = () => setSidebarOpen(prev => !prev);

  const recalcTotals = (lineItems: LineItem[], taxRate: number) => {
    lineItems.forEach(li => { li.total = li.quantity * li.unitPrice; });
    const subtotal = lineItems.reduce((s, li) => s + li.total, 0);
    const taxAmount = subtotal * (taxRate / 100);
    return { subtotal, taxAmount, total: subtotal + taxAmount };
  };

  // Customers
  const addCustomer = useCallback(async (c: Omit<Customer, 'id' | 'createdAt'>) => {
    if (!userId) return;
    try {
      const newC = await insertCustomer(userId, c);
      setCustomers(prev => [newC, ...prev]);
      toast.success('Customer added');
    } catch (err: any) { console.error(err); if (err?.name === 'LimitExceededError') { toast.error(err.message); } else { toast.error('Failed to add customer'); } }
  }, [userId]);

  const updateCustomer = useCallback(async (id: string, c: Partial<Customer>) => {
    try {
      await updateCustomerDb(id, c);
      setCustomers(prev => prev.map(cu => cu.id === id ? { ...cu, ...c } : cu));
      toast.success('Customer updated');
    } catch (err) { console.error(err); toast.error('Failed to update customer'); }
  }, []);

  const deleteCustomer = useCallback(async (id: string) => {
    try {
      await deleteCustomerDb(id);
      setCustomers(prev => prev.filter(c => c.id !== id));
      toast.success('Customer deleted');
    } catch (err) { console.error(err); toast.error('Failed to delete customer'); }
  }, []);

  // Estimates
  const addEstimate = useCallback(async (e: Omit<Estimate, 'id' | 'number' | 'createdAt' | 'updatedAt' | 'subtotal' | 'taxAmount' | 'total'>) => {
    if (!userId) return;
    try {
      const totals = recalcTotals([...e.lineItems], e.taxRate);
      const newE = await insertEstimate(userId, e, totals.subtotal, totals.taxAmount, totals.total);
      setEstimates(prev => [newE, ...prev]);
      toast.success('Estimate created');
    } catch (err: any) { console.error(err); if (err?.name === 'LimitExceededError') { toast.error(err.message); } else { toast.error('Failed to create estimate'); } }
  }, [userId]);

  const updateEstimate = useCallback(async (id: string, e: Partial<Estimate>) => {
    if (!userId) return;
    try {
      let subtotal: number | undefined, taxAmount: number | undefined, total: number | undefined;
      const existing = estimates.find(est => est.id === id);
      if (existing && (e.lineItems || e.taxRate !== undefined)) {
        const items = e.lineItems || existing.lineItems;
        const rate = e.taxRate ?? existing.taxRate;
        const totals = recalcTotals([...items], rate);
        subtotal = totals.subtotal; taxAmount = totals.taxAmount; total = totals.total;
      }
      await updateEstimateDb(userId, id, e, subtotal, taxAmount, total);
      setEstimates(prev => prev.map(est => {
        if (est.id !== id) return est;
        const updated = { ...est, ...e, updatedAt: new Date().toISOString() };
        if (subtotal !== undefined) { updated.subtotal = subtotal; updated.taxAmount = taxAmount!; updated.total = total!; }
        return updated;
      }));
      toast.success('Estimate updated');
    } catch (err) { console.error(err); toast.error('Failed to update estimate'); }
  }, [userId, estimates]);

  const deleteEstimate = useCallback(async (id: string) => {
    try {
      await deleteEstimateDb(id);
      setEstimates(prev => prev.filter(e => e.id !== id));
      toast.success('Estimate deleted');
    } catch (err) { console.error(err); toast.error('Failed to delete estimate'); }
  }, []);

  const convertToInvoice = useCallback(async (estimateId: string) => {
    if (!userId) return;
    const est = estimates.find(e => e.id === estimateId);
    if (!est) return;
    try {
      const due = new Date(); due.setDate(due.getDate() + 30);
      const invData = {
        customerId: est.customerId, customerName: est.customerName, estimateId,
        title: est.title, description: est.description, status: 'draft' as const,
        lineItems: [...est.lineItems], taxRate: est.taxRate, notes: est.notes,
        dueDate: due.toISOString(),
      };
      const newInv = await insertInvoice(userId, invData, est.subtotal, est.taxAmount, est.total);
      setInvoices(prev => [newInv, ...prev]);
      await updateEstimateDb(userId, estimateId, { status: 'invoiced' });
      setEstimates(prev => prev.map(e => e.id === estimateId ? { ...e, status: 'invoiced' as const } : e));
      toast.success('Invoice created from estimate');
    } catch (err) { console.error(err); toast.error('Failed to convert estimate'); }
  }, [userId, estimates]);

  // Invoices
  const addInvoice = useCallback(async (i: Omit<Invoice, 'id' | 'number' | 'createdAt' | 'updatedAt' | 'subtotal' | 'taxAmount' | 'total'>) => {
    if (!userId) return;
    try {
      const totals = recalcTotals([...i.lineItems], i.taxRate);
      const newI = await insertInvoice(userId, i, totals.subtotal, totals.taxAmount, totals.total);
      setInvoices(prev => [newI, ...prev]);
      toast.success('Invoice created');
    } catch (err: any) { console.error(err); if (err?.name === 'LimitExceededError') { toast.error(err.message); } else { toast.error('Failed to create invoice'); } }
  }, [userId]);

  const updateInvoice = useCallback(async (id: string, i: Partial<Invoice>) => {
    if (!userId) return;
    try {
      let subtotal: number | undefined, taxAmount: number | undefined, total: number | undefined;
      const existing = invoices.find(inv => inv.id === id);
      if (existing && (i.lineItems || i.taxRate !== undefined)) {
        const items = i.lineItems || existing.lineItems;
        const rate = i.taxRate ?? existing.taxRate;
        const totals = recalcTotals([...items], rate);
        subtotal = totals.subtotal; taxAmount = totals.taxAmount; total = totals.total;
      }
      await updateInvoiceDb(userId, id, i, subtotal, taxAmount, total);
      setInvoices(prev => prev.map(inv => {
        if (inv.id !== id) return inv;
        const updated = { ...inv, ...i, updatedAt: new Date().toISOString() };
        if (subtotal !== undefined) { updated.subtotal = subtotal; updated.taxAmount = taxAmount!; updated.total = total!; }
        return updated;
      }));
      toast.success('Invoice updated');
    } catch (err) { console.error(err); toast.error('Failed to update invoice'); }
  }, [userId, invoices]);

  const deleteInvoice = useCallback(async (id: string) => {
    try {
      await deleteInvoiceDb(id);
      setInvoices(prev => prev.filter(i => i.id !== id));
      toast.success('Invoice deleted');
    } catch (err) { console.error(err); toast.error('Failed to delete invoice'); }
  }, []);

  // Calibration
  const activeProfile = calibrationProfiles.find(p => p.isActive) || null;

  const addCalibrationProfile = useCallback(async (p: Omit<CalibrationProfile, 'id' | 'createdAt' | 'isActive'>) => {
    if (!userId) return;
    try {
      const newP = await insertCalibrationProfile(userId, p);
      setCalibrationProfiles(prev => [...prev, newP]);
      toast.success('Calibration profile created');
    } catch (err) { console.error(err); toast.error('Failed to create profile'); }
  }, [userId]);

  const updateCalibrationProfile = useCallback(async (id: string, p: Partial<CalibrationProfile>) => {
    try {
      await updateCalibrationProfileDb(id, p);
      setCalibrationProfiles(prev => prev.map(cp => cp.id === id ? { ...cp, ...p } : cp));
      toast.success('Profile updated');
    } catch (err) { console.error(err); toast.error('Failed to update profile'); }
  }, []);

  const deleteCalibrationProfile = useCallback(async (id: string) => {
    try {
      await deleteCalibrationProfileDb(id);
      setCalibrationProfiles(prev => prev.filter(p => p.id !== id));
      toast.success('Profile deleted');
    } catch (err) { console.error(err); toast.error('Failed to delete profile'); }
  }, []);

  const setActiveProfileFn = useCallback(async (id: string) => {
    if (!userId) return;
    try {
      await setActiveCalibrationProfile(userId, id);
      setCalibrationProfiles(prev => prev.map(p => ({ ...p, isActive: p.id === id })));
      toast.success('Active profile changed');
    } catch (err) { console.error(err); toast.error('Failed to set active profile'); }
  }, [userId]);

  // Measurements
  const addMeasurement = useCallback(async (m: Omit<Measurement, 'id' | 'timestamp'>) => {
    if (!userId) return;
    try {
      const newM = await insertMeasurement(userId, m);
      setMeasurements(prev => [newM, ...prev].slice(0, 100));
      toast.success('Measurement saved');
    } catch (err: any) { console.error(err); if (err?.name === 'LimitExceededError') { toast.error(err.message); } else { toast.error('Failed to save measurement'); } }
  }, [userId]);

  const deleteMeasurement = useCallback(async (id: string) => {
    try {
      await deleteMeasurementDb(id);
      setMeasurements(prev => prev.filter(m => m.id !== id));
    } catch (err) { console.error(err); toast.error('Failed to delete measurement'); }
  }, []);

  const clearMeasurements = useCallback(async () => {
    if (!userId) return;
    try {
      await clearMeasurementsDb(userId);
      setMeasurements([]);
      toast.success('Measurement history cleared');
    } catch (err) { console.error(err); toast.error('Failed to clear measurements'); }
  }, [userId]);

  const importMeasurements = useCallback(async (ms: Measurement[]) => {
    if (!userId) return;
    try {
      const existingIds = new Set(measurements.map(m => m.id));
      const newOnes = ms.filter(m => !existingIds.has(m.id));
      const inserted: Measurement[] = [];
      for (const m of newOnes) {
        const newM = await insertMeasurement(userId, {
          distance: m.distance, unit: m.unit, confidence: m.confidence,
          profileId: m.profileId, profileName: m.profileName,
          pixelWidth: m.pixelWidth, referenceWidth: m.referenceWidth, note: m.note,
        });
        inserted.push(newM);
      }
      setMeasurements(prev => [...inserted, ...prev].slice(0, 100));
      toast.success(`Imported ${inserted.length} measurement(s)`);
    } catch (err) { console.error(err); toast.error('Failed to import measurements'); }
  }, [userId, measurements]);

  const measurementStats: MeasurementStats = {
    count: measurements.length,
    average: measurements.length ? measurements.reduce((s, m) => s + m.distance, 0) / measurements.length : 0,
    min: measurements.length ? Math.min(...measurements.map(m => m.distance)) : 0,
    max: measurements.length ? Math.max(...measurements.map(m => m.distance)) : 0,
  };

  // Settings
  const updateSettings = useCallback(async (s: Partial<AppSettings>) => {
    if (!userId) return;
    try {
      const updated = await upsertSettings(userId, s);
      setSettings(updated);
      toast.success('Settings updated');
    } catch (err) { console.error(err); toast.error('Failed to update settings'); }
  }, [userId]);

  // Auto Measure
  const applyMeasurement = useCallback(async (distance: number) => {
    if (!autoMeasureTarget || !userId) return;
    const { estimateId, invoiceId, lineItemId, field } = autoMeasureTarget;
    const converted = settings.unitSystem === 'imperial' ? distance * 3.28084 : distance;
    const value = parseFloat(converted.toFixed(2));
    try {
      if (estimateId) {
        const est = estimates.find(e => e.id === estimateId);
        if (est) {
          const lineItems = est.lineItems.map(li => li.id === lineItemId ? { ...li, [field]: value } : li);
          await updateEstimate(estimateId, { lineItems });
        }
      } else if (invoiceId) {
        const inv = invoices.find(i => i.id === invoiceId);
        if (inv) {
          const lineItems = inv.lineItems.map(li => li.id === lineItemId ? { ...li, [field]: value } : li);
          await updateInvoice(invoiceId, { lineItems });
        }
      }
      setAutoMeasureTarget(null);
      toast.success(`Measurement applied: ${value} ${settings.unitSystem === 'imperial' ? 'ft' : 'm'}`);
    } catch (err) { console.error(err); toast.error('Failed to apply measurement'); }
  }, [autoMeasureTarget, settings.unitSystem, estimates, invoices, userId, updateEstimate, updateInvoice]);

  return (
    <AppContext.Provider value={{
      dataLoading,
      sidebarOpen, toggleSidebar, currentView, setCurrentView, editingId, setEditingId,
      customers, addCustomer, updateCustomer, deleteCustomer,
      estimates, addEstimate, updateEstimate, deleteEstimate, convertToInvoice,
      invoices, addInvoice, updateInvoice, deleteInvoice,
      calibrationProfiles, activeProfile, addCalibrationProfile, updateCalibrationProfile, deleteCalibrationProfile, setActiveProfile: setActiveProfileFn,
      measurements, addMeasurement, deleteMeasurement, clearMeasurements, importMeasurements, measurementStats,
      settings, updateSettings,
      autoMeasureTarget, setAutoMeasureTarget, applyMeasurement,
    }}>
      {children}
    </AppContext.Provider>
  );
};
