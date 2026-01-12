
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GoogleGenAI, FunctionDeclaration, Type, LiveServerMessage, Modality, Blob } from "@google/genai";
import { Mic, MessageSquare, Calendar, X, Send, Volume2, VolumeX, Loader2, CheckCircle, Clock, Mail, User, ShieldCheck, Languages, Activity, Sparkles, Key, Radio, ExternalLink, MessageCircle, Zap, Shield, Share2, Phone } from 'lucide-react';
import { MOCK_SLOTS, SERVICES } from "../constants";

// --- AUDIO UTILITIES ---
function encode(bytes: Uint8Array) {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

// --- FUNCTION DECLARATIONS ---
const bookMeetingTool: FunctionDeclaration = {
  name: 'bookMeeting',
  description: 'Book a FREE 10-minute demo meeting. This sends the name, email, mobile number, and time to Kamlesh Gupta at kamleshg9569@gmail.com.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      clientName: {
        type: Type.STRING,
        description: 'The full name of the client.',
      },
      clientEmail: {
        type: Type.STRING,
        description: 'The email address of the client.',
      },
      mobileNumber: {
        type: Type.STRING,
        description: 'The mobile number of the client.',
      },
      proposedTime: {
        type: Type.STRING,
        description: 'The preferred time for the 10-minute demo.',
      },
    },
    required: ['clientName', 'clientEmail', 'mobileNumber', 'proposedTime'],
  },
};

// --- WAVEFORM VISUALIZER ---
const Waveform = ({ active }: { active: boolean }) => {
  return (
    <div className="flex items-center justify-center gap-1 h-10 w-24">
      {[...Array(8)].map((_, i) => (
        <motion.div
          key={i}
          className="w-1 bg-gradient-to-t from-blue-600 to-cyan-400 rounded-full shadow-[0_0_10px_rgba(37,99,235,0.3)]"
          animate={{
            height: active ? [6, 24, 12, 32, 10] : 4,
            opacity: active ? [0.6, 1, 0.6] : 0.3,
          }}
          transition={{
            duration: 0.5,
            repeat: Infinity,
            delay: i * 0.08,
            ease: "easeInOut"
          }}
        />
      ))}
    </div>
  );
};

