import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/useAuth";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import ForgotPassword from "./pages/ForgotPassword";
import Dashboard from "./pages/Dashboard";
import Cases from "./pages/Cases";
import CaseDetail from "./pages/CaseDetail";
import Clients from "./pages/Clients";
import ClientProfile from "./pages/ClientProfile";
import SelectLicense from "./pages/SelectLicense";
import LicensingForm from "./pages/LicensingForm";
import Licenses from "./pages/Licenses";
import Applications from "./pages/Applications";
import Documents from "./pages/Documents";
import ComplianceDocuments from "./pages/ComplianceDocuments";
import LicensingRequirements from "./pages/LicensingRequirements";
import Tasks from "./pages/Tasks";
import ActivityFeed from "./pages/ActivityFeed";
import Settings from "./pages/Settings";
import Help from "./pages/Help";
import ClientPortal from "./pages/ClientPortal";
import ClientInfoRequest from "./pages/ClientInfoRequest";
import GenerateContract from "./pages/GenerateContract";
import GenerateNDA from "./pages/GenerateNDA";
const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/cases" element={<Cases />} />
            <Route path="/cases/:id" element={<CaseDetail />} />
            <Route path="/clients" element={<Clients />} />
            <Route path="/clients/:id" element={<ClientProfile />} />
            <Route path="/select-license/:clientId" element={<SelectLicense />} />
            <Route path="/licensing-project/:clientId/:licenseType" element={<LicensingForm />} />
            <Route path="/licenses" element={<Licenses />} />
            <Route path="/applications" element={<Applications />} />
            <Route path="/documents" element={<Documents />} />
            <Route path="/compliance" element={<ComplianceDocuments />} />
            <Route path="/licensing-requirements" element={<LicensingRequirements />} />
            <Route path="/uk-requirements" element={<LicensingRequirements />} />
            <Route path="/tasks" element={<Tasks />} />
            <Route path="/activity" element={<ActivityFeed />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/help" element={<Help />} />
            <Route path="/portal" element={<ClientPortal />} />
            <Route path="/client-request" element={<ClientInfoRequest />} />
            <Route path="/generate-contract" element={<GenerateContract />} />
            <Route path="/generate-nda" element={<GenerateNDA />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
