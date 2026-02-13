import { Link } from "react-router-dom";
import UserIcon from "../assets/user.svg";
import Logout from "../assets/logout.svg";
import Tweak from "../assets/tweak.svg";
import { useContext, useEffect, useRef, useState } from "react";
import { UserContext } from "../context/UserContext";
import Login from "./Login";
import { FaUser, FaCog, FaSignOutAlt, FaBars, FaTimes, FaChevronDown } from "react-icons/fa";

export default function Navbar({ forceHidden = false }: { forceHidden?: boolean }) {
  const { userState, updateUserState } = useContext(UserContext)!;
  const [showLogin, setShowLogin] = useState<boolean>(false);
  const [logout, setLogout] = useState<boolean>(false);
  const [scrolled, setScrolled] = useState<boolean>(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
  const userIcon = useRef<HTMLImageElement>(null);
  const navbar = useRef<HTMLElement>(null);

  async function handleLogout() {
    localStorage.removeItem("authToken");
    localStorage.removeItem("metadata");
    await updateUserState();
    window.location.href = "/";
    setLogout(false);
  }

  useEffect(() => {
    // fetching user details
    updateUserState();

    userIcon.current?.addEventListener("click", () => {
      setShowLogin(true);
    });

    window.addEventListener("mousedown", (e: MouseEvent) => {
      if (!document.getElementById("profile")?.contains(e.target as Node))
        setLogout(false);
    });

    // styling navbar based on scroll position
    const handleScroll = () => {
      const isScrolled = window.scrollY > 20;
      setScrolled(isScrolled);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = showLogin ? "hidden" : "auto";
  }, [showLogin]);

  if (forceHidden) return null;

  return (
    <>
      <nav
        ref={navbar}
        className={`fixed top-0 left-0 right-0 z-30 transition-all duration-300 ${
          scrolled
            ? "bg-white/95 backdrop-blur-xl shadow-lg border-b border-blue-100/50"
            : "bg-white/80 backdrop-blur-md"
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <Link
              to="/"
              className="flex items-center space-x-2"
            >
              <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl flex items-center justify-center shadow-md">
                <span className="text-white font-bold text-xl">H</span>
              </div>
              <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent">
                HireMe
              </span>
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-1">
              {userState.Company === null && userState.position === "guest" && (
                <>
                  <NavLink href="/#about">About Us</NavLink>
                  <NavLink href="/#vision">Our Vision</NavLink>
                  <NavLink href="/#partners">Partners</NavLink>
                  <NavLink href="/be-a-partner" isLink>Become a Partner</NavLink>
                  <NavLink href="/#plans">Pricing</NavLink>
                  
                  <button
                    onClick={() => setShowLogin(true)}
                    className="ml-4 px-6 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-medium rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all duration-200 hover:scale-105 shadow-md hover:shadow-lg"
                  >
                    Sign In
                  </button>
                </>
              )}

              {userState.Company === null && userState.position === "superadmin" && (
                <>
                  <NavLink href="/partner-requests" isLink>Partner Requests</NavLink>
                  <NavLink href="/partners" isLink>Partners</NavLink>
                  <UserDropdown
                    username={userState.username}
                    logout={logout}
                    setLogout={setLogout}
                    onLogout={handleLogout}
                    userType="admin"
                  />
                </>
              )}

              {userState.Company !== null && (
                <UserDropdown
                  username={userState.username}
                  logout={logout}
                  setLogout={setLogout}
                  onLogout={handleLogout}
                  userType="company"
                  userState={userState}
                />
              )}
            </div>

            {/* Mobile menu button */}
            <div className="md:hidden">
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2 rounded-xl text-blue-600 hover:bg-blue-50 transition-colors duration-200"
              >
                {mobileMenuOpen ? <FaTimes size={20} /> : <FaBars size={20} />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-white/95 backdrop-blur-xl border-t border-blue-100/50">
            <div className="px-4 py-3 space-y-3">
              {userState.Company === null && userState.position === "guest" && (
                <>
                  <MobileNavLink href="/#about" onClick={() => setMobileMenuOpen(false)}>
                    About Us
                  </MobileNavLink>
                  <MobileNavLink href="/#vision" onClick={() => setMobileMenuOpen(false)}>
                    Our Vision
                  </MobileNavLink>
                  <MobileNavLink href="/#partners" onClick={() => setMobileMenuOpen(false)}>
                    Partners
                  </MobileNavLink>
                  <MobileNavLink href="/be-a-partner" isLink onClick={() => setMobileMenuOpen(false)}>
                    Become a Partner
                  </MobileNavLink>
                  <MobileNavLink href="/#plans" onClick={() => setMobileMenuOpen(false)}>
                    Pricing
                  </MobileNavLink>
                  <button
                    onClick={() => {
                      setShowLogin(true);
                      setMobileMenuOpen(false);
                    }}
                    className="w-full text-left px-4 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-medium rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all duration-200 mt-4"
                  >
                    Sign In
                  </button>
                </>
              )}

              {userState.Company === null && userState.position === "superadmin" && (
                <>
                  <MobileNavLink href="/partner-requests" isLink onClick={() => setMobileMenuOpen(false)}>
                    Partner Requests
                  </MobileNavLink>
                  <MobileNavLink href="/partners" isLink onClick={() => setMobileMenuOpen(false)}>
                    Partners
                  </MobileNavLink>
                  <div className="border-t border-blue-100 pt-3 mt-3">
                    <div className="flex items-center gap-3 px-4 py-2">
                      <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-blue-700 rounded-full flex items-center justify-center">
                        <FaUser className="text-white text-sm" />
                      </div>
                      <span className="font-medium text-blue-800">Welcome, {userState.username}</span>
                    </div>
                    <button
                      onClick={handleLogout}
                      className="w-full text-left px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors flex items-center gap-2"
                    >
                      <FaSignOutAlt />
                      Logout
                    </button>
                  </div>
                </>
              )}

              {userState.Company !== null && (
                <div className="border-t border-blue-100 pt-3 mt-3">
                  <div className="flex items-center gap-3 px-4 py-2">
                    <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-blue-700 rounded-full flex items-center justify-center">
                      <FaUser className="text-white text-sm" />
                    </div>
                    <span className="font-medium text-blue-800">Welcome, {userState.username}</span>
                  </div>
                  <Link
                    to={userState.position !== "emp" ? "/manage-account" : `/employees/employee/${userState.id}`}
                    className="w-full text-left px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors flex items-center gap-2"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <FaCog />
                    Manage Account
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="w-full text-left px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors flex items-center gap-2"
                  >
                    <FaSignOutAlt />
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </nav>

      {/* Spacer to prevent content from going under fixed navbar */}
      <div className="h-16"></div>

      {showLogin && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-md animate-fadeIn"
          onClick={() => setShowLogin(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="z-50 animate-scaleIn transition-all duration-300"
          >
            <Login setShowLogin={(value: boolean) => setShowLogin(value)} />
          </div>
        </div>
      )}
    </>
  );
}

// Navigation Link Component
function NavLink({ href, children, isLink = false }: { href: string; children: React.ReactNode; isLink?: boolean }) {
  const className = "px-4 py-2 text-sm font-medium text-blue-700 hover:text-blue-900 hover:bg-blue-50 rounded-xl transition-all duration-200 relative group";
  
  if (isLink) {
    return (
      <Link to={href} className={className}>
        {children}
        <span className="absolute bottom-0 left-1/2 w-0 h-0.5 bg-blue-600 group-hover:w-full group-hover:left-0 transition-all duration-300"></span>
      </Link>
    );
  }
  
  return (
    <a href={href} className={className}>
      {children}
      <span className="absolute bottom-0 left-1/2 w-0 h-0.5 bg-blue-600 group-hover:w-full group-hover:left-0 transition-all duration-300"></span>
    </a>
  );
}

// Mobile Navigation Link Component
function MobileNavLink({ href, children, isLink = false, onClick }: { href: string; children: React.ReactNode; isLink?: boolean; onClick?: () => void }) {
  const className = "block px-4 py-3 text-base font-medium text-blue-700 hover:text-blue-900 hover:bg-blue-50 rounded-xl transition-colors duration-200";
  
  if (isLink) {
    return (
      <Link to={href} className={className} onClick={onClick}>
        {children}
      </Link>
    );
  }
  
  return (
    <a href={href} className={className} onClick={onClick}>
      {children}
    </a>
  );
}

// User Dropdown Component
function UserDropdown({ username, logout, setLogout, onLogout, userType, userState }: {
  username: string;
  logout: boolean;
  setLogout: (value: boolean) => void;
  onLogout: () => void;
  userType: 'admin' | 'company';
  userState?: any;
}) {
  return (
    <div className="relative">
      <button
        onClick={() => setLogout(!logout)}
        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-700 hover:bg-blue-50 rounded-xl transition-all duration-200 group"
        id="profile"
      >
        <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-blue-700 rounded-full flex items-center justify-center">
          <FaUser className="text-white text-sm" />
        </div>
        <span className="hidden lg:block">Welcome, {username}</span>
        <FaChevronDown className={`text-xs transition-transform duration-200 ${logout ? 'rotate-180' : ''}`} />
      </button>

      {logout && (
        <div className="absolute right-0 mt-2 w-56 bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-blue-100/50 py-2 z-40">
          <div className="px-4 py-3 border-b border-blue-100">
            <p className="text-sm font-medium text-blue-800">Signed in as</p>
            <p className="text-sm text-blue-600 truncate">{username}</p>
          </div>
          
          {userType === 'company' && userState && (
            <Link
              to={userState.position !== "emp" ? "/manage-account" : `/employees/employee/${userState.id}`}
              className="flex items-center gap-3 px-4 py-3 text-sm text-blue-700 hover:bg-blue-50 transition-colors duration-200"
              onClick={() => setLogout(false)}
            >
              <FaCog className="text-blue-500" />
              Manage Account
            </Link>
          )}
          
          <button
            onClick={onLogout}
            className="flex items-center gap-3 w-full px-4 py-3 text-sm text-red-600 hover:bg-red-50 transition-colors duration-200"
          >
            <FaSignOutAlt className="text-red-500" />
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}