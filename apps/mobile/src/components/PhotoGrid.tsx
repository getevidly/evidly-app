import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
} from 'react-native';

interface Photo {
  uri: string;
  phase: string;
  component?: string;
}

interface PhotoGridProps {
  photos: Photo[];
  onPhotoPress?: (index: number) => void;
  columns?: number;
}

const SCREEN_WIDTH = Dimensions.get('window').width;
const GRID_PADDING = 16;
const GRID_GAP = 8;

export function PhotoGrid({
  photos,
  onPhotoPress,
  columns = 2,
}: PhotoGridProps) {
  const cellWidth =
    (SCREEN_WIDTH - GRID_PADDING * 2 - GRID_GAP * (columns - 1)) / columns;

  return (
    <View style={styles.grid}>
      {photos.map((photo, index) => (
        <TouchableOpacity
          key={index}
          style={[
            styles.cell,
            {
              width: cellWidth,
              height: cellWidth,
              marginRight: (index + 1) % columns === 0 ? 0 : GRID_GAP,
            },
          ]}
          activeOpacity={0.7}
          onPress={() => onPhotoPress?.(index)}
        >
          <View style={styles.placeholder}>
            <Text style={styles.cameraEmoji}>📷</Text>
            {photo.component != null && (
              <Text style={styles.componentLabel} numberOfLines={1}>
                {photo.component}
              </Text>
            )}
          </View>

          <View style={styles.phaseBadge}>
            <Text style={styles.phaseText}>{photo.phase}</Text>
          </View>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: GRID_PADDING,
  },
  cell: {
    borderRadius: 10,
    overflow: 'hidden',
    marginBottom: GRID_GAP,
    backgroundColor: '#E8EDF5',
    position: 'relative',
  },
  placeholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#D1D9E6',
  },
  cameraEmoji: {
    fontSize: 32,
  },
  componentLabel: {
    fontSize: 11,
    color: '#3D5068',
    marginTop: 4,
    fontWeight: '500',
  },
  phaseBadge: {
    position: 'absolute',
    bottom: 6,
    left: 6,
    backgroundColor: 'rgba(7, 17, 31, 0.75)',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  phaseText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '600',
  },
});
