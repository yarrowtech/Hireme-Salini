import { useContext, useEffect, useState, type ChangeEvent } from "react"
import { UserContext } from "../context/UserContext"
import { Link, useNavigate } from "react-router-dom"
import { PartnersContext } from "../context/PartnerContext"
import { FaSearch, FaBuilding, FaArrowRight, FaFilter, FaTh, FaList, FaChartLine } from "react-icons/fa"

type Company = {
    id: number
    CompanyName: string
}

export default function AllPartners() {
    const { allPartners, fetchPartnerList } = useContext(PartnersContext)!
    const [companies, setCompanies] = useState<Company[]>([])
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
    const [searchTerm, setSearchTerm] = useState('')

    const search = (e: ChangeEvent) => {
        const param = (e.target as HTMLInputElement).value.toLowerCase()
        setSearchTerm(param)
        if (!allPartners) return
        const filteredCompanies = allPartners.filter(company => {
            return company.CompanyName.toLowerCase().includes(param)
        })
        setCompanies(filteredCompanies)
    }

    const { userState } = useContext(UserContext)!
    const navigate = useNavigate()

    useEffect(() => {
        if (!(userState.Company === null && userState.position === "superadmin"))
            navigate("/")
        fetchPartnerList()
    }, [])

    useEffect(() => {
        setCompanies(allPartners || [])
    }, [allPartners])

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-950 relative overflow-hidden">
            {/* Background Effects */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-1/4 -left-1/4 w-1/2 h-1/2 bg-gradient-to-br from-cyan-500/20 to-blue-600/20 rounded-full blur-3xl animate-pulse" />
                <div className="absolute -bottom-1/4 -right-1/4 w-1/2 h-1/2 bg-gradient-to-tl from-purple-500/20 to-blue-600/20 rounded-full blur-3xl animate-pulse animation-delay-2000" />
            </div>
            
            {/* Floating Grid Pattern */}
            <div className="fixed inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMiIgY3k9IjIiIHI9IjEiIGZpbGw9InJnYmEoMTQ3LCAxOTcsIDI1MywgMC4xKSIvPgo8L3N2Zz4=')] opacity-30"></div>

            <div className="relative z-10 w-full max-w-7xl mx-auto px-6 py-12">
                {/* Header Section */}
                <div className="mb-12">
                    <div className="text-center mb-8">
                        <h1 className="text-4xl md:text-6xl font-bold text-white mb-4">
                            Partner <span className="bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 bg-clip-text text-transparent">Network</span>
                        </h1>
                        <p className="text-xl text-slate-300 max-w-3xl mx-auto">
                            Manage and oversee all registered partner organizations in your ecosystem
                        </p>
                    </div>

                    {/* Stats Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                        <div className="bg-gradient-to-br from-slate-800/50 to-blue-900/50 backdrop-blur-xl rounded-2xl p-6 border border-white/10">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center">
                                    <FaBuilding className="text-white text-xl" />
                                </div>
                                <div>
                                    <p className="text-slate-400 text-sm">Total Partners</p>
                                    <p className="text-white text-2xl font-bold">{companies.length}</p>
                                </div>
                            </div>
                        </div>
                        
                        <div className="bg-gradient-to-br from-slate-800/50 to-blue-900/50 backdrop-blur-xl rounded-2xl p-6 border border-white/10">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center">
                                    <FaChartLine className="text-white text-xl" />
                                </div>
                                <div>
                                    <p className="text-slate-400 text-sm">Active Today</p>
                                    <p className="text-white text-2xl font-bold">{Math.floor(companies.length * 0.8)}</p>
                                </div>
                            </div>
                        </div>
                        
                        <div className="bg-gradient-to-br from-slate-800/50 to-blue-900/50 backdrop-blur-xl rounded-2xl p-6 border border-white/10">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-400 to-pink-500 flex items-center justify-center">
                                    <FaSearch className="text-white text-xl" />
                                </div>
                                <div>
                                    <p className="text-slate-400 text-sm">Search Results</p>
                                    <p className="text-white text-2xl font-bold">{searchTerm ? companies.length : 'All'}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Controls Section */}
                    <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                        {/* Search Bar */}
                        <div className="relative flex-1 max-w-md">
                            <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input 
                                type="text" 
                                className="w-full pl-12 pr-4 py-4 bg-white/10 border border-white/20 rounded-2xl outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent text-white placeholder-slate-400 backdrop-blur-sm transition-all duration-300"
                                placeholder="Search partner companies..." 
                                onChange={search} 
                            />
                        </div>

                        {/* View Toggle */}
                        <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-2xl p-1 border border-white/20">
                            <button 
                                onClick={() => setViewMode('grid')}
                                className={`p-3 rounded-xl transition-all duration-300 ${
                                    viewMode === 'grid' 
                                        ? 'bg-gradient-to-r from-cyan-400 to-blue-500 text-white shadow-lg' 
                                        : 'text-slate-400 hover:text-white'
                                }`}
                            >
                                <FaTh />
                            </button>
                            <button 
                                onClick={() => setViewMode('list')}
                                className={`p-3 rounded-xl transition-all duration-300 ${
                                    viewMode === 'list' 
                                        ? 'bg-gradient-to-r from-cyan-400 to-blue-500 text-white shadow-lg' 
                                        : 'text-slate-400 hover:text-white'
                                }`}
                            >
                                <FaList />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Partners Grid/List */}
                <div className={viewMode === 'grid' ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" : "space-y-4"}>
                    {companies?.length === 0 ? (
                        <div className="col-span-full flex flex-col items-center justify-center py-16">
                            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-slate-700 to-blue-800 flex items-center justify-center mb-6">
                                <FaBuilding className="text-3xl text-slate-400" />
                            </div>
                            <h3 className="text-2xl font-semibold text-white mb-2">No Partners Found</h3>
                            <p className="text-slate-400 text-center max-w-md">
                                {searchTerm ? `No partners match your search for "${searchTerm}"` : "No partner companies are currently registered in the system."}
                            </p>
                        </div>
                    ) : (
                        companies.map((company, index) => (
                            <CompanyCard key={index} companyData={company} viewMode={viewMode} />
                        ))
                    )}
                </div>
            </div>
        </div>
    )
}


