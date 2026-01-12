
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GoogleGenAI, FunctionDeclaration, Type, LiveServerMessage, Modality, Blob } from "@google/genai";
import { Mic, MessageSquare, Calendar, X, Send, Volume2, VolumeX, Loader2, CheckCircle, Clock, Mail, User, ShieldCheck, Languages, Activity, Sparkles, Key, Radio, ExternalLink, MessageCircle, Zap, Shield, Share2, Phone, FileText, AlertCircle, Settings } from 'lucide-react';

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
  description: 'Book a FREE 10-minute demo meeting. This instantly sends the full name, email, mobile number, preferred time, and conversation summary to Kamlesh Gupta at kamleshg9569@gmail.com.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      fullName: {
        type: Type.STRING,
        description: 'The full name of the client.',
      },
      mobileNumber: {
        type: Type.STRING,
        description: 'The mobile number of the client.',
      },
      emailAddress: {
        type: Type.STRING,
        description: 'The email address of the client.',
      },
      preferredTime: {
        type: Type.STRING,
        description: 'The preferred time for the 10-minute demo.',
      },
      callSummary: {
        type: Type.STRING,
        description: 'A summary of the business needs and challenges discussed during the call.',
      },
    },
    required: ['fullName', 'mobileNumber', 'emailAddress', 'preferredTime', 'callSummary'],
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
  const [mode, setMode] = useState<'home' | 'voice' | 'chat' | 'book' | 'success' | 'key-needed' | 'sending' | 'error'>('home');
  const [isListening, setIsListening] = useState(false);
  const [bookingDetails, setBookingDetails] = useState<{fullName: string, mobileNumber: string, emailAddress: string, preferredTime: string, callSummary: string} | null>(null);
  const [userSpeechText, setUserSpeechText] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [showSummary, setShowSummary] = useState(false);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const nextStartTimeRef = useRef(0);
  const sessionRef = useRef<any>(null);
  const lastActiveRef = useRef<number>(Date.now());
  const silenceIntervalRef = useRef<number | null>(null);
  const audioSources = useRef<Set<AudioBufferSourceNode>>(new Set());

  const getSystemInstruction = () => {
    return `You are a FEMALE AI Voice Business Consultant for Cheshta IT Solution.

Your job is to handle website visitors professionally, understand their business needs, and convert them into qualified leads by booking a FREE 10-minute demo meeting.

Language & Tone:
• Speak in simple Hinglish (Hindi + English).
• Tone: NATURAL, WARM, CALM, and VERY CLEAR. 
• Use female suffixes in Hindi (e.g., 'main aapki help kar sakti hoon', 'kar rahi hoon').
• Always finish your sentences completely. Never stop abruptly.
• Friendly, confident, and professional.

Your Core Responsibilities:
• Greet visitors naturally.
• Intro: “Cheshta IT Solution AI Assistant”.
• Understand business type & growth challenges.
• Guide toward FREE 10-minute demo booking.

Services:
🔹 Digital Marketing (SEO, Ads, SMM).
🔹 AI & Automation (Voice Bots, CRM, WhatsApp).

Process:
1. Greet naturally.
2. Ask business type.
3. Identify main challenge.
4. Brief solution.
5. Offer & Book Demo (Name, Mobile, Email, Time).`;
  };

  const triggerBookingEmails = async (details: {fullName: string, mobileNumber: string, emailAddress: string, preferredTime: string, callSummary: string}) => {
    setMode('sending');
    try {
      await fetch('https://formsubmit.co/ajax/kamleshg9569@gmail.com', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({
          _subject: `✅ Qualified Lead: ${details.fullName}`,
          Name: details.fullName,
          Mobile: details.mobileNumber,
          Email: details.emailAddress,
          Time: details.preferredTime,
          Summary: details.callSummary,
          Source: "Cheshta Natural AI",
          _template: "table"
        })
      });
      setBookingDetails(details);
      setMode('success');
    } catch (error) {
      setBookingDetails(details);
      setMode('success');
    }
  };

  const endSession = () => {
    setIsListening(false);
    if (sessionRef.current) {
      sessionRef.current.close();
      sessionRef.current = null;
    }
    for (const source of audioSources.current) {
      try { source.stop(); } catch(e) {}
    }
    audioSources.current.clear();
    nextStartTimeRef.current = 0;
    if (silenceIntervalRef.current) {
      clearInterval(silenceIntervalRef.current);
      silenceIntervalRef.current = null;
    }
    if (mode === 'voice') setMode('home');
  };

  const startVoiceSession = async () => {
    try {
      if (window.aistudio && !(await window.aistudio.hasSelectedApiKey())) {
        await window.aistudio.openSelectKey();
      }

      setErrorMsg('');
      const inputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      const outputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      audioContextRef.current = outputCtx;
      
      await inputCtx.resume();
      await outputCtx.resume();

      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      } catch (err: any) {
        setErrorMsg("Microphone permission denied. Please allow access via the Lock icon in the address bar.");
        setMode('error');
        return;
      }

      setIsListening(true);
      lastActiveRef.current = Date.now();

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
                text: "Namaste! Natural tareeke se greet karein aur baat shuru karein. Professional female consultant bankar poochein ki wo kis tarah ka business handle karte hain."
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
              sessionPromise.then(s => {
                if(s) s.sendRealtimeInput({ media: pcmBlob });
              });
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
                  const args = fc.args as any;
                  triggerBookingEmails(args);
                  sessionPromise.then(s => {
                    s.sendToolResponse({
                      functionResponses: [{ id: fc.id, name: fc.name, response: { result: "Success" } }]
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
              // Decode FIRST
              const decodedBytes = decode(base64Audio);
              const buffer = await decodeAudioData(decodedBytes, outputCtx, 24000, 1);
              
              // Schedule SECOND to ensure current time is accurate after async decode
              const now = outputCtx.currentTime;
              const startTime = Math.max(now, nextStartTimeRef.current);
              
              const source = outputCtx.createBufferSource();
              source.buffer = buffer;
              source.connect(outputCtx.destination);
              
              source.onended = () => {
                audioSources.current.delete(source);
              };
              
              source.start(startTime);
              nextStartTimeRef.current = startTime + buffer.duration;
              audioSources.current.add(source);
            }
          },
          onerror: (e: any) => {
            console.error("Live Error:", e);
            if (e.message?.includes("entity was not found")) setMode('key-needed');
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
    } catch (err: any) {
      setIsListening(false);
      setMode('error');
      setErrorMsg(err.message || "Failed to establish voice session.");
    }
  };

  const handleOpenSelectKey = async () => {
    if (window.aistudio) {
      await window.aistudio.openSelectKey();
      setMode('home');
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-[100] flex flex-col items-end gap-3">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            className="w-[calc(100vw-2.5rem)] sm:w-[320px] h-[500px] bg-slate-900/98 backdrop-blur-2xl border border-slate-800 rounded-[2.5rem] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.5)] flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="p-4 border-b border-slate-800/50 flex justify-between items-center bg-slate-950/20">
               <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-600 via-blue-500 to-indigo-700 flex items-center justify-center text-white font-bold shadow-lg shadow-blue-900/40">C</div>
                  <div className="flex flex-col">
                    <span className="font-heading font-bold text-[10px] text-white uppercase tracking-widest leading-none">Cheshta IT Solution</span>
                    <div className="flex items-center gap-1">
                      <div className="w-1 h-1 rounded-full bg-green-500 animate-pulse" />
                      <span className="text-[7px] text-slate-400 font-black uppercase tracking-tighter">Live Assistant</span>
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
                  <div className="text-center mb-4 px-2">
                    <div className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-blue-500/10 border border-blue-500/20 rounded-full text-blue-400 text-[8px] font-black uppercase tracking-widest mb-2">
                      <Zap size={8} className="animate-pulse" /> Natural AI Consult
                    </div>
                    <h3 className="text-xl font-black text-white uppercase tracking-tight leading-none">Smart <br/><span className="text-blue-500">Growth Partner</span></h3>
                    <p className="mt-2 text-slate-500 text-[8px] uppercase tracking-wider font-bold italic">Talk naturally, like a real person</p>
                  </div>
                  
                  <button onClick={() => { setMode('voice'); startVoiceSession(); }} className="flex items-center gap-4 p-5 bg-blue-600/5 border border-blue-500/20 rounded-3xl hover:bg-blue-600/10 transition-all group relative overflow-hidden text-left">
                    <div className="p-4 bg-blue-600 rounded-2xl text-white group-hover:scale-105 transition-transform shadow-lg shadow-blue-600/20"><Mic size={24} /></div>
                    <div className="flex-1">
                      <div className="text-white font-bold text-sm tracking-tight uppercase">Voice Consulting</div>
                      <div className="text-slate-400 text-[9px] uppercase tracking-wider">Female AI • Stable Audio</div>
                    </div>
                  </button>

                  <div className="p-5 bg-slate-800/20 border border-slate-700/50 rounded-3xl flex items-start gap-3">
                     <ShieldCheck size={20} className="text-blue-500 mt-1 shrink-0" />
                     <div>
                        <span className="text-white font-bold text-[10px] uppercase tracking-widest block mb-1">Gapless Experience</span>
                        <p className="text-slate-500 text-[9px] leading-relaxed">Our AI is now optimized for smooth, continuous conversations without interruptions.</p>
                     </div>
                  </div>
                </div>
              )}

              {mode === 'sending' && (
                <div className="h-full flex flex-col items-center justify-center text-center gap-4">
                  <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: "linear" }} className="w-16 h-16 border-2 border-blue-500/20 border-t-blue-500 rounded-full relative">
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Share2 size={20} className="text-blue-500 animate-pulse" />
                    </div>
                  </motion.div>
                  <h4 className="text-white font-black text-sm uppercase tracking-widest">Processing...</h4>
                  <p className="text-slate-500 text-[8px] uppercase font-bold">Saving lead details...</p>
                </div>
              )}

              {mode === 'error' && (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 gap-4">
                  <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-500">
                    <AlertCircle size={32} />
                  </div>
                  <h4 className="text-white font-bold uppercase tracking-tight text-sm">Action Required</h4>
                  <p className="text-slate-400 text-[10px] leading-relaxed mb-4 font-medium">{errorMsg}</p>
                  
                  <div className="space-y-2 w-full">
                    <button onClick={startVoiceSession} className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold uppercase text-[9px] shadow-lg shadow-blue-900/40">
                       Retry Connection
                    </button>
                    <button onClick={() => setMode('home')} className="w-full py-3 bg-slate-800 text-slate-400 rounded-xl font-bold uppercase text-[9px]">Back Home</button>
                  </div>
                </div>
              )}

              {mode === 'voice' && (
                <div className="h-full flex flex-col items-center justify-center text-center gap-6">
                   <div className="relative">
                     <motion.div animate={{ scale: [1, 1.4, 1], opacity: [0.2, 0.05, 0.2] }} transition={{ duration: 3, repeat: Infinity }} className="absolute inset-0 bg-blue-500 rounded-full blur-[40px]" />
                     <div className="relative w-28 h-28 bg-slate-950 rounded-full border border-blue-500/30 flex items-center justify-center overflow-hidden shadow-2xl">
                       <Waveform active={isListening} />
                     </div>
                   </div>
                   
                   <div className="space-y-3 px-2">
                      <div className="flex flex-col gap-0.5 items-center">
                        <h4 className="text-white font-black text-sm uppercase tracking-widest tracking-widest">Stable Session</h4>
                        <div className="flex items-center gap-1.5 px-2 py-0.5 bg-cyan-500/10 border border-cyan-500/20 rounded-full">
                           <Activity size={10} className="text-cyan-400 animate-pulse" />
                           <span className="text-cyan-400 text-[8px] font-black uppercase tracking-tighter">Optimized Voice</span>
                        </div>
                      </div>

                      <AnimatePresence mode="wait">
                        {userSpeechText && (
                          <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="px-4 py-3 bg-slate-900/60 border border-slate-800 rounded-2xl text-slate-300 text-[10px] font-medium italic max-w-[240px] mx-auto shadow-inner leading-relaxed">
                            "{userSpeechText}"
                          </motion.div>
                        )}
                      </AnimatePresence>
                   </div>

                   <button onClick={endSession} className="px-8 py-3 bg-red-600/10 text-red-500 border border-red-500/30 rounded-full text-[10px] font-black uppercase tracking-[0.2em] shadow-xl hover:bg-red-600 hover:text-white transition-all">
                      End Call
                   </button>
                </div>
              )}

              {mode === 'success' && (
                <div className="h-full flex flex-col items-center justify-center text-center p-1">
                  <motion.div initial={{ scale: 0, rotate: -45 }} animate={{ scale: 1, rotate: 0 }} className="w-14 h-14 bg-green-500/10 text-green-500 rounded-2xl flex items-center justify-center mb-4 border border-green-500/20 shadow-lg shadow-green-900/20">
                    <CheckCircle size={28} />
                  </motion.div>
                  <h4 className="text-lg font-black text-white mb-1 uppercase tracking-tighter">Lead Captured</h4>
                  <p className="text-[8px] text-slate-500 uppercase tracking-widest font-black mb-6 px-4">Our team will reach out at {bookingDetails?.preferredTime}.</p>
                  
                  <div className="w-full space-y-3 px-2">
                    <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 text-left space-y-3">
                       <div className="flex items-center gap-3 text-xs font-bold text-white">
                          <User size={14} className="text-blue-500"/> {bookingDetails?.fullName}
                       </div>
                       <div className="flex items-center gap-3 text-xs font-bold text-blue-400">
                          <Clock size={14} className="text-blue-500"/> {bookingDetails?.preferredTime}
                       </div>
                    </div>

                    <button onClick={() => setShowSummary(!showSummary)} className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-[10px] font-bold uppercase transition-all">
                      {showSummary ? 'Hide Summary' : 'View Session Report'}
                    </button>
                    
                    {showSummary && (
                       <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} className="p-3 bg-slate-900 border border-slate-800 rounded-xl text-left">
                          <p className="text-[9px] text-slate-400 italic">"{bookingDetails?.callSummary}"</p>
                       </motion.div>
                    )}
                  </div>
                  
                  <button onClick={() => setMode('home')} className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-2xl font-black uppercase mt-6 tracking-[0.1em] text-[10px]">
                    Done
                  </button>
                </div>
              )}

              {mode === 'key-needed' && (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 gap-5">
                  <div className="p-5 bg-amber-500/10 border border-amber-500/20 rounded-3xl text-amber-500">
                    <Key size={36} />
                  </div>
                  <h4 className="text-base font-bold text-white uppercase tracking-tight">Access Required</h4>
                  <button onClick={handleOpenSelectKey} className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black uppercase tracking-[0.2em] text-[10px]">
                    Select API Key
                  </button>
                </div>
              )}
            </div>

            <div className="p-4 text-[7px] text-center text-slate-600 uppercase font-black border-t border-slate-800/30 tracking-[0.2em] bg-slate-950/20">
              Cheshta IT Solution • Secure AI Hub
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <button onClick={() => setIsOpen(!isOpen)} className="relative group w-20 h-20 outline-none select-none transition-all duration-500 hover:scale-110 active:scale-95 z-[101]">
        <div className="absolute inset-0 bg-gradient-to-tr from-blue-600 via-cyan-400 to-indigo-600 rounded-full blur-3xl opacity-40 group-hover:opacity-70 transition-opacity duration-700" />
        <div className={`relative w-full h-full rounded-full flex items-center justify-center overflow-hidden border border-white/20 shadow-2xl transition-all duration-700 ${isOpen ? 'rotate-90 bg-slate-900/80 backdrop-blur-xl' : 'bg-gradient-to-br from-slate-900 via-blue-900/80 to-slate-950 shadow-blue-900/40'}`}>
          <div className="relative z-10">
            <AnimatePresence mode="wait">
              {isOpen ? (
                <motion.div key="close" initial={{ opacity: 0, rotate: -45 }} animate={{ opacity: 1, rotate: 0 }} exit={{ opacity: 0, rotate: 45 }} className="text-white">
                  <X size={36} strokeWidth={2.5} />
                </motion.div>
              ) : (
                <motion.div key="monogram" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }} className="flex flex-col items-center justify-center">
                  <div className="relative">
                    <span className="text-3xl font-black text-white tracking-tighter font-heading select-none drop-shadow-lg leading-none">C</span>
                    <motion.div animate={{ rotate: 360 }} transition={{ duration: 10, repeat: Infinity, ease: "linear" }} className="absolute -inset-2 border-t-2 border-blue-400 rounded-full opacity-40" />
                  </div>
                  <div className="flex items-center gap-1 mt-1">
                    <Sparkles size={8} className="text-cyan-400 fill-cyan-400" />
                    <span className="text-[8px] font-black text-slate-300 uppercase tracking-widest leading-none">Consult</span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </button>
    </div>
  );
};
