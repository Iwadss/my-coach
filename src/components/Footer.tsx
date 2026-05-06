
import { Mail, Phone, MapPin } from 'lucide-react';
import { useTheme } from '@/components/theme-provider';

const Footer = () => {
    const { theme } = useTheme();

    return (
        <footer className={`${theme === 'dark' ? 'bg-gray-900 border-gray-800' : 'bg-gray-100 border-gray-200'} py-12 px-4 sm:px-6 lg:px-8 border-t`}>
            <div className="container mx-auto">
                <div className="max-w-6xl mx-auto">
                    <div className="grid md:grid-cols-3 gap-8">
                        <div>
                            <h3 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent mb-4">
                                MyCoach
                            </h3>
                            <p className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'} leading-relaxed`}>
                                Transform your life through fitness. Professional personal training
                                with a focus on sustainable results and long-term health.
                            </p>
                        </div>

                        <div>
                            <h4 className={`text-lg font-semibold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                                Quick Links
                            </h4>
                            <ul className="space-y-2">
                                <li>
                                    <a 
                                        href="#home" 
                                        className={`${theme === 'dark' ? 'text-gray-400 hover:text-blue-400' : 'text-gray-600 hover:text-blue-600'} transition-colors`}
                                    >
                                        Home
                                    </a>
                                </li>
                                <li>
                                    <a 
                                        href="#about" 
                                        className={`${theme === 'dark' ? 'text-gray-400 hover:text-blue-400' : 'text-gray-600 hover:text-blue-600'} transition-colors`}
                                    >
                                        About
                                    </a>
                                </li>
                                <li>
                                    <a 
                                        href="#skills" 
                                        className={`${theme === 'dark' ? 'text-gray-400 hover:text-blue-400' : 'text-gray-600 hover:text-blue-600'} transition-colors`}
                                    >
                                        Services
                                    </a>
                                </li>
                                <li>
                                    <a 
                                        href="/login" 
                                        className={`${theme === 'dark' ? 'text-gray-400 hover:text-blue-400' : 'text-gray-600 hover:text-blue-600'} transition-colors`}
                                    >
                                        Login
                                    </a>
                                </li>
                            </ul>
                        </div>

                        <div>
                            <h4 className={`text-lg font-semibold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                                Contact Info
                            </h4>
                            <div className="space-y-2">
                                <p className={`flex items-center gap-2 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                                    <Mail className="w-4 h-4" /> mycoach@email.com
                                </p>
                                <p className={`flex items-center gap-2 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                                    <Phone className="w-4 h-4" /> +60 12-345 6789
                                </p>
                                <p className={`flex items-center gap-2 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                                    <MapPin className="w-4 h-4" /> Kuala Lumpur, Malaysia
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className={`border-t ${theme === 'dark' ? 'border-gray-800' : 'border-gray-200'} mt-8 pt-8 text-center`}>
                        <p className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>
                            © 2025 MyCoach. All rights reserved.
                        </p>
                    </div>
                </div>
            </div>
        </footer>
    );
};

export default Footer;