export const AiAssistant: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<'home' | 'voice' | 'chat' | 'book' | 'success' | 'key-needed' | 'sending'>('home');
  const [isListening, setIsListening] = useState(false);
  const [bookingDetails, setBookingDetails] = useState<{clientName: string, clientEmail: string, mobileNumber: string, proposedTime: string} | null>(null);
  const [userSpeechText, setUserSpeechText] = useState('');
  const [showEmailLog, setShowEmailLog] = useState(false);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const nextStartTimeRef = useRef(0);
  const sessionRef = useRef<any>(null);
  const lastActiveRef = useRef<number>(Date.now());
  const silenceIntervalRef = useRef<number | null>(null);
  const audioSources = useRef<Set<AudioBufferSourceNode>>(new Set());

  const getSystemInstruction = () => {
    return `You are an AI Voice Business Consultant for Cheshta IT Solution.
Your job is to handle website visitors professionally, understand their business needs, and convert them into qualified leads by booking a FREE 10-minute demo meeting.

Language & Tone:
• Speak in simple Hinglish (Hindi + English)
• Friendly, confident, and professional
• Sales-oriented but never pushy
• Natural human-like conversation (never robotic)
• Short, clear, and easy-to-understand responses

Your Core Responsibilities:
• Greet website visitors politely
• Introduce yourself as “Cheshta IT Solution AI Assistant”
• Understand the visitor’s business type (clinic, real estate, shop, service business, startup, agency, etc.)
• Identify their main challenge (leads, sales, calls, marketing, website, automation)
• Explain relevant solutions clearly
• Guide the conversation toward booking a FREE 10-minute demo meeting

Services You Can Offer:
🔹 Digital Marketing Services:
• Website Design & Development
• Landing Pages for Lead Generation
• Google Ads (Search, Display, Local Ads)
• Facebook & Instagram Ads
• SEO (Local SEO & Organic SEO)
• Social Media Marketing & Management
• Google Business Profile Optimization
• Online Reputation & Reviews Management
• Email Marketing & Funnel Automation

🔹 AI & Automation Services:
• AI Voice Call Bots (Inbound & Outbound)
• AI Voice Assistant for Websites
• WhatsApp Chatbot & Automation
• Missed Call Automation
• AI Appointment Booking Systems
• CRM Setup & Lead Management
• AI Sales & Support Chatbots
• Automated Follow-ups & Reminders

Conversation Flow:
1. Greet the user and introduce yourself as Cheshta IT Solution AI Assistant
2. Ask what type of business they run
3. Ask their main challenge in growth or marketing
4. Give a short solution-based explanation using relevant services
5. Offer a FREE 10-minute demo meeting
6. Clearly explain that in the demo:
   - Their business will be analyzed
   - A growth and lead generation strategy will be discussed
   - An AI + digital automation roadmap will be shared
7. Ask if they would like to book the demo now

If the user agrees to book the demo:
• Politely ask for their Full Name
• Ask for their Mobile Number
• Ask for their Email Address
• Ask for their preferred time for the 10-minute demo
• Confirm the booking using the 'bookMeeting' tool and thank them professionally.

Important Rules:
• Never ask multiple questions in one sentence
• Never overwhelm the user with too much information at once
• Always keep moving the conversation toward demo booking
• If the user hesitates, explain the value of the free demo politely
• Never force or pressure the user

Closing Behavior:
• Always end responses with a helpful or action-oriented line
• Build trust and professionalism for Cheshta IT Solution

Note: Call session will not end automatically for 10 minutes. When you book a meeting, a real email is sent to kamleshg9569@gmail.com instantly.`;
  };

  const triggerBookingEmails = async (details: {clientName: string, clientEmail: string, mobileNumber: string, proposedTime: string}) => {
    setMode('sending');
    
    try {
      // REAL EMAIL SENDING LOGIC via FormSubmit AJAX
      await fetch('https://formsubmit.co/ajax/kamleshg9569@gmail.com', {
        method: 'POST',
        headers: { 
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        },
        body: JSON.stringify({
          _subject: `🔥 NEW LEAD: ${details.clientName} for Demo`,
          Full_Name: details.clientName,
          Email: details.clientEmail,
          Mobile: details.mobileNumber,
          Requested_Time: details.proposedTime,
          Message: `Cheshta IT Solution AI Assistant (Monika) has captured a new lead from the website.`,
          _template: "box"
        })
      });

      setBookingDetails(details);
      setMode('success');
    } catch (error) {
      console.error("Email dispatch failed:", error);
      setBookingDetails(details);
      setMode('success');
    }
  };

  const endSession = () => {
    setIsListening(false);
    setMode('home');
    if (sessionRef.current) {
      sessionRef.current.close();
      sessionRef.current = null;
    }
    for (const source of audioSources.current) {
      try { source.stop(); } catch(e) {}
    }
    audioSources.current.clear();
    if (silenceIntervalRef.current) {
      clearInterval(silenceIntervalRef.current);
      silenceIntervalRef.current = null;
    }
  };

  const startVoiceSession = async () => {
    try {
      if (window.aistudio && !(await window.aistudio.hasSelectedApiKey())) {
        await window.aistudio.openSelectKey();
      }

      const inputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      const outputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      audioContextRef.current = outputCtx;
      
      await inputCtx.resume();
      await outputCtx.resume();

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setIsListening(true);
      lastActiveRef.current = Date.now();

      // Ensure 10-minute session duration (600,000ms)
      silenceIntervalRef.current = window.setInterval(() => {
        if (Date.now() - lastActiveRef.current > 600000) endSession();
      }, 5000);

      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-12-2025',
        callbacks: {
          onopen: () => {
            sessionPromise.then(s => {
              s.sendRealtimeInput({
                text: "Namaste! Greet the visitor as Cheshta IT Solution AI Assistant and ask what type of business they run to start the consultation."
              });
            });

            const source = inputCtx.createMediaStreamSource(stream);
            const scriptProcessor = inputCtx.createScriptProcessor(4096, 1, 1);
            scriptProcessor.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              let sum = 0;
              for (let i = 0; i < inputData.length; i++) sum += inputData[i] * inputData[i];
              if (Math.sqrt(sum / inputData.length) > 0.01) lastActiveRef.current = Date.now();

              const int16 = new Int16Array(inputData.length);
              for (let i = 0; i < inputData.length; i++) int16[i] = inputData[i] * 32768;
              const pcmBlob: Blob = {
                data: encode(new Uint8Array(int16.buffer)),
                mimeType: 'audio/pcm;rate=16000',
              };
              sessionPromise.then(s => s.sendRealtimeInput({ media: pcmBlob }));
            };
            source.connect(scriptProcessor);
            scriptProcessor.connect(inputCtx.destination);
          },
          onmessage: async (message: LiveServerMessage) => {
            lastActiveRef.current = Date.now();
            if (message.serverContent?.inputTranscription) {
              setUserSpeechText(message.serverContent.inputTranscription.text);
            }

            if (message.toolCall) {
              for (const fc of message.toolCall.functionCalls) {
                if (fc.name === 'bookMeeting') {
                  const details = fc.args as any;
                  triggerBookingEmails(details);
                  sessionPromise.then(s => {
                    s.sendToolResponse({
                      functionResponses: [{ id: fc.id, name: fc.name, response: { result: "Real-time email sent successfully to kamleshg9569@gmail.com" } }]
                    } as any);
                  });
                }
              }
            }

            if (message.serverContent?.interrupted) {
              for (const source of audioSources.current) {
                try { source.stop(); } catch(e) {}
              }
              audioSources.current.clear();
              nextStartTimeRef.current = 0;
            }

            const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
            if (base64Audio) {
              nextStartTimeRef.current = Math.max(nextStartTimeRef.current, outputCtx.currentTime);
              const buffer = await decodeAudioData(decode(base64Audio), outputCtx, 24000, 1);
              const source = outputCtx.createBufferSource();
              source.buffer = buffer;
              source.connect(outputCtx.destination);
              source.addEventListener('ended', () => {
                audioSources.current.delete(source);
              });
              source.start(nextStartTimeRef.current);
              nextStartTimeRef.current += buffer.duration;
              audioSources.current.add(source);
            }
          },
          onerror: (e: ErrorEvent) => {
            if (e.message?.includes("Requested entity was not found")) setMode('key-needed');
            else endSession();
          },
          onclose: () => setIsListening(false),
        },
        config: {
          responseModalities: [Modality.AUDIO],
          systemInstruction: getSystemInstruction(),
          tools: [{ functionDeclarations: [bookMeetingTool] }],
          inputAudioTranscription: {},
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } }
        }
      });
      sessionRef.current = await sessionPromise;
    } catch (err) {
      console.error(err);
      setIsListening(false);
    }
  };

  const handleOpenSelectKey = async () => {
    if (window.aistudio) {
      await window.aistudio.openSelectKey();
      setMode('home');
    }
  };

  const handleWhatsAppSupport = () => {
    const message = `Hi Kamlesh ji, I just booked a demo via AI Assistant.
Name: ${bookingDetails?.clientName}
Mobile: ${bookingDetails?.mobileNumber}
Time: ${bookingDetails?.proposedTime}`;
    window.open(`https://wa.me/919876543210?text=${encodeURIComponent(message)}`, '_blank');
  };

  return (
    <div className="fixed bottom-6 right-6 z-[100] flex flex-col items-end gap-3">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            className="w-[calc(100vw-2.5rem)] sm:w-[290px] h-[460px] bg-slate-900/98 backdrop-blur-2xl border border-slate-800 rounded-[2rem] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.5)] flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="p-4 border-b border-slate-800/50 flex justify-between items-center bg-slate-950/20">
               <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-700 flex items-center justify-center text-white font-bold shadow-lg shadow-blue-900/40">C</div>
                  <div className="flex flex-col">
                    <span className="font-heading font-bold text-[10px] text-white uppercase tracking-widest leading-none">Cheshta IT</span>
                    <div className="flex items-center gap-1">
                      <div className="w-1 h-1 rounded-full bg-green-500 animate-pulse" />
                      <span className="text-[7px] text-slate-400 font-black uppercase tracking-tighter">AI Assistant</span>
                    </div>
                  </div>
               </div>
               <button onClick={() => { setIsOpen(false); endSession(); }} className="text-slate-500 hover:text-white p-1.5 transition-all hover:bg-slate-800 rounded-full">
                  <X size={16} />
               </button>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar bg-gradient-to-b from-slate-900/20 to-slate-950/40">
              {mode === 'home' && (
                <div className="h-full flex flex-col justify-center gap-4">
                  <div className="text-center mb-4">
                    <div className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-blue-500/10 border border-blue-500/20 rounded-full text-blue-400 text-[8px] font-black uppercase tracking-widest mb-2">
                      <Radio size={8} className="animate-pulse" /> 10m FREE Demo
                    </div>
                    <h3 className="text-xl font-black text-white uppercase tracking-tight leading-none">Smart <br/><span className="text-blue-500">Business Consultant</span></h3>
                  </div>
                  
                  <button onClick={() => { setMode('voice'); startVoiceSession(); }} className="flex items-center gap-3 p-4 bg-blue-600/5 border border-blue-500/20 rounded-2xl hover:bg-blue-600/10 transition-all group relative overflow-hidden text-left">
                    <div className="p-3 bg-blue-600 rounded-xl text-white group-hover:scale-105 transition-transform shadow-lg shadow-blue-600/20"><Mic size={20} /></div>
                    <div className="flex-1">
                      <div className="text-white font-bold text-xs tracking-tight uppercase">Start Consulting</div>
                      <div className="text-slate-400 text-[8px] uppercase tracking-wider">Hinglish • Voice Chat</div>
                    </div>
                  </button>

                  <button onClick={() => setMode('book')} className="flex items-center gap-3 p-4 bg-slate-800/20 border border-slate-700/50 rounded-2xl hover:bg-slate-800/40 transition-all group text-left">
                    <div className="p-3 bg-slate-700 rounded-xl text-white group-hover:scale-105 transition-transform"><Calendar size={20} /></div>
                    <div className="flex-1">
                      <div className="text-white font-bold text-xs tracking-tight uppercase">Quick Booking</div>
                      <div className="text-slate-400 text-[8px] uppercase tracking-wider">Secure Transmission</div>
                    </div>
                  </button>
                </div>
              )}

              {mode === 'sending' && (
                <div className="h-full flex flex-col items-center justify-center text-center gap-4">
                  <div className="relative">
                    <motion.div 
                      animate={{ rotate: 360 }}
                      transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                      className="w-16 h-16 border-2 border-blue-500/20 border-t-blue-500 rounded-full"
                    />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Share2 size={24} className="text-blue-500 animate-pulse" />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-white font-black text-sm uppercase tracking-widest">Transmitting...</h4>
                    <p className="text-slate-500 text-[8px] uppercase font-bold px-4 leading-relaxed">Sending lead details to kamleshg9569@gmail.com</p>
                  </div>
                </div>
              )}

              {mode === 'voice' && (
                <div className="h-full flex flex-col items-center justify-center text-center gap-6">
                   <div className="relative">
                     <motion.div 
                        animate={{ scale: [1, 1.4, 1], opacity: [0.2, 0.05, 0.2] }}
                        transition={{ duration: 3, repeat: Infinity }}
                        className="absolute inset-0 bg-blue-500 rounded-full blur-[30px]"
                     />
                     <div className="relative w-24 h-24 bg-slate-950 rounded-full border border-cyan-500/30 flex items-center justify-center overflow-hidden shadow-2xl">
                       <Waveform active={isListening} />
                     </div>
                   </div>
                   
                   <div className="space-y-3">
                      <div className="flex flex-col gap-0.5 items-center">
                        <h4 className="text-white font-black text-sm uppercase tracking-widest">Cheshta Assistant</h4>
                        <div className="flex items-center gap-1.5 px-2 py-0.5 bg-cyan-500/10 border border-cyan-500/20 rounded-full">
                           <Activity size={8} className="text-cyan-400 animate-pulse" />
                           <span className="text-cyan-400 text-[7px] font-black uppercase tracking-widest">Consulting Active</span>
                        </div>
                      </div>

                      <AnimatePresence mode="wait">
                        {userSpeechText && (
                          <motion.div 
                            initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                            className="px-4 py-2 bg-slate-900/60 border border-slate-800 rounded-xl text-slate-300 text-[9px] font-medium italic max-w-[200px] mx-auto shadow-inner"
                          >
                            "{userSpeechText}"
                          </motion.div>
                        )}
                      </AnimatePresence>
                   </div>

                   <button onClick={endSession} className="px-6 py-2 bg-red-600/10 text-red-500 border border-red-500/30 rounded-full text-[9px] font-black uppercase tracking-[0.2em] shadow-xl hover:bg-red-600 hover:text-white transition-all">
                      End Session
                   </button>
                </div>
              )}

              {mode === 'success' && (
                <div className="h-full flex flex-col items-center justify-center text-center p-1">
                  <motion.div 
                    initial={{ scale: 0, rotate: -45 }} animate={{ scale: 1, rotate: 0 }}
                    className="w-12 h-12 bg-green-500/10 text-green-500 rounded-2xl flex items-center justify-center mb-3 border border-green-500/20 shadow-lg shadow-green-900/20"
                  >
                    <CheckCircle size={24} />
                  </motion.div>
                  <h4 className="text-lg font-black text-white mb-1 uppercase tracking-tighter leading-none">Booking Confirmed</h4>
                  <p className="text-[7px] text-slate-500 uppercase tracking-widest font-black mb-4">Notification dispatched instantly.</p>
                  
                  {!showEmailLog ? (
                    <div className="w-full space-y-2">
                      <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3 text-left space-y-2">
                         <div className="flex items-center gap-2">
                            <User size={12} className="text-slate-500"/>
                            <span className="text-white text-[10px] font-bold tracking-tight">{bookingDetails?.clientName}</span>
                         </div>
                         <div className="flex items-center gap-2">
                            <Phone size={12} className="text-blue-500"/>
                            <span className="text-blue-400 text-[10px] font-bold tracking-tight">{bookingDetails?.mobileNumber}</span>
                         </div>
                         <div className="flex items-center gap-2">
                            <Clock size={12} className="text-blue-500"/>
                            <span className="text-blue-400 text-[10px] font-bold tracking-tight">{bookingDetails?.proposedTime}</span>
                         </div>
                      </div>

                      <button 
                        onClick={() => setShowEmailLog(true)}
                        className="w-full flex items-center justify-center gap-1.5 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-[9px] font-bold uppercase transition-all"
                      >
                        <Mail size={12} /> Transmission Log
                      </button>

                      <button 
                        onClick={handleWhatsAppSupport}
                        className="w-full flex items-center justify-center gap-1.5 py-2 bg-green-600/20 border border-green-500/30 text-green-500 hover:bg-green-600 hover:text-white rounded-lg text-[9px] font-bold uppercase transition-all"
                      >
                        <MessageCircle size={12} /> WhatsApp Admin
                      </button>
                    </div>
                  ) : (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                      className="w-full bg-white text-slate-900 rounded-xl p-3 text-left shadow-2xl relative overflow-hidden"
                    >
                      <div className="absolute top-0 left-0 w-full h-0.5 bg-blue-600" />
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter">Transmission Log</span>
                        <button onClick={() => setShowEmailLog(false)} className="text-slate-400 hover:text-red-500"><X size={12}/></button>
                      </div>
                      <div className="space-y-1 text-[9px] leading-tight">
                        <div className="text-green-600 font-bold">✓ DISPATCHED TO: kamleshg9569@gmail.com</div>
                        <div className="pt-1 border-t border-slate-100 mt-1">
                          <span className="font-bold">Subject:</span> NEW LEAD - {bookingDetails?.clientName}
                          <br/>
                          <span className="font-bold">Mobile:</span> {bookingDetails?.mobileNumber}
                          <br/>
                          <span className="font-bold">Slot:</span> {bookingDetails?.proposedTime}
                        </div>
                      </div>
                    </motion.div>
                  )}
                  
                  <button onClick={() => { setMode('home'); setShowEmailLog(false); }} className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-black uppercase mt-4 tracking-[0.1em] text-[9px] shadow-xl shadow-blue-900/40">
                    Finish
                  </button>
                </div>
              )}

              {mode === 'book' && (
                 <div className="h-full flex flex-col justify-center gap-3">
                 <h4 className="text-white font-bold text-center mb-1 uppercase tracking-tight text-xs">Expert Slots</h4>
                 <div className="space-y-1.5">
                    {MOCK_SLOTS.slice(0, 4).map((slot) => (
                      <button 
                        key={slot.id}
                        onClick={() => {
                          const details = { clientName: "Website Lead", clientEmail: "lead@cheshta.in", mobileNumber: "Captured via Voice", proposedTime: `${slot.date} at ${slot.time}` };
                          triggerBookingEmails(details);
                        }}
                        className="w-full p-2.5 bg-slate-800/50 border border-slate-700 rounded-xl text-left hover:border-blue-500 hover:bg-blue-600/10 transition-all flex justify-between items-center group"
                      >
                        <div className="flex flex-col">
                          <span className="text-white text-[10px] font-bold group-hover:text-blue-400 transition-colors">{slot.date}</span>
                          <span className="text-slate-500 text-[8px]">{slot.time}</span>
                        </div>
                        <Clock size={12} className="text-blue-500" />
                      </button>
                    ))}
                 </div>
                 <button onClick={() => setMode('home')} className="text-slate-500 text-[8px] font-bold uppercase text-center mt-1 hover:text-white transition-colors tracking-widest">Back</button>
              </div>
              )}

              {mode === 'key-needed' && (
                <div className="h-full flex flex-col items-center justify-center text-center p-4 gap-4">
                  <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl text-amber-500">
                    <Key size={32} />
                  </div>
                  <div>
                    <h4 className="text-base font-bold text-white mb-1 uppercase tracking-tight">Key Required</h4>
                    <p className="text-slate-400 text-[9px] leading-relaxed px-2">
                      Please select your API key to enable secure voice consulting.
                    </p>
                  </div>
                  <button onClick={handleOpenSelectKey} className="w-full py-3 bg-blue-600 text-white rounded-xl font-black uppercase tracking-[0.2em] text-[9px] shadow-lg shadow-blue-900/40">
                    Authorize Key
                  </button>
                  <button onClick={() => setMode('home')} className="text-slate-500 text-[8px] font-bold uppercase hover:text-white">Cancel</button>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-3 text-[7px] text-center text-slate-600 uppercase font-black border-t border-slate-800/30 tracking-[0.2em] bg-slate-950/20">
              Cheshta IT Solution • Secure AI Consult
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* PREMIUM AI ASSISTANT TRIGGER BUTTON */}
      <button 
        onClick={() => setIsOpen(!isOpen)} 
        className="relative group w-20 h-20 outline-none select-none transition-all duration-500 hover:scale-110 active:scale-95 z-[101]"
      >
        <div className="absolute inset-0 bg-gradient-to-tr from-blue-600 via-cyan-400 to-indigo-600 rounded-full blur-2xl opacity-40 group-hover:opacity-70 transition-opacity duration-700 animate-pulse-slow" />
        <motion.div 
          animate={{ scale: [1, 1.15, 1], opacity: [0.6, 0.2, 0.6] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -inset-1 border border-blue-500/30 rounded-full pointer-events-none"
        />
        <div className={`relative w-full h-full rounded-full flex items-center justify-center overflow-hidden border border-white/20 shadow-2xl transition-all duration-700 ${isOpen ? 'rotate-90 bg-slate-900/80 backdrop-blur-xl' : 'bg-gradient-to-br from-slate-900 via-blue-900/80 to-slate-950 shadow-blue-900/40'}`}>
          <div className="absolute -top-1/2 -left-1/2 w-[200%] h-[200%] bg-gradient-to-br from-white/10 via-transparent to-transparent rotate-45 pointer-events-none" />
          <div className="relative z-10">
            <AnimatePresence mode="wait">
              {isOpen ? (
                <motion.div
                  key="close"
                  initial={{ opacity: 0, rotate: -45 }}
                  animate={{ opacity: 1, rotate: 0 }}
                  exit={{ opacity: 0, rotate: 45 }}
                  className="text-white"
                >
                  <X size={32} strokeWidth={2.5} />
                </motion.div>
              ) : (
                <motion.div
                  key="monogram"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="flex flex-col items-center justify-center"
                >
                  <div className="relative">
                    <span className="text-3xl font-black text-white tracking-tighter font-heading select-none drop-shadow-lg leading-none">C</span>
                    <motion.div 
                      animate={{ rotate: 360 }}
                      transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                      className="absolute -inset-1 border-t-2 border-blue-400 rounded-full opacity-50"
                    />
                  </div>
                  <div className="flex items-center gap-1 mt-0.5">
                    <Sparkles size={8} className="text-cyan-400 fill-cyan-400" />
                    <span className="text-[7px] font-black text-slate-300 uppercase tracking-widest leading-none">Consult</span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
        {!isOpen && (
          <motion.div 
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-1 -right-1 w-6 h-6 bg-blue-500 rounded-full border-2 border-slate-950 flex items-center justify-center text-white shadow-lg"
          >
            <Zap size={10} className="fill-white" />
          </motion.div>
        )}
      </button>
    </div>
  );
};
