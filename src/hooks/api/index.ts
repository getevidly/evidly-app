/**
 * API hooks barrel export.
 *
 * All domain hooks are stubbed with demo data today.
 * When Supabase tables are ready, swap the queryFn/mutationFn
 * implementations in each file — consumer imports stay the same.
 */

// Base utilities
export { useApiQuery, useApiMutation } from './useApiQuery';
export type { ApiQueryResult, ApiMutationResult } from './useApiQuery';

// Employees
export {
  useEmployees,
  useEmployee,
  useInviteEmployee,
  useResendInvite,
  useDeactivateEmployee,
} from './useEmployees';

// Timecards
export {
  useTimeEntries,
  useEmployeeTimeEntries,
  useTeamTimeEntries,
  useCurrentShift,
  usePayPeriods,
  usePayPeriod,
  useClockIn,
  useClockOut,
  useApproveShift,
  useCreatePayPeriod,
  useClosePayPeriod,
  useExportPayPeriod,
} from './useTimecards';

// Deficiencies
export {
  useDeficiencies,
  useLocationDeficiencies,
  useDeficiency,
  useUpdateDeficiencyStatus,
  useResolveDeficiency,
} from './useDeficiencies';

// Service Records
export {
  useServiceRecords,
  useLocationServiceRecords,
  useServiceRecord,
  useUpdateQaStatus,
} from './useServiceRecords';

// Settings
export {
  useVendorSettings,
  useUpdateVendorSettings,
  useRolePermissions,
  useUpdateRolePermissions,
  useServiceTypes,
  useCreateServiceType,
  useUpdateServiceType,
  useDeleteServiceType,
  useIntegrations,
  useConnectIntegration,
  useDisconnectIntegration,
  useNotificationPreferences,
  useUpdateNotificationPreferences,
  useBillingInfo,
  useInvoices,
} from './useSettings';

export type {
  VendorSettings,
  SettingsRole,
  RolePermissionRow,
  ServiceType,
  IntegrationConfig,
  IntegrationStatus,
  NotificationPreferences,
  NotificationEvent,
  NotificationChannel,
  BillingInfo,
  PlanTier,
  Invoice,
} from './useSettings';

// Reports
export {
  useReportHistory,
  useScheduledReports,
  useFavoriteReports,
  useGenerateReport,
  useCreateScheduledReport,
  useUpdateScheduledReport,
  useDeleteScheduledReport,
  useToggleFavorite,
} from './useReports';

export type {
  ReportParams,
  GeneratedReport,
  ScheduledReport,
} from './useReports';

// Equipment
export {
  useEquipment,
  useEquipmentItem,
  useLocationEquipment,
  useEquipmentServiceHistory,
  useEquipmentDeficiencies,
  useEquipmentDocuments,
  useCreateEquipment,
  useUpdateEquipment,
  useDeleteEquipment,
  useUploadEquipmentDocument,
} from './useEquipment';

export type {
  EquipmentItem,
  EquipmentCondition,
  EquipmentStatus,
  EquipmentServiceRecord,
  EquipmentDeficiency,
  EquipmentDocument,
  CreateEquipmentInput,
  UpdateEquipmentInput,
  EquipmentFilters,
} from './useEquipment';

// Schedule
export {
  useSchedule,
  useUnassignedJobs,
  useScheduleTechnicians,
  useTechnicianAvailability,
  useRecurringSchedules,
  useRescheduleJob,
  useAssignJob,
  useOptimizeRoute,
  useUpdateAvailability as useUpdateTechAvailability,
  useCreateRecurringSchedule,
} from './useSchedule';

export type {
  ScheduledJob,
  JobStatus,
  Technician,
  TechnicianAvailability,
  AvailabilityException,
  RouteOptimization,
  RecurringSchedule,
  RecurrenceFrequency,
  ScheduleView,
  ScheduleFilters,
} from './useSchedule';

// Vehicles / Fleet
export {
  useVehicles,
  useVehicle,
  useVehicleMaintenance,
  useVehicleIncidents,
  useCreateVehicle,
  useUpdateVehicle,
  useLogMaintenance,
  useReportVehicleIncident,
} from './useVehicles';

