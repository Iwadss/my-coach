
import { Button } from '@/components/ui/button';
import { useTheme } from '@/components/theme-provider';

const Hero = () => {
    const { theme } = useTheme();

    return (
        <section id="home" className="pt-16 pb-20 px-4 sm:px-6 lg:px-8">
            <div className="container mx-auto text-center">
                <div className="max-w-4xl mx-auto">
                    <h1 className={`text-4xl sm:text-5xl lg:text-6xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'} mb-6 leading-tight`}>
                        Transform Your Body with
                        <span className="block bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                            MyCoach
                        </span>
                    </h1>
                    <p className={`text-xl ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'} mb-8 max-w-2xl mx-auto`}>
                        Professional personal trainer dedicated to helping you achieve your fitness goals
                        through personalized training programs and expert guidance.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        <Button
                            size="lg"
                            onClick={() => window.location.href = '/login'}
                            className="bg-violet-600 hover:bg-violet-700 text-white text-lg px-8 py-3"
                        >
                            Start Your Journey
                        </Button>
                        <Button
                            size="lg"
                            variant="outline"
                            onClick={() => document.getElementById('about')?.scrollIntoView({ behavior: 'smooth' })}
                            className={`text-lg px-8 py-3 border-2 ${theme === 'dark' ? 'border-blue-500 text-blue-400 hover:bg-blue-950' : 'border-blue-600 text-blue-600 hover:bg-blue-50'}`}
                        >
                            Learn More
                        </Button>
                    </div>
                </div>

                <div className="mt-16 relative">
                    <div className={`w-full h-64 sm:h-80 lg:h-96 rounded-2xl flex items-center justify-center ${theme === 'dark' ? 'bg-gradient-to-r from-blue-950 to-purple-950' : 'bg-gradient-to-r from-blue-100 to-purple-100'}`}>
                        <div className="text-6xl sm:text-8xl">💪</div>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default Hero;
