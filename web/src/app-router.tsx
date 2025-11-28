// web/src/app-router.tsx

/****************************************************
 * [LMK-01] IMPORTS
 ****************************************************/
import {
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
} from "@tanstack/react-router";

import AppLayout from "./components/layout/AppLayout";
import Home from "./pages/home/Home";
import ProjectsList from "./pages/projects/ProjectsList";
import ProjectShell from "./pages/projects/ProjectShell";
import OverviewTab from "./pages/projects/tabs/OverviewTab";
import SkusTab from "./pages/projects/tabs/SkusTab";
import ListTab from "./pages/projects/tabs/ListTab";
import BoardTab from "./pages/projects/tabs/BoardTab";
import FilesTab from "./pages/projects/tabs/FilesTab";
import MessagesTab from "./pages/projects/tabs/MessagesTab";
import ExecutionTab from "./pages/projects/tabs/ExecutionTab";
import PreProdTab from "./pages/projects/tabs/PreProdTab";
import ComplianceTab from "./pages/projects/tabs/ComplianceTab";
import PlanningTab from "./pages/projects/tabs/PlanningTab";
import Tasks from "./pages/Tasks";
import QC from "./pages/QC";
import Alerts from "./pages/Alerts";
import Reports from "./pages/Reports";
import Admin from "./pages/Admin";
import Login from "./pages/Login";
import Account from "./pages/Account";
import NewProject from "./pages/projects/NewProject";
import NotFound from "./pages/NotFound";
import ChangePassword from "./pages/ChangePassword";
import MfaVerify from "./pages/auth/MfaVerify";
import AcceptInvite from "./pages/auth/AcceptInvite";
import EmailAnalytics from "./pages/admin/EmailAnalytics";
import MoldsPage from "./pages/preprod/MoldsPage";
import TrialsPage from "./pages/preprod/TrialsPage";
import PackagingPage from "./pages/preprod/PackagingPage";
import PPSPage from "./pages/preprod/PPSPage";
import ComplianceDashboard from "./pages/compliance/ComplianceDashboard";
import CertificationsPage from "./pages/compliance/CertificationsPage";
import ProjectCompliancePage from "./pages/compliance/ProjectCompliancePage";
import MaterialCompliancePage from "./pages/compliance/MaterialCompliancePage";
import LabTestsPage from "./pages/compliance/LabTestsPage";
import ProjectPoliciesPage from "./pages/preprod/ProjectPoliciesPage";
import ProcessFlowsPage from "./pages/preprod/ProcessFlowsPage";
import ShiftEntriesPage from "./pages/execution/ShiftEntriesPage";
import WIPLedgerPage from "./pages/execution/WIPLedgerPage";
import StationsPage from "./pages/execution/StationsPage";
import WorkflowPage from "./pages/execution/WorkflowPage";
import QCManagementPage from "./pages/execution/QCManagementPage";
import ProductionEntryPage from "./pages/execution/ProductionEntryPage";
import BatchTrackingPage from "./pages/execution/BatchTrackingPage";
import ProcessConfigurationPage from "./pages/ProcessConfigurationPage";
import WorkflowBuilderPage from "./pages/WorkflowBuilderPage";
import MaterialDashboardPage from "./pages/MaterialDashboardPage";
import WorkforceManagementPage from "./pages/WorkforceManagementPage";
import DailyPlanningPage from "./pages/AutoPlanningPage";
import { AdaptivePlanningDashboard } from "./pages/AdaptivePlanningDashboard";
import MultiProcessPlanPage from "./pages/planning/MultiProcessPlanPage";
import ProcessChainView from "./pages/planning/ProcessChainView";
import PlanEditor from "./pages/planning/PlanEditor";
import LoadBalancingDashboard from "./pages/planning/LoadBalancingDashboard";
import ProjectCostingPage from "./pages/ProjectCostingPage";
import ApprovalTrackerPage from "./pages/ApprovalTrackerPage";
import MRPCalculatorPage from "./pages/MRPCalculatorPage";
import StageView from "./pages/cross-project/StageView";
import { FacilityManagementPage } from "./pages/admin/FacilityManagementPage";
import TasksRemindersHub from "./pages/inbox/TasksRemindersHub";
import TimePlanningDashboard from "./pages/TimePlanningDashboard";
import MarginRulesPage from "./pages/MarginRulesPage";
import CostTemplatesPage from "./pages/CostTemplatesPage";
import CostingPnlPage from "./pages/CostingPnlPage";
import FactoryHierarchyPage from "./pages/FactoryHierarchyPage";
import StationAssignmentPage from "./pages/execution/StationAssignmentPage";
import { WorkforceSkillMatrixPage } from "./pages/WorkforceSkillMatrixPage";

