
import Hero from '../components/Hero';
import Stats from '../components/Stats';
import HowItWorks from '../components/HowItWorks';
import WhyMyCoach from '../components/WhyMyCoach';
import Programs from '../components/Programs';
import Coaches from '../components/Coaches';
import Results from '../components/Results';
import RegisterCoachCta from '../components/RegisterCoachCta';
import Footer from '../components/Footer';

const Index = () => {
    return (
        <div className="min-h-screen bg-white dark:bg-[#0a0a0a]">
            <Hero />
            <Stats />
            <HowItWorks />
            <WhyMyCoach />
            <Programs />
            <Coaches />
            <Results />
            <RegisterCoachCta />
            <Footer />
        </div>
    );
};

export default Index;
