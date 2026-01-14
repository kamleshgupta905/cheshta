
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState, useEffect } from 'react';
import { NetworkHero, GlobeVisual } from './components/QuantumScene';
import { ServicesGrid, ProcessFlow, RoiChart } from './components/Diagrams';
import { AiAssistant } from './components/AiAssistant';
import { 
  ArrowRight, Menu, X, Globe, Cpu, ChevronDown, 
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
    <div className="absolute right-20 top-1/2 -translate-y-1/2 px-4 py-2 bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest rounded-lg border border-white/10 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
      WhatsApp Support
    </div>
  </a>
);

const App: React.FC = () => {
  const [scrolled, setScrolled] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
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

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 selection:bg-blue-600 selection:text-white font-sans relative">
      
      {/* Floating Action Elements */}
      <WhatsAppButton />
      <AiAssistant />

      {/* Navigation */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 border-b ${scrolled ? 'bg-slate-950/95 backdrop-blur-md border-slate-800 py-3' : 'bg-transparent border-transparent py-5'}`}>
        <div className="container mx-auto px-6 flex justify-between items-center">
          <div className="flex items-center gap-3 cursor-pointer group" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <div className="w-10 h-10 bg-gradient-to-tr from-blue-600 to-blue-400 rounded-xl flex items-center justify-center text-white font-heading font-bold text-xl shadow-lg group-hover:rotate-12 transition-transform">C</div>
            <span className="font-heading font-bold text-xl tracking-tight text-white uppercase">
              CHESTHA <span className="text-blue-500">IT</span>
            </span>
          </div>
          
          <div className="hidden lg:flex items-center gap-8 text-[11px] font-bold uppercase tracking-widest text-slate-400">
            <a href="#about" onClick={scrollToSection('about')} className="hover:text-white transition-colors cursor-pointer">Who We Are</a>
            <a href="#services" onClick={scrollToSection('services')} className="hover:text-white transition-colors cursor-pointer">Our Services</a>
            <a href="#process" onClick={scrollToSection('process')} className="hover:text-white transition-colors cursor-pointer">Approach</a>
            <a href="#results" onClick={scrollToSection('results')} className="hover:text-white transition-colors cursor-pointer">Portfolio</a>
            <a href="#contact" onClick={scrollToSection('contact')} className="px-5 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-all cursor-pointer shadow-lg shadow-blue-900/40">Inquire Now</a>
          </div>

          <button className="lg:hidden text-white p-2" onClick={() => setMenuOpen(!menuOpen)}>
            {menuOpen ? <X /> : <Menu />}
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <header className="relative min-h-screen flex items-center justify-center overflow-hidden pt-20">
        <NetworkHero />
        <div className="absolute inset-0 z-0 pointer-events-none bg-gradient-to-t from-slate-950 via-transparent to-transparent" />

        <div className="relative z-10 container mx-auto px-6 text-center">
          <div className="inline-flex items-center gap-2 mb-6 px-4 py-1.5 border border-blue-500/20 bg-blue-500/5 text-blue-400 text-[10px] tracking-[0.2em] uppercase font-black rounded-full backdrop-blur-md">
            The Hub of Technological Innovation
          </div>
          <h1 className="font-heading text-5xl md:text-7xl lg:text-9xl font-black leading-[0.9] mb-8 text-white tracking-tighter">
            LEADING <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-blue-600">IT SOLUTION</span> <br/> COMPANY
          </h1>
          <p className="max-w-2xl mx-auto text-base md:text-lg text-slate-400 font-normal leading-relaxed mb-12">
            Chestha IT Solution provides high-quality software development services that empower businesses to scale, innovate, and lead their industries.
          </p>
          
          <div className="flex flex-col sm:flex-row justify-center items-center gap-4">
             <button onClick={scrollToSection('services')} className="w-full sm:w-auto px-10 py-4 bg-blue-600 text-white rounded-full font-bold shadow-xl shadow-blue-900/40 hover:bg-blue-700 hover:-translate-y-1 transition-all flex items-center justify-center gap-2">
                Start Project <ArrowRight size={18} />
             </button>
             <button onClick={scrollToSection('about')} className="w-full sm:w-auto px-10 py-4 bg-transparent text-white border border-slate-700 rounded-full font-bold hover:bg-slate-900 hover:border-slate-500 transition-all">
                Learn More
             </button>
          </div>
        </div>
      </header>

      <main>
        {/* About Section */}
        <section id="about" className="py-24 bg-slate-950">
            <div className="container mx-auto px-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
                    <div className="relative group">
                        <div className="absolute -inset-4 bg-gradient-to-tr from-blue-600 to-transparent rounded-[3rem] opacity-20 blur-2xl group-hover:opacity-30 transition-opacity"></div>
                        <div className="relative aspect-[4/5] md:aspect-square bg-slate-900 rounded-[2.5rem] overflow-hidden border border-slate-800 flex items-center justify-center">
                            <div className="p-12 text-center">
                                <Globe size={160} className="text-blue-500/10 mx-auto mb-8 animate-pulse-slow" />
                                <h4 className="text-3xl font-bold text-white mb-6 uppercase tracking-widest leading-none">Your Vision, Our Code.</h4>
                                <div className="space-y-4">
                                    <div className="flex items-center gap-3 text-sm text-slate-400">
                                        <CheckCircle2 size={16} className="text-blue-500" /> Web Design & Development
                                    </div>
                                    <div className="flex items-center gap-3 text-sm text-slate-400">
                                        <CheckCircle2 size={16} className="text-blue-500" /> Mobile App Solutions
                                    </div>
                                    <div className="flex items-center gap-3 text-sm text-slate-400">
                                        <CheckCircle2 size={16} className="text-blue-500" /> Digital Growth Strategies
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div>
                        <div className="inline-block mb-4 text-[11px] font-black tracking-[0.4em] text-blue-500 uppercase">A Legacy of Excellence</div>
                        <h2 className="font-heading text-4xl md:text-5xl mb-8 text-white font-black leading-tight">Empowering Global Brands with Modern Tech</h2>
                        <p className="text-slate-400 mb-6 text-lg leading-relaxed">
                            Chestha IT Solution is a team of innovative professionals committed to delivering the best technology solutions to businesses worldwide. We believe in transparency, quality, and results.
                        </p>
                        <p className="text-slate-400 mb-10 leading-relaxed text-sm">
                            Since our inception, we have helped hundreds of startups and enterprises transform their digital presence through scalable architecture and user-centric design.
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <FeatureItem icon={Rocket} title="Innovation" desc="Cutting-edge tech stacks for future-proof growth." />
                            <FeatureItem icon={ShieldCheck} title="Reliability" desc="Secure, robust and battle-tested codebases." />
                            <FeatureItem icon={Clock} title="Speed" desc="Agile methodology for lightning fast delivery." />
                            <FeatureItem icon={CheckCircle2} title="Quality" desc="Rigorous QA ensuring zero-defect deployment." />
                        </div>
                    </div>
                </div>
            </div>
        </section>

        {/* Services Grid (Customized from Diagrams.tsx) */}
        <section id="services" className="py-24 bg-slate-900/50 border-y border-slate-800">
          <div className="container mx-auto px-6">
            <div className="text-center max-w-3xl mx-auto mb-20">
              <h2 className="font-heading text-4xl md:text-6xl text-white font-black mb-6 uppercase">Our <span className="text-blue-500">Capabilities</span></h2>
              <p className="text-slate-500 text-sm tracking-wide uppercase font-bold">Comprehensive IT solutions tailored to your unique business goals.</p>
            </div>
            <ServicesGrid />
          </div>
        </section>

        {/* Process Flow */}
        <section id="process" className="py-24 bg-slate-950">
            <div className="container mx-auto px-6">
                <ProcessFlow />
            </div>
        </section>

        {/* Stats & Impact */}
        <section id="results" className="py-24 bg-slate-900 border-t border-slate-800 overflow-hidden">
             <div className="container mx-auto px-6">
                <RoiChart />
             </div>
        </section>

        {/* Contact Form */}
        <section id="contact" className="py-24 bg-slate-950 relative">
             <div className="container mx-auto px-6 relative z-10">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-16">
                    <div className="lg:col-span-5">
                        <div className="inline-block mb-4 text-[11px] font-black tracking-widest text-blue-500 uppercase">Get In Touch</div>
                        <h2 className="font-heading text-5xl font-black text-white mb-8 leading-tight">Ready to Boost <br/>Your <span className="text-blue-500">Business?</span></h2>
                        <p className="text-slate-400 mb-12 text-lg">Contact Chestha IT Solution today for a free consultation and project quote.</p>
                        
                        <div className="space-y-8">
                            <div className="flex items-center gap-6 p-6 bg-slate-900/50 rounded-2xl border border-slate-800">
                                <div className="p-4 bg-blue-600/10 rounded-xl text-blue-500"><Mail size={24} /></div>
                                <div>
                                    <h4 className="font-bold text-white uppercase text-xs tracking-widest mb-1">Email Inquiry</h4>
                                    <p className="text-slate-300 font-medium">info@chesthaitsolution.in</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-6 p-6 bg-slate-900/50 rounded-2xl border border-slate-800">
                                <div className="p-4 bg-blue-600/10 rounded-xl text-blue-500"><Phone size={24} /></div>
                                <div>
                                    <h4 className="font-bold text-white uppercase text-xs tracking-widest mb-1">Call Support</h4>
                                    <p className="text-slate-300 font-medium">+91 98765 43210</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-6 p-6 bg-slate-900/50 rounded-2xl border border-slate-800">
                                <div className="p-4 bg-blue-600/10 rounded-xl text-blue-500"><MapPin size={24} /></div>
                                <div>
                                    <h4 className="font-bold text-white uppercase text-xs tracking-widest mb-1">HQ Location</h4>
                                    <p className="text-slate-300 font-medium text-sm">Scheme No. 54, Vijay Nagar, Indore, India</p>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div className="lg:col-span-7">
                        <div className="bg-slate-900 p-10 rounded-[2.5rem] border border-slate-800 shadow-2xl relative">
                            <div className="absolute top-0 right-10 -translate-y-1/2 w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center text-white shadow-xl shadow-blue-600/40">
                                <Send size={24} />
                            </div>
                            <h3 className="text-white font-heading text-2xl font-bold mb-8">Tell us about your project</h3>
                            <form className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <input type="text" className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-white focus:border-blue-500 outline-none transition-all" placeholder="Your Name" />
                                    <input type="email" className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-white focus:border-blue-500 outline-none transition-all" placeholder="Your Email" />
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <input type="tel" className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-white focus:border-blue-500 outline-none transition-all" placeholder="Phone Number" />
                                    <select className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-slate-400 focus:border-blue-500 outline-none transition-all appearance-none">
                                        <option>Select Service</option>
                                        <option>Web Development</option>
                                        <option>Mobile App</option>
                                        <option>Digital Marketing</option>
                                        <option>Graphic Design</option>
                                    </select>
                                </div>
                                <textarea rows={4} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-white focus:border-blue-500 outline-none transition-all" placeholder="Briefly describe your requirements..."></textarea>
                                <button className="w-full py-5 bg-blue-600 text-white rounded-xl font-black uppercase tracking-[0.2em] text-xs hover:bg-blue-700 transition-all shadow-lg shadow-blue-900/40">
                                    Submit Request
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
             </div>
        </section>
      </main>

      <footer className="bg-slate-950 text-slate-400 py-20 border-t border-slate-900">
        <div className="container mx-auto px-6 grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
            <div className="md:col-span-2">
                <div className="text-white font-heading font-bold text-3xl mb-6 tracking-tighter">CHESTHA <span className="text-blue-600">IT</span></div>
                <p className="text-sm text-slate-500 max-w-sm leading-relaxed mb-8">
                    An ISO 9001:2015 certified IT solutions provider delivering excellence in software development and digital transformation.
                </p>
                <div className="flex gap-4">
                    {[1,2,3,4].map(i => <div key={i} className="w-10 h-10 bg-slate-900 border border-slate-800 rounded-full flex items-center justify-center hover:bg-blue-600 hover:text-white transition-all cursor-pointer">?</div>)}
                </div>
            </div>
            <div>
                <h4 className="text-white font-bold mb-8 uppercase text-xs tracking-widest">Main Services</h4>
                <ul className="space-y-4 text-xs font-bold uppercase tracking-tight">
                    <li><a href="#" className="hover:text-blue-500 transition-colors">Web Designing</a></li>
                    <li><a href="#" className="hover:text-blue-500 transition-colors">Web Development</a></li>
                    <li><a href="#" className="hover:text-blue-500 transition-colors">Mobile App Dev</a></li>
                    <li><a href="#" className="hover:text-blue-500 transition-colors">Digital Marketing</a></li>
                    <li><a href="#" className="hover:text-blue-500 transition-colors">Graphic Design</a></li>
                </ul>
            </div>
            <div>
                <h4 className="text-white font-bold mb-8 uppercase text-xs tracking-widest">Company</h4>
                <ul className="space-y-4 text-xs font-bold uppercase tracking-tight">
                    <li><a href="#about" onClick={scrollToSection('about')} className="hover:text-blue-500 transition-colors">About Us</a></li>
                    <li><a href="#" className="hover:text-blue-500 transition-colors">Our Team</a></li>
                    <li><a href="#" className="hover:text-blue-500 transition-colors">Latest Works</a></li>
                    <li><a href="#" className="hover:text-blue-500 transition-colors">Career</a></li>
                    <li><a href="#contact" onClick={scrollToSection('contact')} className="hover:text-blue-500 transition-colors">Contact</a></li>
                </ul>
            </div>
        </div>
        <div className="container mx-auto px-6 pt-12 border-t border-slate-900 flex flex-col md:flex-row justify-between items-center gap-4 text-[10px] font-bold uppercase tracking-widest text-slate-600">
            <div>© 2024 Chestha IT Solution. All rights reserved.</div>
            <div className="flex gap-8">
                <a href="#" className="hover:text-blue-500">Privacy Policy</a>
                <a href="#" className="hover:text-blue-500">Terms of Service</a>
            </div>
        </div>
      </footer>

      {/* Scroll to Top Button */}
      <button
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        className={`fixed bottom-8 left-8 z-40 p-4 bg-slate-800 text-white rounded-full shadow-2xl border border-slate-700 hover:bg-blue-600 hover:border-blue-500 transition-all duration-500 transform ${
          showScrollTop ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10 pointer-events-none'
        }`}
      >
        <ArrowUp size={20} />
      </button>

    </div>
  );
};

export default App;
