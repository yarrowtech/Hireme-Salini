
import { createContext, useState, type ReactNode } from "react";
import { Outlet } from "react-router-dom";
import { toast } from "react-toastify";

export const RequestsContext = createContext<RequestsContextType | null>(null)

function RequestsContextProvider({ children }: { children: ReactNode }) {
    const [requests, setRequests] = useState<Request[]>([])

    async function fetchRequests() {
        const token = localStorage.getItem("authToken")
        if (!token) {
            return
        }
        const res = await fetch(`${import.meta.env.VITE_API_URL}/request/get-requests`, {
            method: "GET",
            headers: {
                "authorization": `Bearer ${token}`,
            }
        })
        const data = await res.json();
        if (res.ok) {
            setRequests(data);
        } else {
            toast.error(data.message || "Failed to fetch requests");
        }
    }

    async function fetchRequestDetails(id: number) {
        const token = localStorage.getItem("authToken")
        if (!token) {
            return
        }
        const res = await fetch(`${import.meta.env.VITE_API_URL}/request/get-request-details/${id}`, {
            method: "GET",
            headers: {
                "authorization": `Bearer ${token}`,
            }
        })
        const data = await res.json();
        if (res.ok) {
            return data;
        } else {
            toast.error(data.message || "Failed to fetch request details");
            return null;
        }
    }

    return (
        <RequestsContext.Provider value={{ requests, fetchRequests, fetchRequestDetails }}>
            {children}
        </RequestsContext.Provider>
    )
}

type RequestsContextType = {
    requests: Request[],
    fetchRequests: () => Promise<void>
    fetchRequestDetails: (id: number) => Promise<Object | null>
}

export type Request = {
    id: number
    CompanyName: string
    Status: "PENDING" | "APPROVED" | "REJECTED"
}

export default function RequestContextLayout() {
    return (
        <RequestsContextProvider>
            <Outlet />
        </RequestsContextProvider>
    )
}