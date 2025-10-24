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
import Tasks from "./pages/Tasks";
import QC from "./pages/QC";
import Alerts from "./pages/Alerts";
import Reports from "./pages/Reports";
import Admin from "./pages/Admin";
import Login from "./pages/Login";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import MFASetup from "./pages/MFASetup";
import ChangePassword from "./pages/ChangePassword";
import Account from "./pages/Account";
import NewProject from "./pages/projects/NewProject";
import AcceptInvite from "./pages/AcceptInvite";
import NotFound from "./pages/NotFound";
import InboxPage from "./features/inbox/InboxPage";
import EmailAnalyticsDashboard from "./features/analytics/EmailAnalyticsDashboard";

/****************************************************
 * [LMK-02] ROOT ROUTE (no context)
 ****************************************************/
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

const tasksRoute = createRoute({
  getParentRoute: () => layoutRoute,
  path: "tasks",
  component: Tasks,
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

const forgotPasswordRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "forgot-password",
  component: ForgotPassword,
});

const resetPasswordRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "reset-password/$token",
  component: ResetPassword,
});

const mfaSetupRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "mfa-setup",
  component: MFASetup,
});

const inviteRoute = createRoute({
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

const inboxRoute = createRoute({
  getParentRoute: () => layoutRoute,
  path: "inbox",
  component: InboxPage,
});

const emailAnalyticsRoute = createRoute({
  getParentRoute: () => layoutRoute,
  path: "analytics/email",
  component: EmailAnalyticsDashboard,
});

/****************************************************
 * [LMK-04] ROUTE TREE
 ****************************************************/

const routeTree = rootRoute.addChildren([
  layoutRoute.addChildren([
    dashboardRoute,
    projectsRoute,
    tasksRoute,
    qcRoute,
    alertsRoute,
    reportsRoute,
    adminRoute,
    accountRoute,
    inboxRoute,
    emailAnalyticsRoute,
  ]),
  loginRoute,
  forgotPasswordRoute,
  changePasswordRoute,
  resetPasswordRoute,
  mfaSetupRoute,
  inviteRoute,
]);

projectsRoute.addChildren([projectsIndexRoute, projectDetailRoute, newProjectRoute]);

projectDetailRoute.addChildren([
  overviewTabRoute,
  skusTabRoute,
  listTabRoute,
  boardTabRoute,
  filesTabRoute,
  messagesTabRoute,
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
