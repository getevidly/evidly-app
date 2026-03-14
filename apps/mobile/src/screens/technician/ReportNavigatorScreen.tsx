import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';

interface SectionItem {
  number: number;
  title: string;
  complete: boolean;
  badge?: string;
  screen: string;
}

const BRAND = {
  primary: '#1e4d6b',
  primaryHover: '#2a6a8f',
  gold: '#d4af37',
  darkBg: '#07111F',
  lightBg: '#F4F6FA',
  cardBg: '#0B1628',
  white: '#FFFFFF',
  green: '#166534',
  greenLight: '#DCFCE7',
  gray: '#6B7F96',
  grayLight: '#D1D9E6',
  textPrimary: '#0B1628',
  textSecondary: '#3D5068',
};

export function ReportNavigatorScreen() {
  const [sections] = useState<SectionItem[]>([
    { number: 1, title: 'Grease Levels', complete: true, screen: 'GreaseLevels' },
    { number: 2, title: 'Hood', complete: true, screen: 'SystemInspection' },
    { number: 3, title: 'Filters', complete: true, screen: 'SystemInspection' },
    { number: 4, title: 'Duct', complete: false, screen: 'SystemInspection' },
    { number: 5, title: 'Fan \u2014 Mechanical', complete: false, screen: 'SystemInspection' },
    { number: 6, title: 'Fan \u2014 Electrical', complete: false, screen: 'SystemInspection' },
    { number: 7, title: 'Solid Fuel', complete: false, badge: 'Optional', screen: 'SystemInspection' },
    { number: 8, title: 'Post Cleaning', complete: false, badge: 'KEC Only', screen: 'SystemInspection' },
    { number: 9, title: 'Fire Safety', complete: false, badge: 'Courtesy', screen: 'FireSafety' },
    { number: 10, title: 'Photos & Sign', complete: false, screen: 'PhotoGrid' },
  ]);

  const completedCount = sections.filter(s => s.complete).length;
  const totalRequired = sections.filter(s => s.badge !== 'Optional').length;
  const requiredComplete = sections.filter(
    s => s.complete && s.badge !== 'Optional'
  ).length;
  const allRequiredDone = requiredComplete >= totalRequired;
  const progressPercent = (completedCount / sections.length) * 100;

  const handleSectionPress = (section: SectionItem) => {
    Alert.alert(
      `Navigate to ${section.title}`,
      `Opens ${section.screen} screen for Section ${section.number}.`,
      [{ text: 'OK' }]
    );
  };

  const handleReviewPress = () => {
    if (!allRequiredDone) {
      Alert.alert(
        'Sections Incomplete',
        'Complete all required sections before reviewing the report.',
        [{ text: 'OK' }]
      );
      return;
    }
    Alert.alert('Review Report', 'Navigating to ReviewSignScreen...', [
      { text: 'OK' },
    ]);
  };

  const renderBadge = (badge: string) => {
    let bgColor = BRAND.grayLight;
    let textColor = BRAND.textSecondary;

    if (badge === 'Optional') {
      bgColor = '#EEF1F7';
      textColor = BRAND.gray;
    } else if (badge === 'KEC Only') {
      bgColor = '#FEF3C7';
      textColor = '#92400E';
    } else if (badge === 'Courtesy') {
      bgColor = '#DBEAFE';
      textColor = '#1E40AF';
    }

    return (
      <View style={[styles.badge, { backgroundColor: bgColor }]}>
        <Text style={[styles.badgeText, { color: textColor }]}>{badge}</Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={styles.certificateId}>SR-2026-00417</Text>
          <View style={styles.serviceTypeBadge}>
            <Text style={styles.serviceTypeBadgeText}>KEC Standard</Text>
          </View>
        </View>
        <Text style={styles.customerName}>Riverfront Bistro</Text>
        <Text style={styles.headerSubtitle}>
          System 1 of 2 \u00B7 Hood #A-1 (Main Line)
        </Text>
      </View>

      {/* Sections List */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {sections.map(section => (
          <TouchableOpacity
            key={section.number}
            style={styles.sectionRow}
            onPress={() => handleSectionPress(section)}
            activeOpacity={0.7}
          >
            {/* Section Number Circle */}
            <View
              style={[
                styles.sectionCircle,
                section.complete
                  ? styles.sectionCircleComplete
                  : styles.sectionCirclePending,
              ]}
            >
              {section.complete ? (
                <Text style={styles.checkmark}>{'\u2713'}</Text>
              ) : (
                <Text style={styles.sectionNumber}>{section.number}</Text>
              )}
            </View>

            {/* Section Content */}
            <View style={styles.sectionContent}>
              <View style={styles.sectionTitleRow}>
                <Text
                  style={[
                    styles.sectionTitle,
                    section.complete && styles.sectionTitleComplete,
                  ]}
                >
                  {section.title}
                </Text>
                {section.badge && renderBadge(section.badge)}
              </View>
              <Text style={styles.sectionStatus}>
                {section.complete ? 'Completed' : 'Pending'}
              </Text>
            </View>

            {/* Chevron */}
            <Text style={styles.chevron}>{'\u203A'}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Bottom Status Bar */}
      <View style={styles.bottomBar}>
        <View style={styles.progressInfo}>
          <Text style={styles.progressText}>
            {completedCount}/{sections.length} sections complete
          </Text>
          <View style={styles.progressBarTrack}>
            <View
              style={[styles.progressBarFill, { width: `${progressPercent}%` }]}
            />
          </View>
        </View>

        <TouchableOpacity
          style={[
            styles.reviewButton,
            !allRequiredDone && styles.reviewButtonDisabled,
          ]}
          onPress={handleReviewPress}
          activeOpacity={0.8}
          disabled={!allRequiredDone}
        >
          <Text
            style={[
              styles.reviewButtonText,
              !allRequiredDone && styles.reviewButtonTextDisabled,
            ]}
          >
            Review Report
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BRAND.lightBg,
  },
  header: {
    backgroundColor: BRAND.darkBg,
    paddingTop: 56,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  certificateId: {
    fontSize: 14,
    fontWeight: '600',
    color: BRAND.gold,
    letterSpacing: 0.5,
  },
  serviceTypeBadge: {
    backgroundColor: 'rgba(212, 175, 55, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.3)',
  },
  serviceTypeBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: BRAND.gold,
  },
  customerName: {
    fontSize: 22,
    fontWeight: '700',
    color: BRAND.white,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: BRAND.gray,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 24,
  },
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: BRAND.white,
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E8EDF5',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  sectionCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  sectionCircleComplete: {
    backgroundColor: '#DCFCE7',
  },
  sectionCirclePending: {
    backgroundColor: '#F1F5F9',
    borderWidth: 2,
    borderColor: BRAND.grayLight,
  },
  checkmark: {
    fontSize: 18,
    fontWeight: '700',
    color: BRAND.green,
  },
  sectionNumber: {
    fontSize: 15,
    fontWeight: '700',
    color: BRAND.gray,
  },
  sectionContent: {
    flex: 1,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: BRAND.textPrimary,
  },
  sectionTitleComplete: {
    color: BRAND.green,
  },
  sectionStatus: {
    fontSize: 13,
    color: BRAND.gray,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  chevron: {
    fontSize: 28,
    color: BRAND.grayLight,
    marginLeft: 8,
  },
  bottomBar: {
    backgroundColor: BRAND.white,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 34,
    borderTopWidth: 1,
    borderTopColor: '#E8EDF5',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 4,
  },
  progressInfo: {
    marginBottom: 14,
  },
  progressText: {
    fontSize: 14,
    fontWeight: '600',
    color: BRAND.textSecondary,
    marginBottom: 8,
  },
  progressBarTrack: {
    height: 6,
    backgroundColor: '#E8EDF5',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: 6,
    backgroundColor: BRAND.green,
    borderRadius: 3,
  },
  reviewButton: {
    backgroundColor: BRAND.primary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  reviewButtonDisabled: {
    backgroundColor: '#B8C4D8',
  },
  reviewButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: BRAND.white,
  },
  reviewButtonTextDisabled: {
    color: '#E8EDF5',
  },
});
