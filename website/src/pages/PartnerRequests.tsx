import RightArrow from "../assets/right-arrow-white.svg"
import Search from "../assets/search.svg"
import { useContext, useEffect, useState, type ChangeEvent } from "react"
import { UserContext } from "../context/UserContext"
import { useNavigate } from "react-router-dom"
import { Link } from "react-router-dom"
import { RequestsContext } from "../context/RequestsContext"
import type { Request } from "../context/RequestsContext"


export default function PartnerRequests() {
    const { requests, fetchRequests } = useContext(RequestsContext)!
    const [partners, setPartners] = useState<Request[]>(requests)
    const [filteredPartners, setFilteredPartners] = useState<Request[]>([]);
    const [statusFilter, setStatusFilter] = useState<string>("ALL");
    const [isLoading, setIsLoading] = useState(true);

    const search = (e: ChangeEvent) => {
        const searchParam = (e.target as HTMLInputElement).value.toLowerCase()
        const filteredPartners = requests.filter(partner => {
            return partner.CompanyName.toLowerCase().includes(searchParam)
        })
        setPartners(filteredPartners)
    }

    const { userState } = useContext(UserContext)!

    const navigate = useNavigate()

    useEffect(() => {
        setPartners(requests)
        if (requests)
            setIsLoading(false)
    }, [requests])

    useEffect(() => {
        if (userState.position !== "superadmin")
            navigate("/")

        fetchRequests()

    }, [])

    // Filter partners whenever the filter or partners list changes
    useEffect(() => {
        if (statusFilter === "ALL") {
            setFilteredPartners(partners);
        } else {
            setFilteredPartners(
                partners.filter(partner => partner.Status === statusFilter)
            );
        }
    }, [statusFilter, partners]);

    const handleFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setStatusFilter(e.target.value);
    };

    return (
        <section className="w-full min-h-[55vh] max-w-6xl my-[15vh] mx-auto flex flex-col items-center gap-8">
            <div className="flex items-center justify-between w-full mb-10">
                <h2 className="font-extrabold text-blue-900 text-4xl">All Partner Requests</h2>
                <div className="w-[20%] relative">
                    <input type="text" className="border-2 border-blue-200 w-full h-[5vh] pl-2 rounded-lg focus:ring-2 focus:ring-blue-400 outline-none" placeholder="Search....." onChange={search} />
                    <img src={Search} className="w-5 absolute right-2 top-1/2 -translate-y-1/2 cursor-pointer" />
                </div>
            </div>
            <div className="w-full flex justify-between items-center">
                <h1 className="text-3xl font-bold text-blue-900">Partner Requests</h1>
                <div className="flex items-center gap-2">
                    <label htmlFor="statusFilter" className="font-medium text-blue-800">
                        Filter by Status:
                    </label>
                    <select
                        id="statusFilter"
                        value={statusFilter}
                        onChange={handleFilterChange}
                        className="p-2 border-2 border-blue-200 rounded outline-none focus:ring-2 focus:ring-blue-400 bg-white"
                    >
                        <option value="ALL">All Requests</option>
                        <option value="PENDING">Pending</option>
                        <option value="APPROVED">Approved</option>
                        <option value="REJECTED">Rejected</option>
                    </select>
                </div>
            </div>
            
            {isLoading ? (
                <div className="text-center py-10">
                    <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-500 rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-blue-800 font-medium">Loading requests...</p>
                </div>
            ) : filteredPartners.length === 0 ? (
                <div className="w-full text-center py-10 bg-white/90 rounded-xl shadow-md">
                    <p className="text-lg text-blue-800">
                        {statusFilter === "ALL" 
                            ? "No partner requests found." 
                            : `No ${statusFilter.toLowerCase()} requests found.`}
                    </p>
                </div>
            ) : (
                <div className="w-full flex flex-wrap justify-around gap-6">
                    {filteredPartners.map((partner, index) => (
                        <PartnerCard key={index} partnerData={partner} />
                    ))}
                </div>
            )}
        </section>
    );
}


function PartnerCard({ partnerData }: { partnerData: Request }) {
    return (
        <div className="w-[48%] rounded-2xl flex flex-col p-6 gap-2 bg-white/90 border border-blue-100 shadow-xl cursor-pointer transition-all duration-300 ease-linear hover:scale-105 hover:shadow-2xl">
            <h2 className="font-bold text-3xl col-span-full text-blue-900">{partnerData.CompanyName}</h2>
            
            {/* Status Badge */}
            <div className="flex items-center gap-2 mb-2">
                <span className="font-semibold text-blue-800">Status:</span>
                <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                    partnerData.Status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                    partnerData.Status === 'APPROVED' ? 'bg-green-100 text-green-800' :
                    'bg-red-100 text-red-800'
                }`}>
                    {partnerData.Status}
                </span>
            </div>
            
            <Link to={`./${partnerData.id}`} className="w-[40%] self-end px-5 py-3 font-semibold cursor-pointer flex items-center justify-center bg-gradient-to-r from-blue-500 to-blue-400 text-white rounded-xl transition-all duration-300 ease-linear shadow hover:bg-blue-600 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue-400">
                View Details<img className="fil" src={RightArrow} />
            </Link>
        </div>
    )
}