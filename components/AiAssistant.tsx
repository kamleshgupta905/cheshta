
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GoogleGenAI, FunctionDeclaration, Type, LiveServerMessage, Modality, Blob } from "@google/genai";
import { 
  X, CheckCircle, Phone, AlertCircle, 
  ChevronDown, Mic
} from 'lucide-react';

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

interface AvatarMetrics {
  volume: number;
}

const AGENT_IMAGE = "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?q=80&w=300&h=300&auto=format&fit=crop";

// --- MAIN AI ASSISTANT ---
const bookDemoTool: FunctionDeclaration = {
  name: 'bookDemoMeeting',
  description: 'Book a FREE 10-minute demo meeting with Cheshta IT Solution.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      fullName: { type: Type.STRING },
      mobileNumber: { type: Type.STRING },
      emailAddress: { type: Type.STRING },
      preferredTime: { type: Type.STRING },
    },
    required: ['fullName', 'mobileNumber', 'emailAddress', 'preferredTime'],
  },
};

const CHESHTA_SYSTEM_INSTRUCTION = `You are an AI Voice Business Consultant for Cheshta IT Solution.
Your job is to handle website visitors professionally, understand their business needs, and convert them into qualified leads by booking a FREE 10-minute demo meeting.

Language & Tone:
• Speak in simple Hinglish (Hindi + English)
• Friendly, confident, and professional
• Natural human-like conversation (never robotic)
• Short, clear, and easy-to-understand responses

Persona Details:
• GENDER: You are FEMALE. Use feminine grammar in Hindi naturally (e.g. use "karti hoon", "sakati hoon", "rahi hoon").
• VISITOR: Assume the visitor is MALE. Address him as "Sir" or use masculine Hindi grammar when referring to him (e.g., "Aap kaise hain?", "Kya aap bata sakte hain?").
• IDENTITY: You work FOR Cheshta IT Solution. You are a consultant, NOT the owner.

Your Core Responsibilities:
• Greet website visitors politely.
• Introduce yourself as “Cheshta IT Solution AI Assistant”.
• Understand the visitor’s business type.
• Identify their main challenge (leads, sales, marketing, automation).
• Explain relevant solutions clearly.
• Guide the conversation toward booking a FREE 10-minute demo meeting.

Services You Can Offer:
🔹 Digital Marketing: Web Dev, SEO, Google/FB Ads, Social Media.
🔹 AI & Automation: Voice Call Bots, AI Assistants, WhatsApp Automation.

Conversation Flow:
1. Greet the visitor as "Sir" and introduce yourself.
2. Ask about his business type.
3. Ask about his growth challenges.
4. Provide a solution and offer the FREE 10-minute demo.
5. Explain demo value: Analysis, Strategy, and Roadmap.
6. Book details if agreed: Name -> Mobile -> Email -> Preferred Time.
7. Confirm professionally.

Important Rules:
• Never ask multiple questions at once.
• Keep moving toward the demo booking.
• Consistently use feminine grammar for yourself and masculine for the user.`;

