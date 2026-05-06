
import { useState } from 'react';
import { Menu, X, Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTheme } from '@/components/theme-provider';

const Header = () => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const { theme, setTheme } = useTheme();

    return (
        <header
            className={`sticky top-0 left-0 right-0 z-50 ${theme === 'dark' ? 'bg-gray-900/90 border-gray-800' : 'bg-gray-100/90 border-gray-300'
                } backdrop-blur-md border-b`}
        >
            <nav className="container mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center h-16 relative">
                    {/* Logo (Left) */}
                    <div className="flex-shrink-0">
                        <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                            MyCoach
                        </h1>
                    </div>

                    {/* Navigation + Buttons (Right) */}
                    <div className="hidden lg:flex items-center gap-6">
                        {/* Nav Links */}
                        <div className="flex items-center gap-6">
                            <a
                                href="#home"
                                className={`${theme === 'dark' ? 'text-gray-100 hover:text-blue-400' : 'text-gray-900 hover:text-blue-600'
                                    } transition-colors duration-200 font-medium px-3 py-2 rounded-md`}
                            >
                                Home
                            </a>
                            <a
                                href="#about"
                                className={`${theme === 'dark' ? 'text-gray-100 hover:text-blue-400' : 'text-gray-900 hover:text-blue-600'
                                    } transition-colors duration-200 font-medium px-3 py-2 rounded-md`}
                            >
                                About
                            </a>
                            <a
                                href="#skills"
                                className={`${theme === 'dark' ? 'text-gray-100 hover:text-blue-400' : 'text-gray-900 hover:text-blue-600'
                                    } transition-colors duration-200 font-medium px-3 py-2 rounded-md`}
                            >
                                Services
                            </a>
                        </div>

                        {/* Theme Toggle */}
                        <Button
                            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                            variant="ghost"
                            size="icon"
                            className="h-10 w-10 rounded-full border border-transparent hover:border-gray-300 dark:hover:border-gray-600 transition-all duration-200 hover:bg-gray-100 dark:hover:bg-gray-800"
                        >
                            {theme === 'dark' ? (
                                <Sun className="h-5 w-5 text-yellow-500 transition-colors duration-200" />
                            ) : (
                                <Moon className="h-5 w-5 text-blue-600 transition-colors duration-200" />
                            )}
                        </Button>

                        {/* Login */}
                        <Button
                            onClick={() => (window.location.href = '/login')}
                            className="bg-violet-600 hover:bg-violet-700 text-white font-medium px-6 py-2 rounded-md transition-all duration-200"
                        >
                            Login
                        </Button>
                    </div>

                    {/* Mobile Toggle */}
                    <div className="lg:hidden flex items-center gap-4">
                        <Button
                            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                            variant="ghost"
                            size="icon"
                            className="h-10 w-10 rounded-full border border-transparent hover:border-gray-300 dark:hover:border-gray-600 transition-all duration-200 hover:bg-gray-100 dark:hover:bg-gray-800"
                        >
                            {theme === 'dark' ? (
                                <Sun className="h-5 w-5 text-yellow-500 transition-colors duration-200" />
                            ) : (
                                <Moon className="h-5 w-5 text-blue-600 transition-colors duration-200" />
                            )}
                        </Button>
                        <button
                            onClick={() => setIsMenuOpen(!isMenuOpen)}
                            className={`${theme === 'dark' ? 'text-gray-100 hover:text-blue-400' : 'text-gray-900 hover:text-blue-600'
                                } transition-colors duration-200`}
                        >
                            {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
                        </button>
                    </div>
                </div>

                {/* Mobile Dropdown */}
                {isMenuOpen && (
                    <div className={`lg:hidden ${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-100'} py-4`}>
                        <div className="space-y-4 px-4">
                            <a
                                href="#home"
                                className={`block ${theme === 'dark' ? 'text-gray-100 hover:text-blue-400' : 'text-gray-900 hover:text-blue-600'
                                    } transition-colors duration-200 font-medium px-3 py-2 rounded-md`}
                                onClick={() => setIsMenuOpen(false)}
                            >
                                Home
                            </a>
                            <a
                                href="#about"
                                className={`block ${theme === 'dark' ? 'text-gray-100 hover:text-blue-400' : 'text-gray-900 hover:text-blue-600'
                                    } transition-colors duration-200 font-medium px-3 py-2 rounded-md`}
                                onClick={() => setIsMenuOpen(false)}
                            >
                                About
                            </a>
                            <a
                                href="#skills"
                                className={`block ${theme === 'dark' ? 'text-gray-100 hover:text-blue-400' : 'text-gray-900 hover:text-blue-600'
                                    } transition-colors duration-200 font-medium px-3 py-2 rounded-md`}
                                onClick={() => setIsMenuOpen(false)}
                            >
                                Services
                            </a>

                            {/* Login (Mobile) */}
                            <Button
                                onClick={() => (window.location.href = '/login')}
                                className="w-full bg-violet-600 hover:bg-violet-700 text-white font-medium mt-4 px-3 py-2 rounded-md transition-all duration-200"
                            >
                                Login
                            </Button>
                        </div>
                    </div>
                )}
            </nav>
        </header>
    );
};

export default Header;