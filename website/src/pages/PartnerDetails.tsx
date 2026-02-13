import { useState, useEffect, useContext } from "react";
import { SideBar, AccountDetailsContainer, SubscriptionPlanContainer, PaymentPanel, EmployeesPanel, CompanyDetailsContainer } from "../components/AccountDetails"
import { useNavigate } from "react-router-dom";
import { UserContext } from "../context/UserContext";
import AddEmployee from "../components/AddEmployee";

export default function PartnerDetails() {
  const [panelType, setPanelType] = useState<
    | "account"
    | "company"
    | "plan"
    | "payment"
    | "add-employee"
    | "employees"
  >("account");
  const { userState } = useContext(UserContext)!;
  const navigate = useNavigate();
  useEffect(() => {
    if (userState.position === "guest" || userState.position === "employee")
      navigate("/");
  }, []);
  return (
    <section className="flex flex-col md:grid md:grid-cols-[18rem_auto] min-h-screen mt-[12vh] bg-gradient-to-br from-blue-50 to-blue-100">
      <SideBar panelType={panelType} setPanelType={setPanelType} />
      <main className="flex flex-col items-center w-full p-4">
        {panelType === "account" && <AccountDetailsContainer />}
        {panelType === "company" && <CompanyDetailsContainer />}
        {panelType === "plan" && <SubscriptionPlanContainer />}
        {panelType === "payment" && <PaymentPanel />}
        {panelType === "add-employee" && <AddEmployee />}
        {panelType === "employees" && <EmployeesPanel />}
      </main>
    </section>
  );
}
