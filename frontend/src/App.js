import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "sonner";
import { AuthProvider, useAuth } from "@/lib/auth";
import { I18nProvider } from "@/i18n";
import { ContentProvider } from "@/lib/content";

import Home from "@/pages/Home";
import About from "@/pages/About";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import ForgotPassword from "@/pages/ForgotPassword";
import ResetPassword from "@/pages/ResetPassword";
import CallForPapers from "@/pages/CallForPapers";
import Dates from "@/pages/Dates";
import Templates from "@/pages/Templates";
import JournalsArchive from "@/pages/JournalsArchive";
import DashboardLayout from "@/components/DashboardLayout";
import Overview from "@/pages/Overview";
import PapersList from "@/pages/PapersList";
import SubmitPaper from "@/pages/SubmitPaper";
import PaperDetail from "@/pages/PaperDetail";
import Notifications from "@/pages/Notifications";
import UserManagement from "@/pages/UserManagement";
import JournalRequests from "@/pages/JournalRequests";
import CMS from "@/pages/CMS";

function RoleGate({ roles, children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="p-10 text-gray-400">Loading…</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role) && user.role !== "admin") return <Navigate to="/dashboard" replace />;
  return children;
}

function App() {
  return (
    <div className="App">
      <I18nProvider>
        <BrowserRouter>
          <AuthProvider>
            <ContentProvider>
              <Toaster position="top-right" richColors />
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/about" element={<About />} />
              <Route path="/call-for-papers" element={<CallForPapers />} />
              <Route path="/dates" element={<Dates />} />
              <Route path="/templates" element={<Templates />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/journals" element={<JournalsArchive />} />

              <Route path="/dashboard" element={<DashboardLayout />}>
                <Route index element={<Overview />} />
                <Route path="my-papers" element={<RoleGate roles={["author"]}><PapersList scope="mine" /></RoleGate>} />
                <Route path="submit" element={<RoleGate roles={["author"]}><SubmitPaper /></RoleGate>} />
                <Route path="assigned" element={<RoleGate roles={["reviewer"]}><PapersList scope="assigned" /></RoleGate>} />
                <Route path="submissions" element={<RoleGate roles={["editor"]}><PapersList scope="all" /></RoleGate>} />
                <Route path="journal-requests" element={<RoleGate roles={["editor"]}><JournalRequests /></RoleGate>} />
                <Route path="users" element={<RoleGate roles={["admin"]}><UserManagement /></RoleGate>} />
                <Route path="cms" element={<RoleGate roles={["admin"]}><CMS /></RoleGate>} />
                <Route path="notifications" element={<Notifications />} />
                <Route path="papers/:id" element={<PaperDetail />} />
              </Route>

              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
            </ContentProvider>
          </AuthProvider>
        </BrowserRouter>
      </I18nProvider>
    </div>
  );
}

export default App;
