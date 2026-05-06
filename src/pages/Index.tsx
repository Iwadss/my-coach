
import { useTheme } from '@/components/theme-provider';
import Header from '../components/Header';
import Hero from '../components/Hero';
import About from '../components/About';
import Skills from '../components/Skills';
import Footer from '../components/Footer';

const Index = () => {
    const { theme } = useTheme();

    return (
        <div className={`min-h-screen ${theme === 'dark' ? 'bg-gradient-to-b from-gray-900 to-black text-white' : 'bg-gradient-to-b from-slate-50 to-white'}`}>
            <Header />
            <Hero />
            <About />
            <Skills />
            <Footer />
        </div>
    );
};

export default Index;