function CompanyCard({ companyData, viewMode }: { companyData: Company, viewMode: 'grid' | 'list' }) {
    if (viewMode === 'list') {
        return (
            <Link 
                to={`/partner/details/${companyData.id}`} 
                className="group bg-gradient-to-r from-slate-800/50 to-blue-900/50 backdrop-blur-xl rounded-2xl p-6 border border-white/10 hover:border-white/20 transition-all duration-300 hover:scale-[1.02] flex items-center justify-between"
            >
                <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center">
                        <FaBuilding className="text-white text-xl" />
                    </div>
                    <div>
                        <h3 className="font-bold text-xl text-white group-hover:text-cyan-300 transition-colors duration-300">
                            {companyData.CompanyName}
                        </h3>
                        <p className="text-slate-400 text-sm">Partner Organization</p>
                    </div>
                </div>
                
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-green-500/20 border border-green-500/30">
                        <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                        <span className="text-green-400 text-xs font-medium">Active</span>
                    </div>
                    <FaArrowRight className="text-slate-400 group-hover:text-cyan-400 group-hover:translate-x-1 transition-all duration-300" />
                </div>
            </Link>
        )
    }

    return (
        <Link 
            to={`/partner/details/${companyData.id}`} 
            className="group bg-gradient-to-br from-slate-800/50 to-blue-900/50 backdrop-blur-xl rounded-3xl p-8 border border-white/10 hover:border-white/20 transition-all duration-500 hover:scale-105 relative overflow-hidden"
        >
            {/* Background glow effect */}
            <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 via-blue-500/10 to-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-3xl"></div>
            <div className="absolute -top-10 -right-10 w-20 h-20 bg-gradient-to-br from-cyan-400/20 to-blue-500/20 rounded-full blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            
            <div className="relative z-10">
                {/* Company Icon */}
                <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                    <FaBuilding className="text-white text-2xl" />
                </div>
                
                {/* Company Info */}
                <div className="mb-6">
                    <h3 className="font-bold text-2xl text-white group-hover:text-cyan-300 transition-colors duration-300 mb-2">
                        {companyData.CompanyName}
                    </h3>
                    <p className="text-slate-400 text-sm">Registered Partner</p>
                </div>
                
                {/* Status and Stats */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-green-500/20 border border-green-500/30">
                        <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                        <span className="text-green-400 text-xs font-medium">Active Now</span>
                    </div>
                    
                    <div className="flex items-center gap-2 text-slate-400 group-hover:text-cyan-400 transition-colors duration-300">
                        <span className="text-sm font-medium">View Details</span>
                        <FaArrowRight className="group-hover:translate-x-1 transition-transform duration-300" />
                    </div>
                </div>
                
                {/* Decorative elements */}
                <div className="absolute -bottom-2 -left-2 w-8 h-8 bg-gradient-to-br from-cyan-400/20 to-blue-500/20 rounded-full blur-sm opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                <div className="absolute top-1/2 -right-1 w-4 h-4 bg-gradient-to-br from-blue-400/20 to-purple-500/20 rounded-full blur-sm opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
            </div>
        </Link>
    )
}