export type {
  Vehicle,
  VehicleType,
  VehicleStatus,
  VehicleMaintenance as VehicleMaintenanceRecord,
  VehicleIncident,
  VehicleFilters,
  CreateVehicleInput,
  LogMaintenanceInput,
  ReportIncidentInput,
  MaintenanceType,
  IncidentType,
  IncidentStatus,
} from './useVehicles';

// Insurance
export {
  useCompanyInsurance,
  useVehicleInsurance,
  useRoadsideAssistance,
  useInsurancePolicy,
  useEmergencyInfo,
  useCreateInsurancePolicy,
  useUpdateInsurancePolicy,
  useCreateRoadsideAssistance,
} from './useInsurance';

// Availability
export {
  useAvailabilitySubmission,
  useTeamAvailability,
  usePendingApprovals,
  useSubmitAvailability,
  useUpdateAvailability,
  useApproveAvailability,
  useRejectAvailability,
  useAvailabilityDeadline,
  useIsBeforeDeadline,
  useNextWeekDates,
} from './useAvailability';

export type {
  AvailabilitySubmission,
  DayAvailability,
  SubmissionStatus,
  SubmitAvailabilityInput,
  DeadlineInfo,
} from './useAvailability';

export type {
  CompanyInsurance,
  VehicleInsurance,
  RoadsideAssistance,
  EmergencyInfo,
  CompanyPolicyType,
  VehiclePolicyType,
  PaymentFrequency,
  CoverageType,
  CreateCompanyInsuranceInput,
  CreateVehicleInsuranceInput,
  CreateRoadsideInput,
} from './useInsurance';

// Bonuses & Performance
export {
  useBonusConfiguration,
  useQuarterlyMetrics,
  useCalculateBonus,
  useBonusSummary,
  useCallbacks,
  useCreateCallback,
  useUpdateBonusConfiguration,
  getCurrentQuarter,
  getQuarterDateRange,
  BONUS_MULTIPLIER_METRICS,
  BONUS_KILLERS,
} from './useBonuses';

export type {
  BonusConfiguration,
  PerformanceMetrics,
  BonusSummary,
  JobCallback,
  CreateCallbackInput,
} from './useBonuses';

// Inventory
export {
  useInventoryItems,
  useInventoryItem,
  useInventoryTransactions,
  useInventoryRequests,
  useLogUsage,
  useCreateInventoryRequest,
  useApproveInventoryRequest,
  useDenyInventoryRequest,
  useCreateInventoryItem,
  useUpdateInventoryItem,
} from './useInventory';

export type {
  InventoryItem,
  InventoryCategory,
  InventoryTransaction,
  TransactionType,
  InventoryRequest,
  InventoryRequestItem,
  RequestStatus,
  RequestPriority,
  InventoryFilters,
  LogUsageInput,
  CreateRequestInput,
} from './useInventory';

// Incidents (Equipment + Safety)
export {
  useEquipmentIncidents,
  useCreateEquipmentIncident,
  useResolveEquipmentIncident,
  useIncidentReports,
  useIncidentReport,
  useCreateIncidentReport,
  useUpdateIncidentReport,
  useInvestigateIncident,
} from './useIncidents';

export type {
  EquipmentIncident,
  EquipmentIncidentType,
  IncidentReport as SafetyIncidentReport,
  SafetyIncidentType,
  IncidentSeverity,
  IncidentReportStatus,
  EquipmentIncidentFilters,
  SafetyIncidentFilters,
  CreateEquipmentIncidentInput,
  CreateIncidentReportInput,
  InvestigateInput,
} from './useIncidents';

// Clock Reminders & Auto Clock-Out
export {
  useClockReminders,
  useClockReminderSettings,
  useTimecardAlterations,
  useUpdateClockReminderSettings,
  useAcknowledgeReminder,
  useAutoClockout,
  useLogTimecardAlteration,
} from './useClockReminders';

export type {
  ClockReminder,
  ClockReminderSettings,
  TimecardAlteration,
  ReminderType,
  AutoClockoutReason,
  AutoClockoutEvent,
} from './useClockReminders';
