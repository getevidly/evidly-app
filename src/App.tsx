import { BrowserRouter as Router, Routes, Route, Navigate, Outlet, useLocation, useParams } from 'react-router-dom';
import { lazy, Suspense, useEffect, useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ClientJoin } from './pages/ClientJoin';
import { RoleProvider } from './contexts/RoleContext';
import { OperatingHoursProvider } from './contexts/OperatingHoursContext';
import { DemoProvider, useDemo } from './contexts/DemoContext';
import { LanguageProvider } from './contexts/LanguageContext';
import { OfflineProvider } from './contexts/OfflineContext';
import { InactivityProvider } from './contexts/InactivityContext';
import { BrandingProvider } from './contexts/BrandingContext';
import { NotificationProvider } from './contexts/NotificationContext';
import { EmulationProvider } from './contexts/EmulationContext';
import { Toaster } from 'sonner';
import { ErrorBoundary } from './components/ErrorBoundary';
import { reportError } from './lib/errorReporting';
import { SalesGuard } from './components/layout/SalesGuard';
import QRAuthGuard from './components/auth/QRAuthGuard';
import { RequireAdmin } from './components/auth/RequireAdmin';
// import { OnboardingGuard } from './components/auth/OnboardingGuard';
import { supabase } from './lib/supabase';
import { useCrisp, useCrispIdentify } from './hooks/useCrisp';

const Login = lazy(() => import('./pages/Login').then(m => ({ default: m.Login })));
const AdminLogin = lazy(() => import('./pages/AdminLogin').then(m => ({ default: m.AdminLogin })));
const Signup = lazy(() => import('./pages/Signup').then(m => ({ default: m.Signup })));
const SignupLocations = lazy(() => import('./pages/SignupLocations').then(m => ({ default: m.SignupLocations })));
const VendorLogin = lazy(() => import('./pages/VendorLogin').then(m => ({ default: m.VendorLogin })));
const VendorRegister = lazy(() => import('./pages/VendorRegister').then(m => ({ default: m.VendorRegister })));
const VendorDashboard = lazy(() => import('./pages/VendorDashboard').then(m => ({ default: m.VendorDashboard })));
const VendorSecureUpload = lazy(() => import('./pages/VendorSecureUpload').then(m => ({ default: m.VendorSecureUpload })));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword').then(m => ({ default: m.ForgotPassword })));
const ResetPassword = lazy(() => import('./pages/ResetPassword').then(m => ({ default: m.ResetPassword })));
const EmailConfirmed = lazy(() => import('./pages/EmailConfirmed').then(m => ({ default: m.EmailConfirmed })));
const DemoWizard = lazy(() => import('./pages/DemoWizard').then(m => ({ default: m.DemoWizard })));
const SetupFoodSafety = lazy(() => import('./pages/SetupFoodSafety').then(m => ({ default: m.SetupFoodSafety })));
const SetupFoodSafetyEntry = lazy(() => import('./pages/SetupFoodSafetyEntry').then(m => ({ default: m.SetupFoodSafetyEntry })));
const Dashboard = lazy(() => import('./pages/Dashboard').then(m => ({ default: m.Dashboard })));
const SendInspectionPage = lazy(() => import('./pages/SendInspectionPage').then(m => ({ default: m.SendInspectionPage })));
const TempLogs = lazy(() => import('./pages/TempLogs').then(m => ({ default: m.TempLogs })));
const Checklists = lazy(() => import('./pages/Checklists').then(m => ({ default: m.Checklists })));
const ChecklistCompletionDetail = lazy(() => import('./pages/ChecklistCompletionDetail'));
const Documents = lazy(() => import('./pages/Documents').then(m => ({ default: m.Documents })));
const Policies = lazy(() => import('./pages/Policies').then(m => ({ default: m.Policies })));
const PolicyEditor = lazy(() => import('./pages/PolicyEditor').then(m => ({ default: m.PolicyEditor })));
const PolicyLens = lazy(() => import('./pages/PolicyLens'));
const PolicyLensUpload = lazy(() => import('./pages/PolicyLensUpload'));
const Reports = lazy(() => import('./pages/Reports').then(m => ({ default: m.Reports })));
const ProspectMarketingReport = lazy(() => import('./pages/internal/ProspectMarketingReport'));
const ReportViewer = lazy(() => import('./pages/public/ReportViewer').then(m => ({ default: m.ReportViewer })));
const Vendors = lazy(() => import('./pages/Vendors').then(m => ({ default: m.Vendors })));
const VendorDetail = lazy(() => import('./pages/VendorDetail'));
const VendorsPage = lazy(() => import('./pages/vendors/VendorsPage'));
const ServiceDetail = lazy(() => import('./pages/vendors/ServiceDetail'));
const RequestDetail = lazy(() => import('./pages/vendors/RequestDetail'));
const DocumentReviewDetail = lazy(() => import('./pages/vendors/DocumentReviewDetail'));
const HACCP = lazy(() => import('./pages/HACCP').then(m => ({ default: m.HACCP })));
const Alerts = lazy(() => import('./pages/Alerts').then(m => ({ default: m.Alerts })));
const AIAdvisor = lazy(() => import('./pages/AIAdvisor').then(m => ({ default: m.AIAdvisor })));
const Leaderboard = lazy(() => import('./pages/Leaderboard').then(m => ({ default: m.Leaderboard })));
const LeaderboardPreview = lazy(() => import('./pages/LeaderboardPreview').then(m => ({ default: m.LeaderboardPreview })));
const FoodRecovery = lazy(() => import('./pages/FoodRecovery').then(m => ({ default: m.FoodRecovery })));
const USDAProductionRecords = lazy(() => import('./pages/USDAProductionRecords').then(m => ({ default: m.USDAProductionRecords })));
const SB1383Compliance = lazy(() => import('./pages/SB1383Compliance').then(m => ({ default: m.SB1383Compliance })));
const K12Compliance = lazy(() => import('./pages/K12Compliance').then(m => ({ default: m.K12Compliance })));
const FoodSafetyAnalysis = lazy(() => import('./pages/foodSafety/Analysis'));
const FoodSafetyTrajectory = lazy(() => import('./pages/foodSafety/Trajectory'));
const FireSafetyAnalysis = lazy(() => import('./pages/fireSafety/Analysis'));
const FireSafetyTrajectory = lazy(() => import('./pages/fireSafety/Trajectory'));
const Team = lazy(() => import('./pages/Team').then(m => ({ default: m.Team })));
const SettingsPage = lazy(() => import('./pages/settings/SettingsPage').then(m => ({ default: m.SettingsPage })));
// POST-LAUNCH: Settings sub-pages hidden — backing tables absent or stubs unconnected. Restore when wired.
// const CompanyProfilePage = lazy(() => import('./pages/settings/CompanyProfilePage').then(m => ({ default: m.CompanyProfilePage })));
// const TeamRolesPage = lazy(() => import('./pages/settings/TeamRolesPage').then(m => ({ default: m.TeamRolesPage })));
// const ServiceTypesPage = lazy(() => import('./pages/settings/ServiceTypesPage').then(m => ({ default: m.ServiceTypesPage })));
// const SettingsIntegrationsPage = lazy(() => import('./pages/settings/IntegrationsPage').then(m => ({ default: m.IntegrationsPage })));
const NotificationsPage = lazy(() => import('./pages/settings/NotificationsPage').then(m => ({ default: m.NotificationsPage })));
const BillingPage = lazy(() => import('./pages/settings/BillingPage').then(m => ({ default: m.BillingPage })));
const ReportCenter = lazy(() => import('./pages/ReportCenter').then(m => ({ default: m.ReportCenter })));
const ReportDetail = lazy(() => import('./pages/ReportDetail').then(m => ({ default: m.ReportDetail })));
// Legacy report pages (replaced by /reports + generate-report edge function in wave 1)
// const ReportsPage = lazy(() => import('./pages/reports/ReportsPage').then(m => ({ default: m.ReportsPage })));
// const ReportGeneratorPage = lazy(() => import('./pages/reports/ReportGeneratorPage').then(m => ({ default: m.ReportGeneratorPage })));
const EquipmentPage = lazy(() => import('./pages/equipment/EquipmentPage').then(m => ({ default: m.EquipmentPage })));
const EquipmentDetailPage = lazy(() => import('./pages/equipment/EquipmentDetailPage').then(m => ({ default: m.EquipmentDetailPage })));
const QRScanLandingPage = lazy(() => import('./pages/equipment/QRScanLandingPage').then(m => ({ default: m.QRScanLandingPage })));
const InviteAccept = lazy(() => import('./pages/InviteAccept').then(m => ({ default: m.InviteAccept })));
const AdminClientOnboarding = lazy(() => import('./pages/AdminClientOnboarding').then(m => ({ default: m.AdminClientOnboarding })));
const Help = lazy(() => import('./pages/HelpSupport').then(m => ({ default: m.HelpSupport })));
const Calendar = lazy(() => import('./pages/Calendar').then(m => ({ default: m.Calendar })));
const UsageAnalytics = lazy(() => import('./pages/UsageAnalytics').then(m => ({ default: m.UsageAnalytics })));
const WeeklyDigest = lazy(() => import('./pages/WeeklyDigest').then(m => ({ default: m.WeeklyDigest })));
const IncidentLog = lazy(() => import('./pages/IncidentLog').then(m => ({ default: m.IncidentLog })));
const AuditReport = lazy(() => import('./pages/AuditReport').then(m => ({ default: m.AuditReport })));
const FacilitySafety = lazy(() => import('./pages/FacilitySafety').then(m => ({ default: m.FacilitySafety })));
const WorkforceRisk = lazy(() => import('./pages/WorkforceRisk').then(m => ({ default: m.WorkforceRisk })));
const CicPseView = lazy(() => import('./pages/CicPseView').then(m => ({ default: m.CicPseView })));
const Equipment = lazy(() => import('./pages/Equipment').then(m => ({ default: m.Equipment })));
const EquipmentDetail = lazy(() => import('./pages/EquipmentDetail').then(m => ({ default: m.EquipmentDetail })));
const ServiceRecordEntry = lazy(() => import('./pages/ServiceRecordEntry').then(m => ({ default: m.ServiceRecordEntry })));
const ServiceRecordDetail = lazy(() => import('./pages/ServiceRecordDetail').then(m => ({ default: m.ServiceRecordDetail })));
const RegulatoryAlerts = lazy(() => import('./pages/RegulatoryAlerts').then(m => ({ default: m.RegulatoryAlerts })));
const JurisdictionSettings = lazy(() => import('./pages/JurisdictionSettings').then(m => ({ default: m.JurisdictionSettings })));
const HealthDeptReport = lazy(() => import('./pages/HealthDeptReport').then(m => ({ default: m.HealthDeptReport })));
const ScoringBreakdown = lazy(() => import('./pages/ScoringBreakdown').then(m => ({ default: m.ScoringBreakdown })));

