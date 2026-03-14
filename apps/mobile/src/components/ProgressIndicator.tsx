import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface ProgressIndicatorProps {
  steps: string[];
  currentStep: number;
}

const COLORS = {
  completed: '#1e4d6b',
  current: '#d4af37',
  future: '#D1D9E6',
  lineCompleted: '#1e4d6b',
  lineFuture: '#D1D9E6',
};

export function ProgressIndicator({ steps, currentStep }: ProgressIndicatorProps) {
  return (
    <View style={styles.container}>
      <View style={styles.stepsRow}>
        {steps.map((step, index) => {
          const isCompleted = index < currentStep;
          const isCurrent = index === currentStep;

          let circleColor = COLORS.future;
          if (isCompleted) circleColor = COLORS.completed;
          else if (isCurrent) circleColor = COLORS.current;

          return (
            <React.Fragment key={index}>
              {index > 0 && (
                <View
                  style={[
                    styles.line,
                    {
                      backgroundColor: isCompleted
                        ? COLORS.lineCompleted
                        : COLORS.lineFuture,
                    },
                  ]}
                />
              )}
              <View style={styles.stepColumn}>
                <View
                  style={[
                    styles.circle,
                    { backgroundColor: circleColor },
                    isCurrent && styles.currentCircle,
                  ]}
                >
                  {isCompleted && (
                    <Text style={styles.checkmark}>✓</Text>
                  )}
                  {isCurrent && (
                    <View style={styles.innerDot} />
                  )}
                </View>
                <Text
                  style={[
                    styles.label,
                    (isCompleted || isCurrent) && styles.labelActive,
                  ]}
                  numberOfLines={2}
                >
                  {step}
                </Text>
              </View>
            </React.Fragment>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 16,
    paddingHorizontal: 8,
  },
  stepsRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  stepColumn: {
    alignItems: 'center',
    width: 64,
  },
  circle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  currentCircle: {
    shadowColor: '#d4af37',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 4,
  },
  checkmark: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  innerDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#FFFFFF',
  },
  line: {
    height: 3,
    flex: 1,
    alignSelf: 'center',
    marginTop: 12,
    borderRadius: 2,
  },
  label: {
    fontSize: 11,
    color: '#6B7F96',
    textAlign: 'center',
    marginTop: 6,
    fontWeight: '500',
  },
  labelActive: {
    color: '#0B1628',
    fontWeight: '600',
  },
});
