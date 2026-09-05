import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "@/components/theme-provider";

import Home from "@/marketing/pages/home";
import Login from "./pages/auth/Login";
import SignUp from "./pages/auth/SignUp";
import CoachSignUp from "./pages/auth/CoachSignUp";
import ForgotPassword from "./pages/auth/ForgotPassword";
import ResetPassword from "./pages/auth/ResetPassword";
import PendingApproval from "./pages/auth/PendingApproval";
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
import ProtectedRoute from "@/components/ProtectedRoute";
import CoachRoute from "@/components/CoachRoute";
import AdminRoute from "@/components/AdminRoute";
import TimeSlots from "./components/coach/time-slot-management";
import ClientManagement from "./components/coach/client-management";
import RegisterClient from "./components/coach/client-registration";
import ClientRequests from "./components/coach/client-requests";
import CoachSettings from "./components/coach/coach-settings";

import AdminLayout from "./components/admin/admin-layout";
import AdminCoachApplications from "./pages/admin/AdminCoachApplications";
import AdminCoaches from "./pages/admin/AdminCoaches";
import AdminClients from "./pages/admin/AdminClients";
import AdminBilling from "./pages/admin/AdminBilling";

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
              <ProtectedRoute>
                <ClientDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/client-book"
            element={
              <ProtectedRoute>
                <ClientBook />
              </ProtectedRoute>
            }
          />
          <Route
            path="/client-sessions"
            element={
              <ProtectedRoute>
                <ClientSessions />
              </ProtectedRoute>
            }
          />
          <Route
            path="/client-progress"
            element={
              <ProtectedRoute>
                <ClientProgress />
              </ProtectedRoute>
            }
          />
          <Route
            path="/client-settings"
            element={
              <ProtectedRoute>
                <ClientSettings />
              </ProtectedRoute>
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
