/**
 * PixelMeasure Context - Adapted for React Native
 * Manages calibration profiles, measurements, and settings
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface CalibrationProfile {
  id: string;
  name: string;
  focalLength: number; // focal length in pixels
  referenceWidth: number; // real width of reference object in current units
  referenceWidthPixels: number; // pixel width during calibration
  referenceDistance: number; // distance during calibration
  createdAt: string;
  icon: string;
}

export interface Measurement {
  id: string;
  distance: number;
  pixelWidth: number;
  referenceWidth: number;
  confidence: number;
  unit: 'metric' | 'imperial';
  profileId: string;
  profileName: string;
  timestamp: string;
  note: string;
}

export type UnitSystem = 'metric' | 'imperial';

interface MeasureContextType {
  unitSystem: UnitSystem;
  setUnitSystem: (unit: UnitSystem) => void;
  calibrationProfiles: CalibrationProfile[];
  activeProfileId: string | null;
  setActiveProfileId: (id: string | null) => void;
  addCalibrationProfile: (profile: CalibrationProfile) => void;
  deleteCalibrationProfile: (id: string) => void;
  updateCalibrationProfile: (profile: CalibrationProfile) => void;
  measurements: Measurement[];
  addMeasurement: (m: Measurement) => void;
  deleteMeasurement: (id: string) => void;
  clearMeasurements: () => void;
  importMeasurements: (items: Measurement[]) => void;
  isCalibrated: boolean;
  getActiveProfile: () => CalibrationProfile | null;
  showGrid: boolean;
  setShowGrid: (v: boolean) => void;
  showGuides: boolean;
  setShowGuides: (v: boolean) => void;
  isLoading: boolean;
}

const MeasureContext = createContext<MeasureContextType>({} as MeasureContextType);

export const useMeasureContext = () => useContext(MeasureContext);

const STORAGE_KEY = '@pixelmeasure_data';

export const MeasureProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [unitSystem, setUnitSystemState] = useState<UnitSystem>('imperial');
  const [calibrationProfiles, setCalibrationProfiles] = useState<CalibrationProfile[]>([]);
  const [activeProfileId, setActiveProfileIdState] = useState<string | null>(null);
  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const [showGrid, setShowGridState] = useState(false);
  const [showGuides, setShowGuidesState] = useState(true);

  // Load from AsyncStorage on mount
  useEffect(() => {
    loadFromStorage();
  }, []);

  // Save to AsyncStorage when state changes
  useEffect(() => {
    if (!isLoading) {
      saveToStorage();
    }
  }, [unitSystem, calibrationProfiles, activeProfileId, measurements, showGrid, showGuides, isLoading]);

  const loadFromStorage = async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw) {
        const data = JSON.parse(raw);
        setUnitSystemState(data.unitSystem || 'imperial');
        setCalibrationProfiles(data.calibrationProfiles || []);
        setActiveProfileIdState(data.activeProfileId || null);
        setMeasurements(data.measurements || []);
        setShowGridState(data.showGrid ?? false);
        setShowGuidesState(data.showGuides ?? true);
      }
    } catch (e) {
      console.error('Error loading measure data:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const saveToStorage = async () => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({
        unitSystem,
        calibrationProfiles,
        activeProfileId,
        measurements,
        showGrid,
        showGuides,
      }));
    } catch (e) {
      console.error('Error saving measure data:', e);
    }
  };

  const setUnitSystem = useCallback((unit: UnitSystem) => {
    setUnitSystemState(unit);
  }, []);

  const setActiveProfileId = useCallback((id: string | null) => {
    setActiveProfileIdState(id);
  }, []);

  const addCalibrationProfile = useCallback((profile: CalibrationProfile) => {
    setCalibrationProfiles(prev => [...prev, profile]);
    setActiveProfileIdState(profile.id);
  }, []);

  const updateCalibrationProfile = useCallback((profile: CalibrationProfile) => {
    setCalibrationProfiles(prev => prev.map(p => p.id === profile.id ? profile : p));
  }, []);

  const deleteCalibrationProfile = useCallback((id: string) => {
    setCalibrationProfiles(prev => prev.filter(p => p.id !== id));
    setActiveProfileIdState(prev => prev === id ? null : prev);
  }, []);

  const addMeasurement = useCallback((m: Measurement) => {
    setMeasurements(prev => [m, ...prev].slice(0, 100));
  }, []);

  const deleteMeasurement = useCallback((id: string) => {
    setMeasurements(prev => prev.filter(m => m.id !== id));
  }, []);

  const clearMeasurements = useCallback(() => {
    setMeasurements([]);
  }, []);

  const importMeasurements = useCallback((items: Measurement[]) => {
    setMeasurements(prev => {
      const existingIds = new Set(prev.map(m => m.id));
      const newItems = items.filter(m => !existingIds.has(m.id));
      return [...newItems, ...prev].slice(0, 100);
    });
  }, []);

  const getActiveProfile = useCallback(() => {
    return calibrationProfiles.find(p => p.id === activeProfileId) || null;
  }, [calibrationProfiles, activeProfileId]);

  const setShowGrid = useCallback((v: boolean) => setShowGridState(v), []);
  const setShowGuides = useCallback((v: boolean) => setShowGuidesState(v), []);

  const isCalibrated = calibrationProfiles.length > 0 && activeProfileId !== null;

  return (
    <MeasureContext.Provider
      value={{
        unitSystem,
        setUnitSystem,
        calibrationProfiles,
        activeProfileId,
        setActiveProfileId,
        addCalibrationProfile,
        deleteCalibrationProfile,
        updateCalibrationProfile,
        measurements,
        addMeasurement,
        deleteMeasurement,
        clearMeasurements,
        importMeasurements,
        isCalibrated,
        getActiveProfile,
        showGrid,
        setShowGrid,
        showGuides,
        setShowGuides,
        isLoading,
      }}
    >
      {children}
    </MeasureContext.Provider>
  );
};