const ComplianceTrends = lazy(() => import('./pages/ComplianceTrends').then(m => ({ default: m.ComplianceTrends })));
const ComplianceIndex = lazy(() => import('./pages/ComplianceIndex').then(m => ({ default: m.ComplianceIndex })));
const CarrierPartnership = lazy(() => import('./pages/CarrierPartnership').then(m => ({ default: m.CarrierPartnership })));

const VendorProfile = lazy(() => import('./pages/VendorProfile').then(m => ({ default: m.VendorProfile })));
const MarketplaceLanding = lazy(() => import('./pages/MarketplaceLanding').then(m => ({ default: m.MarketplaceLanding })));
const Suspended = lazy(() => import('./pages/Suspended').then(m => ({ default: m.Suspended })));
const PublicVerification = lazy(() => import('./pages/PublicVerification'));
const PassportDemo = lazy(() => import('./pages/PassportDemo'));
const Passport = lazy(() => import('./pages/Passport'));
const OrgHierarchy = lazy(() => import('./pages/OrgHierarchy').then(m => ({ default: m.OrgHierarchy })));
const EnterpriseDashboard = lazy(() => import('./pages/EnterpriseDashboard').then(m => ({ default: m.EnterpriseDashboard })));
const EnterpriseLanding = lazy(() => import('./pages/EnterpriseLanding').then(m => ({ default: m.EnterpriseLanding })));
const EnterpriseExecutive = lazy(() => import('./pages/EnterpriseExecutive').then(m => ({ default: m.EnterpriseExecutive })));
const ComplianceIntelligence = lazy(() => import('./pages/ComplianceIntelligence').then(m => ({ default: m.ComplianceIntelligence })));
const IntelligenceHub = lazy(() => import('./pages/IntelligenceHub').then(m => ({ default: m.IntelligenceHub })));
const VendorMigration = lazy(() => import('./pages/VendorMigration').then(m => ({ default: m.VendorMigration })));


const OnboardingPage = lazy(() => import('./pages/OnboardingPage'));
const NotFound = lazy(() => import('./pages/NotFound'));
const VendorDocumentReview = lazy(() => import('./pages/VendorDocumentReview'));
const CorrectiveActions = lazy(() => import('./pages/CorrectiveActions').then(m => ({ default: m.CorrectiveActions })));
const CorrectiveActionDetail = lazy(() => import('./pages/CorrectiveActionDetail').then(m => ({ default: m.CorrectiveActionDetail })));
const Deficiencies = lazy(() => import('./pages/Deficiencies').then(m => ({ default: m.Deficiencies })));
const DeficiencyDetail = lazy(() => import('./pages/DeficiencyDetail').then(m => ({ default: m.DeficiencyDetail })));
const DeficiencyUpload = lazy(() => import('./pages/DeficiencyUpload').then(m => ({ default: m.DeficiencyUpload })));
const IntegrationHub = lazy(() => import('./pages/IntegrationHub').then(m => ({ default: m.IntegrationHub })));
const BrandingSettings = lazy(() => import('./pages/BrandingSettings').then(m => ({ default: m.BrandingSettings })));
const DeveloperPortal = lazy(() => import('./pages/DeveloperPortal').then(m => ({ default: m.DeveloperPortal })));
const TrainingHub = lazy(() => import('./pages/TrainingHub').then(m => ({ default: m.TrainingHub })));
const TrainingCourse = lazy(() => import('./pages/TrainingCourse').then(m => ({ default: m.TrainingCourse })));
const CourseBuilder = lazy(() => import('./pages/CourseBuilder').then(m => ({ default: m.CourseBuilder })));
const CertificateViewer = lazy(() => import('./pages/CertificateViewer').then(m => ({ default: m.CertificateViewer })));
const EmployeeCertDetail = lazy(() => import('./pages/EmployeeCertDetail').then(m => ({ default: m.EmployeeCertDetail })));
const TrainingRecords = lazy(() => import('./pages/TrainingRecords').then(m => ({ default: m.TrainingRecords })));
const EmployeeTrainingProfile = lazy(() => import('./pages/EmployeeTrainingProfile').then(m => ({ default: m.EmployeeTrainingProfile })));
const TrainingCatalog = lazy(() => import('./pages/TrainingCatalog').then(m => ({ default: m.TrainingCatalog })));
const IncidentPlaybooks = lazy(() => import('./pages/IncidentPlaybooks').then(m => ({ default: m.IncidentPlaybooks })));
const PlaybookRunner = lazy(() => import('./pages/PlaybookRunner').then(m => ({ default: m.PlaybookRunner })));
const PlaybookBuilder = lazy(() => import('./pages/PlaybookBuilder').then(m => ({ default: m.PlaybookBuilder })));
const PlaybookAnalytics = lazy(() => import('./pages/PlaybookAnalytics').then(m => ({ default: m.PlaybookAnalytics })));
const PlaybookTimeline = lazy(() => import('./pages/PlaybookTimeline').then(m => ({ default: m.PlaybookTimeline })));
const ImportData = lazy(() => import('./pages/ImportData').then(m => ({ default: m.ImportData })));
const InspectorView = lazy(() => import('./pages/InspectorView').then(m => ({ default: m.InspectorView })));
const ShiftHandoff = lazy(() => import('./pages/ShiftHandoff').then(m => ({ default: m.ShiftHandoff })));
const CurrentShift = lazy(() => import('./pages/CurrentShift').then(m => ({ default: m.CurrentShift })));
const Portfolio = lazy(() => import('./pages/Portfolio'));

