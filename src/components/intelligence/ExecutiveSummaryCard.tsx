import React, { useEffect, useState } from 'react';

interface Props {
  data: any;
  viewMode: string;
  loading: boolean;
  setLoading: (v: boolean) => void;
}

const viewPrompts: Record<string, string> = {
  operations: `You are a compliance operations advisor. Analyze this commercial kitchen compliance data and write a 3-paragraph executive briefing for a VP of Operations.
    Paragraph 1: Current organizational compliance posture — what's working, what's not, pattern analysis.
    Paragraph 2: The most urgent operational risks requiring immediate attention, with specific location callouts.
    Paragraph 3: Strategic operational recommendations with estimated impact.
    Be direct, data-driven, and specific. No fluff. Reference specific locations by name when relevant.`,

  risk: `You are a regulatory risk advisor. Analyze this commercial kitchen compliance data and write a 3-paragraph executive briefing for a VP of Risk or General Counsel.
    Paragraph 1: Current liability exposure across locations — which locations represent the highest legal and regulatory risk and why.
    Paragraph 2: Specific threats — permit expirations, failed fire safety items, open violations, reinspection requirements, and their potential legal/regulatory consequences.
    Paragraph 3: Risk mitigation priorities ranked by urgency and potential liability reduction.
    Be precise about regulatory citations. Reference NFPA 96 (2024) Table 12.4 where relevant.`,

  financial: `You are a financial risk analyst. Analyze this commercial kitchen compliance data and write a 3-paragraph executive briefing for a CFO.
    Paragraph 1: Quantify the total financial risk exposure from non-compliance — insurance implications, potential fines, closure risk, and litigation exposure.
    Paragraph 2: The ROI of compliance investment — what the current EvidLY compliance platform is preventing financially, and what it would cost to ignore these issues.
    Paragraph 3: Financial optimization opportunities — where targeted compliance improvement would yield the highest financial return.
    Use the dollar figures provided in the data. Be specific and quantitative.`,

  people: `You are an HR analytics advisor. Analyze this commercial kitchen compliance data and write a 3-paragraph executive briefing for a CHRO or VP of People.
    Paragraph 1: The correlation between staff turnover rates and compliance outcomes across locations. Which locations show the strongest negative correlation?
    Paragraph 2: How staffing instability creates compliance risk — the operational chain from turnover to training gaps to compliance failures to liability.
    Paragraph 3: People strategy recommendations — what staffing and training investments would most improve compliance outcomes, with estimated impact.
    Be specific about which locations show staffing-compliance correlation.`,
};

