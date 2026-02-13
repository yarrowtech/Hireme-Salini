import React, {
  useState,
  useContext,
  type ChangeEvent,
  useEffect,
} from "react";
import { UserContext } from "../context/UserContext";
import { toast } from "react-toastify";
import Search from "../assets/search.svg";
import { EmployeeCard } from "./AllEmployees";
import type { Employee } from "./AllEmployees";
import {
  PartnersContext,
  type PartnerDetails,
} from "../context/PartnerContext";
import { useParams } from "react-router-dom";

export function AccountDetailsContainer() {
  const { userState } = useContext(UserContext)!;

  return (
    <div className="w-full bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl shadow-lg p-8 flex flex-col gap-6 border border-blue-200/50 backdrop-blur-sm">
      <div className="flex items-center gap-4 mb-2">
        <div className="p-3 rounded-xl bg-blue-100/80 shadow-inner">
          <i className="fas fa-user-circle text-2xl text-blue-600"></i>
        </div>
        <h2 className="text-2xl font-bold text-blue-800 tracking-tight">
          Account Details
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white/80 p-4 rounded-xl shadow-sm border border-blue-100">
          <span className="text-sm font-medium text-blue-500">Username</span>
          <p className="text-lg font-semibold text-blue-800 mt-1">
            {userState.username}
          </p>
        </div>

        <div className="bg-white/80 p-4 rounded-xl shadow-sm border border-blue-100">
          <span className="text-sm font-medium text-blue-500">Account Type</span>
          <p className="mt-1">
            <span
              className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold ${
                userState.position === "admin"
                  ? "bg-red-100 text-red-800"
                  : userState.position === "manager"
                  ? "bg-blue-100 text-blue-800"
                  : "bg-green-100 text-green-800"
              }`}
            >
              {userState.position?.charAt(0).toUpperCase() +
                userState.position?.slice(1)}
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}

export function CompanyDetailsContainer() {
  const { userState } = useContext(UserContext)!;
  const [partner, setPartner] = useState<PartnerDetails>();
  const { fetchPartnerDetails } = useContext(PartnersContext)!;
  const params = useParams();

  useEffect(() => {
    const fetchDetails = async () => {
      const compid =
        userState.position === "superadmin"
          ? parseInt(params.id || "-1")
          : userState.Company;
      const details = await fetchPartnerDetails(compid || -1);
      if (details) {
        setPartner(details);
      } else {
        toast.error("Failed to fetch company details");
      }
    };
    fetchDetails();
  }, []);

  return (
    <div className="w-full bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl shadow-lg p-8 flex flex-col gap-6 border border-blue-200/50 backdrop-blur-sm">
      <div className="flex items-center gap-4 mb-2">
        <div className="p-3 rounded-xl bg-blue-100/80 shadow-inner">
          <i className="fas fa-building text-2xl text-blue-600"></i>
        </div>
        <h2 className="text-2xl font-bold text-blue-800 tracking-tight">
          Company Details
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white/80 p-4 rounded-xl shadow-sm border border-blue-100">
          <span className="text-sm font-medium text-blue-500">Company Name</span>
          <p className="text-lg font-semibold text-blue-800 mt-1">
            {partner?.CompanyName}
          </p>
        </div>

        <div className="bg-white/80 p-4 rounded-xl shadow-sm border border-blue-100">
          <span className="text-sm font-medium text-blue-500">Company Code</span>
          <p className="text-lg font-semibold text-blue-800 mt-1 font-mono bg-blue-50 px-3 py-1 rounded-lg inline-block">
            {partner?.id}
          </p>
        </div>

        <div className="bg-white/80 p-4 rounded-xl shadow-sm border border-blue-100">
          <span className="text-sm font-medium text-blue-500">CIN</span>
          <p className="text-lg font-semibold text-blue-800 mt-1">
            {partner?.CIN || "N/A"}
          </p>
        </div>

        <div className="bg-white/80 p-4 rounded-xl shadow-sm border border-blue-100">
          <span className="text-sm font-medium text-blue-500">PAN Number</span>
          <p className="text-lg font-semibold text-blue-800 mt-1">
            {partner?.PAN_No || "N/A"}
          </p>
        </div>

        <div className="bg-white/80 p-4 rounded-xl shadow-sm border border-blue-100">
          <span className="text-sm font-medium text-blue-500">Phone No</span>
          <p className="text-lg font-semibold text-blue-800 mt-1">
            {partner?.Contact || "N/A"}
          </p>
        </div>

        <div className="bg-white/80 p-4 rounded-xl shadow-sm border border-blue-100">
          <span className="text-sm font-medium text-blue-500">Email ID</span>
          <p className="text-lg font-semibold text-blue-800 mt-1 truncate">
            {partner?.Email || "N/A"}
          </p>
        </div>
      </div>

      {/* Company Documents Section */}
      <div className="mt-4">
        <div className="flex items-center gap-4 mb-4">
          <div className="p-3 rounded-xl bg-blue-100/80 shadow-inner">
            <i className="fas fa-file-alt text-2xl text-blue-600"></i>
          </div>
          <h3 className="text-xl font-bold text-blue-800">Company Documents</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {partner?.ESI && (
            <DocumentItem 
              label="ESI" 
              url={partner.ESI} 
            />
          )}
          {partner?.PF && (
            <DocumentItem 
              label="PF" 
              url={partner.PF} 
            />
          )}
          {partner?.PAN && (
            <DocumentItem 
              label="PAN Card" 
              url={partner.PAN} 
            />
          )}
          {partner?.MOA && (
            <DocumentItem 
              label="MOA" 
              url={partner.MOA} 
            />
          )}
          {partner?.GST && (
            <DocumentItem 
              label="GST Certificate" 
              url={partner.GST} 
            />
          )}
          {partner?.TradeLicense && (
            <DocumentItem 
              label="Trade License" 
              url={partner.TradeLicense} 
            />
          )}
          {partner?.MSMC && (
            <DocumentItem 
              label="MSMC" 
              url={partner.MSMC} 
            />
          )}
        </div>
      </div>
    </div>
  );
}

function DocumentItem({ label, url }: { label: string; url: string }) {
  return (
    <div className="bg-white/80 p-3 rounded-lg shadow-sm border border-blue-100 flex items-center justify-between">
      <span className="font-medium text-blue-700">{label}</span>
      <a
        href={`${import.meta.env.VITE_API_URL}/${url}`}
        target="_blank"
        rel="noopener noreferrer"
        className="text-blue-600 hover:text-blue-800 flex items-center gap-1 text-sm font-medium px-3 py-1 rounded-md bg-blue-50 hover:bg-blue-100 transition-colors"
      >
        View <i className="fas fa-external-link-alt text-xs"></i>
      </a>
    </div>
  );
}

export function SubscriptionPlanContainer() {
  return (
    <div className="w-full bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl shadow-lg p-8 flex flex-col gap-6 border border-blue-200/50 backdrop-blur-sm">
      <div className="flex items-center gap-4 mb-2">
        <div className="p-3 rounded-xl bg-blue-100/80 shadow-inner">
          <i className="fas fa-crown text-2xl text-blue-600"></i>
        </div>
        <h2 className="text-2xl font-bold text-blue-800 tracking-tight">
          Subscription Plan
        </h2>
      </div>
      
      <div className="bg-white/80 p-6 rounded-xl shadow-sm border border-blue-100">
        <div className="text-center py-8">
          <i className="fas fa-gem text-4xl text-blue-400 mb-4"></i>
          <h3 className="text-xl font-bold text-blue-800 mb-2">Premium Plan</h3>
          <p className="text-blue-600 mb-4">Active until December 31, 2023</p>
          <div className="flex justify-center gap-4">
            <button className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors shadow-md">
              Upgrade Plan
            </button>
            <button className="px-6 py-2 bg-white border border-blue-300 hover:bg-blue-50 text-blue-700 font-medium rounded-lg transition-colors shadow-md">
              View Usage
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function PaymentPanel() {
  // Mock payment history data
  const paymentHistory = [
    { id: 1, date: "2023-10-15", amount: "$49.99", status: "Completed" },
    { id: 2, date: "2023-09-15", amount: "$49.99", status: "Completed" },
    { id: 3, date: "2023-08-15", amount: "$49.99", status: "Completed" },
  ];

  return (
    <div className="w-full bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl shadow-lg p-8 flex flex-col gap-6 border border-blue-200/50 backdrop-blur-sm">
      <div className="flex items-center gap-4 mb-2">
        <div className="p-3 rounded-xl bg-blue-100/80 shadow-inner">
          <i className="fas fa-credit-card text-2xl text-blue-600"></i>
        </div>
        <h2 className="text-2xl font-bold text-blue-800 tracking-tight">
          Payment
        </h2>
      </div>

      <div className="bg-white/80 p-6 rounded-xl shadow-sm border border-blue-100">
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-blue-800 mb-4">Payment Method</h3>
          <div className="flex items-center gap-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div className="p-3 bg-white rounded-lg shadow-sm">
              <i className="fab fa-cc-visa text-3xl text-blue-800"></i>
            </div>
            <div>
              <p className="font-medium text-blue-800">Visa ending in 4242</p>
              <p className="text-sm text-blue-600">Expires 04/2025</p>
            </div>
            <button className="ml-auto text-blue-600 hover:text-blue-800 font-medium">
              Change
            </button>
          </div>
        </div>

        <div>
          <h3 className="text-lg font-semibold text-blue-800 mb-4">Payment History</h3>
          <div className="space-y-3">
            {paymentHistory.map((payment) => (
              <div key={payment.id} className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-200">
                <div>
                  <p className="font-medium text-blue-800">{payment.date}</p>
                  <p className="text-sm text-blue-600">{payment.status}</p>
                </div>
                <p className="font-semibold text-blue-800">{payment.amount}</p>
                <button className="text-blue-600 hover:text-blue-800">
                  <i className="fas fa-download"></i>
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function EmployeesPanel() {
  const { userState } = useContext(UserContext)!;
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [allEmployees, setAllEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        setLoading(true);
        const response = await fetch(
          `${import.meta.env.VITE_API_URL}/partner/employees/${
            userState.Company
          }`,
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${localStorage.getItem("authToken")}`,
            },
          }
        );

        if (response.ok) {
          const data = await response.json();
          const transformedData = data.map((emp: any) => ({
            id: emp.id,
            fullname: emp.Name,
            pic: emp.Pic || "",
          }));
          setEmployees(transformedData);
          setAllEmployees(transformedData);
        } else {
          toast.error("Failed to fetch employees");
        }
      } catch (error) {
        console.error("Error fetching employees:", error);
        toast.error("Error fetching employees");
      } finally {
        setLoading(false);
      }
    };

    if (userState.Company) {
      fetchEmployees();
    }
  }, [userState.Company]);

  const search = (e: ChangeEvent) => {
    const param = (e.target as HTMLInputElement).value.toLowerCase();
    const filteredEmployees = allEmployees.filter((employee) => {
      return employee.fullname.toLowerCase().includes(param);
    });
    setEmployees(filteredEmployees);
  };

  if (loading) {
    return (
      <div className="w-full max-w-6xl mx-auto flex flex-col items-center gap-8 py-8">
        <div className="w-full flex justify-between items-center mb-8">
          <h2 className="text-3xl font-bold text-blue-800">All Employees</h2>
          <div className="animate-pulse bg-blue-200 rounded-lg h-10 w-48"></div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 w-full">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="animate-pulse bg-blue-100 rounded-xl h-40"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-6xl mx-auto flex flex-col items-center gap-8 py-8">
      <div className="w-full flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
        <h2 className="text-3xl font-bold text-blue-800">All Employees</h2>
        <div className="relative w-full md:w-64">
          <input
            type="text"
            className="border-2 border-blue-200 w-full h-12 pl-4 pr-10 rounded-lg focus:ring-2 focus:ring-blue-400 outline-none bg-white/90 shadow-sm"
            placeholder="Search employees..."
            onChange={search}
          />
          <img
            src={Search}
            className="w-5 absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer"
            alt="Search"
          />
        </div>
      </div>
      
      {employees.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 w-full">
          {employees.map((employee) => (
            <EmployeeCard key={employee.id} employeeData={employee} />
          ))}
        </div>
      ) : (
        <div className="w-full bg-white/80 p-8 rounded-xl shadow-sm border border-blue-100 text-center">
          <i className="fas fa-users text-4xl text-blue-400 mb-4"></i>
          <h3 className="text-xl font-semibold text-blue-800 mb-2">No Employees Found</h3>
          <p className="text-blue-600">Your search didn't match any employees</p>
        </div>
      )}
    </div>
  );
}

