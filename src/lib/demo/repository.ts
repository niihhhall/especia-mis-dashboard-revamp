import "server-only";

// Server-only entry point for the demo data. The data itself lives in the pure
// `./dataset` module so vitest can check it; app code imports from here.
export {
  DEMO_COMPANY_ID,
  DEMO_COMPANY_SLUG,
  DEMO_PERIOD_IDS,
  demoCompanySummary,
  getDemoAgeing,
  getDemoBudget,
  getDemoBudgetMatrix,
  getDemoCompany,
  getDemoCompanyBySlug,
  getDemoCompanyCard,
  getDemoCompanySummary,
  getDemoGpDashboardHtml,
  getDemoGpDashboardPeriods,
  getDemoLedgerMap,
  getDemoManualInputs,
  getDemoMasterEdits,
  getDemoMasterRows,
  getDemoPeriods,
  getDemoQueries,
  getDemoSegments,
  getDemoTemplateRows,
  getDemoUsers,
  isDemoCompanyId,
  isDemoPeriodId,
  listDemoAuditEvents,
} from "./dataset";
