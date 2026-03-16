/**
 * Measure Settings Screen
 * 
 * Manage calibration profiles, unit system, and overlay options
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Switch,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useMeasureContext } from '../src/contexts/MeasureContext';
import { formatDistance } from '../src/utils/pinholeCamera';

export default function MeasureSettingsScreen() {
  const router = useRouter();
  const {
    unitSystem,
    setUnitSystem,
    calibrationProfiles,
    activeProfileId,
    setActiveProfileId,
    deleteCalibrationProfile,
    showGrid,
    setShowGrid,
    showGuides,
    setShowGuides,
  } = useMeasureContext();

  const handleDeleteProfile = (id: string, name: string) => {
    Alert.alert(
      'Delete Profile',
      `Delete calibration profile "${name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => deleteCalibrationProfile(id) },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView style={styles.scroll}>
        {/* Unit System */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Unit System</Text>
          <View style={styles.unitToggle}>
            <TouchableOpacity
              style={[styles.unitOption, unitSystem === 'imperial' && styles.unitOptionActive]}
              onPress={() => setUnitSystem('imperial')}
            >
              <Text style={[styles.unitText, unitSystem === 'imperial' && styles.unitTextActive]}>
                Imperial (ft/in)
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.unitOption, unitSystem === 'metric' && styles.unitOptionActive]}
              onPress={() => setUnitSystem('metric')}
            >
              <Text style={[styles.unitText, unitSystem === 'metric' && styles.unitTextActive]}>
                Metric (m/cm)
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Calibration Profiles */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Calibration Profiles</Text>
          {calibrationProfiles.length === 0 ? (
            <View style={styles.emptyProfiles}>
              <Ionicons name="camera-outline" size={32} color="#666" />
              <Text style={styles.emptyText}>No profiles yet</Text>
              <Text style={styles.emptySubtext}>Create one from the Auto Measure screen</Text>
            </View>
          ) : (
            <View style={styles.profilesList}>
              {calibrationProfiles.map(profile => (
                <TouchableOpacity
                  key={profile.id}
                  style={[
                    styles.profileCard,
                    activeProfileId === profile.id && styles.profileCardActive,
                  ]}
                  onPress={() => setActiveProfileId(profile.id)}
                  onLongPress={() => handleDeleteProfile(profile.id, profile.name)}
                >
                  <View style={styles.profileInfo}>
                    <View style={styles.profileHeader}>
                      <Ionicons
                        name={activeProfileId === profile.id ? 'checkmark-circle' : 'ellipse-outline'}
                        size={20}
                        color={activeProfileId === profile.id ? '#007AFF' : '#666'}
                      />
                      <Text style={styles.profileName}>{profile.name}</Text>
                    </View>
                    <Text style={styles.profileDetails}>
                      Ref: {profile.referenceWidth} {unitSystem === 'metric' ? 'm' : 'ft'} @ {profile.referenceDistance} {unitSystem === 'metric' ? 'm' : 'ft'}
                    </Text>
                    <Text style={styles.profileDate}>
                      Created: {new Date(profile.createdAt).toLocaleDateString()}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.deleteButton}
                    onPress={() => handleDeleteProfile(profile.id, profile.name)}
                  >
                    <Ionicons name="trash-outline" size={18} color="#FF3B30" />
                  </TouchableOpacity>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Overlay Options */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Camera Overlay</Text>
          <View style={styles.toggleRow}>
            <View style={styles.toggleInfo}>
              <Text style={styles.toggleLabel}>Show Grid</Text>
              <Text style={styles.toggleSubtext}>Display rule-of-thirds grid</Text>
            </View>
            <Switch
              value={showGrid}
              onValueChange={setShowGrid}
              trackColor={{ false: '#444', true: '#007AFF' }}
            />
          </View>
          <View style={styles.toggleRow}>
            <View style={styles.toggleInfo}>
              <Text style={styles.toggleLabel}>Show Guides</Text>
              <Text style={styles.toggleSubtext}>Display center crosshair</Text>
            </View>
            <Switch
              value={showGuides}
              onValueChange={setShowGuides}
              trackColor={{ false: '#444', true: '#007AFF' }}
            />
          </View>
        </View>

        {/* History Link */}
        <View style={styles.section}>
          <TouchableOpacity
            style={styles.linkButton}
            onPress={() => router.push('/measure-history')}
          >
            <Ionicons name="time-outline" size={20} color="#007AFF" />
            <Text style={styles.linkText}>View Measurement History</Text>
            <Ionicons name="chevron-forward" size={20} color="#666" />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  scroll: { flex: 1 },
  section: { padding: 16, borderBottomWidth: 1, borderBottomColor: '#222' },
  sectionTitle: { color: '#888', fontSize: 13, fontWeight: '600', textTransform: 'uppercase', marginBottom: 12 },
  unitToggle: { flexDirection: 'row', backgroundColor: '#1a1a1a', borderRadius: 10, padding: 4 },
  unitOption: { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 8 },
  unitOptionActive: { backgroundColor: '#007AFF' },
  unitText: { color: '#888', fontSize: 15 },
  unitTextActive: { color: '#fff', fontWeight: '600' },
  emptyProfiles: { alignItems: 'center', paddingVertical: 32 },
  emptyText: { color: '#888', fontSize: 16, marginTop: 12 },
  emptySubtext: { color: '#666', fontSize: 13, marginTop: 4 },
  profilesList: { gap: 12 },
  profileCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1a1a1a', borderRadius: 12, padding: 14, borderWidth: 2, borderColor: 'transparent' },
  profileCardActive: { borderColor: '#007AFF' },
  profileInfo: { flex: 1 },
  profileHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  profileName: { color: '#fff', fontSize: 16, fontWeight: '600' },
  profileDetails: { color: '#888', fontSize: 13, marginLeft: 28 },
  profileDate: { color: '#666', fontSize: 12, marginLeft: 28, marginTop: 2 },
  deleteButton: { padding: 8 },
  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12 },
  toggleInfo: { flex: 1 },
  toggleLabel: { color: '#fff', fontSize: 16 },
  toggleSubtext: { color: '#666', fontSize: 13, marginTop: 2 },
  linkButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1a1a1a', borderRadius: 12, padding: 16, gap: 12 },
  linkText: { flex: 1, color: '#007AFF', fontSize: 16 },
});
