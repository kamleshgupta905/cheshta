
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GoogleGenAI, FunctionDeclaration, Type, LiveServerMessage, Modality, Blob } from "@google/genai";
import { 
  X, CheckCircle, Phone, AlertCircle, 
  ChevronDown, Mic, RefreshCw, MicOff
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

const AGENT_IMAGE = "https://images.unsplash.com/photo-1589156280159-27698a70f29e?q=80&w=300&h=300&auto=format&fit=crop";

// --- MAIN AI ASSISTANT TOOL ---
const bookDemoTool: FunctionDeclaration = {
  name: 'bookDemoMeeting',
  description: 'Book a FREE 10-minute demo meeting with Cheshta IT Solution.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      fullName: { type: Type.STRING, description: 'The full name of the client.' },
      mobileNumber: { type: Type.STRING, description: 'Mobile number of the client.' },
      emailAddress: { type: Type.STRING, description: 'Email address of the client.' },
      preferredTime: { type: Type.STRING, description: 'The time slot preferred by the client for the demo.' },
    },
    required: ['fullName', 'mobileNumber', 'emailAddress', 'preferredTime'],
  },
};

const CHESHTA_SYSTEM_INSTRUCTION = `You are a professional female AI Voice Business Consultant for Cheshta IT Solution.
Your job is to act like a natural human assistant, not a robot.

IMPORTANT INSTRUCTION FOR CONTINUITY:
• Do NOT stop in the middle of sentences.
• Speak fluently in Hinglish.
• If the user is silent, encourage them gently to share their business details.
• Lead the conversation. If the user gives a short answer, follow up immediately with the next question in the flow.

LANGUAGE & TONE:
• Simple Hinglish (Hindi + English).
• Friendly, confident, and professional.
• Use feminine Hindi grammar (e.g., "Main help kar sakti hoon").

CONVERSATION FLOW:
1. Greet: "Namaste! Main Cheshta IT Solution ki AI Assistant hoon. Aapka kis tarah ka business hai?"
2. Growth Challenge: "Great! Growth ya marketing mein aapko sabse badi challenge kya aa rahi hai?"
3. Solution Pitch: Briefly mention how our Digital Marketing or AI services can solve it.
4. Demo Offer: Pitch the FREE 10-minute demo. "Hum aapke business ka audit karenge aur ek growth roadmap share karenge."
5. Booking: Collect Name, Mobile, Email, and Preferred Time ONE BY ONE.
6. Execution: Once all 4 are collected, call 'bookDemoMeeting'.

RULES:
• ONE QUESTION AT A TIME. 
• Keep responses short and snappy.
• Never wait too long to speak.`;

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
  const streamRef = useRef<MediaStream | null>(null);
  const inputCtxRef = useRef<AudioContext | null>(null);
  const outputCtxRef = useRef<AudioContext | null>(null);

  const cleanupResources = () => {
    setIsListening(false);
    if (sessionRef.current) {
      try { sessionRef.current.close(); } catch (e) {}
      sessionRef.current = null;
    }
    for (const source of audioSources.current) {
      try { source.stop(); } catch(e) {}
    }
    audioSources.current.clear();
    nextStartTimeRef.current = 0;
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    if (inputCtxRef.current) {
      try { inputCtxRef.current.close(); } catch (e) {}
      inputCtxRef.current = null;
    }
    
    if (outputCtxRef.current) {
      try { outputCtxRef.current.close(); } catch (e) {}
      outputCtxRef.current = null;
    }
    analyserRef.current = null;
  };

  const endSession = () => {
    cleanupResources();
    setUserSpeechText('');
    setMode('intro');
  };

  const startVoiceSession = async () => {
    setMode('sending');
    setErrorMsg('');
    
    try {
      const inputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      const outputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      inputCtxRef.current = inputCtx;
      outputCtxRef.current = outputCtx;

      const analyser = outputCtx.createAnalyser();
      analyser.fftSize = 256;
      analyser.connect(outputCtx.destination);
      analyserRef.current = analyser;

      await inputCtx.resume();
      await outputCtx.resume();

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      setMode('voice');
      setIsListening(true);

      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-12-2025',
        callbacks: {
          onopen: () => {
            const source = inputCtx.createMediaStreamSource(stream);
            const scriptProcessor = inputCtx.createScriptProcessor(4096, 1, 1);
            scriptProcessor.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              const int16 = new Int16Array(inputData.length);
              for (let i = 0; i < inputData.length; i++) int16[i] = inputData[i] * 32768;
              sessionPromise.then(s => {
                s.sendRealtimeInput({ 
                  media: { data: encode(new Uint8Array(int16.buffer)), mimeType: 'audio/pcm;rate=16000' } 
                });
              }).catch(() => {});
            };
            source.connect(scriptProcessor);
            scriptProcessor.connect(inputCtx.destination);

            // Initial trigger
            sessionPromise.then(s => s.sendRealtimeInput({ text: "Gently greet the user and ask for their business name or type." }));
          },
          onmessage: async (message: LiveServerMessage) => {
            // Handle Interruption
            if (message.serverContent?.interrupted) {
              for (const source of audioSources.current) {
                try { source.stop(); } catch(e) {}
              }
              audioSources.current.clear();
              nextStartTimeRef.current = 0;
              return;
            }

            if (message.serverContent?.inputTranscription) {
              setUserSpeechText(prev => (prev + ' ' + message.serverContent!.inputTranscription!.text).trim());
            }

            if (message.toolCall) {
              for (const fc of message.toolCall.functionCalls) {
                if (fc.name === 'bookDemoMeeting') {
                  try {
                    const response = await fetch('https://formsubmit.co/ajax/kamleshg9569@gmail.com', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
                      body: JSON.stringify({
                        name: fc.args.fullName,
                        phone: fc.args.mobileNumber,
                        email: fc.args.emailAddress,
                        time: fc.args.preferredTime,
                        _subject: "AI Consultant: New Demo Booked"
                      })
                    });
                    if (response.ok) {
                      setMode('success');
                      sessionPromise.then(s => s.sendToolResponse({
                        functionResponses: { id: fc.id, name: fc.name, response: { result: "Demo booked successfully." } }
                      }));
                    }
                  } catch (e) {
                    setMode('error');
                    setErrorMsg("Booking failed. Please retry.");
                  }
                }
              }
            }

            const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
            if (base64Audio && outputCtx) {
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
          onerror: () => { setMode('error'); setErrorMsg("Session interrupted."); },
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
    } catch (err: any) { 
      setMode('error'); 
      setErrorMsg("Mic access is required.");
    }
  };

  const monitorAudio = () => {
    if (analyserRef.current) {
      const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
      analyserRef.current.getByteFrequencyData(dataArray);
      let total = 0;
      for (let i = 0; i < dataArray.length; i++) total += dataArray[i] / 255;
      setMetrics({ volume: total / dataArray.length });
    }
    requestAnimationFrame(monitorAudio);
  };

  useEffect(() => {
    if (mode === 'voice') monitorAudio();
  }, [mode]);

  return (
    <div className="fixed bottom-0 right-0 z-[100] flex flex-col items-end p-4">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 30, originX: 1, originY: 1 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 30 }}
            className="w-[calc(100vw-2rem)] sm:w-[320px] h-[520px] bg-white rounded-[2.5rem] shadow-[0_20px_60px_rgba(0,0,0,0.15)] flex flex-col overflow-hidden border border-slate-100 mb-4"
          >
            <div className="bg-[#1a1a3a] px-5 py-4 flex justify-between items-center text-white shrink-0">
               <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-full overflow-hidden border border-white/20">
                    <img src={AGENT_IMAGE} alt="Consultant" className="w-full h-full object-cover" />
                  </div>
                  <div className="flex flex-col">
                    <span className="font-bold text-[13px] tracking-tight">Cheshta AI</span>
                    <span className="text-[9px] text-emerald-400 font-bold flex items-center gap-1">
                      <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" /> Live Now
                    </span>
                  </div>
               </div>
               <button onClick={() => setIsOpen(false)} className="p-1 hover:bg-white/10 rounded-full transition-colors">
                 <ChevronDown size={20} />
               </button>
            </div>

            <div className="flex-1 flex flex-col items-center bg-white px-6 py-6 text-center overflow-y-auto">
              <div className="flex-1 flex flex-col items-center w-full">
                <div className="relative mb-6">
                  <motion.div 
                    animate={mode === 'voice' ? { 
                      scale: metrics.volume > 0.05 ? [1, 1.1, 1] : 1,
                      boxShadow: `0 0 ${metrics.volume * 60}px rgba(37, 99, 235, 0.4)`
                    } : {}}
                    className="w-24 h-24 rounded-full overflow-hidden border-4 border-white shadow-2xl relative z-10"
                  >
                    <img src={AGENT_IMAGE} alt="Agent" className="w-full h-full object-cover" />
                  </motion.div>
                </div>
                
                <h3 className="text-[#1a1a3a] font-bold text-base mb-1">AI Business Consultant</h3>

                <div className="w-full flex-1 flex flex-col items-center justify-center min-h-[200px]">
                  {mode === 'intro' && (
                    <div className="w-full">
                      <p className="text-slate-500 text-[11px] mb-8 leading-relaxed max-w-[220px] mx-auto">
                        Hamare digital expert se baat karein aur apne business ke liye <strong>FREE Growth Plan</strong> payein.
                      </p>
                      <button 
                        onClick={startVoiceSession} 
                        className="w-full py-4 bg-[#1a1a3a] text-white font-bold rounded-2xl flex items-center justify-center gap-3 active:scale-95 transition-all shadow-xl shadow-slate-200"
                      >
                         <Mic size={18} />
                         <span>Baat Shuru Karein</span>
                      </button>
                    </div>
                  )}

                  {mode === 'voice' && (
                    <div className="flex flex-col items-center gap-6 w-full">
                       <div className="space-y-2">
                        <div className="flex justify-center gap-1.5 h-8 items-center">
                          {[1,2,3,4,5,6,7].map(i => (
                            <motion.div 
                              key={i} 
                              animate={{ height: metrics.volume > 0.02 ? [4, 24, 4] : 4 }} 
                              transition={{ duration: 0.3, repeat: Infinity, delay: i * 0.04 }}
                              className="w-1.5 bg-blue-600 rounded-full" 
                            />
                          ))}
                        </div>
                        <p className="text-slate-400 text-[9px] font-bold uppercase tracking-widest">Consultant is Online</p>
                       </div>
                       
                       <div className="px-4 py-3 bg-slate-50 rounded-2xl text-slate-500 text-[10px] text-center max-w-full italic shadow-sm border border-slate-100 min-h-[40px] flex items-center justify-center">
                         {userSpeechText ? `"${userSpeechText}"` : "Waiting for you to speak..."}
                       </div>

                       <button onClick={endSession} className="w-14 h-14 bg-red-500 text-white rounded-full flex items-center justify-center shadow-lg active:scale-90 transition-all">
                          <Phone size={24} className="rotate-[135deg]" />
                       </button>
                    </div>
                  )}

                  {mode === 'sending' && (
                    <div className="flex flex-col items-center gap-4">
                       <div className="w-12 h-12 border-4 border-blue-50 border-t-blue-600 rounded-full animate-spin" />
                       <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Connecting to AI...</p>
                    </div>
                  )}

                  {mode === 'success' && (
                    <div className="text-center">
                       <CheckCircle size={44} className="text-emerald-500 mx-auto mb-4" />
                       <h4 className="font-bold text-[#1a1a3a] text-sm uppercase">Demo Confirmed!</h4>
                       <p className="text-[11px] text-slate-500 mt-2">Hum aapse jald contact karenge. Email check karein.</p>
                       <button onClick={endSession} className="mt-8 w-full py-3 bg-[#1a1a3a] text-white rounded-xl text-[11px] font-bold">Close</button>
                    </div>
                  )}

                  {mode === 'error' && (
                    <div className="text-center w-full px-4">
                       <AlertCircle size={40} className="text-red-500 mx-auto mb-4" />
                       <p className="text-[11px] text-slate-600 mb-6 font-medium">{errorMsg}</p>
                       <button onClick={startVoiceSession} className="w-full py-3 bg-[#1a1a3a] text-white rounded-xl text-[11px] font-bold">Try Again</button>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-auto pt-4 border-t border-slate-50 w-full flex justify-center">
                 <div className="flex items-center gap-1.5 opacity-40 grayscale hover:grayscale-0 transition-all cursor-default">
                    <div className="w-4 h-4 bg-blue-600 rounded flex items-center justify-center text-[10px] text-white font-bold">C</div>
                    <span className="text-[10px] text-[#1a1a3a] font-bold tracking-tight">Cheshta IT Solution</span>
                 </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <button 
        onClick={() => setIsOpen(!isOpen)} 
        className="relative group w-16 h-16 transition-all duration-300 hover:scale-110 active:scale-95"
      >
        <div className="absolute inset-0 bg-[#1a1a3a] rounded-full blur-2xl opacity-25 group-hover:opacity-40 transition-opacity" />
        <div className={`relative w-full h-full rounded-full flex items-center justify-center shadow-2xl border-2 border-white transition-all duration-500 overflow-hidden ${isOpen ? 'rotate-90 bg-slate-900' : 'bg-white'}`}>
          <AnimatePresence mode="wait">
            {isOpen ? (
              <motion.div key="close"><X size={32} className="text-white" /></motion.div>
            ) : (
              <motion.div key="avatar" className="w-full h-full">
                <img src={AGENT_IMAGE} alt="Avatar" className="w-full h-full object-cover" />
                <div className="absolute bottom-2 right-2 w-4 h-4 rounded-full border-2 border-white shadow-sm bg-emerald-500 animate-pulse" />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </button>
    </div>
  );
};
