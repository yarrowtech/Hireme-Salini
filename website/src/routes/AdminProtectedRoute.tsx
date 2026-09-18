import { useEffect, useState } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { getAdminMe } from "../api/admin.api.js";

export default function AdminProtectedRoute() {
  const location = useLocation();
  const [status, setStatus] = useState<"loading" | "allowed" | "denied">("loading");

  useEffect(() => {
    const run = async () => {
      const token = localStorage.getItem("authToken");
      if (!token) {
        setStatus("denied");
        return;
      }

      try {
        await getAdminMe();
        setStatus("allowed");
      } catch {
        // token invalid/expired
        localStorage.removeItem("authToken");
        localStorage.removeItem("adminRefreshToken");
        setStatus("denied");
      }
    };

    run();
  }, []);

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white text-slate-900">
        <div className="flex items-center gap-3">
          <span className="h-5 w-5 rounded-full border-b-2 border-white animate-spin" />
          Checking admin session...
        </div>
      </div>
    );
  }

  if (status === "denied") {
    return <Navigate to="/admin/login" replace state={{ from: location }} />;
  }

  return <Outlet />;
}
