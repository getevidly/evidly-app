export type TechnicianTabParams = {
  Today: undefined;
  Jobs: undefined;
  Camera: undefined;
  Reports: undefined;
  More: undefined;
};

export type TechnicianStackParams = {
  TechTabs: undefined;
  JobDetail: { jobId: string };
  Checklist: { jobId: string; phase: 'pre' | 'during' | 'post' };
  PhotoCapture: { jobId: string; systemId?: string; component?: string; phase?: string };
  Deficiencies: { jobId: string };
  ReportGenerator: { jobId: string };
  ServiceReport: { jobId: string; reportId?: string };
  ReportBuilder: { reportId: string; systemIndex?: number };
  SystemInspection: { reportId: string; systemId: string; sectionIndex?: number };
  ReportReview: { reportId: string };
  NfpaLookup: { reportId: string; systemId: string };
  Signature: { jobId: string; reportId?: string };
  Schedule: undefined;
  Availability: undefined;
  Timecards: undefined;
  Emergency: undefined;
  Settings: undefined;
};

export type AdminTabParams = {
  Dashboard: undefined;
  Dispatch: undefined;
  Team: undefined;
  QA: undefined;
  More: undefined;
};

export type AdminStackParams = {
  AdminTabs: undefined;
  CustomerLookup: undefined;
  QAReviewDetail: { reportId: string };
};