/****************************************************
 * [LMK-02] ROOT ROUTE (no context)
 *****************************************************/
const rootRoute = createRootRoute({
  component: () => <Outlet />,
  notFoundComponent: NotFound,
});

// Layout wrapper for authenticated pages
const layoutRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: "layout",
  component: () => (
    <AppLayout>
      <Outlet />
    </AppLayout>
  ),
});

/****************************************************
 * [LMK-03] CHILD ROUTES
 ****************************************************/
const dashboardRoute = createRoute({
  getParentRoute: () => layoutRoute,
  path: "/",
  component: Home,
});

const projectsRoute = createRoute({
  getParentRoute: () => layoutRoute,
  path: "projects",
  component: () => <Outlet />,
});

const projectsIndexRoute = createRoute({
  getParentRoute: () => projectsRoute,
  path: "/",
  component: ProjectsList,
});

const projectDetailRoute = createRoute({
  getParentRoute: () => projectsRoute,
  path: "$id",
  component: ProjectShell,
});

const overviewTabRoute = createRoute({
  getParentRoute: () => projectDetailRoute,
  path: "/",
  component: OverviewTab,
});

const skusTabRoute = createRoute({
  getParentRoute: () => projectDetailRoute,
  path: "skus",
  component: SkusTab,
});

const listTabRoute = createRoute({
  getParentRoute: () => projectDetailRoute,
  path: "list",
  component: ListTab,
});

const boardTabRoute = createRoute({
  getParentRoute: () => projectDetailRoute,
  path: "board",
  component: BoardTab,
});

const filesTabRoute = createRoute({
  getParentRoute: () => projectDetailRoute,
  path: "files",
  component: FilesTab,
});

const messagesTabRoute = createRoute({
  getParentRoute: () => projectDetailRoute,
  path: "messages",
  component: MessagesTab,
});

const executionTabRoute = createRoute({
  getParentRoute: () => projectDetailRoute,
  path: "execution",
  component: ExecutionTab,
});

const preprodTabRoute = createRoute({
  getParentRoute: () => projectDetailRoute,
  path: "preprod",
  component: PreProdTab,
});

const complianceTabRoute = createRoute({
  getParentRoute: () => projectDetailRoute,
  path: "compliance",
  component: ComplianceTab,
});

const planningTabRoute = createRoute({
  getParentRoute: () => projectDetailRoute,
  path: "planning",
  component: PlanningTab,
});

const tasksRoute = createRoute({
  getParentRoute: () => layoutRoute,
  path: "tasks",
  component: Tasks,
});

const remindersRoute = createRoute({
  getParentRoute: () => layoutRoute,
  path: "reminders",
  component: TasksRemindersHub,
});

const qcRoute = createRoute({
  getParentRoute: () => layoutRoute,
  path: "qc",
  component: QC,
});

const alertsRoute = createRoute({
  getParentRoute: () => layoutRoute,
  path: "alerts",
  component: Alerts,
});

const reportsRoute = createRoute({
  getParentRoute: () => layoutRoute,
  path: "reports",
  component: Reports,
});

const adminRoute = createRoute({
  getParentRoute: () => layoutRoute,
  path: "admin",
  component: Admin,
});

const emailAnalyticsRoute = createRoute({
  getParentRoute: () => layoutRoute,
  path: "admin/email-analytics",
  component: EmailAnalytics,
});

const facilityManagementRoute = createRoute({
  getParentRoute: () => layoutRoute,
  path: "admin/facilities",
  component: FacilityManagementPage,
});

const moldsRoute = createRoute({
  getParentRoute: () => layoutRoute,
  path: "preprod/molds",
  component: MoldsPage,
});

const trialsRoute = createRoute({
  getParentRoute: () => layoutRoute,
  path: "preprod/trials",
  component: TrialsPage,
});

const packagingRoute = createRoute({
  getParentRoute: () => layoutRoute,
  path: "preprod/packaging",
  component: PackagingPage,
});

const ppsRoute = createRoute({
  getParentRoute: () => layoutRoute,
  path: "preprod/pps",
  component: PPSPage,
});

const complianceDashboardRoute = createRoute({
  getParentRoute: () => layoutRoute,
  path: "compliance",
  component: ComplianceDashboard,
});

const certificationsRoute = createRoute({
  getParentRoute: () => layoutRoute,
  path: "compliance/certifications",
  component: CertificationsPage,
});

