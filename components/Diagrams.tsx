
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Target, Search, Share2, BarChart, Zap, Users, TrendingUp, Code, Smartphone, Layout, Globe, Settings, Database } from 'lucide-react';

// --- SERVICE MATRIX ---
export const ServicesGrid: React.FC = () => {
  const [activeService, setActiveService] = useState<number | null>(null);
  
  const services = [
    { id: 1, name: 'Web Dev', icon: <Code size={20} />, color: 'bg-blue-500', desc: 'Custom enterprise websites.' },
    { id: 2, name: 'Mobile App', icon: <Smartphone size={20} />, color: 'bg-blue-600', desc: 'iOS & Android excellence.' },
    { id: 3, name: 'E-commerce', icon: <Layout size={20} />, color: 'bg-blue-400', desc: 'Scale your online store.' },
    { id: 4, name: 'SEO', icon: <Globe size={20} />, color: 'bg-blue-700', desc: 'Rank higher, grow faster.' },
    { id: 5, name: 'Graphic Design', icon: <Settings size={20} />, color: 'bg-sky-500', desc: 'Visual brand storytelling.' },
    { id: 6, name: 'IT Consult', icon: <Database size={20} />, color: 'bg-indigo-600', desc: 'Expert technical strategy.' },
  ];

  return (
    <div className="flex flex-col items-center p-8 bg-slate-900/50 rounded-2xl shadow-xl border border-slate-800 backdrop-blur-sm my-8">
      <h3 className="font-heading text-xl mb-4 text-white uppercase tracking-wider">IT Expertise</h3>
      <p className="text-sm text-slate-400 mb-8 text-center max-w-md">
        Explore our specialized technology stack designed to drive business efficiency.
      </p>
      
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 w-full max-w-md">
        {services.map((service) => (
          <motion.button
            key={service.id}
            onHoverStart={() => setActiveService(service.id)}
            onHoverEnd={() => setActiveService(null)}
            className={`relative p-6 rounded-xl border border-slate-800 flex flex-col items-center gap-3 transition-all duration-300 ${activeService === service.id ? 'bg-slate-800 border-blue-500/50 scale-105 z-10' : 'bg-slate-900 hover:bg-slate-800'}`}
          >
             <div className={`p-3 rounded-lg text-white ${service.color} bg-opacity-20`}>
                <span className={service.color.replace('bg-', 'text-')}>{service.icon}</span>
             </div>
             <span className="text-slate-200 font-bold text-xs uppercase tracking-tight">{service.name}</span>
             
             {activeService === service.id && (
                <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="absolute inset-0 bg-slate-950/95 rounded-xl flex items-center justify-center p-4 text-center border border-blue-500/30"
                >
                    <p className="text-xs text-blue-300 font-medium">{service.desc}</p>
                </motion.div>
             )}
          </motion.button>
        ))}
      </div>
    </div>
  );
};

