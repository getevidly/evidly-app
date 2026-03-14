import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SeverityBadge } from './SeverityBadge';

interface DetectedIssue {
  type: string;
  severity: string;
}

interface Analysis {
  grease_level: string;
  cleanliness_score: number;
  detected_issues: DetectedIssue[];
  confidence: number;
}

interface AIAnalysisOverlayProps {
  analysis: Analysis | null;
  visible: boolean;
}

const GREASE_LEVEL_COLORS: Record<string, string> = {
  low: '#166534',
  moderate: '#F59E0B',
  heavy: '#DC2626',
  excessive: '#991B1B',
};

export function AIAnalysisOverlay({
  analysis,
  visible,
}: AIAnalysisOverlayProps) {
  if (!visible || analysis == null) {
    return null;
  }

  const greaseBgColor =
    GREASE_LEVEL_COLORS[analysis.grease_level.toLowerCase()] ?? '#6B7F96';

  const scoreColor =
    analysis.cleanliness_score >= 80
      ? '#166534'
      : analysis.cleanliness_score >= 50
        ? '#F59E0B'
        : '#DC2626';

  return (
    <View style={styles.overlay}>
      <View style={styles.content}>
        <Text style={styles.title}>AI Analysis</Text>

        <View style={styles.metricsRow}>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>Grease Level</Text>
            <View
              style={[styles.greaseBadge, { backgroundColor: greaseBgColor }]}
            >
              <Text style={styles.greaseBadgeText}>
                {analysis.grease_level.toUpperCase()}
              </Text>
            </View>
          </View>

          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>Cleanliness</Text>
            <View style={[styles.scoreCircle, { borderColor: scoreColor }]}>
              <Text style={[styles.scoreText, { color: scoreColor }]}>
                {analysis.cleanliness_score}
              </Text>
            </View>
          </View>
        </View>

        {analysis.detected_issues.length > 0 && (
          <View style={styles.issuesSection}>
            <Text style={styles.issuesTitle}>Detected Issues</Text>
            <ScrollView style={styles.issuesList}>
              {analysis.detected_issues.map((issue, index) => (
                <View key={index} style={styles.issueRow}>
                  <Text style={styles.issueType}>{issue.type}</Text>
                  <SeverityBadge
                    severity={
                      issue.severity as 'critical' | 'major' | 'minor'
                    }
                  />
                </View>
              ))}
            </ScrollView>
          </View>
        )}

        <View style={styles.confidenceRow}>
          <Text style={styles.confidenceLabel}>Confidence</Text>
          <Text style={styles.confidenceValue}>
            {Math.round(analysis.confidence * 100)}%
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(7, 17, 31, 0.85)',
    justifyContent: 'flex-end',
  },
  content: {
    backgroundColor: '#07111F',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    paddingBottom: 40,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 20,
  },
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  metricCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
  },
  metricLabel: {
    fontSize: 12,
    color: '#6B7F96',
    fontWeight: '600',
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  greaseBadge: {
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  greaseBadgeText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  scoreCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 3,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  scoreText: {
    fontSize: 20,
    fontWeight: '700',
  },
  issuesSection: {
    marginBottom: 16,
  },
  issuesTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 10,
  },
  issuesList: {
    maxHeight: 150,
  },
  issueRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  issueType: {
    fontSize: 14,
    color: '#D1D9E6',
    flex: 1,
    marginRight: 12,
  },
  confidenceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  confidenceLabel: {
    fontSize: 13,
    color: '#6B7F96',
    fontWeight: '600',
  },
  confidenceValue: {
    fontSize: 16,
    color: '#d4af37',
    fontWeight: '700',
  },
});
