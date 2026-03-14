/* ------------------------------------------------------------------ */
/*  Navigation type definitions for HoodOps mobile                     */
/* ------------------------------------------------------------------ */

/**
 * Root-level param lists.  Each navigator defines its own set of
 * screen params so that `useNavigation` / `useRoute` can be strongly
 * typed via `NativeStackScreenProps<ParamList, RouteName>`.
 */

/* ---------- Technician bottom tabs ---------- */

export type TechnicianTabParamList = {
  TodayTab: undefined;
  JobsTab: undefined;
  CameraTab: undefined;
  MoreTab: undefined;
};

/* ---------- Admin bottom tabs ---------- */

export type AdminTabParamList = {
  DashboardTab: undefined;
  DispatchTab: undefined;
  TeamTab: undefined;
  QATab: undefined;
  MoreTab: undefined;
};

/* ---------- Stack screens nested inside tabs ---------- */

export type TodayStackParamList = {
  TodayHome: undefined;
  JobDetail: { jobId: string };
  CheckIn: { jobId: string };
};

export type JobsStackParamList = {
  JobsList: undefined;
  JobDetail: { jobId: string };
  JobReport: { jobId: string };
};

export type CameraStackParamList = {
  CameraCapture: undefined;
  PhotoReview: { uri: string; jobId?: string };
};

export type DashboardStackParamList = {
  DashboardHome: undefined;
  MetricDetail: { metricId: string };
};

export type DispatchStackParamList = {
  DispatchBoard: undefined;
  AssignJob: { jobId?: string };
  TechnicianDetail: { technicianId: string };
};

export type TeamStackParamList = {
  TeamList: undefined;
  TeamMemberDetail: { memberId: string };
};

export type QAStackParamList = {
  QAList: undefined;
  QAReview: { reportId: string };
};

export type MoreStackParamList = {
  MoreMenu: undefined;
  Settings: undefined;
  Profile: undefined;
  OfflineQueue: undefined;
  About: undefined;
};

/* ---------- Auth screens ---------- */

export type AuthStackParamList = {
  SignIn: undefined;
  ForgotPassword: undefined;
};
