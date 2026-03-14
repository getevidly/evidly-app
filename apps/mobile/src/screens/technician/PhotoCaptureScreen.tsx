import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';

type Phase = 'Before' | 'During' | 'After';
type Component = 'Hood' | 'Duct' | 'Fan' | 'Filter';

interface CapturedPhoto {
  id: string;
  phase: Phase;
  component: Component;
  timestamp: string;
  aiAnalyzed: boolean;
}

const DEMO_PHOTOS: CapturedPhoto[] = [
  { id: 'p1', phase: 'Before', component: 'Hood', timestamp: '8:14 AM', aiAnalyzed: true },
  { id: 'p2', phase: 'Before', component: 'Filter', timestamp: '8:16 AM', aiAnalyzed: true },
  { id: 'p3', phase: 'During', component: 'Duct', timestamp: '9:02 AM', aiAnalyzed: false },
];

const PHASES: Phase[] = ['Before', 'During', 'After'];
const COMPONENTS: Component[] = ['Hood', 'Duct', 'Fan', 'Filter'];

export function PhotoCaptureScreen() {
  const [selectedPhase, setSelectedPhase] = useState<Phase>('Before');
  const [selectedComponent, setSelectedComponent] = useState<Component>('Hood');
  const [photos, setPhotos] = useState<CapturedPhoto[]>(DEMO_PHOTOS);

  const handleCapture = () => {
    const newPhoto: CapturedPhoto = {
      id: `p${photos.length + 1}`,
      phase: selectedPhase,
      component: selectedComponent,
      timestamp: new Date().toLocaleTimeString([], {
        hour: 'numeric',
        minute: '2-digit',
      }),
      aiAnalyzed: false,
    };
    setPhotos([...photos, newPhoto]);
    Alert.alert('Photo Captured', `${selectedComponent} - ${selectedPhase} photo saved (demo).`);
  };

  const phasePhotos = photos.filter((p) => p.phase === selectedPhase);

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Camera Placeholder */}
        <TouchableOpacity style={styles.cameraArea} onPress={handleCapture}>
          <View style={styles.cameraFrame}>
            <View style={styles.crosshair} />
            <Text style={styles.cameraTapText}>Tap to Take Photo</Text>
          </View>
        </TouchableOpacity>

        {/* Phase Selector */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Phase</Text>
          <View style={styles.selectorRow}>
            {PHASES.map((phase) => (
              <TouchableOpacity
                key={phase}
                style={[
                  styles.selectorButton,
                  selectedPhase === phase ? styles.selectorActive : null,
                ]}
                onPress={() => setSelectedPhase(phase)}
              >
                <Text
                  style={[
                    styles.selectorText,
                    selectedPhase === phase ? styles.selectorTextActive : null,
                  ]}
                >
                  {phase}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Component Selector */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Component</Text>
          <View style={styles.selectorRow}>
            {COMPONENTS.map((comp) => (
              <TouchableOpacity
                key={comp}
                style={[
                  styles.selectorButton,
                  selectedComponent === comp ? styles.selectorActive : null,
                ]}
                onPress={() => setSelectedComponent(comp)}
              >
                <Text
                  style={[
                    styles.selectorText,
                    selectedComponent === comp
                      ? styles.selectorTextActive
                      : null,
                  ]}
                >
                  {comp}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Photo Grid */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {selectedPhase} Photos ({phasePhotos.length})
          </Text>
          {phasePhotos.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>
                No {selectedPhase.toLowerCase()} photos yet
              </Text>
            </View>
          ) : (
            <View style={styles.photoGrid}>
              {phasePhotos.map((photo) => (
                <View key={photo.id} style={styles.photoCard}>
                  <View style={styles.photoPlaceholder}>
                    <Text style={styles.photoIcon}>{'🖼'}</Text>
                  </View>
                  <View style={styles.photoInfo}>
                    <Text style={styles.photoComponent}>
                      {photo.component}
                    </Text>
                    <Text style={styles.photoTimestamp}>
                      {photo.timestamp}
                    </Text>
                  </View>
                  {photo.aiAnalyzed && (
                    <View style={styles.aiBadge}>
                      <Text style={styles.aiBadgeText}>AI</Text>
                    </View>
                  )}
                </View>
              ))}
            </View>
          )}
        </View>

        {/* All Photos Summary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            All Photos ({photos.length})
          </Text>
          <View style={styles.summaryRow}>
            {PHASES.map((phase) => {
              const count = photos.filter((p) => p.phase === phase).length;
              return (
                <View key={phase} style={styles.summaryItem}>
                  <Text style={styles.summaryCount}>{count}</Text>
                  <Text style={styles.summaryLabel}>{phase}</Text>
                </View>
              );
            })}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4F6FA',
  },
  scrollContent: {
    paddingBottom: 32,
  },
  cameraArea: {
    backgroundColor: '#07111F',
    height: 280,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraFrame: {
    width: 200,
    height: 200,
    borderWidth: 2,
    borderColor: 'rgba(212,175,55,0.5)',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  crosshair: {
    width: 40,
    height: 40,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    borderRadius: 20,
    marginBottom: 16,
  },
  cameraTapText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    fontWeight: '500',
  },
  section: {
    paddingHorizontal: 16,
    marginTop: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0B1628',
    marginBottom: 10,
  },
  selectorRow: {
    flexDirection: 'row',
    gap: 8,
  },
  selectorButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D1D9E6',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
  },
  selectorActive: {
    backgroundColor: '#1e4d6b',
    borderColor: '#1e4d6b',
  },
  selectorText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#3D5068',
  },
  selectorTextActive: {
    color: '#FFFFFF',
  },
  emptyState: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#6B7F96',
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  photoCard: {
    width: '47%',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
    position: 'relative',
  },
  photoPlaceholder: {
    height: 100,
    backgroundColor: '#07111F',
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoIcon: {
    fontSize: 32,
  },
  photoInfo: {
    padding: 8,
  },
  photoComponent: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0B1628',
  },
  photoTimestamp: {
    fontSize: 11,
    color: '#6B7F96',
    marginTop: 2,
  },
  aiBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#d4af37',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  aiBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#07111F',
  },
  summaryRow: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryCount: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1e4d6b',
  },
  summaryLabel: {
    fontSize: 12,
    color: '#6B7F96',
    marginTop: 2,
  },
});
