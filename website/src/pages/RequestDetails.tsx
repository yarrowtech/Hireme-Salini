import { useContext, useEffect, useState } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { RequestsContext } from "../context/RequestsContext"
import LeftArrow from "../assets/left-arrow-white.svg"
import ApproveIcon from "../assets/approve.svg"
import RejectIcon from "../assets/reject.svg"
import { toast } from "react-toastify"

type RequestDetails = {
    id: number;
    CompanyName: string;
    Contact: string;
    Email: string;
    Address: string;
    CIN: string;
    PAN_No: string;
    Status: "PENDING" | "APPROVED" | "REJECTED";
    ESI?: string;
    PF?: string;
    PAN?: string;
    MOA?: string;
    GST?: string;
    TradeLicense?: string;
    MSMC?: string;
}

export default function RequestDetails() {
    const { id } = useParams()
    const { fetchRequestDetails } = useContext(RequestsContext)!
    const [requestDetails, setRequestDetails] = useState<RequestDetails | null>(null)
    const navigate = useNavigate()

    useEffect(() => {
        const fetchDetails = async () => {
            if (id) {
                const details = await fetchRequestDetails(parseInt(id))
                setRequestDetails(details as RequestDetails)
            }
        }
        fetchDetails()
    }, [])

    if (!requestDetails) {
        return (
            <section className="mt-[15vh] flex flex-col items-center justify-center min-h-[40vh]">
                <h2 className="text-2xl font-bold text-blue-900 mb-4">Request Not Found</h2>
                <button
                    className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-400 text-white rounded-lg shadow hover:bg-blue-600 hover:scale-105 transition-all"
                    onClick={() => navigate(-1)}
                >
                    <img src={LeftArrow} className="w-5" alt="Back" />
                    Back
                </button>
            </section>
        )
    }

    const handleApprove = async () => {
        try {
            const token = localStorage.getItem("authToken");
            const metadata = localStorage.getItem("metadata");
            
            const res = await fetch(`${import.meta.env.VITE_API_URL}/request/approve-request/${requestDetails.id}`, {
                method: "PUT",
                headers: {
                    "Authorization": `Bearer ${token}`,
                    "metadata": metadata || "",
                    "Content-Type": "application/json"
                }
            });
            
            const data = await res.json();
            
            if (res.ok) {
                toast.success(data.message || "Request approved successfully!");
                setRequestDetails(prev => prev ? { ...prev, Status: "APPROVED" } : null);
            } else {
                toast.error(data.message || "Failed to approve request");
            }
        } catch (error) {
            console.error("Error approving request:", error);
            alert("An error occurred while approving the request");
        }
    };

    const handleReject = async () => {
        try {
            const token = localStorage.getItem("authToken");
            const metadata = localStorage.getItem("metadata");
            
            const res = await fetch(`${import.meta.env.VITE_API_URL}/request/reject-request/${requestDetails.id}`, {
                method: "PUT",
                headers: {
                    "Authorization": `Bearer ${token}`,
                    "metadata": metadata || "",
                    "Content-Type": "application/json"
                }
            });
            
            const data = await res.json();
            
            if (res.ok) {
                alert("Request rejected successfully!");
                setRequestDetails(prev => prev ? { ...prev, Status: "REJECTED" } : null);
            } else {
                alert(data.message || "Failed to reject request");
            }
        } catch (error) {
            console.error("Error rejecting request:", error);
            alert("An error occurred while rejecting the request");
        }
    };

    return (
        <section className="w-full max-w-2xl my-[15vh] mx-auto flex flex-col items-center gap-8">
            <div className="w-full flex items-center mb-8">
                <button
                    className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-400 text-white rounded-lg shadow hover:bg-blue-600 hover:scale-105 transition-all cursor-pointer"
                    onClick={() => navigate(-1)}
                >
                    <img src={LeftArrow} className="w-5" alt="Back" />
                    Back
                </button>
                <h2 className="flex-1 text-center font-extrabold text-blue-900 text-4xl">Request Details</h2>
            </div>
            <div className="w-full rounded-2xl bg-white/90 border border-blue-100 shadow-xl p-8 flex flex-col gap-4">
                <div className="flex flex-col md:flex-row md:items-center gap-4">
                    <span className="font-bold text-blue-900 text-2xl md:w-1/3">Company Name:</span>
                    <span className="text-lg text-blue-800">{requestDetails.CompanyName}</span>
                </div>
                <div className="flex flex-col md:flex-row md:items-center gap-4">
                    <span className="font-bold text-blue-900 text-2xl md:w-1/3">Mobile No:</span>
                    <span className="text-lg text-blue-800">{requestDetails.Contact}</span>
                </div>
                <div className="flex flex-col md:flex-row md:items-center gap-4">
                    <span className="font-bold text-blue-900 text-2xl md:w-1/3">Email ID:</span>
                    <span className="text-lg text-blue-800">{requestDetails.Email}</span>
                </div>
                <div className="flex flex-col md:flex-row md:items-center gap-4">
                    <span className="font-bold text-blue-900 text-2xl md:w-1/3">Address:</span>
                    <span className="text-lg text-blue-800">{requestDetails.Address}</span>
                </div>
                <div className="flex flex-col md:flex-row md:items-center gap-4">
                    <span className="font-bold text-blue-900 text-2xl md:w-1/3">CIN:</span>
                    <span className="text-lg text-blue-800">{requestDetails.CIN}</span>
                </div>
                <div className="flex flex-col md:flex-row md:items-center gap-4">
                    <span className="font-bold text-blue-900 text-2xl md:w-1/3">PAN Number:</span>
                    <span className="text-lg text-blue-800">{requestDetails.PAN_No}</span>
                </div>
                <div className="flex flex-col md:flex-row md:items-center gap-4">
                    <span className="font-bold text-blue-900 text-2xl md:w-1/3">Status:</span>
                    <span className={`text-lg font-semibold ${
                        requestDetails.Status === 'PENDING' ? 'text-yellow-600' :
                        requestDetails.Status === 'APPROVED' ? 'text-green-600' :
                        'text-red-600'
                    }`}>
                        {requestDetails.Status}
                    </span>
                </div>

                {/* Document Links Section - Now inside the main container */}
                <div className="mt-6 pt-6 border-t border-blue-200">
                    <h3 className="font-bold text-blue-900 text-2xl mb-4">Uploaded Documents:</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {requestDetails.ESI && (
                            <div className="flex items-center gap-2">
                                <span className="font-semibold text-blue-800">ESI:</span>
                                <a 
                                    href={`${import.meta.env.VITE_API_URL}/${requestDetails.ESI}`} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="text-blue-600 hover:text-blue-800 underline"
                                >
                                    View Document
                                </a>
                            </div>
                        )}
                        {requestDetails.PF && (
                            <div className="flex items-center gap-2">
                                <span className="font-semibold text-blue-800">PF:</span>
                                <a 
                                    href={`${import.meta.env.VITE_API_URL}/${requestDetails.PF}`} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="text-blue-600 hover:text-blue-800 underline"
                                >
                                    View Document
                                </a>
                            </div>
                        )}
                        {requestDetails.PAN && (
                            <div className="flex items-center gap-2">
                                <span className="font-semibold text-blue-800">PAN Card:</span>
                                <a 
                                    href={`${import.meta.env.VITE_API_URL}/${requestDetails.PAN}`} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="text-blue-600 hover:text-blue-800 underline"
                                >
                                    View Document
                                </a>
                            </div>
                        )}
                        {requestDetails.MOA && (
                            <div className="flex items-center gap-2">
                                <span className="font-semibold text-blue-800">MOA:</span>
                                <a 
                                    href={`${import.meta.env.VITE_API_URL}/${requestDetails.MOA}`} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="text-blue-600 hover:text-blue-800 underline"
                                >
                                    View Document
                                </a>
                            </div>
                        )}
                        {requestDetails.GST && (
                            <div className="flex items-center gap-2">
                                <span className="font-semibold text-blue-800">GST Certificate:</span>
                                <a 
                                    href={`${import.meta.env.VITE_API_URL}/${requestDetails.GST}`} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="text-blue-600 hover:text-blue-800 underline"
                                >
                                    View Document
                                </a>
                            </div>
                        )}
                        {requestDetails.TradeLicense && (
                            <div className="flex items-center gap-2">
                                <span className="font-semibold text-blue-800">Trade License:</span>
                                <a 
                                    href={`${import.meta.env.VITE_API_URL}/${requestDetails.TradeLicense}`} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="text-blue-600 hover:text-blue-800 underline"
                                >
                                    View Document
                                </a>
                            </div>
                        )}
                        {requestDetails.MSMC && (
                            <div className="flex items-center gap-2">
                                <span className="font-semibold text-blue-800">MSMC:</span>
                                <a 
                                    href={`${import.meta.env.VITE_API_URL}/${requestDetails.MSMC}`} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="text-blue-600 hover:text-blue-800 underline"
                                >
                                    View Document
                                </a>
                            </div>
                        )}
                    </div>
                </div>
            </div>
            {requestDetails.Status === 'PENDING' && (
                <div className="flex gap-8 mt-6">
                    <button
                        onClick={handleApprove}
                        className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-green-500 to-green-400 text-white rounded-xl shadow font-bold text-lg hover:bg-green-600 hover:scale-105 transition-all focus:outline-none focus:ring-2 focus:ring-green-400"
                    >
                        <img src={ApproveIcon} className="w-6" alt="Approve" />
                        Approve
                    </button>
                    <button
                        onClick={handleReject}
                        className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-red-500 to-red-400 text-white rounded-xl shadow font-bold text-lg hover:bg-red-600 hover:scale-105 transition-all focus:outline-none focus:ring-2 focus:ring-red-400"
                    >
                        <img src={RejectIcon} className="w-6" alt="Reject" />
                        Reject
                    </button>
                </div>
            )}
        </section>
    )
}