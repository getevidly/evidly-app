/**
 * PhotoGrid -- 3-column grid of photo thumbnails with an add button.
 */

import React from 'react';
import {
  Dimensions,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

// ---------------------------------------------------------------------------
// Brand
// ---------------------------------------------------------------------------

const BRAND_BLUE = '#1e4d6b';

// ---------------------------------------------------------------------------
// Layout
// ---------------------------------------------------------------------------

const COLUMNS = 3;
const GAP = 8;
const SCREEN_PADDING = 32; // 16px on each side
const TILE_SIZE =
  (Dimensions.get('window').width - SCREEN_PADDING - GAP * (COLUMNS - 1)) /
  COLUMNS;

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface Photo {
  id: string;
  thumbnail_url: string;
  phase: string;
}

interface PhotoGridProps {
  photos: Photo[];
  onPhotoPress: (id: string) => void;
  onAddPress: () => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function PhotoGrid({ photos, onPhotoPress, onAddPress }: PhotoGridProps) {
  return (
    <View style={styles.grid}>
      {photos.map((photo) => (
        <TouchableOpacity
          key={photo.id}
          style={styles.tile}
          onPress={() => onPhotoPress(photo.id)}
          activeOpacity={0.8}
        >
          <Image
            source={{ uri: photo.thumbnail_url }}
            style={styles.image}
            resizeMode="cover"
          />
          <View style={styles.phaseBadge}>
            <Text style={styles.phaseText}>{photo.phase}</Text>
          </View>
        </TouchableOpacity>
      ))}

      {/* Add photo card */}
      <TouchableOpacity
        style={[styles.tile, styles.addCard]}
        onPress={onAddPress}
        activeOpacity={0.7}
      >
        <Text style={styles.addIcon}>+</Text>
        <Text style={styles.addLabel}>Add Photo</Text>
      </TouchableOpacity>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: GAP,
  },
  tile: {
    width: TILE_SIZE,
    height: TILE_SIZE,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#F3F4F6',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  phaseBadge: {
    position: 'absolute',
    bottom: 4,
    left: 4,
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  phaseText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  addCard: {
    borderWidth: 2,
    borderColor: BRAND_BLUE + '40',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  addIcon: {
    fontSize: 28,
    color: BRAND_BLUE,
    fontWeight: '300',
    marginBottom: 2,
  },
  addLabel: {
    fontSize: 11,
    color: BRAND_BLUE,
    fontWeight: '600',
  },
});
