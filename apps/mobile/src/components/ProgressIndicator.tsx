/**
 * ProgressIndicator -- horizontal step dots for job workflow progress.
 *
 * Shows a row of dots with labels. Steps before currentStep are filled
 * (brand blue), the current step is highlighted in gold, and future
 * steps are grey outlines.
 */

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

// ---------------------------------------------------------------------------
// Brand
// ---------------------------------------------------------------------------

const BRAND_BLUE = '#1e4d6b';
const BRAND_GOLD = '#d4af37';
const GREY = '#D1D5DB';
const TEXT_SECONDARY = '#6B7280';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface ProgressIndicatorProps {
  currentStep: number;
  steps: string[];
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ProgressIndicator({ currentStep, steps }: ProgressIndicatorProps) {
  return (
    <View style={styles.container}>
      {/* Dots row */}
      <View style={styles.dotsRow}>
        {steps.map((_, idx) => {
          const isCompleted = idx < currentStep;
          const isCurrent = idx === currentStep;

          return (
            <React.Fragment key={idx}>
              {/* Connector line (skip before first dot) */}
              {idx > 0 && (
                <View
                  style={[
                    styles.connector,
                    { backgroundColor: isCompleted ? BRAND_BLUE : GREY },
                  ]}
                />
              )}

              {/* Dot */}
              <View
                style={[
                  styles.dot,
                  isCompleted && styles.dotCompleted,
                  isCurrent && styles.dotCurrent,
                  !isCompleted && !isCurrent && styles.dotFuture,
                ]}
              />
            </React.Fragment>
          );
        })}
      </View>

      {/* Labels row */}
      <View style={styles.labelsRow}>
        {steps.map((label, idx) => {
          const isCurrent = idx === currentStep;
          const isCompleted = idx < currentStep;

          return (
            <Text
              key={idx}
              style={[
                styles.label,
                isCurrent && styles.labelCurrent,
                isCompleted && styles.labelCompleted,
              ]}
              numberOfLines={2}
            >
              {label}
            </Text>
          );
        })}
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const DOT_SIZE = 14;

const styles = StyleSheet.create({
  container: {
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  connector: {
    flex: 1,
    height: 2,
    maxWidth: 60,
  },
  dot: {
    width: DOT_SIZE,
    height: DOT_SIZE,
    borderRadius: DOT_SIZE / 2,
  },
  dotCompleted: {
    backgroundColor: BRAND_BLUE,
  },
  dotCurrent: {
    backgroundColor: BRAND_GOLD,
    borderWidth: 2,
    borderColor: BRAND_GOLD,
    shadowColor: BRAND_GOLD,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
    elevation: 3,
  },
  dotFuture: {
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: GREY,
  },
  labelsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  label: {
    flex: 1,
    fontSize: 10,
    color: TEXT_SECONDARY,
    textAlign: 'center',
  },
  labelCurrent: {
    color: BRAND_GOLD,
    fontWeight: '700',
  },
  labelCompleted: {
    color: BRAND_BLUE,
    fontWeight: '600',
  },
});