const projectComplianceRoute = createRoute({
  getParentRoute: () => layoutRoute,
  path: "compliance/projects",
  component: ProjectCompliancePage,
});

const materialComplianceRoute = createRoute({
  getParentRoute: () => layoutRoute,
  path: "compliance/materials",
  component: MaterialCompliancePage,
});

const labTestsRoute = createRoute({
  getParentRoute: () => layoutRoute,
  path: "compliance/lab-tests",
  component: LabTestsPage,
});

const projectPoliciesRoute = createRoute({
  getParentRoute: () => layoutRoute,
  path: "preprod/policies",
  component: ProjectPoliciesPage,
});

const processFlowsRoute = createRoute({
  getParentRoute: () => layoutRoute,
  path: "preprod/process-flows",
  component: ProcessFlowsPage,
});

const shiftEntriesRoute = createRoute({
  getParentRoute: () => layoutRoute,
  path: "execution/shift-entries",
  component: ShiftEntriesPage,
});

const wipLedgerRoute = createRoute({
  getParentRoute: () => layoutRoute,
  path: "execution/wip-ledger",
  component: WIPLedgerPage,
});

const stationsRoute = createRoute({
  getParentRoute: () => layoutRoute,
  path: "execution/stations",
  component: StationsPage,
});
const stationAssignmentRoute = createRoute({
  getParentRoute: () => layoutRoute,
  path: "execution/station-assignment",
  component: StationAssignmentPage,
});

const workflowRoute = createRoute({
  getParentRoute: () => layoutRoute,
  path: "execution/workflow",
  component: WorkflowPage,
});

const qcManagementRoute = createRoute({
  getParentRoute: () => layoutRoute,
  path: "execution/qc",
  component: QCManagementPage,
});

const productionEntryRoute = createRoute({
  getParentRoute: () => layoutRoute,
  path: "execution/production",
  component: ProductionEntryPage,
});

const batchTrackingRoute = createRoute({
  getParentRoute: () => layoutRoute,
  path: "execution/batches",
  component: BatchTrackingPage,
});

const processConfigurationRoute = createRoute({
  getParentRoute: () => layoutRoute,
  path: "execution/process-config",
  component: ProcessConfigurationPage,
});

const workflowBuilderRoute = createRoute({
  getParentRoute: () => layoutRoute,
  path: "execution/workflow-builder",
  component: WorkflowBuilderPage,
});

const materialDashboardRoute = createRoute({
  getParentRoute: () => layoutRoute,
  path: "planning/materials",
  component: MaterialDashboardPage,
});

const workforceManagementRoute = createRoute({
  getParentRoute: () => layoutRoute,
  path: "workforce",
  component: WorkforceManagementPage,
});
const workforceSkillsRoute = createRoute({
  getParentRoute: () => layoutRoute,
  path: "workforce/skills",
  component: WorkforceSkillMatrixPage,
});

const dailyPlanningRoute = createRoute({
  getParentRoute: () => layoutRoute,
  path: "planning/daily",
  component: DailyPlanningPage,
});

const adaptivePlanningRoute = createRoute({
  getParentRoute: () => layoutRoute,
  path: "planning/adaptive",
  component: AdaptivePlanningDashboard,
});

const multiProcessPlanRoute = createRoute({
  getParentRoute: () => layoutRoute,
  path: "planning/multi-process",
  component: MultiProcessPlanPage,
});

const processChainViewRoute = createRoute({
  getParentRoute: () => layoutRoute,
  path: "planning/process-chain/:flowId",
  component: ProcessChainView,
});

const planEditorRoute = createRoute({
  getParentRoute: () => layoutRoute,
  path: "planning/editor/:planId",
  component: () => {
    const { planId } = { planId: '' }; // Will be populated by router
    return <PlanEditor planId={planId} />;
  },
});

const loadBalancingRoute = createRoute({
  getParentRoute: () => layoutRoute,
  path: "planning/load-balancing/:planId",
  component: () => {
    const { planId } = { planId: '' }; // Will be populated by router
    return <LoadBalancingDashboard planId={planId} />;
  },
});

const projectCostingRoute = createRoute({
  getParentRoute: () => layoutRoute,
  path: "planning/costing",
  component: ProjectCostingPage,
});

const approvalTrackerRoute = createRoute({
  getParentRoute: () => layoutRoute,
  path: "planning/approvals",
  component: ApprovalTrackerPage,
});

const mrpCalculatorRoute = createRoute({
  getParentRoute: () => layoutRoute,
  path: "planning/mrp",
  component: MRPCalculatorPage,
});

const timePlanningRoute = createRoute({
  getParentRoute: () => layoutRoute,
  path: "planning/time",
  component: TimePlanningDashboard,
});

