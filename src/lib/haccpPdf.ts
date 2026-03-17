/**
 * HACCP-BUILD-01 — Per-plan PDF export using pdfExport.ts branded primitives.
 */

import {
  createReportPdf,
  saveReportPdf,
  drawReportHeader,
  drawSectionHeading,
  drawTable,
  MARGIN,
  CONTENT_W,
  PAGE_H,
  NAVY,
  GOLD,
  GRAY,
  hexToRgb,
} from './pdfExport';
import type { ParsedCCP } from './haccpParser';

interface HACCPPlanForPdf {
  name: string;
  generated_plan?: string;
  intake_data?: {
    kitchenType?: string;
    menuCategories?: string[];
    cookingMethods?: string[];
    allergens?: string[];
    servingPopulation?: string;
    dailyCovers?: string;
    equipment?: string;
  };
  created_at: string;
}

interface PlanSection {
  title: string;
  content: string;
}

function safePdfText(text: string): string {
  return text
    .replace(/\u2265/g, '>=')
    .replace(/\u2264/g, '<=')
    .replace(/\u2022/g, '-')
    .replace(/\u2014/g, '--')
    .replace(/\u00B0/g, ' deg')
    .replace(/\u00B1/g, '+/-');
}

/**
 * Export a single HACCP plan as a branded PDF.
 */
export function exportHACCPPlanPdf(
  plan: HACCPPlanForPdf,
  ccps: ParsedCCP[],
  sections?: PlanSection[],
): void {
  const doc = createReportPdf();
  const intake = plan.intake_data || {};
  const dateStr = new Date(plan.created_at).toLocaleDateString('en-US', {
    month: 'long', day: 'numeric', year: 'numeric',
  });

  // Header
  let y = drawReportHeader(
    doc,
    `HACCP Plan — ${plan.name}`,
    'FDA 7-Principle Format',
    intake.kitchenType || '',
    `Generated ${dateStr}`,
  );

  // Disclaimer box
  y += 2;
  doc.setFillColor(254, 243, 199);
  doc.roundedRect(MARGIN, y, CONTENT_W, 14, 1, 1, 'F');
  doc.setFontSize(7);
  doc.setTextColor(133, 77, 14);
  doc.text(
    'IMPORTANT: This plan must be reviewed and validated by a qualified food safety professional before use.',
    MARGIN + 3, y + 5,
  );
  doc.text(
    'Your local AHJ (fire safety) and EHD (food safety) may have additional requirements.',
    MARGIN + 3, y + 10,
  );
  y += 18;

  // Intake summary
  if (intake.kitchenType) {
    y = drawSectionHeading(doc, 'Kitchen Profile', y);
    doc.setFontSize(9);
    doc.setTextColor(...hexToRgb(NAVY));
    const lines: string[] = [];
    if (intake.kitchenType) lines.push(`Kitchen Type: ${intake.kitchenType}`);
    if (intake.menuCategories?.length) lines.push(`Menu: ${intake.menuCategories.join(', ')}`);
    if (intake.cookingMethods?.length) lines.push(`Methods: ${intake.cookingMethods.join(', ')}`);
    if (intake.servingPopulation) lines.push(`Population: ${intake.servingPopulation}`);
    if (intake.dailyCovers) lines.push(`Daily Volume: ${intake.dailyCovers} covers`);
    if (intake.allergens?.length) lines.push(`Allergens: ${intake.allergens.join(', ')}`);
    if (intake.equipment) lines.push(`Equipment: ${intake.equipment}`);
    for (const line of lines) {
      doc.text(line, MARGIN, y);
      y += 5;
    }
    y += 4;
  }

  // CCP Table
  if (ccps.length > 0) {
    y = drawSectionHeading(doc, 'Critical Control Points', y);
    y = drawTable(
      doc,
      ['CCP', 'Process Step', 'Hazard', 'Critical Limit', 'Monitoring', 'Corrective Action'],
      ccps.map(ccp => [
        ccp.ccp_number,
        ccp.step_name || '',
        ccp.hazard_type || '',
        ccp.critical_limit || '',
        ccp.monitoring_procedure || '',
        ccp.corrective_action || '',
      ]),
      y,
      { colWidths: [18, 30, 30, 30, 34, 32], fontSize: 7 },
    );
    y += 4;
  }

  // Plan narrative sections
  if (sections && sections.length > 0) {
    for (const section of sections) {
      if (y > PAGE_H - 40) {
        doc.addPage();
        y = MARGIN;
      }
      y = drawSectionHeading(doc, section.title, y);
      doc.setFontSize(8);
      doc.setTextColor(...hexToRgb(GRAY));
      const safeContent = safePdfText(section.content);
      const textLines = doc.splitTextToSize(safeContent, CONTENT_W);
      for (const line of textLines) {
        if (y > PAGE_H - 20) {
          doc.addPage();
          y = MARGIN;
        }
        doc.text(line, MARGIN, y);
        y += 3.5;
      }
      y += 6;
    }
  } else if (plan.generated_plan) {
    // Fallback: render raw generated plan text
    if (y > PAGE_H - 40) {
      doc.addPage();
      y = MARGIN;
    }
    y = drawSectionHeading(doc, 'Full HACCP Plan', y);
    doc.setFontSize(8);
    doc.setTextColor(...hexToRgb(GRAY));
    const safeContent = safePdfText(plan.generated_plan);
    const textLines = doc.splitTextToSize(safeContent, CONTENT_W);
    for (const line of textLines) {
      if (y > PAGE_H - 20) {
        doc.addPage();
        y = MARGIN;
      }
      doc.text(line, MARGIN, y);
      y += 3.5;
    }
  }

  const filename = `HACCP-Plan-${plan.name.replace(/[^a-zA-Z0-9]+/g, '-')}.pdf`;
  saveReportPdf(doc, filename);
}