const demoSummaries: Record<string, string> = {
  operations: `Pacific Coast Dining's compliance posture shows a clear bifurcation: Downtown Kitchen operates at 96% checklist completion with an improving trajectory and zero incidents — a model location. However, the organizational average of 74% checklist completion is pulled down significantly by Airport Cafe (71%) and University Dining (54%), both on declining trajectories over the past 90 days. Temp log completion mirrors this pattern at 76% org-wide, indicating the compliance gaps are systemic at underperforming locations rather than task-specific.

The most urgent operational risk is University Dining, which requires immediate intervention. With 6 open items, a reinspection window closing March 1, and checklist completion at 54% and falling, this location is on track for a failed reinspection. Airport Cafe's fire safety failure compounds the organizational risk — two of three locations now carry active compliance deficiencies. The declining trends at both locations suggest the root cause has not been addressed.

Three strategic priorities: First, deploy management support to University Dining before the March 1 reinspection — a reinspection failure at current trajectory is near-certain without intervention. Second, remediate Airport Cafe's fire safety failure and address the 18-day hood cleaning certificate expiration before it compounds into a multi-violation scenario. Third, replicate Downtown Kitchen's operational model (staffing stability, checklist discipline, management oversight) as the organizational standard. The compliance gap between your best and worst locations represents a 42-point spread — closing that gap by even half would materially change the risk profile.`,

  risk: `Pacific Coast Dining faces $520,500 in estimated annual risk exposure, concentrated overwhelmingly at two locations. University Dining represents $385,000 of that exposure — a single location carrying 74% of the organization's total regulatory and legal risk. This location has an active "Action Required" food safety status, a failed fire safety inspection, a health permit expiring in 7 days, and a hood cleaning certificate expiring in 3 days. If the hood cleaning certificate expires while the fire safety failure remains unresolved, the AHJ has grounds for immediate closure under NFPA 96 (2024) enforcement. Airport Cafe adds $127,000 in exposure with its own fire safety failure and 18-day hood cleaning certificate expiration.

The specific threat chain at University Dining is: hood cleaning certificate expires in 3 days → fire safety non-compliance confirmed → health permit expires in 7 days → reinspection due March 1 with 6 open items → if reinspection fails, the AHJ may issue a closure notice. Each of these events compounds the next. Separately, Airport Cafe's fire suppression inspection expires in 45 days — if that location enters reinspection with both a fire safety failure and an expired fire suppression certificate, the probability of enforcement action increases substantially. Two active permit expirations within 30 days across the organization is a critical documentation gap.

Priority 1: Renew University Dining's hood cleaning certificate within 48 hours — this is the single highest-impact action available. Priority 2: Resolve University Dining's food safety violations before the March 1 reinspection. Priority 3: Address Airport Cafe's fire safety failure and schedule hood cleaning certificate renewal. These three actions would reduce total organizational risk exposure by an estimated 60-70%.`,

  financial: `Total quantified risk exposure across Pacific Coast Dining stands at $520,500 annually, against estimated compliance savings of $341,000. The net financial case for compliance investment is not the savings alone — it is the avoidance of the $520,500 exposure. University Dining alone carries $385,000 in risk exposure: potential closure costs (revenue loss at $2,500-5,000/day for 3-14 days), reinspection fees, emergency remediation premiums, legal consultation for enforcement defense, and insurance carrier dispute grounds if an incident occurs with expired permits and active violations. The 3-day hood cleaning certificate expiration creates immediate insurance vulnerability.

The ROI of EvidLY's compliance platform is most visible at Downtown Kitchen: $42,000 in estimated annual savings from maintained compliance, zero incidents, and a documented record that supports favorable insurance positioning. That location demonstrates what systematic compliance management produces. The gap between Downtown ($8,500 exposure) and University ($385,000 exposure) is a 45:1 ratio — the difference is not the tool, it is the operational discipline the tool enables. Investing in operational support for the two underperforming locations would yield an estimated 15:1 return on investment.

The highest-return financial actions: (1) University Dining remediation — estimated $2,000-8,000 investment to address fire safety and permit renewals, against $385,000 in exposure reduction. (2) Airport Cafe fire safety resolution — estimated $2,000-5,000 investment against $127,000 exposure. (3) At next insurance renewal, present Downtown Kitchen's EvidLY compliance documentation as the basis for premium renegotiation — carriers increasingly factor digital compliance documentation into underwriting decisions.`,

  people: `The staffing-compliance correlation across Pacific Coast Dining is striking and quantifiable. Downtown Kitchen operates at 12% annual turnover with 96% checklist completion — your strongest compliance location is also your most stable workforce. Airport Cafe shows 34% turnover with 71% checklist completion, and University Dining has 51% turnover with 54% checklist completion. The organization-wide pattern is clear: each 10-point increase in turnover rate correlates with approximately 10-12 points of checklist completion decline. University Dining's 51% turnover is the single strongest predictor of its compliance failure trajectory.

The operational chain is direct: high turnover means new staff who lack training → untrained staff miss checklist items and temperature logs → open compliance items accumulate → inspection readiness declines → enforcement risk increases → operational disruption from enforcement further increases turnover. University Dining appears to be in the negative feedback loop phase of this cycle — turnover is both causing and being caused by operational instability. The 4 incidents in 90 days at that location likely accelerated the cycle. Each new hire requires approximately 3 weeks to reach compliance proficiency, meaning University Dining is perpetually operating with a partially-trained workforce.

Three people-strategy investments would most improve compliance outcomes: First, conduct a retention diagnostic at University Dining — identify whether the turnover driver is compensation, management, working conditions, or scheduling, and address the root cause. Reducing turnover from 51% to 30% would be estimated to improve checklist completion by 15-20 points. Second, implement a structured 3-week onboarding compliance checklist for all new hires across all locations — this reduces the proficiency gap during the high-risk transition period. Third, assign a compliance mentor at Airport Cafe and University Dining — a designated team member responsible for daily checklist oversight until completion rates stabilize above 85%.`,
};

