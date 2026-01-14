
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

// --- MAIN AI ASSISTANT ---
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

const CHESHTA_SYSTEM_INSTRUCTION = `You are a female AI Business Consultant for Cheshta IT Solution.
Your goal: Book a FREE 10-minute demo meeting with visitors.

TONE: Friendly, Professional, Hinglish (Hindi + English). Use feminine Hindi grammar for yourself (e.g., "Main kar sakti hoon").

PROCESS:
1. Greet as "Sir" (assume user is male).
2. Ask about their business.
3. Identify their problem (SEO, Web Dev, Ads).
4. Pitch the FREE 10-minute demo.
5. IF THEY AGREE, you MUST collect: Full Name, Mobile, Email, and Preferred Time.
6. ONCE YOU HAVE ALL 4 DETAILS, immediately call the 'bookDemoMeeting' tool. DO NOT wait for more instructions.

CRITICAL: After booking, tell the user that "Meeting schedule ho gayi hai, aapko email mil jayega".`;

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
  const streamRef = useRef<MediaStream | null>(null);
  const inputCtxRef = useRef<AudioContext | null>(null);
  const outputCtxRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    if (isOpen) {
      window.parent.postMessage('ai_assistant_opened', '*');
    } else {
      window.parent.postMessage('ai_assistant_closed', '*');
    }
  }, [isOpen]);

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

    if (frameRef.current) {
      cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    }
    analyserRef.current = null;
  };

  const endSession = () => {
    cleanupResources();
    setUserSpeechText('');
    setMode('intro');
  };

  const handleRetry = () => {
    cleanupResources();
    setMode('intro');
    setErrorMsg('');
    setTimeout(() => startVoiceSession(), 100);
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

      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        streamRef.current = stream;
      } catch (micErr) {
        setMode('error');
        setErrorMsg("Microphone access denied. Please allow permissions.");
        return;
      }

      setMode('voice');
      setIsListening(true);

      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-12-2025',
        callbacks: {
          onopen: () => {
            const trigger = "Greet the visitor as 'Sir' and introduce yourself as Cheshta IT's AI Consultant. Ask about his business.";
            sessionPromise.then(s => s.sendRealtimeInput({ text: trigger }));
            
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
          },
          onmessage: async (message: LiveServerMessage) => {
            if (message.serverContent?.inputTranscription) {
              setUserSpeechText(prev => (prev + ' ' + message.serverContent!.inputTranscription!.text).trim());
            }

            if (message.toolCall) {
              for (const fc of message.toolCall.functionCalls) {
                if (fc.name === 'bookDemoMeeting') {
                   console.log("Tool call detected:", fc.args);
                   try {
                     const response = await fetch('https://formsubmit.co/ajax/kamleshg9569@gmail.com', { 
                       method: 'POST', 
                       headers: { 
                         'Content-Type': 'application/json',
                         'Accept': 'application/json'
                       }, 
                       body: JSON.stringify({
                         name: fc.args.fullName,
                         email: fc.args.emailAddress,
                         phone: fc.args.mobileNumber,
                         time: fc.args.preferredTime,
                         _subject: `New Lead: ${fc.args.fullName} via AI Chatbot`,
                         message: `A demo meeting was booked.\nName: ${fc.args.fullName}\nEmail: ${fc.args.emailAddress}\nMobile: ${fc.args.mobileNumber}\nPreferred Time: ${fc.args.preferredTime}`
                       }) 
                     });
                     
                     if (response.ok) {
                        setMode('success');
                        sessionPromise.then(s => s.sendToolResponse({ functionResponses: { id: fc.id, name: fc.name, response: { result: "Meeting booked successfully. Confirmation email sent." } } }));
                     } else {
                        throw new Error("FormSubmit failed");
                     }
                   } catch (e) { 
                     console.error("Booking error:", e);
                     setMode('error');
                     setErrorMsg("Meeting booking failed. Please try again later.");
                   }
                }
              }
            }

            const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
            if (base64Audio && outputCtx) {
              try {
                const buffer = await decodeAudioData(decode(base64Audio), outputCtx, 24000, 1);
                const startTime = Math.max(outputCtx.currentTime, nextStartTimeRef.current);
                const source = outputCtx.createBufferSource();
                source.buffer = buffer;
                source.connect(analyser);
                source.onended = () => audioSources.current.delete(source);
                source.start(startTime);
                nextStartTimeRef.current = startTime + buffer.duration;
                audioSources.current.add(source);
              } catch (decodeErr) {}
            }
          },
          onerror: (e: any) => {
            setMode('error');
            setErrorMsg("Connection error occurred.");
          },
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
      setErrorMsg(err.message || "Failed to start.");
    }
  };

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
            {/* Header */}
            <div className="bg-[#1a1a3a] px-5 py-3.5 flex justify-between items-center text-white shrink-0">
               <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full overflow-hidden border border-white/20">
                    <img src={AGENT_IMAGE} alt="Consultant" className="w-full h-full object-cover" />
                  </div>
                  <div className="flex flex-col">
                    <span className="font-bold text-[13px] tracking-tight">Cheshta AI</span>
                  </div>
               </div>
               <button onClick={() => setIsOpen(false)} className="p-1 hover:bg-white/10 rounded-full transition-colors">
                 <ChevronDown size={20} />
               </button>
            </div>

            <div className="flex-1 flex flex-col items-center bg-white px-6 py-6 text-center overflow-y-auto">
              <div className="flex-1 flex flex-col items-center w-full">
                <div className="relative mb-4">
                  <motion.div 
                    animate={mode === 'voice' ? { scale: [1, 1.05, 1] } : {}}
                    transition={{ repeat: Infinity, duration: 2 }}
                    className="w-24 h-24 rounded-full overflow-hidden border-4 border-white shadow-[0_10px_30px_rgba(0,0,0,0.1)] relative"
                  >
                    <img src={AGENT_IMAGE} alt="Agent Big" className="w-full h-full object-cover" />
                  </motion.div>
                </div>
                
                <h3 className="text-[#1a1a3a] font-bold text-base mb-1">AI Business Consultant</h3>

                <div className="w-full flex-1 flex flex-col items-center justify-center min-h-[200px]">
                  {mode === 'intro' && (
                    <div className="w-full">
                      <p className="text-slate-500 text-xs mb-6 leading-relaxed">Book a FREE 10-minute demo to analyze your business growth strategy.</p>
                      <button 
                        onClick={startVoiceSession} 
                        className="w-full py-4 bg-[#1a1a3a] text-white font-bold rounded-2xl flex items-center justify-center gap-3 active:scale-95 transition-all"
                      >
                         <span>Start Voice Call</span>
                      </button>
                    </div>
                  )}

                  {mode === 'voice' && (
                    <div className="flex flex-col items-center gap-6 w-full">
                       <div className="space-y-1">
                        <p className="text-slate-400 text-xs font-medium italic">Consultant is speaking...</p>
                        <div className="flex justify-center gap-1">
                          {[1,2,3,4,5].map(i => (
                            <motion.div 
                              key={i} 
                              animate={{ height: metrics.volume > 0.05 ? [4, 12, 4] : [4, 4, 4] }} 
                              transition={{ duration: 0.5, repeat: Infinity, delay: i * 0.1 }}
                              className="w-1 bg-blue-500 rounded-full" 
                            />
                          ))}
                        </div>
                       </div>
                       <AnimatePresence>
                        {userSpeechText && (
                          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="px-4 py-3 bg-slate-50 rounded-2xl text-slate-500 text-[11px] text-center max-w-full italic shadow-sm border border-slate-100 line-clamp-2">
                            "{userSpeechText}"
                          </motion.div>
                        )}
                       </AnimatePresence>
                       <div className="flex items-center gap-4">
                          <button onClick={endSession} className="w-12 h-12 bg-red-500 text-white rounded-full flex items-center justify-center shadow-lg active:scale-90 transition-all">
                             <Phone size={20} className="rotate-[135deg]" />
                          </button>
                       </div>
                    </div>
                  )}

                  {mode === 'sending' && (
                    <div className="flex flex-col items-center gap-4">
                       <div className="w-10 h-10 border-4 border-[#1a1a3a] border-t-transparent rounded-full animate-spin" />
                       <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Initialising...</p>
                    </div>
                  )}

                  {mode === 'success' && (
                    <div className="text-center">
                       <CheckCircle size={40} className="text-emerald-500 mx-auto mb-4" />
                       <h4 className="font-bold text-[#1a1a3a] text-sm">Meeting Scheduled!</h4>
                       <p className="text-[11px] text-slate-400 mt-2">Aapko jald hi confirmation mil jayega.</p>
                       <button onClick={endSession} className="mt-6 w-full py-3 bg-slate-100 text-[#1a1a3a] rounded-xl text-[11px] font-bold">Close</button>
                    </div>
                  )}

                  {(mode === 'error' || mode === 'key-needed') && (
                    <div className="text-center w-full">
                       <AlertCircle size={40} className="text-red-500 mx-auto mb-4" />
                       <p className="text-[10px] text-red-500/70 mb-6 font-medium">{errorMsg}</p>
                       <button onClick={handleRetry} className="w-full py-3 bg-[#1a1a3a] text-white rounded-xl text-[11px] font-bold flex items-center justify-center gap-2">
                         <RefreshCw size={14} /> Try Again
                       </button>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-auto pt-4 border-t border-slate-50 w-full">
                 <p className="text-[9px] text-slate-300 font-medium">
                   Powered by <span className="text-[#1a1a3a] font-bold">Cheshta IT Solution</span>
                 </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <button 
        onClick={() => setIsOpen(!isOpen)} 
        className="relative group w-16 h-16 transition-all duration-300 hover:scale-110 active:scale-95"
      >
        <div className="absolute inset-0 bg-[#1a1a3a] rounded-full blur-xl opacity-20" />
        <div className={`relative w-full h-full rounded-full flex items-center justify-center shadow-2xl border-2 border-white transition-all duration-500 overflow-hidden ${isOpen ? 'rotate-90 bg-slate-900' : 'bg-white'}`}>
          <AnimatePresence mode="wait">
            {isOpen ? (
              <motion.div key="close"><X size={32} className="text-white" /></motion.div>
            ) : (
              <motion.div key="avatar" className="w-full h-full">
                <img src={AGENT_IMAGE} alt="Avatar" className="w-full h-full object-cover" />
                <div className={`absolute bottom-2 right-2 w-3 h-3 rounded-full border-2 border-white shadow-sm bg-emerald-500`} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </button>
    </div>
  );
};
