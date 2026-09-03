import { Routes, Route, useLocation ,  Navigate} from "react-router-dom";
import { ToastContainer, Bounce } from "react-toastify";
import UserContextProvider from "./context/UserContext";
import RequestContextLayout from "./context/RequestsContext";
import PartnerContextLayout from "./context/PartnerContext";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import Home from "./pages/Home";
import BecomePartner from "./pages/BecomePartner";
import PartnerRequests from "./pages/PartnerRequests";
import RequestDetails from "./pages/RequestDetails";
import AllPartners from "./pages/AllPartners";
import PartnerDetails from "./pages/PartnerDetails";
import ProfileDashboard from "./pages/ProfileDashboard";
import Employee from "./components/EmployeeModule/Employee";
import AdminLogin from "./pages/AdminLogin";

import AdminProtectedRoute from "./routes/AdminProtectedRoute";
import CompanyLayout from "./components/PartnerModule/company";
import CompanyDashboard from "./components/PartnerModule/companyDashboard";
import CompanyAnalytics from "./components/PartnerModule/companyAnalytics";
import CompanySalaryPayment from "./components/PartnerModule/companySalaryPayment";
import CompanyServiceAccess from "./components/PartnerModule/companyServiceAccess";
import CompanySubscription from "./components/PartnerModule/companySubscription";

import Admin from "./components/AdminModule/Admin";

function App() {
  const location = useLocation();

  // ✅ Better: hide layout for whole sections
  const hideLayout =
    location.pathname === "/" ||
    location.pathname === "/be-a-partner" ||
    location.pathname.startsWith("/company") ||
    location.pathname.startsWith("/employee") ||
    location.pathname.startsWith("/admin");

  return (
    <UserContextProvider>
      {!hideLayout && <Navbar />}

      <ToastContainer
        position="bottom-right"
        autoClose={5000}
        theme="light"
        transition={Bounce}
      />

      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/be-a-partner" element={<BecomePartner />} />
        <Route path="/admin/login" element={<AdminLogin />} />

        <Route element={<RequestContextLayout />}>
          <Route path="/partner-requests" element={<PartnerRequests />} />
          <Route path="/partner-requests/:id" element={<RequestDetails />} />
        </Route>

        <Route element={<PartnerContextLayout />}>
          <Route path="/partners" element={<AllPartners />} />
          <Route path="/partner/details/:id" element={<PartnerDetails />} />
          <Route path="/manage-account" element={<ProfileDashboard />} />
        </Route>

      <Route path="/company" element={<CompanyLayout />}>
    <Route index element={<Navigate to="dashboard" replace />} />
    <Route path="dashboard" element={<CompanyDashboard />} />
    <Route path="analytics" element={<CompanyAnalytics />} />
    <Route path="salary" element={<CompanySalaryPayment />} />
    <Route path="service" element={<CompanyServiceAccess />} />
    <Route path="subscription" element={<CompanySubscription />} />
  </Route>

        {/* ✅ Employee module */}
        <Route path="/employee/*" element={<Employee />} />

        {/* ✅ Admin protected */}
        <Route element={<AdminProtectedRoute />}>
          <Route path="/admin/*" element={<Admin />} />
        </Route>
      </Routes>

      {!hideLayout && <Footer />}
    </UserContextProvider>
  );
}

export default App;