const JurisdictionIntelligenceUser = lazy(() => import('./pages/JurisdictionIntelligence').then(m => ({ default: m.JurisdictionIntelligence })));
const InspectorMode = lazy(() => import('./pages/InspectorMode').then(m => ({ default: m.InspectorMode })));
const VendorNetworkPlaceholder = lazy(() => import('./pages/vendors/VendorNetworkPlaceholder'));
const SelfInspection = lazy(() => import('./pages/SelfInspection').then(m => ({ default: m.SelfInspection })));
const MockInspection = lazy(() => import('./pages/MockInspection'));
const PhotoEvidencePage = lazy(() => import('./pages/PhotoEvidencePage').then(m => ({ default: m.PhotoEvidencePage })));
const AuditTrail = lazy(() => import('./pages/AuditTrail').then(m => ({ default: m.AuditTrail })));
const DocumentChecklist = lazy(() => import('./pages/DocumentChecklist').then(m => ({ default: m.DocumentChecklist })));
const AdminRegulatoryChanges = lazy(() => import('./pages/AdminRegulatoryChanges').then(m => ({ default: m.AdminRegulatoryChanges })));
const IntelligenceAdmin = lazy(() => import('./pages/admin/IntelligenceAdmin'));
const CommandCenter = lazy(() => import('./pages/admin/CommandCenter'));
const RfpIntelligence = lazy(() => import('./pages/admin/RfpIntelligence'));
const JurisdictionIntelligence = lazy(() => import('./pages/admin/JurisdictionIntelligence'));
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'));
const AdminHome = lazy(() => import('./pages/admin/AdminHome'));
const SecuritySettings = lazy(() => import('./pages/admin/SecuritySettings').then(m => ({ default: m.SecuritySettings })));
const EdgeFunctions = lazy(() => import('./pages/admin/system/EdgeFunctions'));
const GuidedTours = lazy(() => import('./pages/admin/GuidedTours'));
const Configure = lazy(() => import('./pages/admin/Configure'));
const UserEmulation = lazy(() => import('./pages/admin/UserEmulation'));
const RolePreview = lazy(() => import('./pages/admin/RolePreview'));
const AdminBilling = lazy(() => import('./pages/admin/AdminBilling'));
const AdminCrawlMonitor = lazy(() => import('./pages/admin/AdminCrawlMonitor'));
const AdminScoreTable = lazy(() => import('./pages/admin/AdminScoreTable'));
const AdminTestimonials = lazy(() => import('./pages/admin/AdminTestimonials'));
const SystemMessages = lazy(() => import('./pages/admin/SystemMessages'));
const AdminK2C = lazy(() => import('./pages/admin/AdminK2C'));
const DatabaseBackup = lazy(() => import('./pages/admin/DatabaseBackup'));
const MaintenanceMode = lazy(() => import('./pages/admin/MaintenanceMode'));
const EvidlyVault = lazy(() => import('./pages/admin/EvidlyVault'));
const EventLog = lazy(() => import('./pages/admin/EventLog'));
const MarketingCampaigns = lazy(() => import('./pages/admin/MarketingCampaigns'));
const MarketingAccounts = lazy(() => import('./pages/admin/marketing/MarketingAccounts'));
const MarketingNetwork = lazy(() => import('./pages/admin/marketing/MarketingNetwork'));
const MarketingMethods = lazy(() => import('./pages/admin/marketing/MarketingMethods'));
const SalesPipeline = lazy(() => import('./pages/admin/SalesPipeline'));
const EvidLYIntelligence = lazy(() => import('./pages/admin/EvidLYIntelligence'));
const SupportTickets = lazy(() => import('./pages/admin/SupportTickets'));
const SurveyPage = lazy(() => import('./pages/admin/SurveyPage'));
const RemoteConnect = lazy(() => import('./pages/admin/RemoteConnect'));
const StaffRoles = lazy(() => import('./pages/admin/StaffRoles'));
const AdminReports = lazy(() => import('./pages/admin/AdminReports'));
const ViolationOutreach = lazy(() => import('./pages/admin/ViolationOutreach'));
const EmailSequenceManager = lazy(() => import('./pages/admin/EmailSequenceManager'));
// POST-LAUNCH: TrialHealth hidden — queries phantom columns (owner_email, trial_started_at, etc.) on organizations; dead legacy page
// const TrialHealth = lazy(() => import('./pages/admin/TrialHealth'));
const FeatureFlags = lazy(() => import('./pages/admin/FeatureFlags'));
const FeatureBaselineTracker = lazy(() => import('./pages/admin/FeatureBaselineTracker'));
const VerificationReport = lazy(() => import('./pages/admin/VerificationReport'));
const PolicyLensQueue = lazy(() => import('./pages/admin/PolicyLensQueue'));
const LeaseQueue = lazy(() => import('./pages/admin/LeaseQueue'));
const PolicyLensReleased = lazy(() => import('./pages/admin/PolicyLensReleased'));
const PolicyLensMessages = lazy(() => import('./pages/admin/PolicyLensMessages'));
const AdvisorBriefings = lazy(() => import('./pages/admin/AdvisorBriefings'));
const ExtractionDetail = lazy(() => import('./pages/admin/ExtractionDetail'));
const AdminUsers = lazy(() => import('./pages/admin/AdminUsers'));
const AdminSecurity = lazy(() => import('./pages/admin/AdminSecurity'));
const AdminAuditLog = lazy(() => import('./pages/admin/AdminAuditLog'));
const AdminOrgs = lazy(() => import('./pages/admin/AdminOrgs'));
const UserProvisioning = lazy(() => import('./pages/admin/UserProvisioning'));
const BusinessIntelligence = lazy(() => import('./pages/BusinessIntelligence').then(m => ({ default: m.BusinessIntelligence })));
const ClientReports = lazy(() => import('./pages/ClientReports').then(m => ({ default: m.ClientReports })));
const PredictiveAnalysis = lazy(() => import('./pages/PredictiveAnalysis'));
const SharedReport = lazy(() => import('./pages/public/SharedReport').then(m => ({ default: m.SharedReport })));
const PortalPage = lazy(() => import('./pages/public/PortalPage').then(m => ({ default: m.PortalPage })));
const AuthCallback = lazy(() => import('./pages/AuthCallback').then(m => ({ default: m.AuthCallback })));
const ReferralDashboard = lazy(() => import('./pages/ReferralDashboard').then(m => ({ default: m.ReferralDashboard })));
const ReferralRedirect = lazy(() => import('./pages/ReferralRedirect'));
const ReferralPage = lazy(() => import('./pages/public/ReferralPage').then(m => ({ default: m.ReferralPage })));
const TermsOfService = lazy(() => import('./pages/TermsOfService').then(m => ({ default: m.TermsOfService })));
const PrivacyPolicy = lazy(() => import('./pages/PrivacyPolicy').then(m => ({ default: m.PrivacyPolicy })));
const TempLogQuick = lazy(() => import('./pages/TempLogQuick').then(m => ({ default: m.TempLogQuick })));
const TempLogScan = lazy(() => import('./pages/TempLogScan').then(m => ({ default: m.TempLogScan })));
const SelfDiagnosis = lazy(() => import('./pages/SelfDiagnosis').then(m => ({ default: m.SelfDiagnosis })));
const RolesPermissions = lazy(() => import('./pages/RolesPermissions').then(m => ({ default: m.RolesPermissions })));
const CaliforniaCompliance = lazy(() => import('./pages/public/CaliforniaCompliance').then(m => ({ default: m.CaliforniaCompliance })));
const CountyCompliance = lazy(() => import('./pages/public/CountyCompliance').then(m => ({ default: m.CountyCompliance })));

const CountyLandingPage = lazy(() => import('./pages/public/CountyLandingPage'));
const ScoreTableCountyPage = lazy(() => import('./pages/public/ScoreTableCountyPage'));
const KitchenCheckPage = lazy(() => import('./pages/public/KitchenCheckPage'));
const NewLandingPage = lazy(() => import('./pages/public/LandingPage'));

const CountyWrapper = () => { const { slug } = useParams(); return <CountyLandingPage county={slug?.replace("-county", "")} />; };
const KitchenCheckWrapper = () => { const { slug } = useParams(); return <KitchenCheckPage county={slug?.replace("-county", "")} />; };
const CityPage = lazy(() => import('./pages/public/CityPage'));
const ScoreTableCityPage = lazy(() => import('./pages/public/ScoreTableCityPage'));
const ScoreTableIndex = lazy(() => import('./pages/public/ScoreTableIndex'));
const ScoreTableState = lazy(() => import('./pages/public/ScoreTableState'));
const ScoreTableCountyDetail = lazy(() => import('./pages/public/ScoreTableCountyDetail'));

const BlogList = lazy(() => import('./pages/public/BlogList').then(m => ({ default: m.BlogList })));
const BlogPost = lazy(() => import('./pages/public/BlogPost').then(m => ({ default: m.BlogPost })));
const ServiceThreadListPage = lazy(() => import('./pages/vendors/ServiceThreadListPage'));
const ServiceThreadDetailPage = lazy(() => import('./pages/vendors/ServiceThreadDetailPage'));
const VendorScheduleResponse = lazy(() => import('./pages/VendorScheduleResponse').then(m => ({ default: m.VendorScheduleResponse })));

