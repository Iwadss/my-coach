import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "@/components/theme-provider";

import Home from "@/marketing/pages/home";
import Login from "@/auth/pages/login";
import SignUp from "@/auth/pages/sign-up";
import CoachSignUp from "@/auth/pages/coach-sign-up";
import ForgotPassword from "@/auth/pages/forgot-password";
import ResetPassword from "@/auth/pages/reset-password";
import PendingApproval from "@/auth/pages/pending-approval";
import CoachDashboard from "./pages/coach/CoachDashboard";
import CoachSchedule from "./pages/coach/CoachSchedule";
import CoachEarnings from "./pages/coach/CoachEarnings";
import ClientDashboard from "./pages/client/ClientDashboard";
import ClientBook from "./pages/client/ClientBook";
import ClientSessions from "./pages/client/ClientSessions";
import ClientProgress from "./pages/client/ClientProgress";
import ClientSettings from "./pages/client/ClientSettings";
import NotFound from "./pages/NotFound";

// Route protection components
import ClientRoute from "@/auth/guards/client-route";
import CoachRoute from "@/auth/guards/coach-route";
import AdminRoute from "@/auth/guards/admin-route";
import TimeSlots from "./components/coach/time-slot-management";
import ClientManagement from "./components/coach/client-management";
import RegisterClient from "./components/coach/client-registration";
import ClientRequests from "./components/coach/client-requests";
import CoachSettings from "./components/coach/coach-settings";

import AdminLayout from "@/admin/components/admin-layout";
import AdminCoachApplications from "@/admin/pages/coach-applications";
import AdminCoaches from "@/admin/pages/coaches";
import AdminClients from "@/admin/pages/clients";
import AdminBilling from "@/admin/pages/billing";

const App = () => (
  <TooltipProvider>
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
      <Sonner />
      <BrowserRouter>
        <Routes>
          {/* Public routes */}
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<SignUp />} />
          <Route path="/coach-signup" element={<CoachSignUp />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />

          {/* Any signed-in, not-yet-approved user lands here */}
          <Route path="/pending-approval" element={<PendingApproval />} />

          {/* Client routes */}
          <Route
            path="/client-dashboard"
            element={
              <ClientRoute>
                <ClientDashboard />
              </ClientRoute>
            }
          />
          <Route
            path="/client-book"
            element={
              <ClientRoute>
                <ClientBook />
              </ClientRoute>
            }
          />
          <Route
            path="/client-sessions"
            element={
              <ClientRoute>
                <ClientSessions />
              </ClientRoute>
            }
          />
          <Route
            path="/client-progress"
            element={
              <ClientRoute>
                <ClientProgress />
              </ClientRoute>
            }
          />
          <Route
            path="/client-settings"
            element={
              <ClientRoute>
                <ClientSettings />
              </ClientRoute>
            }
          />

          {/* Coach routes */}
          <Route
            path="/coach-dashboard"
            element={
              <CoachRoute>
                <CoachDashboard />
              </CoachRoute>
            }
          />
          <Route
            path="/coach-schedule"
            element={
              <CoachRoute>
                <CoachSchedule />
              </CoachRoute>
            }
          />
          <Route
            path="/coach-earnings"
            element={
              <CoachRoute>
                <CoachEarnings />
              </CoachRoute>
            }
          />
          <Route
            path="/time-slots-management"
            element={
              <CoachRoute>
                <TimeSlots />
              </CoachRoute>
            }
          />
          <Route
            path="/client-management"
            element={
              <CoachRoute>
                <ClientManagement />
              </CoachRoute>
            }
          />
          <Route
            path="/client-registration"
            element={
              <CoachRoute>
                <RegisterClient />
              </CoachRoute>
            }
          />
          <Route
            path="/client-requests"
            element={
              <CoachRoute>
                <ClientRequests />
              </CoachRoute>
            }
          />
          <Route
            path="/coach-settings"
            element={
              <CoachRoute>
                <CoachSettings />
              </CoachRoute>
            }
          />

          {/* Admin routes — sidebar layout persists across all of them */}
          <Route
            path="/admin"
            element={
              <AdminRoute>
                <AdminLayout />
              </AdminRoute>
            }
          >
            {/* Applications is the default landing tab — the design has no separate dashboard/overview screen */}
            <Route index element={<Navigate to="coach-applications" replace />} />
            <Route path="coach-applications" element={<AdminCoachApplications />} />
            <Route path="coaches" element={<AdminCoaches />} />
            <Route path="clients" element={<AdminClients />} />
            <Route path="billing" element={<AdminBilling />} />
          </Route>

          {/* 404 Not Found */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  </TooltipProvider>
);

export default App;
