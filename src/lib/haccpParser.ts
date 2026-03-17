/**
 * HACCP-BUILD-01 — Parse AI output + principle wizard data into structured CCP records.
 */

export interface ParsedCCP {
  ccp_number: string;
  step_name: string;
  hazard_type: string;
  principle_number: number;
  critical_limit: string;
  monitoring_procedure: string;
  corrective_action: string;
  verification_procedure: string;
  record_keeping: string;
  display_order: number;
}

/**
 * Extract structured CCPs from wizard principle data + optional AI text fallback.
 */
export function parseWizardToCCPs(
  principleData: Record<number, Record<string, string>>,
): ParsedCCP[] {
  const ccps: ParsedCCP[] = [];

  // Principle 2 contains CCP definitions (user entered or AI-suggested)
  const p2 = principleData[2] || {};
  const ccpEntries: { step: string; hazard: string }[] = [];

  // Parse CCP fields: ccp_1_step, ccp_1_hazard, ccp_2_step, ccp_2_hazard, etc.
  for (let i = 1; i <= 10; i++) {
    const step = p2[`ccp_${i}_step`]?.trim();
    const hazard = p2[`ccp_${i}_hazard`]?.trim();
    if (step) {
      ccpEntries.push({ step, hazard: hazard || '' });
    }
  }

  // Principle 3: critical limits per CCP
  const p3 = principleData[3] || {};
  // Principle 4: monitoring procedures
  const p4 = principleData[4] || {};
  // Principle 5: corrective actions
  const p5 = principleData[5] || {};
  // Principle 6: verification
  const p6 = principleData[6] || {};
  // Principle 7: record-keeping
  const p7 = principleData[7] || {};

  ccpEntries.forEach((entry, idx) => {
    ccps.push({
      ccp_number: `CCP-${String(idx + 1).padStart(2, '0')}`,
      step_name: entry.step,
      hazard_type: entry.hazard,
      principle_number: 2,
      critical_limit: p3[`ccp_${idx + 1}_limit`]?.trim() || '',
      monitoring_procedure: p4[`ccp_${idx + 1}_monitoring`]?.trim() || p4.what || '',
      corrective_action: p5[`ccp_${idx + 1}_action`]?.trim() || '',
      verification_procedure: p6.activities || '',
      record_keeping: p7.records || '',
      display_order: idx,
    });
  });

  return ccps;
}

/**
 * Fallback: extract CCPs from AI-generated text if wizard data is sparse.
 */
export function parseCCPsFromText(aiText: string): ParsedCCP[] {
  const ccps: ParsedCCP[] = [];
  const lines = aiText.split('\n');
  let order = 0;

  for (const line of lines) {
    // Match patterns like "CCP-1: COOKING" or "CCP 1: Cold Storage"
    const match = line.match(/CCP[-\s]*(\d+)\s*[:—-]\s*(.+)/i);
    if (match) {
      ccps.push({
        ccp_number: `CCP-${String(parseInt(match[1])).padStart(2, '0')}`,
        step_name: match[2].trim(),
        hazard_type: '',
        principle_number: 2,
        critical_limit: '',
        monitoring_procedure: '',
        corrective_action: '',
        verification_procedure: '',
        record_keeping: '',
        display_order: order,
      });
      order++;
    }
  }

  return ccps;
}