const marginRulesRoute = createRoute({
  getParentRoute: () => layoutRoute,
  path: "planning/margin-rules",
  component: MarginRulesPage,
});

const costTemplatesRoute = createRoute({
  getParentRoute: () => layoutRoute,
  path: "planning/cost-templates",
  component: CostTemplatesPage,
});

const costingPnlRoute = createRoute({
  getParentRoute: () => layoutRoute,
  path: "planning/costing/pnl",
  component: CostingPnlPage,
});

const factoryHierarchyRoute = createRoute({
  getParentRoute: () => layoutRoute,
  path: "admin/factory-hierarchy",
  component: FactoryHierarchyPage,
});

const stageViewRoute = createRoute({
  getParentRoute: () => layoutRoute,
  path: "stages/$stage",
  component: StageView,
});

const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "login",
  component: Login,
});

const changePasswordRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "change-password",
  component: ChangePassword,
});

const mfaVerifyRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "auth/mfa-verify",
  component: MfaVerify,
});

const acceptInviteRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "invite/$token",
  component: AcceptInvite,
});

const accountRoute = createRoute({
  getParentRoute: () => layoutRoute,
  path: "account",
  component: Account,
});

const newProjectRoute = createRoute({
  getParentRoute: () => projectsRoute,
  path: "new",
  component: NewProject,
});

// Project-scoped execution subpages
const stationAssignmentProjectRoute = createRoute({
  getParentRoute: () => projectDetailRoute,
  path: "execution/station-assignment",
  component: StationAssignmentPage,
});

// Project-scoped planning and workforce subpages
const adaptivePlanningProjectRoute = createRoute({
  getParentRoute: () => projectDetailRoute,
  path: "planning/adaptive",
  component: AdaptivePlanningDashboard,
});

const workforceSkillsProjectRoute = createRoute({
  getParentRoute: () => projectDetailRoute,
  path: "workforce/skills",
  component: WorkforceSkillMatrixPage,
});

/****************************************************
 * [LMK-04] ROUTE TREE
 ****************************************************/

const routeTree = rootRoute.addChildren([
  layoutRoute.addChildren([
    dashboardRoute,
    projectsRoute,
    tasksRoute,
    remindersRoute,
    qcRoute,
    alertsRoute,
    reportsRoute,
    adminRoute,
    emailAnalyticsRoute,
    facilityManagementRoute,
    moldsRoute,
    trialsRoute,
    packagingRoute,
    ppsRoute,
    complianceDashboardRoute,
    certificationsRoute,
    projectComplianceRoute,
    materialComplianceRoute,
    labTestsRoute,
    projectPoliciesRoute,
    processFlowsRoute,
    shiftEntriesRoute,
    wipLedgerRoute,
    stationsRoute,
  stationAssignmentRoute,
    workflowRoute,
    qcManagementRoute,
    productionEntryRoute,
    batchTrackingRoute,
    processConfigurationRoute,
    workflowBuilderRoute,
    materialDashboardRoute,
    workforceManagementRoute,
  workforceSkillsRoute,
    dailyPlanningRoute,
  adaptivePlanningRoute,
  multiProcessPlanRoute,
  processChainViewRoute,
  planEditorRoute,
  loadBalancingRoute,
    projectCostingRoute,
    approvalTrackerRoute,
    mrpCalculatorRoute,
    timePlanningRoute,
    marginRulesRoute,
    costTemplatesRoute,
    costingPnlRoute,
    factoryHierarchyRoute,
    stageViewRoute,
    accountRoute,
  ]),
  loginRoute,
  changePasswordRoute,
  mfaVerifyRoute,
  acceptInviteRoute,
]);

projectsRoute.addChildren([projectsIndexRoute, projectDetailRoute, newProjectRoute]);

projectDetailRoute.addChildren([
  overviewTabRoute,
  skusTabRoute,
  listTabRoute,
  boardTabRoute,
  executionTabRoute,
  preprodTabRoute,
  complianceTabRoute,
  planningTabRoute,
  filesTabRoute,
  messagesTabRoute,
  stationAssignmentProjectRoute,
  adaptivePlanningProjectRoute,
  workforceSkillsProjectRoute,
]);

/****************************************************
 * [LMK-05] ROUTER INSTANCE
 ****************************************************/
export const router = createRouter({
  routeTree,
  defaultNotFoundComponent: NotFound,
});

/****************************************************
 * [LMK-06] MODULE AUGMENTATION
 * Lets TS know about your router type for RouterProvider.
 ****************************************************/
declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
