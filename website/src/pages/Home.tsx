import { Link } from "react-router-dom";
import { FaLinkedin, FaInstagram, FaFacebook, FaCheckCircle, FaPhoneAlt, FaEnvelope, FaMapMarkerAlt, FaArrowRight, FaRocket, FaUsers, FaShieldAlt, FaChartLine, FaCog, FaStar } from "react-icons/fa";
import Navbar from "../components/Navbar";
import { useEffect, useState } from "react";

export default function Home() {
    // Navbar visibility state
    const [showNavbar, setShowNavbar] = useState(false);

    useEffect(() => {
        const handleScroll = () => {
            if (window.scrollY > 100) {
                setShowNavbar(true);
            } else {
                setShowNavbar(false);
            }
        };
        window.addEventListener("scroll", handleScroll);
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    const scrollToPlans = (event: React.MouseEvent<HTMLAnchorElement>) => {
        event.preventDefault();
        const plansSection = document.getElementById('plans');
        plansSection?.scrollIntoView({ behavior: 'smooth' });
    };

    // Remove the MinimalBar definition and its usage in the JSX.
    // Only render the Navbar after scroll as before.

    return (
        <section className="relative flex flex-col items-center w-full min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-950 overflow-x-hidden">
            {/* MinimalBar always visible at top until scroll, then replaced by Navbar */}
            {/* Full Navbar appears after scroll */}
            <div className={`fixed top-0 left-0 w-full z-50 transition-all duration-500 ${showNavbar ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
                <Navbar forceHidden={false} />
            </div>
            {/* Advanced Background Effects */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-1/4 -left-1/4 w-1/2 h-1/2 bg-gradient-to-br from-blue-500/20 to-purple-600/20 rounded-full blur-3xl animate-pulse" />
                <div className="absolute -bottom-1/4 -right-1/4 w-1/2 h-1/2 bg-gradient-to-tl from-cyan-400/20 to-blue-600/20 rounded-full blur-3xl animate-pulse animation-delay-2000" />
                <div className="absolute top-1/3 left-1/3 w-64 h-64 bg-gradient-to-br from-indigo-400/10 to-purple-500/10 rounded-full blur-2xl animate-float" />
                <div className="absolute bottom-1/4 left-1/4 w-32 h-32 bg-gradient-to-br from-cyan-300/20 to-blue-400/20 rounded-full blur-xl animate-float-delayed" />
            </div>
            
            {/* Floating Grid Pattern */}
            <div className="fixed inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMiIgY3k9IjIiIHI9IjEiIGZpbGw9InJnYmEoMTQ3LCAxOTcsIDI1MywgMC4xKSIvPgo8L3N2Zz4=')] opacity-30"></div>
            {/* Hero Section */}
            <div className="relative w-full min-h-screen flex items-center justify-center overflow-hidden">
                {/* Content container */}
                <div className="relative z-10 w-full px-4 sm:px-6 lg:px-8 py-12">
                    <div className="mx-auto max-w-7xl">
                        <div className="text-center space-y-12">
                            {/* Main Headline with advanced styling */}
                            <div className="space-y-8">
                                <div className="relative">
                                    <h1 className="text-5xl sm:text-6xl md:text-7xl xl:text-8xl font-black tracking-tight leading-none">
                                        <span className="block bg-gradient-to-r from-white via-blue-100 to-cyan-200 bg-clip-text text-transparent drop-shadow-2xl">
                                            The Future of
                                        </span>
                                        <span className="block bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-500 bg-clip-text text-transparent animate-gradient-x">
                                            Employee Management
                                        </span>
                                    </h1>
                                    {/* Glowing text effect */}
                                    <div className="absolute inset-0 bg-gradient-to-r from-cyan-400/20 via-blue-400/20 to-purple-500/20 blur-3xl -z-10 animate-pulse"></div>
                                </div>
                                
                                <div className="relative max-w-4xl mx-auto">
                                    <p className="text-xl md:text-2xl font-medium text-slate-300 leading-relaxed">
                                        Revolutionary AI-powered platform that transforms workforce management through 
                                        <span className="text-transparent bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text font-semibold"> intelligent automation</span>, 
                                        <span className="text-transparent bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text font-semibold"> seamless integration</span>, 
                                        and <span className="text-transparent bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text font-semibold">predictive analytics</span>.
                                    </p>
                                </div>
                            </div>

                            {/* Advanced CTA Buttons */}
                            <div className="flex flex-col sm:flex-row gap-6 justify-center items-center">
                                <Link 
                                    to="/be-a-partner" 
                                    className="group relative overflow-hidden px-10 py-5 rounded-2xl font-bold text-lg shadow-2xl transition-all duration-500 hover:scale-105 focus:outline-none focus:ring-4 focus:ring-cyan-400/50 min-w-[240px] bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-600 hover:from-cyan-400 hover:via-blue-400 hover:to-purple-500"
                                >
                                    <span className="relative z-10 flex items-center justify-center gap-3 text-white">
                                        <FaRocket className="text-xl transition-transform group-hover:rotate-12 group-hover:scale-110" />
                                        Launch Your Journey
                                        <FaArrowRight className="transition-transform group-hover:translate-x-2" />
                                    </span>
                                    <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-white/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                                    <div className="absolute -inset-1 bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600 rounded-2xl blur opacity-75 group-hover:opacity-100 transition duration-1000 group-hover:duration-200 animate-tilt"></div>
                                </Link>
                                
                                <a 
                                    href="#plans"
                                    onClick={scrollToPlans}
                                    className="group relative overflow-hidden px-10 py-5 rounded-2xl font-bold text-lg transition-all duration-500 hover:scale-105 focus:outline-none focus:ring-4 focus:ring-white/30 min-w-[240px] bg-white/10 backdrop-blur-md border border-white/20 hover:bg-white/20 text-white hover:text-white"
                                >
                                    <span className="flex items-center justify-center gap-3">
                                        <FaChartLine className="text-xl transition-transform group-hover:scale-110" />
                                        Explore Solutions
                                        <FaArrowRight className="transition-transform group-hover:translate-x-2" />
                                    </span>
                                </a>
                            </div>

                            {/* Feature Pills */}
                            <div className="flex flex-wrap justify-center gap-4 mt-12">
                                {[
                                    { icon: FaShieldAlt, text: "Enterprise Security" },
                                    { icon: FaUsers, text: "Unlimited Scale" },
                                    { icon: FaCog, text: "AI Automation" },
                                    { icon: FaStar, text: "5-Star Support" }
                                ].map((feature, index) => (
                                    <div key={index} className="flex items-center gap-2 px-6 py-3 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white/90 hover:bg-white/20 transition-all duration-300 hover:scale-105">
                                        <feature.icon className="text-cyan-400" />
                                        <span className="font-medium">{feature.text}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Advanced scrolling indicator */}
                <div className="absolute bottom-8 left-1/2 -translate-x-1/2 hidden md:block">
                    <div className="flex flex-col items-center gap-2 animate-bounce">
                        <div className="text-white/70 text-sm font-medium">Scroll to explore</div>
                        <div className="w-8 h-14 rounded-3xl border-2 border-white/30 flex justify-center p-1 bg-white/5 backdrop-blur-sm">
                            <div className="w-2 h-2 rounded-full bg-gradient-to-r from-cyan-400 to-blue-400 animate-pulse" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Welcome Section - Redesigned */}
            <div className="w-full flex justify-center px-4 sm:px-6 my-24">
                <div className="w-full max-w-6xl bg-gradient-to-br from-slate-800/50 via-blue-900/50 to-indigo-900/50 backdrop-blur-xl rounded-3xl p-12 border border-white/10 relative overflow-hidden group hover:border-white/20 transition-all duration-700">
                    {/* Animated border gradient */}
                    <div className="absolute inset-0 rounded-3xl bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-500 p-[2px] opacity-50 group-hover:opacity-75 transition-opacity duration-500">
                        <div className="w-full h-full bg-gradient-to-br from-slate-800/90 via-blue-900/90 to-indigo-900/90 rounded-3xl"></div>
                    </div>
                    
                    <div className="relative z-10 text-center space-y-8">
                        <div className="space-y-4">
                            <h2 className="text-3xl md:text-5xl font-bold text-white">
                                Welcome to the <span className="bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 bg-clip-text text-transparent">Next Generation</span>
                            </h2>
                            <p className="text-xl md:text-2xl font-medium text-slate-300 max-w-3xl mx-auto">
                                Where innovation meets workforce excellence through cutting-edge technology
                            </p>
                        </div>
                        
                        <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
                            <div className="text-left space-y-4 p-6 bg-white/5 rounded-2xl border border-white/10 backdrop-blur-sm hover:bg-white/10 transition-all duration-300">
                                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center mb-4">
                                    <FaRocket className="text-2xl text-white" />
                                </div>
                                <p className="text-slate-300 text-lg leading-relaxed">
                                    Transform traditional HR operations into intelligent, automated workflows that scale with your business growth and adapt to changing workforce dynamics.
                                </p>
                            </div>
                            
                            <div className="text-left space-y-4 p-6 bg-white/5 rounded-2xl border border-white/10 backdrop-blur-sm hover:bg-white/10 transition-all duration-300">
                                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center mb-4">
                                    <FaUsers className="text-2xl text-white" />
                                </div>
                                <p className="text-slate-300 text-lg leading-relaxed">
                                    Empower your workforce with transparent processes, real-time insights, and tools designed to foster career growth and organizational success.
                                </p>
                            </div>
                        </div>
                        
                        {/* Floating particles effect */}
                        <div className="absolute -z-10 w-full h-full top-0 left-0">
                            <div className="absolute top-1/4 left-1/4 w-2 h-2 bg-cyan-400/60 rounded-full animate-float"></div>
                            <div className="absolute top-3/4 right-1/4 w-3 h-3 bg-blue-400/40 rounded-full animate-float-delayed"></div>
                            <div className="absolute bottom-1/3 left-1/3 w-1 h-1 bg-purple-400/80 rounded-full animate-pulse"></div>
                        </div>
                    </div>
                </div>
            </div>

            {/* About Us Section - Redesigned */}
            <div id="about" className="w-full max-w-7xl mx-auto my-24 px-4 sm:px-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                    <div className="relative group">
                        <div className="absolute -inset-4 bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-500 rounded-3xl blur-xl opacity-20 group-hover:opacity-30 transition-opacity duration-700"></div>
                        <div className="relative overflow-hidden rounded-3xl shadow-2xl bg-gradient-to-br from-slate-800 to-blue-900">
                            <img 
                                src="/about.png" 
                                alt="About Hire Me" 
                                className="w-full h-[400px] object-cover transition-transform duration-700 hover:scale-110" 
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-blue-900/30 to-transparent" />
                            <div className="absolute bottom-6 left-6 right-6">
                                <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/20">
                                    <p className="text-white font-semibold text-lg">Transforming HR Since 2024</p>
                                    <p className="text-slate-300 text-sm">Leading innovation in workforce management</p>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div className="space-y-8">
                        <div className="space-y-4">
                            <h2 className="text-4xl md:text-5xl font-bold text-white leading-tight">
                                About <span className="bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 bg-clip-text text-transparent">Our Mission</span>
                            </h2>
                            <p className="text-xl text-slate-300 leading-relaxed">
                                Pioneering the future of workforce management through AI-driven solutions and human-centered design.
                            </p>
                        </div>
                        
                        <div className="space-y-6">
                            <p className="text-slate-300 text-lg leading-relaxed">
                                We're building the next generation of HR technology that seamlessly connects organizations with their most valuable asset - their people. Through intelligent automation and predictive analytics, we're making workforce management more efficient, transparent, and empowering.
                            </p>
                            
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {[
                                    { icon: FaRocket, text: "Innovation-First Approach", desc: "Cutting-edge technology solutions" },
                                    { icon: FaUsers, text: "Human-Centered Design", desc: "Built for real-world workflows" },
                                    { icon: FaShieldAlt, text: "Enterprise Security", desc: "Bank-grade data protection" },
                                    { icon: FaChartLine, text: "Data-Driven Insights", desc: "Actionable workforce analytics" }
                                ].map((item, index) => (
                                    <div key={index} className="p-4 bg-white/5 rounded-2xl border border-white/10 backdrop-blur-sm hover:bg-white/10 transition-all duration-300 group">
                                        <div className="flex items-start gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform duration-300">
                                                <item.icon className="text-white text-sm" />
                                            </div>
                                            <div>
                                                <h4 className="font-semibold text-white text-sm">{item.text}</h4>
                                                <p className="text-slate-400 text-xs mt-1">{item.desc}</p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Section Divider */}
            <div className="w-full h-px bg-gradient-to-r from-transparent via-blue-300 to-transparent my-12" />

            {/* Vision Section */}
            <div id="vision" className="w-[95vw] max-w-6xl mx-auto my-16 p-8 sm:p-10 flex flex-col items-center gap-10 bg-white/95 rounded-3xl shadow-xl border border-blue-100 transition-all hover:shadow-2xl hover:scale-[1.005] duration-300">
                <div className="text-center max-w-2xl">
                    <h2 className="text-3xl font-extrabold text-blue-900 mb-4 tracking-tight">
                        Our <span className="bg-gradient-to-r from-blue-500 to-blue-600 bg-clip-text text-transparent">Vision</span>
                    </h2>
                    <p className="text-blue-900/90 text-lg font-medium">
                        We envision a future where HR management is seamless, transparent, and empowering for all stakeholders involved in the employment ecosystem.
                    </p>
                </div>
                <div className="w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <VisionCard 
                        icon={<FaCheckCircle className="text-blue-500 text-3xl" />} 
                        title="Centralized Workforce Management" 
                        desc="A single intuitive dashboard to oversee your entire workforce with real-time data and analytics." 
                    />
                    <VisionCard 
                        icon={<FaCheckCircle className="text-blue-500 text-3xl" />} 
                        title="Scalable HR Infrastructure" 
                        desc="Modular solutions that grow with your company, from startup to enterprise scale." 
                    />
                    <VisionCard 
                        icon={<FaCheckCircle className="text-blue-500 text-3xl" />} 
                        title="Transparent Operations" 
                        desc="Clear visibility into HR processes for both administrators and employees." 
                    />
                    <VisionCard 
                        icon={<FaCheckCircle className="text-blue-500 text-3xl" />} 
                        title="Employment Continuity" 
                        desc="Tools to help workers maintain stable employment relationships." 
                    />
                    <VisionCard 
                        icon={<FaCheckCircle className="text-blue-500 text-3xl" />} 
                        title="Digital Transformation" 
                        desc="Modern digital workflows replacing outdated paper-based processes." 
                    />
                    <VisionCard 
                        icon={<FaCheckCircle className="text-blue-500 text-3xl" />} 
                        title="Subscription Flexibility" 
                        desc="Cost-effective plans with transparent pricing and no hidden fees." 
                    />
                </div>
            </div>

            {/* Section Divider */}
            <div className="w-full h-px bg-gradient-to-r from-transparent via-blue-300 to-transparent my-12" />

            {/* Services Section */}
            <div id="services" className="w-[95vw] max-w-6xl mx-auto my-16 bg-white/95 rounded-3xl p-8 sm:p-10 shadow-xl flex flex-col items-center gap-6 border border-blue-100 transition-all hover:shadow-2xl hover:scale-[1.005] duration-300">
                <div className="text-center max-w-2xl">
                    <h2 className="text-3xl font-extrabold text-blue-900 mb-4 tracking-tight">
                        Our <span className="bg-gradient-to-r from-blue-500 to-blue-600 bg-clip-text text-transparent">Services</span>
                    </h2>
                    <p className="text-blue-900/90 text-lg font-medium">
                        Comprehensive HR solutions designed to meet the diverse needs of modern organizations and their workforce.
                    </p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
                    <ServiceCard 
                        title="Partnership Management" 
                        description="Companies can apply and get verified as official Hire Me partners through our rigorous approval process, ensuring system integrity and quality standards." 
                    />
                    <ServiceCard 
                        title="Subscription Access" 
                        description="Flexible subscription plans with transparent pricing to unlock full platform functionality based on your organization's needs." 
                    />
                    <ServiceCard 
                        title="HR Dashboard" 
                        description="Comprehensive employee management with real-time tracking, advanced search, document uploads, and status monitoring." 
                    />
                    <ServiceCard 
                        title="Admin Control Panel" 
                        description="Centralized oversight for reviewing applications, monitoring platform usage, and tracking key workforce metrics." 
                    />
                    <ServiceCard 
                        title="Employment Records" 
                        description="Secure, centralized storage for all employee data including work history, performance metrics, and company associations." 
                    />
                    <ServiceCard 
                        title="Analytics & Reporting" 
                        description="Powerful insights into workforce trends, productivity metrics, and HR operational efficiency." 
                    />
                </div>
            </div>

            {/* Plans Section */}
            <div id="plans" className="w-[95vw] max-w-6xl mx-auto my-16 bg-white/95 rounded-3xl p-8 sm:p-10 shadow-xl flex flex-col items-center gap-8 border border-blue-100 transition-all hover:shadow-2xl hover:scale-[1.005] duration-300">
                <div className="text-center max-w-2xl">
                    <h2 className="text-3xl font-extrabold text-blue-900 mb-4 tracking-tight">
                        Choose Your <span className="bg-gradient-to-r from-blue-500 to-blue-600 bg-clip-text text-transparent">Plan</span>
                    </h2>
                    <p className="text-blue-900/90 text-lg font-medium">
                        Flexible pricing options designed to meet the needs of organizations of all sizes.
                    </p>
                </div>
                <div className="w-full overflow-hidden rounded-xl shadow-lg border border-blue-200">
                    <table className="min-w-full divide-y divide-blue-200">
                        <thead className="bg-gradient-to-r from-blue-50 to-blue-100">
                            <tr>
                                <th className="px-6 py-4 text-left text-lg font-bold text-blue-800 uppercase tracking-wider">Plan</th>
                                <th className="px-6 py-4 text-left text-lg font-bold text-blue-800 uppercase tracking-wider">Features</th>
                                <th className="px-6 py-4 text-left text-lg font-bold text-blue-800 uppercase tracking-wider">Ideal For</th>
                                <th className="px-6 py-4 text-left text-lg font-bold text-blue-800 uppercase tracking-wider">Price</th>
                                <th className="px-6 py-4 text-left text-lg font-bold text-blue-800 uppercase tracking-wider">Action</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-blue-200">
                            <PlanRow 
                                plan="Starter" 
                                features={["Up to 25 employees", "1 HR login", "Basic reports", "Email support"]} 
                                ideal="Small teams & startups" 
                                price="₹999/month" 
                            />
                            <PlanRow 
                                plan="Professional" 
                                features={["Up to 100 employees", "3 HR logins", "Advanced analytics", "Priority support"]} 
                                ideal="Growing businesses" 
                                price="₹9,999/month" 
                            />
                            <PlanRow 
                                plan="Enterprise" 
                                features={["Unlimited employees", "Custom HR roles", "Admin dashboard", "API access", "Dedicated manager"]} 
                                ideal="Large organizations" 
                                price="Custom Pricing" 
                            />
                        </tbody>
                    </table>
                </div>
                <p className="text-blue-900/80 text-sm mt-2">
                    All plans include secure access, 24/7 availability, and regular platform updates. Volume discounts available.
                </p>
            </div>


            {/* Partners Section */}
            <div id="partners" className="w-full max-w-7xl mx-auto my-24 px-4 sm:px-6">
                <div className="text-center mb-16">
                    <h2 className="text-4xl md:text-5xl font-bold text-white mb-4 leading-tight">
                        Trusted By <span className="bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 bg-clip-text text-transparent">Industry Leaders</span>
                    </h2>
                    <p className="text-xl text-slate-300 max-w-3xl mx-auto">
                        Join thousands of companies worldwide who trust HireMe to manage their workforce efficiently
                    </p>
                </div>

                {/* Partner Logos with Advanced Styling */}
                <div className="relative">
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 via-purple-500/20 to-cyan-500/20 rounded-3xl blur-3xl"></div>
                    <div className="relative bg-white/10 backdrop-blur-xl rounded-3xl border border-white/20 p-8 md:p-12">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12">
                            <PartnerLogo src="/swiggy.png" alt="Swiggy" />
                            <PartnerLogo src="/zepto.png" alt="Zepto" />
                            <PartnerLogo src="/dunzo.jpg" alt="Dunzo" />
                            <PartnerLogo src="/zomato.png" alt="Zomato" />
                        </div>
                        
                        {/* Stats Section */}
                        <div className="mt-12 pt-8 border-t border-white/20">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
                                <div className="group">
                                    <div className="text-3xl md:text-4xl font-bold text-white mb-2 group-hover:scale-110 transition-transform duration-300">
                                        500+
                                    </div>
                                    <div className="text-slate-300 font-medium">
                                        Partner Companies
                                    </div>
                                </div>
                                <div className="group">
                                    <div className="text-3xl md:text-4xl font-bold text-white mb-2 group-hover:scale-110 transition-transform duration-300">
                                        50K+
                                    </div>
                                    <div className="text-slate-300 font-medium">
                                        Employees Managed
                                    </div>
                                </div>
                                <div className="group">
                                    <div className="text-3xl md:text-4xl font-bold text-white mb-2 group-hover:scale-110 transition-transform duration-300">
                                        99.9%
                                    </div>
                                    <div className="text-slate-300 font-medium">
                                        Uptime Guarantee
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Testimonial */}
                <div className="mt-16 text-center">
                    <div className="bg-gradient-to-br from-slate-800/50 to-blue-900/50 backdrop-blur-xl rounded-3xl p-8 md:p-12 border border-white/10 max-w-4xl mx-auto">
                        <div className="flex items-center justify-center mb-6">
                            {[...Array(5)].map((_, i) => (
                                <FaStar key={i} className="text-yellow-400 text-2xl mx-1" />
                            ))}
                        </div>
                        <blockquote className="text-xl md:text-2xl text-slate-300 font-medium leading-relaxed mb-8">
                            "HireMe has transformed how we manage our workforce. The AI-powered insights and seamless integration have improved our operational efficiency by 40%."
                        </blockquote>
                        <div className="flex items-center justify-center gap-4">
                            <div className="w-16 h-16 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center">
                                <span className="text-white font-bold text-xl">R</span>
                            </div>
                            <div className="text-left">
                                <div className="font-semibold text-white text-lg">Rajesh Kumar</div>
                                <div className="text-slate-400">CEO, TechFlow Solutions</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}

function VisionCard({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
    return (
        <div className="flex items-start gap-4 bg-gradient-to-br from-blue-50 to-white rounded-2xl p-6 shadow border border-blue-100 hover:shadow-lg transition-all duration-300 h-full">
            <div className="mt-1 flex-shrink-0">{icon}</div>
            <div>
                <h4 className="text-xl font-bold text-blue-800 mb-2">{title}</h4>
                <p className="text-blue-900/90 text-base">{desc}</p>
            </div>
        </div>
    );
}

function ServiceCard({ title, description }: { title: string; description: string }) {
    return (
        <div className="bg-white rounded-xl p-6 shadow-md border border-blue-100 hover:shadow-lg transition-all duration-300 h-full">
            <h3 className="text-xl font-bold text-blue-800 mb-3">{title}</h3>
            <p className="text-blue-900/90">{description}</p>
        </div>
    );
}

function PlanRow({ plan, features, ideal, price }: { plan: string; features: string[]; ideal: string; price: string }) {
    return (
        <tr className="hover:bg-blue-50/50 transition-colors duration-200">
            <td className="px-6 py-4 whitespace-nowrap">
                <span className="font-bold text-blue-800 text-lg">{plan}</span>
            </td>
            <td className="px-6 py-4">
                <ul className="list-disc list-inside space-y-1">
                    {features.map((feature, index) => (
                        <li key={index} className="text-blue-900/90">{feature}</li>
                    ))}
                </ul>
            </td>
            <td className="px-6 py-4 whitespace-nowrap text-blue-900/90">{ideal}</td>
            <td className="px-6 py-4 whitespace-nowrap font-semibold text-blue-700">{price}</td>
            <td className="px-6 py-4 whitespace-nowrap">
                <Link 
                    to="/signup" 
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-300 text-sm font-medium"
                >
                    Select
                </Link>
            </td>
        </tr>
    );
}


function PartnerLogo({ src, alt }: { src: string; alt: string }) {
    return (
        <div className="group relative">
            <div className="absolute inset-0 bg-gradient-to-r from-cyan-400/20 to-blue-500/20 rounded-2xl blur-lg opacity-0 group-hover:opacity-100 transition-all duration-500"></div>
            <div className="relative bg-white/5 backdrop-blur-sm border border-white/10 hover:border-white/30 rounded-2xl p-6 md:p-8 flex items-center justify-center h-28 md:h-32 transition-all duration-300 group-hover:bg-white/10 group-hover:scale-105">
                <img 
                    src={src} 
                    alt={alt} 
                    className="max-h-12 md:max-h-16 max-w-[100px] md:max-w-[120px] object-contain filter brightness-0 invert opacity-60 group-hover:opacity-100 transition-all duration-500 group-hover:scale-110" 
                />
            </div>
        </div>
    );
}