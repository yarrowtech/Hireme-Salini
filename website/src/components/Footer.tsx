import Location from "../assets/location.svg";
import Phone from "../assets/phone.svg";
import Email from "../assets/mail.svg";
import { FaLinkedin, FaInstagram, FaFacebook, FaTwitter, FaYoutube, FaGithub, FaMapMarkerAlt, FaPhoneAlt, FaEnvelope, FaClock, FaRocket, FaUsers, FaShieldAlt, FaChartLine } from "react-icons/fa";

export default function Footer() {
    return (
        <footer className="bg-gradient-to-br from-blue-900 to-blue-700 text-white w-full flex flex-col items-center pt-16 pb-8 px-4 relative mt-20 shadow-xl">
            {/* Decorative elements */}
            <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-blue-400 via-blue-300 to-blue-400 opacity-30"></div>
            
            {/* Company Brand Section */}
            <div className="w-full max-w-6xl mb-12">
                <div className="text-center mb-8">
                    <h2 className="text-4xl font-bold mb-4 bg-gradient-to-r from-blue-100 via-white to-blue-100 bg-clip-text text-transparent">
                        HireMe
                    </h2>
                    <p className="text-blue-200 text-lg max-w-2xl mx-auto leading-relaxed">
                        Revolutionizing workforce management through AI-powered solutions, seamless integration, and predictive analytics for the future of work.
                    </p>
                </div>
            </div>

            {/* Main content */}
            <div className="w-full max-w-6xl grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
                {/* Company section */}
                <div className="flex flex-col gap-4">
                    <h4 className="text-xl font-bold mb-3 text-blue-100 flex items-center gap-2">
                        <FaRocket className="text-blue-300" />
                        Company
                    </h4>
                    <div className="flex flex-col gap-3">
                        <a href="/#about" className="text-sm font-medium hover:text-blue-200 transition-colors duration-300 transform hover:translate-x-1 flex items-center">
                            <span className="w-2 h-2 bg-blue-300 rounded-full mr-3"></span>
                            About Us
                        </a>
                        <a href="/#vision" className="text-sm font-medium hover:text-blue-200 transition-colors duration-300 transform hover:translate-x-1 flex items-center">
                            <span className="w-2 h-2 bg-blue-300 rounded-full mr-3"></span>
                            Our Vision
                        </a>
                        <a href="/#partners" className="text-sm font-medium hover:text-blue-200 transition-colors duration-300 transform hover:translate-x-1 flex items-center">
                            <span className="w-2 h-2 bg-blue-300 rounded-full mr-3"></span>
                            Partners
                        </a>
                        <a href="#" className="text-sm font-medium hover:text-blue-200 transition-colors duration-300 transform hover:translate-x-1 flex items-center">
                            <span className="w-2 h-2 bg-blue-300 rounded-full mr-3"></span>
                            Careers
                        </a>
                        <a href="#" className="text-sm font-medium hover:text-blue-200 transition-colors duration-300 transform hover:translate-x-1 flex items-center">
                            <span className="w-2 h-2 bg-blue-300 rounded-full mr-3"></span>
                            Press & Media
                        </a>
                    </div>
                </div>

                {/* Services section */}
                <div className="flex flex-col gap-4">
                    <h4 className="text-xl font-bold mb-3 text-blue-100 flex items-center gap-2">
                        <FaUsers className="text-blue-300" />
                        Services
                    </h4>
                    <div className="flex flex-col gap-3">
                        <a href="#" className="text-sm font-medium hover:text-blue-200 transition-colors duration-300 transform hover:translate-x-1 flex items-center">
                            <span className="w-2 h-2 bg-blue-300 rounded-full mr-3"></span>
                            Employee Management
                        </a>
                        <a href="#" className="text-sm font-medium hover:text-blue-200 transition-colors duration-300 transform hover:translate-x-1 flex items-center">
                            <span className="w-2 h-2 bg-blue-300 rounded-full mr-3"></span>
                            Workforce Analytics
                        </a>
                        <a href="#" className="text-sm font-medium hover:text-blue-200 transition-colors duration-300 transform hover:translate-x-1 flex items-center">
                            <span className="w-2 h-2 bg-blue-300 rounded-full mr-3"></span>
                            HirePay Payroll
                        </a>
                        <a href="#" className="text-sm font-medium hover:text-blue-200 transition-colors duration-300 transform hover:translate-x-1 flex items-center">
                            <span className="w-2 h-2 bg-blue-300 rounded-full mr-3"></span>
                            Performance Tracking
                        </a>
                        <a href="#" className="text-sm font-medium hover:text-blue-200 transition-colors duration-300 transform hover:translate-x-1 flex items-center">
                            <span className="w-2 h-2 bg-blue-300 rounded-full mr-3"></span>
                            Compliance Management
                        </a>
                    </div>
                </div>

                {/* Resources section */}
                <div className="flex flex-col gap-4">
                    <h4 className="text-xl font-bold mb-3 text-blue-100 flex items-center gap-2">
                        <FaChartLine className="text-blue-300" />
                        Resources
                    </h4>
                    <div className="flex flex-col gap-3">
                        <a href="#" className="text-sm font-medium hover:text-blue-200 transition-colors duration-300 transform hover:translate-x-1 flex items-center">
                            <span className="w-2 h-2 bg-blue-300 rounded-full mr-3"></span>
                            Help Center
                        </a>
                        <a href="#" className="text-sm font-medium hover:text-blue-200 transition-colors duration-300 transform hover:translate-x-1 flex items-center">
                            <span className="w-2 h-2 bg-blue-300 rounded-full mr-3"></span>
                            Documentation
                        </a>
                        <a href="#" className="text-sm font-medium hover:text-blue-200 transition-colors duration-300 transform hover:translate-x-1 flex items-center">
                            <span className="w-2 h-2 bg-blue-300 rounded-full mr-3"></span>
                            API Reference
                        </a>
                        <a href="#" className="text-sm font-medium hover:text-blue-200 transition-colors duration-300 transform hover:translate-x-1 flex items-center">
                            <span className="w-2 h-2 bg-blue-300 rounded-full mr-3"></span>
                            Tutorials
                        </a>
                        <a href="#" className="text-sm font-medium hover:text-blue-200 transition-colors duration-300 transform hover:translate-x-1 flex items-center">
                            <span className="w-2 h-2 bg-blue-300 rounded-full mr-3"></span>
                            Webinars
                        </a>
                    </div>
                </div>

                {/* Support & Legal section */}
                <div className="flex flex-col gap-4">
                    <h4 className="text-xl font-bold mb-3 text-blue-100 flex items-center gap-2">
                        <FaShieldAlt className="text-blue-300" />
                        Support & Legal
                    </h4>
                    <div className="flex flex-col gap-3">
                        <a href="/contact" className="text-sm font-medium hover:text-blue-200 transition-colors duration-300 transform hover:translate-x-1 flex items-center">
                            <span className="w-2 h-2 bg-blue-300 rounded-full mr-3"></span>
                            Contact Support
                        </a>
                        <a href="#" className="text-sm font-medium hover:text-blue-200 transition-colors duration-300 transform hover:translate-x-1 flex items-center">
                            <span className="w-2 h-2 bg-blue-300 rounded-full mr-3"></span>
                            Terms & Conditions
                        </a>
                        <a href="#" className="text-sm font-medium hover:text-blue-200 transition-colors duration-300 transform hover:translate-x-1 flex items-center">
                            <span className="w-2 h-2 bg-blue-300 rounded-full mr-3"></span>
                            Privacy Policy
                        </a>
                        <a href="#" className="text-sm font-medium hover:text-blue-200 transition-colors duration-300 transform hover:translate-x-1 flex items-center">
                            <span className="w-2 h-2 bg-blue-300 rounded-full mr-3"></span>
                            Cookie Policy
                        </a>
                        <a href="#" className="text-sm font-medium hover:text-blue-200 transition-colors duration-300 transform hover:translate-x-1 flex items-center">
                            <span className="w-2 h-2 bg-blue-300 rounded-full mr-3"></span>
                            Security
                        </a>
                    </div>
                </div>
            </div>

            {/* Contact Information Section */}
            <div className="w-full max-w-6xl mb-12">
                <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-8 border border-white/10">
                    <h3 className="text-2xl font-bold text-blue-100 mb-6 text-center flex items-center justify-center gap-3">
                        <FaEnvelope className="text-blue-300" />
                        Get In Touch
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="flex flex-col items-center text-center p-4 bg-white/5 rounded-xl hover:bg-white/10 transition-all duration-300">
                            <div className="w-12 h-12 bg-blue-400/20 rounded-full flex items-center justify-center mb-3">
                                <FaMapMarkerAlt className="text-blue-300 text-xl" />
                            </div>
                            <h4 className="font-semibold text-blue-100 mb-2">Head Office</h4>
                            <p className="text-sm text-blue-200">Hire Me HQ, Sector 5</p>
                            <p className="text-sm text-blue-200">Salt Lake, Kolkata - 700091</p>
                            <p className="text-sm text-blue-200">West Bengal, India</p>
                        </div>

                        <div className="flex flex-col items-center text-center p-4 bg-white/5 rounded-xl hover:bg-white/10 transition-all duration-300">
                            <div className="w-12 h-12 bg-blue-400/20 rounded-full flex items-center justify-center mb-3">
                                <FaPhoneAlt className="text-blue-300 text-xl" />
                            </div>
                            <h4 className="font-semibold text-blue-100 mb-2">Phone Support</h4>
                            <p className="text-sm text-blue-200">+91 90000 12345</p>
                            <p className="text-sm text-blue-200">+91 80000 67890</p>
                            <div className="flex items-center gap-1 mt-2">
                                <FaClock className="text-blue-300 text-xs" />
                                <p className="text-xs text-blue-300">Mon - Sat, 10:00 AM - 7:00 PM</p>
                            </div>
                        </div>

                        <div className="flex flex-col items-center text-center p-4 bg-white/5 rounded-xl hover:bg-white/10 transition-all duration-300">
                            <div className="w-12 h-12 bg-blue-400/20 rounded-full flex items-center justify-center mb-3">
                                <FaEnvelope className="text-blue-300 text-xl" />
                            </div>
                            <h4 className="font-semibold text-blue-100 mb-2">Email Support</h4>
                            <p className="text-sm text-blue-200">info@hiremeplatform.com</p>
                            <p className="text-sm text-blue-200">support@hiremeplatform.com</p>
                            <p className="text-sm text-blue-200">partnerships@hiremeplatform.com</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Newsletter Section */}
            <div className="w-full max-w-6xl mb-12">
                <div className="bg-gradient-to-r from-blue-800/50 to-blue-600/50 backdrop-blur-sm rounded-2xl p-8 border border-blue-400/20 text-center">
                    <h3 className="text-2xl font-bold text-white mb-3">Stay Updated</h3>
                    <p className="text-blue-200 mb-6">Subscribe to our newsletter for the latest HR technology insights and platform updates</p>
                    <div className="flex flex-col sm:flex-row gap-4 max-w-md mx-auto">
                        <input
                            type="email"
                            placeholder="Enter your email address"
                            className="flex-1 px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-400 backdrop-blur-sm"
                        />
                        <button className="px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white font-semibold rounded-xl hover:from-blue-600 hover:to-blue-700 transition-all duration-300 hover:scale-105 shadow-lg">
                            Subscribe
                        </button>
                    </div>
                </div>
            </div>

            {/* Bottom section */}
            <div className="w-full max-w-6xl border-t border-white/20 pt-8">
                <div className="flex flex-col lg:flex-row justify-between items-center gap-6">
                    {/* Copyright and Legal */}
                    <div className="text-center lg:text-left">
                        <p className="text-sm text-blue-200 font-medium mb-2">
                            &copy; {new Date().getFullYear()} HireMe Platform. All rights reserved.
                        </p>
                        <p className="text-xs text-blue-300">
                            Empowering businesses with intelligent workforce management solutions since 2024.
                        </p>
                    </div>
                    
                    {/* Social Media Links */}
                    <div className="flex flex-col items-center gap-4">
                        <p className="text-sm text-blue-200 font-medium">Follow Us</p>
                        <div className="flex gap-4">
                            <a 
                                href="#" 
                                className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center text-blue-200 hover:text-white hover:bg-blue-600 transition-all duration-300 hover:scale-110"
                                aria-label="Facebook"
                            >
                                <FaFacebook className="text-lg" />
                            </a>
                            <a 
                                href="#" 
                                className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center text-blue-200 hover:text-white hover:bg-blue-500 transition-all duration-300 hover:scale-110"
                                aria-label="Twitter"
                            >
                                <FaTwitter className="text-lg" />
                            </a>
                            <a 
                                href="#" 
                                className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center text-blue-200 hover:text-white hover:bg-blue-700 transition-all duration-300 hover:scale-110"
                                aria-label="LinkedIn"
                            >
                                <FaLinkedin className="text-lg" />
                            </a>
                            <a 
                                href="#" 
                                className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center text-blue-200 hover:text-white hover:bg-gradient-to-r hover:from-purple-500 hover:to-pink-500 transition-all duration-300 hover:scale-110"
                                aria-label="Instagram"
                            >
                                <FaInstagram className="text-lg" />
                            </a>
                            <a 
                                href="#" 
                                className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center text-blue-200 hover:text-white hover:bg-red-600 transition-all duration-300 hover:scale-110"
                                aria-label="YouTube"
                            >
                                <FaYoutube className="text-lg" />
                            </a>
                            <a 
                                href="#" 
                                className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center text-blue-200 hover:text-white hover:bg-gray-800 transition-all duration-300 hover:scale-110"
                                aria-label="GitHub"
                            >
                                <FaGithub className="text-lg" />
                            </a>
                        </div>
                    </div>

                    {/* Additional Info */}
                    <div className="text-center lg:text-right">
                        <p className="text-xs text-blue-300 mb-1">Version 2.1.0</p>
                        <p className="text-xs text-blue-300">Made with ❤️ in India by Koushik & Atanu</p>
                    </div>
                </div>
            </div>
        </footer>
    );
}