// --- PROCESS FLOW ---
export const ProcessFlow: React.FC = () => {
  const [step, setStep] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
        setStep(s => (s + 1) % 4);
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  const steps = [
      { label: 'Analyze', icon: <Search size={16}/> },
      { label: 'Design', icon: <Layout size={16}/> },
      { label: 'Develop', icon: <Code size={16}/> },
      { label: 'Deliver', icon: <Zap size={16}/> },
  ];

  return (
    <div className="flex flex-col items-center p-8 bg-slate-950 rounded-2xl border border-slate-900 my-8 shadow-2xl">
      <h3 className="font-heading text-xl mb-4 text-white uppercase tracking-wider">Software Lifecycle</h3>
      <p className="text-sm text-slate-400 mb-8 text-center max-w-md">
        A systematic approach to project delivery ensuring zero friction and high quality.
      </p>

      <div className="relative w-full flex items-center justify-between gap-2 md:gap-4 mb-8 px-4">
         <div className="absolute top-1/2 left-0 w-full h-0.5 bg-slate-800 -translate-y-1/2 rounded-full overflow-hidden">
             <motion.div 
                className="h-full bg-blue-500"
                initial={{ width: '0%' }}
                animate={{ width: `${(step / 3) * 100}%` }}
                transition={{ duration: 0.5 }}
             />
         </div>

         {steps.map((s, i) => (
             <div key={i} className="relative z-10 flex flex-col items-center gap-3">
                 <motion.div 
                    className={`w-12 h-12 rounded-xl border flex items-center justify-center transition-colors duration-500 ${i <= step ? 'bg-blue-600 border-blue-500 text-white shadow-[0_0_15px_rgba(37,99,235,0.4)]' : 'bg-slate-950 border-slate-800 text-slate-600'}`}
                    animate={{ scale: i === step ? 1.15 : 1 }}
                 >
                    {s.icon}
                 </motion.div>
                 <span className={`text-[10px] font-bold uppercase tracking-widest ${i <= step ? 'text-blue-400' : 'text-slate-600'}`}>{s.label}</span>
             </div>
         ))}
      </div>

      <div className="h-14 w-full max-w-sm bg-slate-900/50 rounded-lg flex items-center justify-center border border-slate-800">
         <AnimatePresence mode="wait">
             <motion.p 
                key={step}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="text-xs text-slate-300 text-center px-4"
             >
                {step === 0 && "Requirement gathering and system architecture planning..."}
                {step === 1 && "UI/UX wireframing and interactive prototyping..."}
                {step === 2 && "Agile development using modern tech stacks..."}
                {step === 3 && "Rigorous testing and successful cloud deployment..."}
             </motion.p>
         </AnimatePresence>
      </div>
    </div>
  );
};

// --- ROI CHART ---
export const RoiChart: React.FC = () => {
    const data = [
        { month: 'Start', value: 15 },
        { month: 'Q1', value: 45 },
        { month: 'Q2', value: 75 },
        { month: 'Q3', value: 110 },
        { month: 'Q4', value: 160 },
    ];

    return (
        <div className="flex flex-col md:flex-row gap-8 items-center p-8 bg-slate-900 rounded-2xl my-8 border border-slate-800 shadow-2xl w-full">
            <div className="flex-1">
                <div className="inline-block px-3 py-1 bg-blue-500/10 border border-blue-500/20 rounded-full text-blue-400 text-[10px] font-bold mb-4 uppercase tracking-widest">
                    Enterprise Scaling
                </div>
                <h3 className="font-heading text-2xl mb-2 text-white font-bold">Project Success Rate</h3>
                <p className="text-slate-400 text-sm mb-6 leading-relaxed">
                    Chestha IT Solution has a proven track record of delivering <strong className="text-white">99% on-time deployment</strong> for complex enterprise systems.
                </p>
                <div className="flex items-center gap-4">
                     <div className="text-center">
                         <div className="text-2xl font-bold text-white">500+</div>
                         <div className="text-[10px] text-slate-500 uppercase font-bold">Solutions</div>
                     </div>
                     <div className="w-[1px] h-8 bg-slate-800"></div>
                     <div className="text-center">
                         <div className="text-2xl font-bold text-blue-400">100%</div>
                         <div className="text-[10px] text-slate-500 uppercase font-bold">Satisfaction</div>
                     </div>
                </div>
            </div>
            
            <div className="relative w-full md:w-80 h-64 bg-slate-950 rounded-xl border border-slate-800 p-6 flex items-end justify-between gap-2">
                {data.map((d, i) => (
                    <div key={i} className="flex-1 flex flex-col justify-end h-full group">
                        <motion.div 
                            className="w-full bg-gradient-to-t from-blue-700 to-blue-400 rounded-t-md relative overflow-hidden group-hover:from-blue-600 transition-all duration-300"
                            initial={{ height: 0 }}
                            whileInView={{ height: `${(d.value / 180) * 100}%` }}
                            transition={{ duration: 1, delay: i * 0.1, type: 'spring' }}
                        >
                             <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-500"></div>
                        </motion.div>
                        <div className="mt-2 text-[9px] text-slate-600 font-bold text-center uppercase tracking-tighter">{d.month}</div>
                    </div>
                ))}
            </div>
        </div>
    )
}
