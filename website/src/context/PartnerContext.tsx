import React from "react"
import { Outlet } from "react-router-dom";
import { toast } from "react-toastify";

export const PartnersContext = React.createContext<null | PartnersContextType>(null)

export function PartnersContextProvider({ children }: { children: React.ReactNode }) {

    const [allPartners, setAllPartners] = React.useState<PartnerData[] | null>(null)

    async function fetchPartnerList() {
        const res = await fetch(`${import.meta.env.VITE_API_URL}/admin/partner-list`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                "authorization": `Bearer ${localStorage.getItem("authToken")}` || "",
            }
        })
        if (res.ok) {
            const data = await res.json();
            setAllPartners(data);
        } else {
            setAllPartners(null);
        }
    }

    async function fetchPartnerDetails(partnerId: number) {
        if (partnerId <= 0) return
        const res = await fetch(`${import.meta.env.VITE_API_URL}/partner/details/${partnerId}`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
            }
        })
        if (res.ok) {
            const data = await res.json();
            return data;
        } else {
            toast.error("Failed to fetch partner details");
        }
    }

    return (
        <PartnersContext.Provider value={{allPartners, fetchPartnerList, fetchPartnerDetails}}>
            {children}
        </PartnersContext.Provider>
    )
}

type PartnersContextType = {
    allPartners: PartnerData[] | null
    fetchPartnerList: () => Promise<void>
    fetchPartnerDetails: (partnerId: number) => Promise<PartnerDetails | null>
}

type PartnerData = {
    id: number,
    CompanyName: string,
}
export type PartnerDetails = {
    id: string,
    CompanyName: string,
    Contact: string,
    Email: string,
    Address: string,
    ESI: string,
    PF: string,
    PAN: string,
    PAN_No: string,
    MOA: string,
    CIN: string,
    GST: string,
    TradeLicense: string,
    MSMC: string,
    CreatedAt: string
}

export default function PartnerContextLayout() {
    return (
        <PartnersContextProvider>
            <Outlet />
        </PartnersContextProvider>
    )
} 