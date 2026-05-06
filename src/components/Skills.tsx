
import { useTheme } from '@/components/theme-provider';

const Skills = () => {
    const { theme } = useTheme();

    const services = [
        {
            icon: "🏃‍♂️",
            title: "Weight Loss",
            description: "Structured programs to help you lose weight safely and effectively with sustainable results."
        },
        {
            icon: "💪",
            title: "Strength Training",
            description: "Build functional strength and power through progressive resistance training programs."
        },
        {
            icon: "🏋️‍♀️",
            title: "Muscle Gain",
            description: "Targeted muscle building programs designed to help you gain lean muscle mass."
        },
        {
            icon: "🤸‍♂️",
            title: "Functional Fitness",
            description: "Improve your daily movement patterns and overall athletic performance."
        },
        {
            icon: "🏃‍♀️",
            title: "Cardio Training",
            description: "Boost your cardiovascular health and endurance with personalized cardio programs."
        },
        {
            icon: "🧘‍♂️",
            title: "Flexibility & Mobility",
            description: "Enhance your flexibility and mobility to prevent injuries and improve performance."
        }
    ];

    return (
        <section id="skills" className={`py-20 px-4 sm:px-6 lg:px-8 ${theme === 'dark' ? 'bg-gray-900' : 'bg-white'}`}>
            <div className="container mx-auto">
                <div className="max-w-6xl mx-auto">
                    <div className="text-center mb-16">
                        <h2 className={`text-3xl sm:text-4xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'} mb-4`}>
                            Training Services
                        </h2>
                        <p className={`text-xl ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'} max-w-2xl mx-auto`}>
                            Comprehensive fitness programs tailored to your individual goals and needs
                        </p>
                    </div>

                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {services.map((service, index) => (
                            <div
                                key={index}
                                className={`p-6 rounded-xl ${theme === 'dark' ? 'bg-gray-800 hover:bg-gray-700' : 'bg-white hover:bg-gray-50'} transition-colors duration-200 shadow-sm hover:shadow-md`}
                            >
                                <div className="text-4xl mb-4">{service.icon}</div>
                                <h3 className={`text-xl font-semibold mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                                    {service.title}
                                </h3>
                                <p className={`${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                                    {service.description}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </section>
    );
};

export default Skills;