const VendorConnectApply = lazy(() => import('./pages/VendorConnectApply').then(m => ({ default: m.VendorConnectApply })));
const VendorPartnerDashboard = lazy(() => import('./pages/VendorPartnerDashboard').then(m => ({ default: m.VendorPartnerDashboard })));
const Upgrade = lazy(() => import('./pages/Upgrade').then(m => ({ default: m.Upgrade })));
const AdminVendorConnect = lazy(() => import('./pages/admin/AdminVendorConnect').then(m => ({ default: m.AdminVendorConnect })));
const AssessmentLeads = lazy(() => import('./pages/admin/AssessmentLeads'));
const InsuranceApiKeys = lazy(() => import('./pages/admin/InsuranceApiKeys'));
const DemoGenerator = lazy(() => import('./pages/admin/DemoGenerator'));
const DemoLauncher = lazy(() => import('./pages/admin/DemoLauncher'));
const DemoPipeline = lazy(() => import('./pages/admin/DemoPipeline'));
const DemoTours = lazy(() => import('./pages/admin/DemoTours'));
const PartnerDemos = lazy(() => import('./pages/admin/PartnerDemos'));
const VendorDemoDashboard = lazy(() => import('./pages/partner/VendorDemoDashboard'));
const AssociationDemoDashboard = lazy(() => import('./pages/partner/AssociationDemoDashboard'));
const CarrierDemoDashboard = lazy(() => import('./pages/partner/CarrierDemoDashboard'));
const GtmDashboard = lazy(() => import('./pages/admin/GtmDashboard'));
const DemoDashboard = lazy(() => import('./pages/admin/DemoDashboard'));
const DemoRequest = lazy(() => import('./pages/DemoRequest'));
const DemoSchedule = lazy(() => import('./pages/DemoSchedule'));
const DemoExpired = lazy(() => import('./pages/DemoExpired'));
const SetupMFA = lazy(() => import('./pages/SetupMFA').then(m => ({ default: m.SetupMFA })));
const MFAChallenge = lazy(() => import('./pages/MFAChallenge').then(m => ({ default: m.MFAChallenge })));
const KitchenExhaustCleaning = lazy(() => import('./pages/fire-safety/KitchenExhaustCleaning'));
const FanPerformanceManagement = lazy(() => import('./pages/fire-safety/FanPerformanceManagement'));
const RooftopGreaseContainment = lazy(() => import('./pages/fire-safety/RooftopGreaseContainment'));
const FilterExchange = lazy(() => import('./pages/fire-safety/FilterExchange'));
const FireProtection = lazy(() => import('./pages/fire-safety/FireProtection'));

const InsightsHub = lazy(() => import('./pages/InsightsHub').then(m => ({ default: m.InsightsHub })));
const InspectionForecastPage = lazy(() => import('./pages/insights/InspectionForecast').then(m => ({ default: m.InspectionForecast })));
const ViolationRadarPage = lazy(() => import('./pages/insights/ViolationRadar').then(m => ({ default: m.ViolationRadar })));
const VendorPerformancePage = lazy(() => import('./pages/insights/VendorPerformance').then(m => ({ default: m.VendorPerformance })));
const JurisdictionSignalsPage = lazy(() => import('./pages/insights/JurisdictionSignals').then(m => ({ default: m.JurisdictionSignals })));
const TeamLeaderboardPage = lazy(() => import('./pages/insights/TeamLeaderboard').then(m => ({ default: m.TeamLeaderboard })));
const OperationalDriftPage = lazy(() => import('./pages/insights/OperationalDrift').then(m => ({ default: m.OperationalDrift })));
const WhatsAtRiskPage = lazy(() => import('./pages/insights/WhatsAtRisk').then(m => ({ default: m.WhatsAtRisk })));
const ToolsHub = lazy(() => import('./pages/ToolsHub').then(m => ({ default: m.ToolsHub })));
const AdminHub = lazy(() => import('./pages/AdminHub').then(m => ({ default: m.AdminHub })));
const VendorSetup = lazy(() => import('./pages/VendorSetup').then(m => ({ default: m.VendorSetup })));
const VendorInviteLanding = lazy(() => import('./pages/VendorInviteLanding').then(m => ({ default: m.VendorInviteLanding })));
const SchedulePage = lazy(() => import('./pages/schedule/SchedulePage').then(m => ({ default: m.SchedulePage })));

import { CookieConsent } from './components/CookieConsent';
import { usePageTracking } from './hooks/usePageTracking';

const KitchenToCommunity = lazy(() => import('./pages/KitchenToCommunity'));
const DemoBookingBanner = lazy(() => import('./components/landing/DemoBookingBanner'));
const DemoTalkingPoints = lazy(() => import('./components/DemoTalkingPoints'));
import { PageSkeleton } from './components/LoadingSkeleton';
import { Layout } from './components/layout/Layout';
import { AdminShell } from './components/layout/AdminShell';
import { PageTransition } from './components/PageTransition';
import { PageExplanation } from './components/PageExplanation';

import { useEmulation } from './contexts/EmulationContext';

import { useRole } from './contexts/RoleContext';
import { isRouteAllowedForRole } from './lib/routeGuards';
import type { UserRole } from './contexts/RoleContext';

/** Map a database user_profiles.role string to the demo UserRole enum.
 *  Authenticated users use this instead of the demo RoleContext. */
function dbRoleToUserRole(dbRole: string | undefined | null): UserRole {
  const MAP: Record<string, UserRole> = {
    platform_admin: 'platform_admin',
    admin: 'owner_operator',
    owner: 'owner_operator',
    owner_operator: 'owner_operator',
    executive: 'executive',
    compliance_manager: 'compliance_manager',
    chef: 'chef',
    facilities_manager: 'facilities_manager',
    kitchen_manager: 'kitchen_manager',
    kitchen_staff: 'kitchen_staff',
  };
  return MAP[dbRole || ''] || 'owner_operator';
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, profile, loading, isEvidlyAdmin } = useAuth();
  const { isDemoMode } = useDemo();
  const { userRole } = useRole();
  const location = useLocation();

  // Synchronous fallback: sessionStorage is set synchronously in enterDemo(),
  // so check it directly to prevent race-condition redirects during demo entry.
  const effectiveDemoMode = isDemoMode || (() => {
    try { return sessionStorage.getItem('evidly_demo_mode') === 'true'; } catch { return false; }
  })();

  if (effectiveDemoMode) {
    if (!isRouteAllowedForRole(location.pathname, userRole)) {
      return <Navigate to="/dashboard" replace />;
    }
    return <>{children}</>;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#A08C5A] mx-auto"></div>
          <p className="mt-4 text-[#1E2D4D]/70">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // AUDIT-FIX-05 / A-1: Suspended user redirect
  if (profile?.is_suspended) {
    return <Navigate to="/suspended" replace />;
  }

  // Authenticated users: EvidlyAdmin bypasses route guards; others use DB role
  if (!isEvidlyAdmin) {
    const effectiveRole = dbRoleToUserRole(profile?.role);
    if (!isRouteAllowedForRole(location.pathname, effectiveRole)) {
      return <Navigate to="/dashboard" replace />;
    }
  }

  return <>{children}</>;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#A08C5A] mx-auto"></div>
          <p className="mt-4 text-[#1E2D4D]/70">Loading...</p>
        </div>
      </div>
    );
  }

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}

/** Show AdminHome for authenticated platform_admin, AdminHub for everyone else.
 *  In demo mode, always show AdminHub — AdminHome has admin-internal tools
 *  (Sales Pipeline, etc.) that should never appear in the operator context. */
function AdminRoute() {
  const { isEvidlyAdmin } = useAuth();
  const { isDemoMode } = useDemo();
  const { userRole } = useRole();
  if (!isDemoMode && (isEvidlyAdmin || userRole === 'platform_admin')) {
    return <AdminHome />;
  }
  return <AdminHub />;
}

