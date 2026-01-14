
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState, useEffect } from 'react';
import { NetworkHero } from './components/QuantumScene';
import { ServicesGrid, ProcessFlow, RoiChart } from './components/Diagrams';
import { AiAssistant } from './components/AiAssistant';
import { 
  ArrowRight, Menu, X, Globe, ChevronDown, 
  ArrowUp, Mail, Phone, MapPin, Send, MessageSquare, 
  CheckCircle2, Rocket, ShieldCheck, Clock 
} from 'lucide-react';

const FeatureItem = ({ icon: Icon, title, desc }: { icon: any, title: string, desc: string }) => (
  <div className="flex gap-4 p-6 bg-slate-900/40 rounded-2xl border border-slate-800/50 hover:border-blue-500/50 transition-all group">
    <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-blue-600/10 flex items-center justify-center text-blue-500 group-hover:bg-blue-600 group-hover:text-white transition-colors">
      <Icon size={24} />
    </div>
    <div>
      <h4 className="text-white font-bold mb-2 uppercase tracking-tight text-sm">{title}</h4>
      <p className="text-slate-500 text-xs leading-relaxed">{desc}</p>
    </div>
  </div>
);

const WhatsAppButton = () => (
  <a 
    href="https://wa.me/919876543210" 
    target="_blank" 
    rel="noopener noreferrer"
    className="fixed bottom-32 right-8 z-[90] group"
  >
    <div className="absolute inset-0 bg-green-500 rounded-full blur-xl opacity-40 group-hover:opacity-70 transition-opacity animate-pulse" />
    <div className="relative w-14 h-14 bg-gradient-to-tr from-green-600 to-green-400 rounded-full flex items-center justify-center text-white shadow-2xl border border-white/20 hover:scale-110 transition-transform active:scale-95">
      <MessageSquare size={28} fill="currentColor" />
    </div>
  </a>
);

const App: React.FC = () => {
  const [scrolled, setScrolled] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [isEmbed, setIsEmbed] = useState(false);

  useEffect(() => {
    // Check if the URL has ?embed=true
    const params = new URLSearchParams(window.location.search);
    if (params.get('embed') === 'true') {
      setIsEmbed(true);
      // Force transparency on body and html for the iframe
      document.body.style.background = 'transparent';
      document.body.style.backgroundColor = 'transparent';
      document.documentElement.style.background = 'transparent';
      document.documentElement.style.backgroundColor = 'transparent';
    }

    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
      setShowScrollTop(window.scrollY > 200);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToSection = (id: string) => (e: React.MouseEvent) => {
    e.preventDefault();
    setMenuOpen(false);
    const element = document.getElementById(id);
    if (element) {
      const headerOffset = 100;
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
      window.scrollTo({ top: offsetPosition, behavior: "smooth" });
    }
  };

  // If in embed mode, only return the AI Assistant with no background
  if (isEmbed) {
    return (
      <div className="w-full h-screen bg-transparent overflow-hidden flex items-end justify-end pointer-events-none">
        <div className="pointer-events-auto">
          <AiAssistant />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 selection:bg-blue-600 selection:text-white font-sans relative">
      <WhatsAppButton />
      <AiAssistant />

      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 border-b ${scrolled ? 'bg-slate-950/95 backdrop-blur-md border-slate-800 py-3' : 'bg-transparent border-transparent py-5'}`}>
        <div className="container mx-auto px-6 flex justify-between items-center">
          <div className="flex items-center gap-3 cursor-pointer group" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <div className="w-10 h-10 bg-gradient-to-tr from-blue-600 to-blue-400 rounded-xl flex items-center justify-center text-white font-heading font-bold text-xl shadow-lg group-hover:rotate-12 transition-transform">C</div>
            <span className="font-heading font-bold text-xl tracking-tight text-white uppercase">
              CHESTHA <span className="text-blue-500">IT</span>
            </span>
          </div>
          
          <div className="hidden lg:flex items-center gap-8 text-[11px] font-bold uppercase tracking-widest text-slate-400">
            <a href="#about" onClick={scrollToSection('about')} className="hover:text-white transition-colors">Who We Are</a>
            <a href="#services" onClick={scrollToSection('services')} className="hover:text-white transition-colors">Services</a>
            <a href="#contact" onClick={scrollToSection('contact')} className="px-5 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-all">Inquire Now</a>
          </div>

          <button className="lg:hidden text-white p-2" onClick={() => setMenuOpen(!menuOpen)}>
            {menuOpen ? <X /> : <Menu />}
          </button>
        </div>
      </nav>

      <header className="relative min-h-screen flex items-center justify-center overflow-hidden pt-20">
        <NetworkHero />
        <div className="relative z-10 container mx-auto px-6 text-center">
          <h1 className="font-heading text-5xl md:text-7xl lg:text-9xl font-black leading-[0.9] mb-8 text-white tracking-tighter">
            LEADING <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-blue-600">IT SOLUTION</span>
          </h1>
          <button onClick={scrollToSection('services')} className="px-10 py-4 bg-blue-600 text-white rounded-full font-bold shadow-xl shadow-blue-900/40 hover:bg-blue-700 transition-all flex items-center gap-2 mx-auto">
             Start Project <ArrowRight size={18} />
          </button>
        </div>
      </header>

      <main>
        <section id="about" className="py-24 bg-slate-950">
            <div className="container mx-auto px-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
                    <div className="relative aspect-square bg-slate-900 rounded-[2.5rem] overflow-hidden border border-slate-800 flex items-center justify-center">
                        <Globe size={160} className="text-blue-500/10 animate-pulse" />
                    </div>
                    <div>
                        <h2 className="font-heading text-4xl md:text-5xl mb-8 text-white font-black leading-tight">Empowering Global Brands</h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <FeatureItem icon={Rocket} title="Innovation" desc="Future-proof tech growth." />
                            <FeatureItem icon={ShieldCheck} title="Reliability" desc="Secure codebases." />
                        </div>
                    </div>
                </div>
            </div>
        </section>

        <section id="services" className="py-24 bg-slate-900/50 border-y border-slate-800">
          <div className="container mx-auto px-6">
            <ServicesGrid />
          </div>
        </section>

        <section id="process" className="py-24 bg-slate-950">
            <div className="container mx-auto px-6">
                <ProcessFlow />
            </div>
        </section>

        <section id="results" className="py-24 bg-slate-900 border-t border-slate-800">
             <div className="container mx-auto px-6">
                <RoiChart />
             </div>
        </section>
      </main>

      <footer className="bg-slate-950 text-slate-400 py-20 border-t border-slate-900">
        <div className="container mx-auto px-6 text-center">
            <div className="text-white font-heading font-bold text-3xl mb-6">CHESTHA <span className="text-blue-600">IT</span></div>
            <p className="text-sm text-slate-500">© 2024 Chestha IT Solution. All rights reserved.</p>
        </div>
      </footer>

      <button
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        className={`fixed bottom-8 left-8 z-40 p-4 bg-slate-800 text-white rounded-full shadow-2xl border border-slate-700 hover:bg-blue-600 transition-all ${
          showScrollTop ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        <ArrowUp size={20} />
      </button>

    </div>
  );
};

export default App;
