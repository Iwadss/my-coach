
import Hero from '@/marketing/sections/hero';
import Stats from '@/marketing/sections/stats';
import HowItWorks from '@/marketing/sections/how-it-works';
import WhyMyCoach from '@/marketing/sections/why-my-coach';
import Programs from '@/marketing/sections/programs';
import Coaches from '@/marketing/sections/coaches';
import Results from '@/marketing/sections/results';
import RegisterCoachCta from '@/marketing/sections/register-coach-cta';
import Footer from '@/marketing/sections/footer';

const Home = () => {
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

export default Home;