function ProtectedLayout() {
  const { user, profile, loading, isEvidlyAdmin, isAdmin } = useAuth();
  const { isDemoMode, isDemoExpired, isAuthenticatedDemo } = useDemo();
  const { userRole, isPreviewMode } = useRole();
  const { isEmulating } = useEmulation();
  const location = useLocation();

  useCrispIdentify({
    email: user?.email,
    name: profile?.full_name,
    role: userRole,
    orgId: profile?.organization_id,
  });

  // Synchronous fallback: if DemoContext state hasn't propagated yet but
  // sessionStorage already has the demo flag, treat as demo mode to prevent
  // a race-condition redirect to /login during demo entry.
  // Role Preview mode (__rolePreview param) also acts like demo mode —
  // forces tenant Layout, uses demo data, bypasses admin shell.
  const effectiveDemoMode = isDemoMode || isPreviewMode || (() => {
    try { return sessionStorage.getItem('evidly_demo_mode') === 'true'; } catch { return false; }
  })();

  // MFA enforcement hooks — must be above all conditional returns (Rules of Hooks)
  const [mfaChecked, setMfaChecked] = useState(false);
  const [mfaRequired, setMfaRequired] = useState(false);
  useEffect(() => {
    if (effectiveDemoMode || !user?.id || !profile?.role) { setMfaChecked(true); return; }
    (async () => {
      const { data: policy } = await supabase
        .from('mfa_policy')
        .select('mfa_required, grace_period_days')
        .eq('role', profile.role)
        .maybeSingle();
      if (!policy?.mfa_required) { setMfaChecked(true); return; }
      const { data: config } = await supabase
        .from('user_mfa_config')
        .select('mfa_enabled')
        .eq('user_id', user.id)
        .maybeSingle();
      if (config?.mfa_enabled) { setMfaChecked(true); return; }
      // Check grace period
      const graceDays = policy.grace_period_days || 0;
      const createdAt = profile.created_at ? new Date(profile.created_at) : new Date();
      const accountAgeDays = Math.floor((Date.now() - createdAt.getTime()) / 86400000);
      if (accountAgeDays < graceDays) { setMfaChecked(true); return; }
      setMfaRequired(true);
      setMfaChecked(true);
    })();
  }, [effectiveDemoMode, user?.id, profile?.role]);

  if (!effectiveDemoMode) {
    if (loading) {
      return (
        <div className="min-h-screen bg-cream flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#A08C5A] mx-auto"></div>
            <p className="mt-4 text-[#1E2D4D]/70">Loading...</p>
          </div>
        </div>
      );
    }
    if (!user) {
      return <Navigate to="/login" replace />;
    }
    // Wait for profile to load before rendering layout — prevents isAdmin flicker
    // that causes admin routes to briefly render inside user Layout then re-mount
    if (!profile) {
      return (
        <div className="min-h-screen bg-cream flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#A08C5A] mx-auto"></div>
            <p className="mt-4 text-[#1E2D4D]/70">Loading...</p>
          </div>
        </div>
      );
    }
    // AUDIT-FIX-05 / A-1: Double-check suspension at layout level
    if (profile?.is_suspended) {
      return <Navigate to="/suspended" replace />;
    }
  }

  // Authenticated demo expired — redirect to upgrade page (profile data intact)
  if (isAuthenticatedDemo && isDemoExpired && location.pathname !== '/demo-expired') {
    return <Navigate to="/demo-expired" replace />;
  }

  if (!effectiveDemoMode && mfaRequired && location.pathname !== '/setup-mfa') {
    return <Navigate to="/setup-mfa" replace />;
  }

  // Role-based route guard — redirect to dashboard if role not allowed
  // Authenticated users: EvidlyAdmin bypasses guards; others use DB profile role
  if (effectiveDemoMode) {
    if (!isRouteAllowedForRole(location.pathname, userRole)) {
      return <Navigate to="/dashboard" replace />;
    }
  } else if (!isEvidlyAdmin) {
    const effectiveRole = dbRoleToUserRole(profile?.role);
    if (!isRouteAllowedForRole(location.pathname, effectiveRole)) {
      return <Navigate to="/dashboard" replace />;
    }
  }

  // ── Admin shell: /admin/* routes ALWAYS get AdminShell for admin users ──
  // Non-admin routes: AdminShell only when not emulating and not in demo mode
  const isAdminRoute = location.pathname === '/admin' || location.pathname.startsWith('/admin/');
  const useAdminShell = isAdmin && (isAdminRoute || (!isEmulating && !effectiveDemoMode));

  const content = (
    <ErrorBoundary level="page" resetKey={location.pathname}>
      <Suspense fallback={
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#A08C5A] mx-auto"></div>
            <p className="mt-3 text-sm text-[#1E2D4D]/50">Loading...</p>
          </div>
        </div>
      }>
        <PageTransition key={location.pathname}>
          <PageExplanation />
          {/* OnboardingGuard disabled pre-launch for dev/test — re-enable before July 4 launch. See src/components/auth/OnboardingGuard.tsx */}
          <Outlet />
        </PageTransition>
      </Suspense>
    </ErrorBoundary>
  );

  if (useAdminShell) {
    return (
      <AdminShell>
        {content}
      </AdminShell>
    );
  }

  return (
    <Layout>
      {content}
      {isDemoMode && (
        <Suspense fallback={null}>
          <DemoBookingBanner />
          <DemoTalkingPoints />
        </Suspense>
      )}
    </Layout>
  );
}

