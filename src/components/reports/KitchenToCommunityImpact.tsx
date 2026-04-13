// ── Report #11: Kitchen to Community Impact ─────────────────────────────
import { useState } from 'react';
import { Heart, Users, TrendingUp } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useDemo } from '../../contexts/DemoContext';
import { ReportPdfButton } from './ReportPdfButton';
import { ReportEmptyState } from './ReportEmptyState';
import { getK2CImpactData } from '../../data/reportsDemoData';
import { createReportPdf, drawReportHeader, drawSectionHeading, drawTable, drawStatBox, saveReportPdf, MARGIN, CONTENT_W } from '../../lib/pdfExport';
import { CARD_BG, CARD_BORDER, CARD_SHADOW, BODY_TEXT, MUTED } from '../dashboard/shared/constants';
import type { ReportTypeConfig } from '../../config/reportConfig';

const GOLD = '#d4af37';

export default function KitchenToCommunityImpact({ config }: { config: ReportTypeConfig }) {
  const { isDemoMode } = useDemo();

  if (!isDemoMode) return <ReportEmptyState reportTitle={config.title} guidance="Enable Kitchen to Community to start tracking your community impact." />;

  const data = getK2CImpactData();

  const handleExportPdf = () => {
    const doc = createReportPdf();
    let y = drawReportHeader(doc, 'Kitchen to Community Impact', 'Meals funded, donations, and referral activity', 'All Locations', 'All Time');
    const boxW = CONTENT_W / 3 - 3;
    drawStatBox(doc, MARGIN, y, boxW, String(data.totalMealsFunded), 'Total Meals Funded');
    drawStatBox(doc, MARGIN + boxW + 4, y, boxW, `$${data.monthlyDonation}/mo`, 'Monthly Donation');
    drawStatBox(doc, MARGIN + (boxW + 4) * 2, y, boxW, String(data.referralsCount), 'Referrals');
    y += 26;
    y = drawSectionHeading(doc, 'Donation History', y);
    drawTable(doc, ['Month', 'Amount', 'Meals'], data.donationHistory.map(d => [d.month, `$${d.amount}`, String(d.meals)]), y);
    saveReportPdf(doc, 'evidly-k2c-impact.pdf');
  };

  return (
    <div className="space-y-5">
      <div className="flex justify-end">
        <ReportPdfButton onExport={handleExportPdf} />
      </div>

      {/* Impact stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-xl p-5 text-center" style={{ background: CARD_BG, border: `1px solid ${CARD_BORDER}`, boxShadow: CARD_SHADOW }}>
          <Heart size={24} className="mx-auto mb-2" style={{ color: GOLD }} />
          <p className="text-3xl font-bold" style={{ color: BODY_TEXT }}>{data.totalMealsFunded}</p>
          <p className="text-xs mt-1" style={{ color: MUTED }}>Total Meals Funded</p>
        </div>
        <div className="rounded-xl p-5 text-center" style={{ background: CARD_BG, border: `1px solid ${CARD_BORDER}`, boxShadow: CARD_SHADOW }}>
          <TrendingUp size={24} className="mx-auto mb-2" style={{ color: GOLD }} />
          <p className="text-3xl font-bold" style={{ color: BODY_TEXT }}>${data.monthlyDonation}</p>
          <p className="text-xs mt-1" style={{ color: MUTED }}>Monthly Donation</p>
        </div>
        <div className="rounded-xl p-5 text-center" style={{ background: CARD_BG, border: `1px solid ${CARD_BORDER}`, boxShadow: CARD_SHADOW }}>
          <Users size={24} className="mx-auto mb-2" style={{ color: GOLD }} />
          <p className="text-3xl font-bold" style={{ color: BODY_TEXT }}>{data.referralsCount}</p>
          <p className="text-xs mt-1" style={{ color: MUTED }}>Referrals</p>
        </div>
      </div>

      {/* Impact statement */}
      <div className="rounded-xl p-5 text-center" style={{ background: '#fdf8ef', border: `1px solid ${GOLD}33` }}>
        <p className="text-sm font-medium" style={{ color: BODY_TEXT }}>{data.impactComparison}</p>
      </div>

      {/* Donation history chart */}
      <div className="rounded-xl p-5" style={{ background: CARD_BG, border: `1px solid ${CARD_BORDER}`, boxShadow: CARD_SHADOW }}>
        <h3 className="text-sm font-semibold mb-4" style={{ color: BODY_TEXT }}>Monthly Donation History</h3>
        <div className="h-52">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.donationHistory}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#6B7F96' }} />
              <YAxis tick={{ fontSize: 11, fill: '#6B7F96' }} />
              <Tooltip />
              <Bar dataKey="amount" name="Donation ($)" fill={GOLD} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Donation history table */}
      <div className="rounded-xl p-5" style={{ background: CARD_BG, border: `1px solid ${CARD_BORDER}`, boxShadow: CARD_SHADOW }}>
        <h3 className="text-sm font-semibold mb-4" style={{ color: BODY_TEXT }}>Donation Details</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: `2px solid ${CARD_BORDER}` }}>
                {['Month', 'Amount', 'Meals Funded'].map(h => (
                  <th key={h} className="text-left py-2 px-3 text-xs font-semibold" style={{ color: MUTED }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.donationHistory.map((d, i) => (
                <tr key={i} style={{ borderBottom: '1px solid #f0f0f0' }}>
                  <td className="py-2 px-3 font-medium" style={{ color: BODY_TEXT }}>{d.month}</td>
                  <td className="py-2 px-3" style={{ color: BODY_TEXT }}>${d.amount}</td>
                  <td className="py-2 px-3" style={{ color: BODY_TEXT }}>{d.meals}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
