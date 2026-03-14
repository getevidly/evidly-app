/**
 * AIAnalysisOverlay -- semi-transparent overlay card that displays
 * photo AI analysis results (grease level, condition, detected issues)
 * with action buttons to create a deficiency or dismiss.
 */

import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

// ---------------------------------------------------------------------------
// Brand
// ---------------------------------------------------------------------------

const BRAND_BLUE = '#1e4d6b';
const BRAND_GOLD = '#d4af37';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface AIAnalysis {
  grease_level: string;
  grease_percentage: number;
  condition_rating: string;
  detected_issues: string[];
  recommended_actions: string[];
}

interface AIAnalysisOverlayProps {
  analysis: AIAnalysis;
  onCreateDeficiency: () => void;
  onDismiss: () => void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function conditionColor(rating: string): string {
  switch (rating.toLowerCase()) {
    case 'good':
      return '#059669';
    case 'fair':
      return '#D97706';
    case 'poor':
      return '#DC2626';
    default:
      return '#6B7280';
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function AIAnalysisOverlay({
  analysis,
  onCreateDeficiency,
  onDismiss,
}: AIAnalysisOverlayProps) {
  return (
    <View style={styles.backdrop}>
      <View style={styles.card}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>AI Analysis</Text>
          <View style={styles.aiTag}>
            <Text style={styles.aiTagText}>AI</Text>
          </View>
        </View>

        {/* Metrics row */}
        <View style={styles.metricsRow}>
          <View style={styles.metric}>
            <Text style={styles.metricLabel}>Grease Level</Text>
            <Text style={styles.metricValue}>{analysis.grease_level}</Text>
          </View>
          <View style={styles.metric}>
            <Text style={styles.metricLabel}>Coverage</Text>
            <Text style={styles.metricValue}>{analysis.grease_percentage}%</Text>
          </View>
          <View style={styles.metric}>
            <Text style={styles.metricLabel}>Condition</Text>
            <Text
              style={[
                styles.metricValue,
                { color: conditionColor(analysis.condition_rating) },
              ]}
            >
              {analysis.condition_rating}
            </Text>
          </View>
        </View>

        {/* Detected issues */}
        {analysis.detected_issues.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Detected Issues</Text>
            {analysis.detected_issues.map((issue, idx) => (
              <View key={idx} style={styles.bulletRow}>
                <Text style={styles.bullet}>{'\u2022'}</Text>
                <Text style={styles.bulletText}>{issue}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Recommended actions */}
        {analysis.recommended_actions.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Recommended Actions</Text>
            {analysis.recommended_actions.map((action, idx) => (
              <View key={idx} style={styles.bulletRow}>
                <Text style={styles.bullet}>{'\u2022'}</Text>
                <Text style={styles.bulletText}>{action}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Action buttons */}
        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={styles.dismissButton}
            onPress={onDismiss}
            activeOpacity={0.7}
          >
            <Text style={styles.dismissText}>Dismiss</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.deficiencyButton}
            onPress={onCreateDeficiency}
            activeOpacity={0.7}
          >
            <Text style={styles.deficiencyText}>Create Deficiency</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'flex-end',
    padding: 16,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: BRAND_BLUE,
    flex: 1,
  },
  aiTag: {
    backgroundColor: BRAND_GOLD + '25',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  aiTagText: {
    fontSize: 11,
    fontWeight: '800',
    color: BRAND_GOLD,
    letterSpacing: 1,
  },
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    backgroundColor: '#F9FAFB',
    borderRadius: 10,
    padding: 12,
  },
  metric: {
    alignItems: 'center',
    flex: 1,
  },
  metricLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#9CA3AF',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  metricValue: {
    fontSize: 15,
    fontWeight: '700',
    color: '#374151',
  },
  section: {
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 6,
  },
  bulletRow: {
    flexDirection: 'row',
    paddingLeft: 4,
    marginBottom: 3,
  },
  bullet: {
    fontSize: 13,
    color: '#9CA3AF',
    marginRight: 6,
    lineHeight: 20,
  },
  bulletText: {
    fontSize: 13,
    color: '#6B7280',
    flex: 1,
    lineHeight: 20,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 16,
    gap: 10,
  },
  dismissButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
  },
  dismissText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  deficiencyButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#DC2626',
  },
  deficiencyText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
