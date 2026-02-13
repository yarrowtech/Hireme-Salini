
import { Routes, Route, useLocation } from "react-router-dom";
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
import Employee from "./pages/Employee";
import AdminLogin from "./pages/AdminLogin";

//protected admin route 
import AdminProtectedRoute from "./routes/AdminProtectedRoute";

/* Partner Dashboard */
import Company from "./components/PartnerModule/company";
import Admin from "./components/AdminModule/Admin";
function App() {
  const location = useLocation();

  const hideLayout =
    location.pathname === "/" ||
    location.pathname === "/be-a-partner" ||
    location.pathname.startsWith("/company") ||
    location.pathname.startsWith("/hr") ||
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

        <Route path="/employees/employee/:id" element={<Employee />} />
        <Route path="/company/*" element={<Company />} />
        
<Route element={<AdminProtectedRoute />}>
  <Route path="/admin/*" element={<Admin />} />
</Route>     
      </Routes>

      {!hideLayout && <Footer />}
    </UserContextProvider>
  );
}

export default App;
