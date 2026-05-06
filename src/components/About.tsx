import { useTheme } from '@/components/theme-provider';
import { Button } from '@/components/ui/button';

const About = () => {
    const { theme } = useTheme();

    return (
        <section id="about" className={`py-20 px-4 sm:px-6 lg:px-8 ${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'}`}>
            <div className="container mx-auto">
                <div className="max-w-6xl mx-auto">
                    <div className="text-center mb-16">
                        <h2 className={`text-3xl sm:text-4xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'} mb-4`}>
                            About MyCoach
                        </h2>
                        <p className={`text-xl ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'} max-w-2xl mx-auto`}>
                            Passionate about fitness and dedicated to your success
                        </p>
                    </div>

                    <div className="grid lg:grid-cols-2 gap-12 items-center">
                        <div className="space-y-6">
                            <h3 className={`text-2xl font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                                Your Personal Fitness Journey Starts Here
                            </h3>
                            <p className={`${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'} leading-relaxed`}>
                                With over 8 years of experience in personal training and fitness coaching,
                                I've helped hundreds of clients transform their lives through structured,
                                personalized fitness programs.
                            </p>
                            <p className={`${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'} leading-relaxed`}>
                                My approach combines scientific training methods with practical lifestyle
                                changes to ensure sustainable results. Whether you're looking to lose weight,
                                build muscle, or improve your overall health, I'm here to guide you every step of the way.
                            </p>

                            {/* 👇 Start Your Journey Button */}
                            <div className="mt-6">
                                <Button
                                    onClick={() => window.location.href = '/login'}
                                    className="bg-violet-600 hover:bg-violet-700 text-white font-semibold px-6 py-3 rounded-md transition-all duration-200"
                                >
                                    Start Your Journey
                                </Button>
                            </div>

                            {/* Client Stats */}
                            <div className="grid sm:grid-cols-2 gap-6 mt-8">
                                <div className={`text-center p-6 rounded-lg shadow-sm ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'}`}>
                                    <div className="text-3xl font-bold text-blue-500 mb-2">500+</div>
                                    <div className={`${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>Clients Trained</div>
                                </div>
                                <div className={`text-center p-6 rounded-lg shadow-sm ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'}`}>
                                    <div className="text-3xl font-bold text-purple-500 mb-2">8+</div>
                                    <div className={`${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>Years Experience</div>
                                </div>
                            </div>
                        </div>

                        <div className="relative">
                            <div className={`w-full h-96 rounded-2xl flex items-center justify-center ${theme === 'dark' ? 'bg-gradient-to-br from-blue-950 to-purple-950' : 'bg-gradient-to-br from-blue-100 to-purple-100'}`}>
                                <div className="text-8xl">🏋️‍♂️</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default About;