export const AiAssistant: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<'intro' | 'voice' | 'success' | 'key-needed' | 'sending' | 'error'>('intro');
  const [isListening, setIsListening] = useState(false);
  const [userSpeechText, setUserSpeechText] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [metrics, setMetrics] = useState<AvatarMetrics>({ volume: 0 });
  
  const analyserRef = useRef<AnalyserNode | null>(null);
  const nextStartTimeRef = useRef(0);
  const sessionRef = useRef<any>(null);
  const audioSources = useRef<Set<AudioBufferSourceNode>>(new Set());
  const frameRef = useRef<number | null>(null);

  const monitorAudio = () => {
    if (analyserRef.current) {
      const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
      analyserRef.current.getByteFrequencyData(dataArray);
      let total = 0;
      for (let i = 0; i < dataArray.length; i++) total += dataArray[i] / 255;
      setMetrics({ volume: total / dataArray.length });
    }
    frameRef.current = requestAnimationFrame(monitorAudio);
  };

  useEffect(() => {
    if (mode === 'voice') frameRef.current = requestAnimationFrame(monitorAudio);
    else { if (frameRef.current) cancelAnimationFrame(frameRef.current); setMetrics({ volume: 0 }); }
    return () => { if (frameRef.current) cancelAnimationFrame(frameRef.current); };
  }, [mode]);

  const endSession = () => {
    setIsListening(false);
    if (sessionRef.current) { sessionRef.current.close(); sessionRef.current = null; }
    for (const source of audioSources.current) try { source.stop(); } catch(e) {}
    audioSources.current.clear();
    nextStartTimeRef.current = 0;
    setUserSpeechText('');
    setMode('intro');
  };

  const startVoiceSession = async () => {
    setMode('voice');
    try {
      if ((window as any).aistudio && !(await (window as any).aistudio.hasSelectedApiKey())) {
        await (window as any).aistudio.openSelectKey();
      }
      const inputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      const outputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      const analyser = outputCtx.createAnalyser();
      analyser.fftSize = 256;
      analyser.connect(outputCtx.destination);
      analyserRef.current = analyser;
      await inputCtx.resume();
      await outputCtx.resume();
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setIsListening(true);
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-12-2025',
        callbacks: {
          onopen: () => {
            // Direct instruction to ensure it stays in character and addresses user correctly
            const trigger = "Greet the male visitor as 'Sir' professionally. Introduce yourself as the Cheshta IT Solution AI Assistant (female voice). Ask him what business he runs.";
            sessionPromise.then(s => s.sendRealtimeInput({ text: trigger }));
            const source = inputCtx.createMediaStreamSource(stream);
            const scriptProcessor = inputCtx.createScriptProcessor(4096, 1, 1);
            scriptProcessor.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              const int16 = new Int16Array(inputData.length);
              for (let i = 0; i < inputData.length; i++) int16[i] = inputData[i] * 32768;
              sessionPromise.then(s => s.sendRealtimeInput({ media: { data: encode(new Uint8Array(int16.buffer)), mimeType: 'audio/pcm;rate=16000' } }));
            };
            source.connect(scriptProcessor);
            scriptProcessor.connect(inputCtx.destination);
          },
          onmessage: async (message: LiveServerMessage) => {
            if (message.serverContent?.inputTranscription) setUserSpeechText(prev => (prev + ' ' + message.serverContent!.inputTranscription!.text).trim());
            if (message.toolCall) {
              for (const fc of message.toolCall.functionCalls) {
                if (fc.name === 'bookDemoMeeting') {
                   setMode('sending');
                   try {
                     await fetch('https://formsubmit.co/ajax/kamleshg9569@gmail.com', { 
                       method: 'POST', 
                       headers: { 'Content-Type': 'application/json' }, 
                       body: JSON.stringify({
                         ...fc.args,
                         _subject: "Meeting Booked: Cheshta IT Solution Demo",
                         _cc: fc.args.emailAddress, 
                         message: `A new demo meeting has been scheduled.\n\nVisitor: ${fc.args.fullName}\nEmail: ${fc.args.emailAddress}\nMobile: ${fc.args.mobileNumber}\nTime: ${fc.args.preferredTime}\n\nLead generated by Cheshta AI.`
                       }) 
                     });
                   } catch (e) { console.error("Notification error"); }
                   setMode('success');
                   sessionPromise.then(s => s.sendToolResponse({ functionResponses: { id: fc.id, name: fc.name, response: { result: "confirmed" } } }));
                }
              }
            }
            const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
            if (base64Audio) {
              const buffer = await decodeAudioData(decode(base64Audio), outputCtx, 24000, 1);
              const startTime = Math.max(outputCtx.currentTime, nextStartTimeRef.current);
              const source = outputCtx.createBufferSource();
              source.buffer = buffer;
              source.connect(analyser);
              source.onended = () => audioSources.current.delete(source);
              source.start(startTime);
              nextStartTimeRef.current = startTime + buffer.duration;
              audioSources.current.add(source);
            }
          },
          onerror: (e: any) => e.message?.includes("entity") ? setMode('key-needed') : endSession(),
          onclose: () => setIsListening(false),
        },
        config: {
          responseModalities: [Modality.AUDIO],
          systemInstruction: CHESHTA_SYSTEM_INSTRUCTION,
          tools: [{ functionDeclarations: [bookDemoTool] }],
          inputAudioTranscription: {},
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } }
        }
      });
      sessionRef.current = await sessionPromise;
    } catch (err: any) { setMode('error'); setErrorMsg("Sync interrupted."); }
  };

  return (
    <div className="fixed bottom-8 right-8 z-[100] flex flex-col items-end gap-4">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 30 }}
            className="w-[calc(100vw-3rem)] sm:w-[310px] h-[480px] bg-white rounded-[2.5rem] shadow-[0_20px_60px_rgba(0,0,0,0.15)] flex flex-col overflow-hidden border border-slate-100"
          >
            <div className="bg-[#1a1a3a] px-5 py-3.5 flex justify-between items-center text-white shrink-0">
               <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full overflow-hidden border border-white/20">
                    <img src={AGENT_IMAGE} alt="Consultant" className="w-full h-full object-cover" />
                  </div>
                  <div className="flex flex-col">
                    <span className="font-bold text-[13px] tracking-tight">Cheshta IT</span>
                    <div className="flex items-center gap-1">
                       <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full" />
                       <span className="text-[9px] text-emerald-400 font-bold uppercase tracking-wider leading-none">Online</span>
                    </div>
                  </div>
               </div>
               <button onClick={() => { setIsOpen(false); endSession(); }} className="p-1 hover:bg-white/10 rounded-full transition-colors">
                 <ChevronDown size={20} />
               </button>
            </div>

            <div className="flex-1 flex flex-col items-center bg-white px-6 py-6 text-center">
              <div className="flex-1 flex flex-col items-center w-full">
                <div className="relative mb-4">
                  <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-white shadow-[0_10px_30px_rgba(0,0,0,0.1)]">
                    <img src={AGENT_IMAGE} alt="Agent Big" className="w-full h-full object-cover" />
                  </div>
                  <div className="absolute bottom-1 right-1 w-5 h-5 bg-emerald-400 rounded-full border-4 border-white shadow-sm" />
                </div>
                
                <h3 className="text-[#1a1a3a] font-bold text-base tracking-tight mb-1">AI Business Consultant</h3>
                <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-6">Empowering Your Growth</p>

                <div className="w-full flex-1 flex flex-col items-center justify-center">
                  {mode === 'intro' && (
                    <div className="w-full px-2">
                      <p className="text-slate-500 text-xs mb-6 leading-relaxed">Book a FREE 10-minute demo to analyze your business growth strategy.</p>
                      <button 
                        onClick={startVoiceSession} 
                        className="w-full py-4 bg-[#1a1a3a] hover:bg-[#252555] text-white font-bold rounded-2xl flex items-center justify-center gap-3 transition-all shadow-xl active:scale-95"
                      >
                         <div className="flex gap-0.5 items-center">
                           <motion.div animate={{ height: [8, 16, 8] }} transition={{ duration: 0.6, repeat: Infinity }} className="w-0.5 bg-emerald-400" />
                           <motion.div animate={{ height: [14, 6, 14] }} transition={{ duration: 0.6, repeat: Infinity, delay: 0.1 }} className="w-0.5 bg-emerald-400" />
                           <motion.div animate={{ height: [18, 10, 18] }} transition={{ duration: 0.6, repeat: Infinity, delay: 0.2 }} className="w-0.5 bg-emerald-400" />
                         </div>
                         <span className="text-[14px]">Call us here</span>
                      </button>
                    </div>
                  )}

                  {mode === 'voice' && (
                    <div className="flex flex-col items-center gap-6 w-full">
                       <p className="text-slate-400 text-xs font-medium italic">Consultant is speaking...</p>
                       <AnimatePresence>
                        {userSpeechText && (
                          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="px-4 py-2 bg-slate-50 rounded-xl text-slate-500 text-[11px] text-center max-w-full italic">
                            "{userSpeechText}"
                          </motion.div>
                        )}
                       </AnimatePresence>
                       <div className="flex items-center gap-4 mt-2">
                          <button className="w-11 h-11 rounded-full border border-slate-100 flex items-center justify-center text-slate-300">
                             <Mic size={18} />
                          </button>
                          <button onClick={endSession} className="w-11 h-11 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center shadow-lg active:scale-90 transition-all">
                             <Phone size={18} className="rotate-[135deg]" />
                          </button>
                       </div>
                    </div>
                  )}

                  {mode === 'sending' && (
                    <div className="flex flex-col items-center gap-3">
                       <div className="w-8 h-8 border-2 border-[#1a1a3a] border-t-transparent rounded-full animate-spin" />
                       <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">Processing</p>
                    </div>
                  )}

                  {mode === 'success' && (
                    <div className="text-center px-4">
                       <CheckCircle size={32} className="text-emerald-500 mx-auto mb-3" />
                       <h4 className="font-bold text-[#1a1a3a] text-sm">Demo Confirmed</h4>
                       <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">Humne booking details bhej di hain. Hum jald hi aapse connect karenge!</p>
                       <button onClick={() => setMode('intro')} className="mt-6 text-blue-600 text-[10px] font-bold hover:underline transition-all">Done</button>
                    </div>
                  )}

                  {(mode === 'error' || mode === 'key-needed') && (
                    <div className="text-center p-4 bg-red-50 rounded-2xl">
                       <AlertCircle size={24} className="text-red-500 mx-auto mb-2" />
                       <p className="text-[9px] text-red-600 font-medium">Network Error. Please retry.</p>
                       <button onClick={() => setMode('intro')} className="mt-3 py-2 px-4 bg-white text-red-500 border border-red-200 rounded-lg text-[9px] font-bold uppercase shadow-sm">Retry</button>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-auto pt-4 border-t border-slate-50 w-full text-center">
                 <p className="text-[9px] text-slate-300 font-medium flex items-center justify-center gap-1">
                   Powered by <span className="text-[#1a1a3a] font-bold">Cheshta IT Solution</span>
                 </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <button 
        onClick={() => setIsOpen(!isOpen)} 
        className="relative group w-20 h-20 transition-all duration-300 hover:scale-110 active:scale-95 z-[101]"
      >
        <div className="absolute inset-0 bg-[#1a1a3a] rounded-full blur-2xl opacity-20 animate-pulse" />
        <div className={`relative w-full h-full rounded-full flex items-center justify-center shadow-2xl border-2 border-white transition-all duration-500 overflow-hidden ${isOpen ? 'rotate-90 bg-slate-900' : 'bg-white'}`}>
          <AnimatePresence mode="wait">
            {isOpen ? (
              <motion.div key="close"><X size={36} className="text-white" /></motion.div>
            ) : (
              <motion.div key="avatar" className="w-full h-full relative">
                <img src={AGENT_IMAGE} alt="Avatar" className="w-full h-full object-cover" />
                <div className="absolute bottom-3 right-3 w-4 h-4 bg-emerald-500 rounded-full border-2 border-white shadow-sm" />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </button>
    </div>
  );
};