export function SideBar({
  panelType,
  setPanelType,
}: {
  panelType:
    | "account"
    | "company"
    | "plan"
    | "payment"
    | "add-employee"
    | "employees";
  setPanelType: React.Dispatch<
    React.SetStateAction<
      "account" | "company" | "plan" | "payment" | "add-employee" | "employees"
    >
  >;
}) {
  const { userState } = useContext(UserContext)!;
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <>
      {/* Mobile menu button */}
      <button 
        className="md:hidden fixed bottom-6 right-6 z-20 bg-blue-600 text-white p-4 rounded-full shadow-xl"
        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
      >
        <i className={`fas ${mobileMenuOpen ? 'fa-times' : 'fa-bars'} text-xl`}></i>
      </button>

      <nav className={`fixed md:relative bottom-0 left-0 right-0 md:inset-auto h-auto md:h-full w-full md:w-64 bg-gradient-to-b md:bg-gradient-to-r from-blue-800 to-blue-600 shadow-xl p-4 md:p-6 flex flex-row md:flex-col items-stretch gap-2 md:gap-4 rounded-t-2xl md:rounded-r-2xl md:rounded-l-none transition-transform duration-300 ease-in-out ${mobileMenuOpen ? 'translate-y-0' : 'translate-y-full md:translate-y-0'}`}>
        <NavButton
          icon="user-circle"
          label="Account Details"
          active={panelType === "account"}
          onClick={() => {
            setPanelType("account");
            setMobileMenuOpen(false);
          }}
        />

        <NavButton
          icon="building"
          label="Company Details"
          active={panelType === "company"}
          onClick={() => {
            setPanelType("company");
            setMobileMenuOpen(false);
          }}
        />

        <NavButton
          icon="crown"
          label="Subscription Plan"
          active={panelType === "plan"}
          onClick={() => {
            setPanelType("plan");
            setMobileMenuOpen(false);
          }}
        />

        <NavButton
          icon="credit-card"
          label="Payment"
          active={panelType === "payment"}
          onClick={() => {
            setPanelType("payment");
            setMobileMenuOpen(false);
          }}
        />

        {userState.position === "company" && (
          <>
            <NavButton
              icon="user-plus"
              label="Add Employee"
              active={panelType === "add-employee"}
              onClick={() => {
                setPanelType("add-employee");
                setMobileMenuOpen(false);
              }}
            />

            <NavButton
              icon="users"
              label="Employees"
              active={panelType === "employees"}
              onClick={() => {
                setPanelType("employees");
                setMobileMenuOpen(false);
              }}
            />
          </>
        )}
      </nav>
    </>
  );
}

function NavButton({ icon, label, active, onClick }: { icon: string; label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      className={`flex items-center gap-3 px-4 py-3 rounded-xl w-full text-base font-medium transition-all duration-200 ease-linear cursor-pointer focus:outline-none ${
        active
          ? "bg-white text-blue-800 shadow-md"
          : "text-white hover:bg-blue-500/50 hover:shadow-md"
      }`}
      onClick={onClick}
    >
      <i className={`fas fa-${icon} ${active ? 'text-blue-600' : 'text-white'} text-lg w-6 text-center`}></i>
      <span>{label}</span>
    </button>
  );
}