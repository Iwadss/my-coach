import {
    LayoutDashboard,
    Users,
    Calendar,
    Clock,
    LogOut,
    Moon,
    Sun,
    Menu,
    X,
} from "lucide-react";
import { NavLink, useNavigate } from "react-router-dom";
import { useState } from "react";
import supabase from "@/supabase/supabase";
import { useTheme } from "@/components/theme-provider";
import { Button } from "@/components/ui/button";

const navigationLinks = [
    { title: "Dashboard", url: "/admin-dashboard", icon: LayoutDashboard },
    { title: "Appointments", url: "/appointment-management", icon: Calendar },
    { title: "Time Slots", url: "/time-slots-management", icon: Clock },
    { title: "Clients", url: "/client-management", icon: Users },
];

export function AdminHeader() {
    const navigate = useNavigate();
    const { theme, setTheme } = useTheme();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    const handleLogout = async () => {
        try {
            await supabase.auth.signOut();
            navigate("/login");
        } catch (error) {
            console.error("Logout failed:", error);
        }
    };

    const toggleTheme = () => {
        setTheme(theme === "dark" ? "light" : "dark");
    };

    return (
        <header
            className={`sticky top-0 left-0 right-0 z-50 ${theme === "dark"
                ? "bg-gray-900/90 border-gray-800"
                : "bg-white/90 border-gray-200"
                } backdrop-blur-md border-b`}
        >
            <nav className="container mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-center items-center h-16 relative">
                    <div className="absolute left-0 flex-shrink-0">
                        <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                            MyCoach
                        </h1>
                    </div>

                    <div className="hidden lg:block">
                        <div className="flex items-baseline space-x-8">
                            {navigationLinks.map((item) => (
                                <NavLink
                                    key={item.title}
                                    to={item.url}
                                    className={({ isActive }) =>
                                        `${isActive
                                            ? theme === "dark"
                                                ? "text-blue-400"
                                                : "text-blue-600"
                                            : theme === "dark"
                                                ? "text-gray-100 hover:text-blue-400"
                                                : "text-gray-900 hover:text-blue-600"
                                        } transition-colors duration-200 font-medium flex items-center gap-2 px-3 py-2 rounded-md`
                                    }
                                >
                                    <item.icon className="w-4 h-4" />
                                    {item.title}
                                </NavLink>
                            ))}
                        </div>
                    </div>

                    {/* Dark Mode Toggle and Logout (Desktop) */}
                    <div className="absolute right-0 hidden lg:flex items-center gap-4">
                        {/* Dark Mode Toggle */}
                        <Button
                            onClick={toggleTheme}
                            variant="ghost"
                            size="icon"
                            className="h-10 w-10 rounded-full border border-transparent hover:border-gray-300 dark:hover:border-gray-600 transition-all duration-200 hover:bg-gray-100 dark:hover:bg-gray-800"
                        >
                            {theme === "dark" ? (
                                <Sun className="h-5 w-5 text-yellow-500 transition-colors duration-200" />
                            ) : (
                                <Moon className="h-5 w-5 text-blue-600 transition-colors duration-200" />
                            )}
                        </Button>

                        {/* Logout Button */}
                        <button
                            onClick={handleLogout}
                            className="flex items-center gap-2 px-3 py-2 rounded-md text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-950/20 transition-colors duration-200 font-medium"
                        >
                            <LogOut className="h-4 w-4" />
                            Sign Out
                        </button>
                    </div>

                    {/* Mobile Menu */}
                    <div className="absolute right-0 lg:hidden flex items-center gap-4">
                        {/* Dark Mode Toggle (Mobile) */}
                        <Button
                            onClick={toggleTheme}
                            variant="ghost"
                            size="icon"
                            className="h-10 w-10 rounded-full border border-transparent hover:border-gray-300 dark:hover:border-gray-600 transition-all duration-200 hover:bg-gray-100 dark:hover:bg-gray-800"
                        >
                            {theme === "dark" ? (
                                <Sun className="h-5 w-5 text-yellow-500 transition-colors duration-200" />
                            ) : (
                                <Moon className="h-5 w-5 text-blue-600 transition-colors duration-200" />
                            )}
                        </Button>
                        <button
                            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                            className={`${theme === "dark"
                                ? "text-gray-100 hover:text-blue-400"
                                : "text-gray-900 hover:text-blue-600"
                                } transition-colors duration-200`}
                        >
                            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
                        </button>
                    </div>
                </div>

                {/* Mobile Dropdown */}
                {isMobileMenuOpen && (
                    <div
                        className={`lg:hidden ${theme === "dark" ? "bg-gray-900" : "bg-white"
                            } py-4`}
                    >
                        <div className="space-y-4 px-4">
                            {navigationLinks.map((item) => (
                                <NavLink
                                    key={item.title}
                                    to={item.url}
                                    className={({ isActive }) =>
                                        `block ${isActive
                                            ? theme === "dark"
                                                ? "text-blue-400"
                                                : "text-blue-600"
                                            : theme === "dark"
                                                ? "text-gray-100 hover:text-blue-400"
                                                : "text-gray-900 hover:text-blue-600"
                                        } transition-colors duration-200 font-medium flex items-center gap-2 px-3 py-2 rounded-md`
                                    }
                                    onClick={() => setIsMobileMenuOpen(false)}
                                >
                                    <item.icon className="w-4 h-4" />
                                    {item.title}
                                </NavLink>
                            ))}

                            {/* Logout Button (Mobile) */}
                            <button
                                onClick={handleLogout}
                                className="w-full flex items-center gap-2 mt-4 px-3 py-2 rounded-md text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-950/20 transition-colors duration-200 font-medium"
                            >
                                <LogOut className="w-4 h-4" />
                                Sign Out
                            </button>
                        </div>
                    </div>
                )}
            </nav>
        </header>
    );
}