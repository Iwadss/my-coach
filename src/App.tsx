import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@/components/theme-provider";

import Index from "./pages/Index";
import Login from "./pages/Login";
import AdminDashboard from "./pages/AdminDashboard";
import ClientDashboard from "./pages/ClientDashboard";
import NotFound from "./pages/NotFound";

// Route protection components
import ProtectedRoute from "@/components/ProtectedRoute";
import AdminRoute from "@/components/AdminRoute";
import TimeSlots from "./components/admin/time-slot-management";
import ClientManagement from "./components/admin/client-management";
import RegisterClient from "./components/admin/client-registration";
import AppointmentManagement from "./components/admin/appointment-management";

const App = () => (
  <TooltipProvider>
    <Sonner />
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
      <BrowserRouter>
        <Routes>
          {/* Public routes */}
          <Route path="/" element={<Index />} />
          <Route path="/login" element={<Login />} />

          {/* Protected routes */}
          <Route
            path="/admin-dashboard"
            element={
              <AdminRoute>
                <AdminDashboard />
              </AdminRoute>
            }
          />

          <Route
            path="/time-slots-management"
            element={
              <AdminRoute>
                <TimeSlots />
              </AdminRoute>
            }
          />

          <Route
            path="/client-dashboard"
            element={
              <ProtectedRoute>
                <ClientDashboard />
              </ProtectedRoute>
            }
          />

          <Route
            path="/client-management"
            element={
              <AdminRoute>
                <ClientManagement />
              </AdminRoute>
            }
          />

          <Route
            path="/appointment-management"
            element={
              <AdminRoute>
                <AppointmentManagement />
              </AdminRoute>
            }
          />

          <Route
            path="/client-registration"
            element={
              <AdminRoute>
                <RegisterClient />
              </AdminRoute>
            }
          />

          {/* 404 Not Found */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  </TooltipProvider>
);

export default App;