function AppRoutes() {
  usePageTracking();
  useCrisp();

  return (
    <>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        {/* Public routes */}
        <Route path="/verify/:code" element={<Suspense fallback={<PageSkeleton />}><PublicVerification /></Suspense>} />
        <Route path="/ref/:code" element={<Suspense fallback={<PageSkeleton />}><ReferralRedirect /></Suspense>} />
        <Route path="/r/:code" element={<Suspense fallback={<PageSkeleton />}><ReferralPage /></Suspense>} />
        <Route path="/report/:token" element={<Suspense fallback={<PageSkeleton />}><SharedReport /></Suspense>} />
        <Route path="/reports/view/:shareToken" element={<Suspense fallback={<PageSkeleton />}><ReportViewer /></Suspense>} />
        <Route path="/portal/:token" element={<Suspense fallback={<PageSkeleton />}><PortalPage /></Suspense>} />
        <Route path="/passport/demo" element={<Suspense fallback={<PageSkeleton />}><PassportDemo /></Suspense>} />
        <Route path="/passport/:id" element={<Suspense fallback={<PageSkeleton />}><Passport /></Suspense>} />
        <Route path="/partners/insurance" element={<Suspense fallback={<PageSkeleton />}><CarrierPartnership /></Suspense>} />
        <Route path="/providers" element={<Suspense fallback={<PageSkeleton />}><MarketplaceLanding /></Suspense>} />
        <Route path="/enterprise" element={<Suspense fallback={<PageSkeleton />}><EnterpriseLanding /></Suspense>} />
        <Route path="/terms" element={<Suspense fallback={<PageSkeleton />}><TermsOfService /></Suspense>} />
        <Route path="/privacy" element={<Suspense fallback={<PageSkeleton />}><PrivacyPolicy /></Suspense>} />
        <Route path="/compliance/california" element={<Suspense fallback={<PageSkeleton />}><CaliforniaCompliance /></Suspense>} />
        <Route path="/compliance/california/:countySlug" element={<Suspense fallback={<PageSkeleton />}><CountyCompliance /></Suspense>} />

        <Route path="/scoretable" element={<Suspense fallback={<PageSkeleton />}><ScoreTableIndex /></Suspense>} />
        <Route path="/scoretable/city/:citySlug" element={<Suspense fallback={<PageSkeleton />}><ScoreTableCityPage /></Suspense>} />
        <Route path="/scoretable/:stateSlug" element={<Suspense fallback={<PageSkeleton />}><ScoreTableState /></Suspense>} />
        <Route path="/scoretable/:stateSlug/:countySlug" element={<Suspense fallback={<PageSkeleton />}><ScoreTableCountyDetail /></Suspense>} />
        <Route path="/kitchen-check/:slug" element={<Suspense fallback={<PageSkeleton />}><KitchenCheckWrapper /></Suspense>} />
        <Route path="/kitchen-to-community" element={<Suspense fallback={<PageSkeleton />}><KitchenToCommunity /></Suspense>} />
        <Route path="/leaderboard-preview" element={<Suspense fallback={<PageSkeleton />}><LeaderboardPreview /></Suspense>} />
        <Route path="/equipment/scan/:equipmentId" element={<Suspense fallback={<PageSkeleton />}><QRScanLandingPage /></Suspense>} />
        <Route path="/temp/log" element={<QRAuthGuard><Suspense fallback={<PageSkeleton />}><TempLogQuick /></Suspense></QRAuthGuard>} />
        <Route path="/temp-logs/scan" element={<QRAuthGuard><Suspense fallback={<PageSkeleton />}><TempLogScan /></Suspense></QRAuthGuard>} />
        <Route path="/suspended" element={<Suspense fallback={<PageSkeleton />}><Suspended /></Suspense>} />
        <Route path="/login" element={<PublicRoute><Suspense fallback={<PageSkeleton />}><Login /></Suspense></PublicRoute>} />
        <Route path="/admin-login" element={<PublicRoute><Suspense fallback={<PageSkeleton />}><AdminLogin /></Suspense></PublicRoute>} />
        <Route path="/signup" element={<PublicRoute><Suspense fallback={<PageSkeleton />}><Signup /></Suspense></PublicRoute>} />
        <Route path="/signup/locations" element={<ProtectedRoute><Suspense fallback={<PageSkeleton />}><SignupLocations /></Suspense></ProtectedRoute>} />
        <Route path="/join/:token" element={<ClientJoin />} />
        <Route path="/invite/:token" element={<Suspense fallback={<PageSkeleton />}><InviteAccept /></Suspense>} />
        <Route path="/forgot-password" element={<PublicRoute><Suspense fallback={<PageSkeleton />}><ForgotPassword /></Suspense></PublicRoute>} />
        <Route path="/reset-password" element={<Suspense fallback={<PageSkeleton />}><ResetPassword /></Suspense>} />
        <Route path="/email-confirmed" element={<Suspense fallback={<PageSkeleton />}><EmailConfirmed /></Suspense>} />
        <Route path="/demo" element={<Suspense fallback={<PageSkeleton />}><DemoWizard /></Suspense>} />
        <Route path="/demo/request" element={<Suspense fallback={<PageSkeleton />}><DemoRequest /></Suspense>} />
        <Route path="/demo/schedule/:sessionId" element={<Suspense fallback={<PageSkeleton />}><DemoSchedule /></Suspense>} />
        <Route path="/auth/callback" element={<Suspense fallback={<PageSkeleton />}><AuthCallback /></Suspense>} />
        <Route path="/setup-mfa" element={<Suspense fallback={<PageSkeleton />}><SetupMFA /></Suspense>} />
        <Route path="/mfa-challenge" element={<Suspense fallback={<PageSkeleton />}><MFAChallenge /></Suspense>} />
        <Route path="/vendor/login" element={<Suspense fallback={<PageSkeleton />}><VendorLogin /></Suspense>} />
        <Route path="/vendor/register" element={<Suspense fallback={<PageSkeleton />}><VendorRegister /></Suspense>} />
        <Route path="/vendor/upload/:token" element={<Suspense fallback={<PageSkeleton />}><VendorSecureUpload /></Suspense>} />
          <Route path="/vendor/invite/:code" element={<Suspense fallback={<PageSkeleton />}><VendorInviteLanding /></Suspense>} />
        <Route path="/vendor/schedule/:token" element={<Suspense fallback={<PageSkeleton />}><VendorScheduleResponse /></Suspense>} />
        <Route path="/vendor-connect/apply" element={<Suspense fallback={<PageSkeleton />}><VendorConnectApply /></Suspense>} />
        <Route path="/support/survey/:token" element={<Suspense fallback={<PageSkeleton />}><SurveyPage /></Suspense>} />

        {/* City landing pages */}
        <Route path="/city/:citySlug" element={<Suspense fallback={<PageSkeleton />}><CityPage /></Suspense>} />

        {/* Blog */}
        <Route path="/blog" element={<Suspense fallback={<PageSkeleton />}><BlogList /></Suspense>} />
        <Route path="/blog/:slug" element={<Suspense fallback={<PageSkeleton />}><BlogPost /></Suspense>} />

        {/* Catch-all county landing page — must be AFTER all other public routes */}
        <Route path="/:slug" element={<Suspense fallback={<PageSkeleton />}><CountyWrapper /></Suspense>} />

        {/* Protected routes without shared layout */}
        <Route path="/vendor/dashboard" element={<ProtectedRoute><ErrorBoundary level="page"><Suspense fallback={<PageSkeleton />}><VendorDashboard /></Suspense></ErrorBoundary></ProtectedRoute>} />
        <Route path="/vendor/partner-dashboard" element={<ProtectedRoute><ErrorBoundary level="page"><Suspense fallback={<PageSkeleton />}><VendorPartnerDashboard /></Suspense></ErrorBoundary></ProtectedRoute>} />
        <Route path="/vendor/setup" element={<ProtectedRoute><ErrorBoundary level="page"><Suspense fallback={<PageSkeleton />}><VendorSetup /></Suspense></ErrorBoundary></ProtectedRoute>} />
        <Route path="/enterprise/admin" element={<ProtectedRoute><ErrorBoundary level="page"><Suspense fallback={<PageSkeleton />}><EnterpriseDashboard /></Suspense></ErrorBoundary></ProtectedRoute>} />
        <Route path="/enterprise/dashboard" element={<ProtectedRoute><ErrorBoundary level="page"><Suspense fallback={<PageSkeleton />}><EnterpriseExecutive /></Suspense></ErrorBoundary></ProtectedRoute>} />
        <Route path="/enterprise/intelligence" element={<ProtectedRoute><ErrorBoundary level="page"><Suspense fallback={<PageSkeleton />}><ComplianceIntelligence /></Suspense></ErrorBoundary></ProtectedRoute>} />
        {/* /business-intelligence now handled by /insights/intelligence */}
        {/* /onboarding now inside ProtectedLayout */}
        <Route path="/setup/food-safety" element={<ProtectedRoute><ErrorBoundary level="page"><Suspense fallback={<PageSkeleton />}><SetupFoodSafetyEntry /></Suspense></ErrorBoundary></ProtectedRoute>} />
        <Route path="/setup/food-safety/:locationId" element={<ProtectedRoute><ErrorBoundary level="page"><Suspense fallback={<PageSkeleton />}><SetupFoodSafety /></Suspense></ErrorBoundary></ProtectedRoute>} />

        {/* Demo expired — full-screen upgrade prompt, no layout chrome */}
        <Route path="/demo-expired" element={<ProtectedRoute><ErrorBoundary level="page"><Suspense fallback={<PageSkeleton />}><DemoExpired /></Suspense></ErrorBoundary></ProtectedRoute>} />

        {/* RolePreview — standalone full-viewport route (no Layout/AdminShell wrapper) */}
        <Route path="/admin/role-preview" element={<ProtectedRoute><ErrorBoundary level="page"><Suspense fallback={<PageSkeleton />}><RolePreview /></Suspense></ErrorBoundary></ProtectedRoute>} />

        {/* Protected routes with shared layout — sidebar/topbar stay mounted */}
        <Route element={<ProtectedLayout />}>
          <Route path="/onboarding" element={<OnboardingPage />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/inspection-package/send" element={<SendInspectionPage />} />
          <Route path="/food-safety" element={<Navigate to="/temp-logs" replace />} />

          <Route path="/insights" element={<InsightsHub />} />
          <Route path="/tools" element={<ToolsHub />} />
          <Route path="/admin" element={<AdminRoute />} />
          <Route path="/admin/onboarding" element={<AdminClientOnboarding />} />
          <Route path="/temp-logs" element={<TempLogs />} />
          <Route path="/checklists" element={<Checklists />} />
          <Route path="/checklists/history/:completionId" element={<ChecklistCompletionDetail />} />
          <Route path="/documents" element={<Documents />} />
          <Route path="/policies" element={<Policies />} />
          <Route path="/policies/:id" element={<PolicyEditor />} />
          <Route path="/policy-lens" element={<PolicyLens />} />
          <Route path="/policy-lens/upload" element={<PolicyLensUpload />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/document-checklist" element={<DocumentChecklist />} />
          <Route path="/vendors" element={<VendorsPage />} />
          <Route path="/vendors/:vendorId" element={<VendorDetail />} />
          <Route path="/vendors/services/:serviceId" element={<ServiceDetail />} />
          <Route path="/vendors/requests/:requestId" element={<RequestDetail />} />
          <Route path="/vendors/documents/:docId" element={<DocumentReviewDetail />} />
          <Route path="/vendors/threads" element={<ServiceThreadListPage />} />
          <Route path="/vendors/threads/:threadId" element={<ServiceThreadDetailPage />} />
          <Route path="/vendor-network" element={<VendorNetworkPlaceholder />} />


          <Route path="/upgrade" element={<Upgrade />} />
          <Route path="/marketplace/vendor/:vendorSlug" element={<VendorProfile />} />
          <Route path="/marketplace/:vendorSlug" element={<VendorProfile />} />
          <Route path="/haccp" element={<HACCP />} />
          <Route path="/alerts" element={<Alerts />} />
          <Route path="/incidents" element={<IncidentLog />} />
          <Route path="/ai-advisor" element={<AIAdvisor />} />
          <Route path="/leaderboard" element={<Leaderboard />} />
          <Route path="/referrals" element={<ReferralDashboard />} />
          <Route path="/food-safety/analysis" element={<FoodSafetyAnalysis />} />
          <Route path="/food-safety/trajectory" element={<FoodSafetyTrajectory />} />
          <Route path="/team" element={<Team />} />
          {/* Legacy report routes (replaced by /reports + generate-report edge function in wave 1) */}
          {/* <Route path="/reports/:slug" element={<ReportGeneratorPage />} /> */}
          <Route path="/settings" element={<SettingsPage />}>
            {/* POST-LAUNCH: Settings sub-pages hidden — backing tables absent or stubs unconnected. Restore when wired. */}
            <Route index element={<Navigate to="/settings/notifications" replace />} />
            {/* <Route path="company" element={<CompanyProfilePage />} /> */}
            {/* <Route path="team-roles" element={<TeamRolesPage />} /> */}
            {/* <Route path="service-types" element={<ServiceTypesPage />} /> */}
            <Route path="notifications" element={<NotificationsPage />} />
            <Route path="billing" element={<BillingPage />} />
          </Route>
          <Route path="/settings/branding" element={<BrandingSettings />} />
          <Route path="/settings/roles-permissions" element={<RolesPermissions />} />
          <Route path="/import" element={<ImportData />} />
          <Route path="/calendar" element={<Calendar />} />
          <Route path="/schedule" element={<SchedulePage />} />
          <Route path="/help" element={<Help />} />
          <Route path="/weekly-digest" element={<WeeklyDigest />} />
          <Route path="/audit-report" element={<AuditReport />} />
          <Route path="/facility-safety" element={<FacilitySafety />} />
          <Route path="/fire-safety" element={<Navigate to="/fire-safety/kec" replace />} />
          <Route path="/fire-safety/kec" element={<KitchenExhaustCleaning />} />
          <Route path="/fire-safety/kec/fpm" element={<FanPerformanceManagement />} />
          <Route path="/fire-safety/kec/rgc" element={<RooftopGreaseContainment />} />
          <Route path="/fire-safety/kec/gfx" element={<FilterExchange />} />
          <Route path="/fire-safety/protection" element={<FireProtection />} />
          <Route path="/fire-safety/analysis" element={<FireSafetyAnalysis />} />
          <Route path="/fire-safety/trajectory" element={<FireSafetyTrajectory />} />
          <Route path="/workforce-risk" element={<WorkforceRisk />} />
          <Route path="/cic-pse" element={<CicPseView />} />

          <Route path="/food-recovery" element={<FoodRecovery />} />
          <Route path="/sb1383" element={<SB1383Compliance />} />
          <Route path="/k12" element={<K12Compliance />} />
          <Route path="/usda/production-records" element={<USDAProductionRecords />} />
          <Route path="/equipment" element={<EquipmentPage />} />
          <Route path="/equipment/:id" element={<EquipmentDetailPage />} />
          <Route path="/equipment/:equipmentId/service/new" element={<ServiceRecordEntry />} />
          <Route path="/regulatory-alerts" element={<RegulatoryAlerts />} />
          <Route path="/jurisdiction" element={<JurisdictionSettings />} />
          <Route path="/jurisdiction-intelligence" element={<JurisdictionIntelligenceUser />} />
          <Route path="/health-dept-report" element={<HealthDeptReport />} />
          <Route path="/scoring-breakdown" element={<ScoringBreakdown />} />

          <Route path="/compliance-trends" element={<ComplianceTrends />} />
          <Route path="/org-hierarchy" element={<OrgHierarchy />} />
          <Route path="/portfolio" element={<Portfolio />} />
          <Route path="/compliance-index" element={<ComplianceIndex />} />
          <Route path="/migrate" element={<VendorMigration />} />

          {/* User routes unwrapped from RequireAdmin — AUDIT-3 */}
          <Route path="/integrations" element={<IntegrationHub />} />
          <Route path="/services" element={<Navigate to="/vendors" replace />} />
          <Route path="/services/:recordId" element={<ServiceRecordDetail />} />
          <Route path="/self-inspection" element={<SelfInspection />} />
          <Route path="/self-audit" element={<Navigate to="/self-inspection" replace />} />
          <Route path="/shift-handoff" element={<ShiftHandoff />} />
          <Route path="/current-shift" element={<CurrentShift />} />

          {/* Admin routes — RequireAdmin enforces platform_admin access */}
          <Route element={<RequireAdmin />}>
          <Route path="/admin/onboard-client" element={<Navigate to="/admin/onboarding" replace />} />
          <Route path="/admin/usage-analytics" element={<UsageAnalytics />} />
          {/* POST-LAUNCH: Integrations hidden — no connect/sync engine. Restore when wired. */}
          {/* <Route path="/settings/integrations" element={<SettingsIntegrationsPage />} /> */}
          <Route path="/settings/api-keys" element={<IntegrationHub />} />
          <Route path="/settings/webhooks" element={<IntegrationHub />} />
          <Route path="/developers" element={<DeveloperPortal />} />
          <Route path="/training" element={<TrainingHub />} />
          <Route path="/training/course/:id" element={<TrainingCourse />} />
          <Route path="/training/courses/builder" element={<CourseBuilder />} />
          <Route path="/training/certificates" element={<CertificateViewer />} />
          <Route path="/training/employee/:userId" element={<EmployeeCertDetail />} />
          <Route path="/dashboard/training" element={<TrainingRecords />} />
          <Route path="/dashboard/training/:employeeId" element={<EmployeeTrainingProfile />} />
          <Route path="/dashboard/training-catalog" element={<TrainingCatalog />} />
          <Route path="/playbooks" element={<IncidentPlaybooks />} />
          <Route path="/playbooks/active/:id" element={<PlaybookRunner />} />
          <Route path="/playbooks/builder" element={<PlaybookBuilder />} />
          <Route path="/playbooks/analytics" element={<PlaybookAnalytics />} />
          <Route path="/playbooks/history/:id" element={<PlaybookTimeline />} />
          <Route path="/inspector-view" element={<InspectorView />} />
          <Route path="/inspector-mode" element={<InspectorMode />} />
          <Route path="/mock-inspection" element={<MockInspection />} />
          <Route path="/photo-evidence" element={<PhotoEvidencePage />} />
          <Route path="/audit-trail" element={<AuditTrail />} />
          <Route path="/copilot" element={<Navigate to="/" replace />} />
          <Route path="/intelligence" element={<IntelligenceHub />} />
          <Route path="/regulatory-updates" element={<Navigate to="/intelligence" replace />} />
          <Route path="/self-diagnosis" element={<SelfDiagnosis />} />
          <Route path="/admin/regulatory-changes" element={<AdminRegulatoryChanges />} />
          <Route path="/admin/intelligence-admin" element={<IntelligenceAdmin />} />
          <Route path="/admin/intelligence-queue" element={<Navigate to="/admin/intelligence-admin" replace />} />
          <Route path="/admin/rfp-intelligence" element={<Navigate to="/admin/rfp-monitor" replace />} />
          <Route path="/admin/jurisdiction-intelligence" element={<JurisdictionIntelligence />} />
          {/* Redirects for old nav paths */}
          <Route path="/admin/emulation" element={<Navigate to="/admin/emulate" replace />} />
          <Route path="/admin/regulatory" element={<Navigate to="/admin/regulatory-changes" replace />} />
          <Route path="/admin/rfp" element={<Navigate to="/admin/rfp-monitor" replace />} />
          <Route path="/admin/jurisdiction-intel" element={<Navigate to="/admin/jurisdiction-intelligence" replace />} />
          {/* Demo Generator disabled — all demos are run live with a sales rep */}
          <Route path="/admin/demo-generator" element={<SalesGuard><DemoGenerator /></SalesGuard>} />
          <Route path="/admin/demo-launcher" element={<SalesGuard><DemoLauncher /></SalesGuard>} />
          <Route path="/admin/demos" element={<Navigate to="/admin/demo-pipeline" replace />} />
          <Route path="/admin/demo-pipeline" element={<SalesGuard><DemoPipeline /></SalesGuard>} />
          <Route path="/admin/demo-tours" element={<SalesGuard><DemoTours /></SalesGuard>} />
          <Route path="/admin/partner-demos" element={<SalesGuard><PartnerDemos /></SalesGuard>} />
          <Route path="/partner/vendor-demo" element={<SalesGuard><VendorDemoDashboard /></SalesGuard>} />
          <Route path="/partner/association-demo" element={<SalesGuard><AssociationDemoDashboard /></SalesGuard>} />
          <Route path="/partner/carrier-demo" element={<SalesGuard><CarrierDemoDashboard /></SalesGuard>} />
          <Route path="/admin/kitchen-checkup" element={<SalesGuard><AssessmentLeads /></SalesGuard>} />
          <Route path="/admin/scoretable" element={<SalesGuard><AdminScoreTable /></SalesGuard>} />
          <Route path="/admin/testimonials" element={<SalesGuard><AdminTestimonials /></SalesGuard>} />
          <Route path="/admin/assessments" element={<Navigate to="/admin/kitchen-checkup" replace />} />
          <Route path="/admin/api-keys" element={<InsuranceApiKeys />} />
          <Route path="/admin/home" element={<Navigate to="/admin" replace />} />
          <Route path="/admin/dashboard" element={<AdminDashboard />} />
          <Route path="/admin/demo/dashboard" element={<DemoDashboard />} />
          <Route path="/admin/command-center" element={<CommandCenter />} />
          <Route path="/admin/guided-tours" element={<SalesGuard><GuidedTours /></SalesGuard>} />
          <Route path="/admin/leads" element={<SalesGuard><AssessmentLeads /></SalesGuard>} />
          <Route path="/admin/configure" element={<Configure />} />
          <Route path="/admin/emulate" element={<UserEmulation />} />
          {/* RolePreview moved to standalone route (no Layout/AdminShell wrapper) */}
          <Route path="/admin/billing" element={<AdminBilling />} />
          <Route path="/admin/crawl-monitor" element={<AdminCrawlMonitor />} />
          <Route path="/admin/rfp-monitor" element={<RfpIntelligence />} />
          <Route path="/admin/messages" element={<SystemMessages />} />
          <Route path="/admin/k2c" element={<AdminK2C />} />
          <Route path="/admin/backup" element={<DatabaseBackup />} />
          <Route path="/admin/maintenance" element={<MaintenanceMode />} />
          <Route path="/admin/security-settings" element={<SecuritySettings />} />
          <Route path="/admin/evidly-vault" element={<EvidlyVault />} />
          <Route path="/admin/vault" element={<Navigate to="/admin/evidly-vault" replace />} />
          <Route path="/admin/event-log" element={<EventLog />} />
          <Route path="/admin/marketing/accounts" element={<SalesGuard><MarketingAccounts /></SalesGuard>} />
          <Route path="/admin/marketing/network" element={<SalesGuard><MarketingNetwork /></SalesGuard>} />
          <Route path="/admin/marketing/methods" element={<SalesGuard><MarketingMethods /></SalesGuard>} />
          <Route path="/admin/campaigns" element={<SalesGuard><MarketingCampaigns /></SalesGuard>} />
          <Route path="/admin/sales" element={<SalesGuard><SalesPipeline /></SalesGuard>} />
          <Route path="/admin/pipeline" element={<Navigate to="/admin/sales" replace />} />
          <Route path="/admin/users" element={<AdminUsers />} />
          <Route path="/admin/security" element={<AdminSecurity />} />
          <Route path="/admin/audit-log" element={<AdminAuditLog />} />
          <Route path="/admin/orgs" element={<AdminOrgs />} />
          <Route path="/admin/provisioning" element={<UserProvisioning />} />
          <Route path="/admin/user-provisioning" element={<Navigate to="/admin/provisioning" replace />} />
          <Route path="/admin/support" element={<SupportTickets />} />
          <Route path="/admin/remote-connect" element={<RemoteConnect />} />
          <Route path="/admin/staff" element={<StaffRoles />} />
          <Route path="/admin/intelligence" element={<EvidLYIntelligence />} />
          <Route path="/admin/advisor-briefings" element={<AdvisorBriefings />} />
          <Route path="/admin/reports" element={<AdminReports />} />
          <Route path="/admin/violation-outreach" element={<SalesGuard><ViolationOutreach /></SalesGuard>} />
          <Route path="/admin/email-sequences" element={<SalesGuard><EmailSequenceManager /></SalesGuard>} />
          {/* POST-LAUNCH: TrialHealth hidden — dead legacy page with phantom columns */}
          {/* <Route path="/admin/trial-health" element={<SalesGuard><TrialHealth /></SalesGuard>} /> */}
          <Route path="/admin/verification" element={<VerificationReport />} />
          <Route path="/admin/system/edge-functions" element={<EdgeFunctions />} />
          <Route path="/admin/feature-flags" element={<FeatureFlags />} />
          <Route path="/admin/feature-baseline" element={<FeatureBaselineTracker />} />
          <Route path="/admin/vendor-connect" element={<AdminVendorConnect />} />
          <Route path="/admin/policy-lens" element={<PolicyLensQueue />} />
          <Route path="/admin/lease-queue" element={<LeaseQueue />} />
          <Route path="/admin/policy-lens/released" element={<PolicyLensReleased />} />
          <Route path="/admin/policy-lens/messages" element={<PolicyLensMessages />} />
          <Route path="/admin/policy-lens/:intakeId" element={<ExtractionDetail />} />
          <Route path="/admin/gtm" element={<SalesGuard><GtmDashboard /></SalesGuard>} />
          <Route path="/internal/pmr" element={<ProspectMarketingReport />} />
          </Route>
          <Route path="/insights/intelligence" element={<BusinessIntelligence />} />
          <Route path="/insights/whats-at-risk" element={<WhatsAtRiskPage />} />
          <Route path="/insights/reports" element={<ClientReports />} />
          <Route path="/insights/predictions" element={<PredictiveAnalysis />} />
          <Route path="/insights/inspection-forecast" element={<InspectionForecastPage />} />
          <Route path="/insights/violation-radar" element={<ViolationRadarPage />} />
          <Route path="/insights/vendor-performance" element={<VendorPerformancePage />} />
          <Route path="/insights/signals" element={<JurisdictionSignalsPage />} />
          <Route path="/insights/leaderboard" element={<TeamLeaderboardPage />} />
          <Route path="/insights/operational-drift" element={<OperationalDriftPage />} />
          {/* Stub routes for upcoming features */}
          <Route path="/vendors/review" element={<Navigate to="/documents?tab=vendor-business&status=pending" replace />} />
          <Route path="/corrective-actions" element={<CorrectiveActions />} />
          <Route path="/corrective-actions/:actionId" element={<CorrectiveActionDetail />} />


          <Route path="/deficiencies" element={<Deficiencies />} />
          <Route path="/deficiencies/upload" element={<DeficiencyUpload />} />
          <Route path="/deficiencies/:deficiencyId" element={<DeficiencyDetail />} />
          {/* Blueprint route aliases — FIX-03 */}
          <Route path="/incident-playbook" element={<Navigate to="/playbooks" replace />} />
          <Route path="/regulatory-tracking" element={<Navigate to="/regulatory-alerts" replace />} />
          <Route path="/ai-insights" element={<Navigate to="/ai-advisor" replace />} />
          <Route path="/analytics" element={<Navigate to="/food-safety/analysis" replace />} />
          <Route path="/daily-operations" element={<Navigate to="/dashboard" replace />} />
          <Route path="/locations" element={<Navigate to="/org-hierarchy" replace />} />
          <Route path="/inspections" element={<Navigate to="/self-inspection" replace />} />
          <Route path="/certifications" element={<Navigate to="/training/certificates" replace />} />
        </Route>
        <Route path="*" element={<Suspense fallback={null}><NotFound /></Suspense>} />
      </Routes>
    </>
  );
}

function GlobalErrorHandlers({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      reportError(event.error ?? new Error(event.message), { source: 'window.onerror', filename: event.filename, lineno: event.lineno });
    };
    const handleRejection = (event: PromiseRejectionEvent) => {
      const error = event.reason instanceof Error ? event.reason : new Error(String(event.reason));
      reportError(error, { source: 'unhandledrejection' });
    };
    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleRejection);
    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleRejection);
    };
  }, []);
  return <>{children}</>;
}

function App() {
  return (
    <ErrorBoundary level="page">
      <BrandingProvider>
      <Router>
        <AuthProvider>
          <DemoProvider>
            <LanguageProvider>
              <RoleProvider>
                <EmulationProvider>
                <OperatingHoursProvider>
                  <OfflineProvider>
                    <InactivityProvider>
                      <NotificationProvider>
                        <GlobalErrorHandlers>
                          <AppRoutes />
                        </GlobalErrorHandlers>
                      </NotificationProvider>
                      <CookieConsent />
                      <Toaster position="top-right" richColors closeButton duration={4000} toastOptions={{ style: { borderRadius: '12px', boxShadow: '0 8px 30px rgba(0,0,0,0.12)' } }} />
                    </InactivityProvider>
                  </OfflineProvider>
                </OperatingHoursProvider>
                </EmulationProvider>
              </RoleProvider>
            </LanguageProvider>
          </DemoProvider>
        </AuthProvider>
      </Router>
      </BrandingProvider>
    </ErrorBoundary>
  );
}

export default App;