export const ExecutiveSummaryCard: React.FC<Props> = ({ data, viewMode, loading, setLoading }) => {
  const [summary, setSummary] = useState('');
  const [error, setError] = useState('');
  const [isDemo, setIsDemo] = useState(false);

  const generateSummary = async () => {
    setLoading(true);
    setError('');
    setIsDemo(false);

    const prompt = viewPrompts[viewMode] || viewPrompts.operations;
    const dataContext = JSON.stringify({
      orgName: data.orgName,
      period: data.period,
      orgMetrics: data.orgMetrics,
      complianceMatrix: data.complianceMatrix.map((l: any) => ({
        name: l.locationName,
        jurisdiction: l.jurisdiction,
        foodSafetyStatus: l.foodSafetyStatus,
        fireSafetyVerdict: l.fireSafetyVerdict,
        openItems: l.openItems,
        trend: l.trend,
        riskLevel: l.riskLevel,
        checklistCompletionRate: l.checklistCompletionRate,
        tempLogCompletionRate: l.tempLogCompletionRate,
        staffTurnoverRate: l.staffTurnoverRate,
        incidentsLast90Days: l.incidentsLast90Days,
        permitExpirations: l.permitExpirations,
        estimatedRiskExposure: l.estimatedRiskExposure,
        estimatedComplianceSavings: l.estimatedComplianceSavings,
        nextInspectionWindow: l.nextInspectionWindow,
      })),
      upcomingRegulatoryChanges: data.upcomingRegulatoryChanges,
      industryBenchmarks: data.industryBenchmarks,
    });

    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-5-20250929',
          max_tokens: 1000,
          system: prompt,
          messages: [{
            role: 'user',
            content: `Here is the compliance data for ${data.orgName} over the past ${data.period}:\n\n${dataContext}\n\nWrite the executive briefing now. Use plain paragraphs only — no bullet points, no headers, no markdown. Write as if briefing a C-suite executive verbally.`,
          }],
        }),
      });

      if (!response.ok) throw new Error('API unavailable');

      const result = await response.json();
      const text = result.content?.[0]?.text || '';
      if (!text) throw new Error('Empty response');
      setSummary(text);
    } catch {
      // Fall back to pre-written demo summaries
      setIsDemo(true);
      setSummary(demoSummaries[viewMode] || demoSummaries.operations);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    generateSummary();
  }, [viewMode]);

  const viewLabels: Record<string, { icon: string; title: string; color: string }> = {
    operations: { icon: '\u2699\uFE0F', title: 'Operations Intelligence Brief', color: '#3b82f6' },
    risk:       { icon: '\u2696\uFE0F', title: 'Risk & Legal Intelligence Brief', color: '#ef4444' },
    financial:  { icon: '\uD83D\uDCB0', title: 'Financial Intelligence Brief', color: '#A08C5A' },
    people:     { icon: '\uD83D\uDC65', title: 'People Intelligence Brief', color: '#8b5cf6' },
  };

  const v = viewLabels[viewMode] || viewLabels.operations;

  return (
    <div style={{
      background: 'linear-gradient(135deg, #1E2D4D 0%, #162038 100%)',
      border: `1px solid ${v.color}40`,
      borderLeft: `4px solid ${v.color}`,
      borderRadius: '12px',
      padding: '20px 24px',
      marginBottom: '20px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '18px' }}>{v.icon}</span>
          <span style={{
            fontFamily: "system-ui, -apple-system, 'Segoe UI', sans-serif",
            fontSize: '13px',
            fontWeight: 700,
            color: v.color,
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
          }}>
            {v.title}
          </span>
          <span style={{
            backgroundColor: '#A08C5A20',
            border: '1px solid #A08C5A40',
            borderRadius: '4px',
            padding: '2px 6px',
            fontSize: '10px',
            color: '#A08C5A',
            fontWeight: 600,
          }}>
            {isDemo ? 'DEMO ANALYSIS' : 'AI GENERATED'}
          </span>
        </div>
        <button
          onClick={generateSummary}
          disabled={loading}
          style={{
            backgroundColor: 'transparent',
            border: '1px solid #334155',
            borderRadius: '6px',
            padding: '4px 10px',
            color: '#64748b',
            fontSize: '11px',
            cursor: loading ? 'not-allowed' : 'pointer',
            fontFamily: 'system-ui',
          }}
        >
          {loading ? 'Analyzing...' : '\u21BB Refresh'}
        </button>
      </div>

      {loading && (
        <div style={{
          width: '100%', height: '4px',
          background: '#1e293b',
          borderRadius: '2px',
          overflow: 'hidden',
        }}>
          <div style={{
            height: '100%',
            width: '40%',
            background: v.color,
            borderRadius: '2px',
            animation: 'slideRight 1.5s ease-in-out infinite',
          }} />
        </div>
      )}

      {!loading && summary && (
        <div style={{
          fontFamily: "system-ui, -apple-system, 'Segoe UI', sans-serif",
          fontSize: '13px',
          color: '#cbd5e1',
          lineHeight: 1.7,
        }}>
          {summary.split('\n\n').map((para, i) => (
            <p key={i} style={{ margin: i === 0 ? 0 : '12px 0 0' }}>{para}</p>
          ))}
        </div>
      )}

      {!loading && error && (
        <p style={{ color: '#ef4444', fontSize: '13px', margin: 0 }}>{error}</p>
      )}
    </div>
  );
};
