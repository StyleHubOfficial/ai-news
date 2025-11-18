
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality, Blob } from "@google/genai";
import { encode, decode, decodeAudioData } from '../utils/audioUtils';
import { CloseIcon } from './icons';
import AudioVisualizer from './AudioVisualizer';

interface LiveAgentProps {
    onClose: () => void;
}

const LiveAgent: React.FC<LiveAgentProps> = ({ onClose }) => {
    const [status, setStatus] = useState('Initializing...');
    const [transcription, setTranscription] = useState<{ user: string, model: string }[]>([]);
    const [currentTurn, setCurrentTurn] = useState({ user: '', model: '' });
    const [isListening, setIsListening] = useState(false);
    
    const currentTurnDataRef = useRef({ user: '', model: '' });
    const thinkingTimeoutRef = useRef<number | null>(null);

    const sessionPromiseRef = useRef<Promise<any> | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const outputAudioContextRef = useRef<AudioContext | null>(null);
    const analyserNodeRef = useRef<AnalyserNode | null>(null);

    const nextStartTimeRef = useRef(0);
    const sourcesRef = useRef(new Set<AudioBufferSourceNode>());
    const streamRef = useRef<MediaStream | null>(null);

    const cleanup = useCallback(() => {
        if (thinkingTimeoutRef.current) clearTimeout(thinkingTimeoutRef.current);
        streamRef.current?.getTracks().forEach(track => track.stop());
        if (sessionPromiseRef.current) {
            sessionPromiseRef.current.then(session => session.close());
            sessionPromiseRef.current = null;
        }
        audioContextRef.current?.close();
        outputAudioContextRef.current?.close();
    }, []);

    useEffect(() => {
        const startSession = async () => {
            try {
                if (!process.env.API_KEY) throw new Error("API_KEY not set");
                const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
                
                setStatus('Requesting microphone...');
                streamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true });

                setStatus('Connecting...');
                audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
                outputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
                
                const outputNode = outputAudioContextRef.current.createGain();
                analyserNodeRef.current = outputAudioContextRef.current.createAnalyser();
                outputNode.connect(analyserNodeRef.current);
                analyserNodeRef.current.connect(outputAudioContextRef.current.destination);

                sessionPromiseRef.current = ai.live.connect({
                    model: 'gemini-2.5-flash-native-audio-preview-09-2025',
                    callbacks: {
                        onopen: () => {
                            setStatus('Connected. Start speaking.');
                             setIsListening(true);
                            if (!audioContextRef.current || !streamRef.current) return;
                            const source = audioContextRef.current.createMediaStreamSource(streamRef.current);
                            const scriptProcessor = audioContextRef.current.createScriptProcessor(4096, 1, 1);
                            
                            scriptProcessor.onaudioprocess = (audioProcessingEvent) => {
                                const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
                                const pcmBlob: Blob = {
                                    data: encode(new Uint8Array(new Int16Array(inputData.map(v => v * 32768)).buffer)),
                                    mimeType: 'audio/pcm;rate=16000',
                                };
                                sessionPromiseRef.current?.then((session) => {
                                    session.sendRealtimeInput({ media: pcmBlob });
                                });
                            };
                            source.connect(scriptProcessor);
                            scriptProcessor.connect(audioContextRef.current.destination);
                        },
                        onmessage: async (message: LiveServerMessage) => {
                             if (thinkingTimeoutRef.current) {
                                clearTimeout(thinkingTimeoutRef.current);
                                thinkingTimeoutRef.current = null;
                            }
                            
                             if (message.serverContent?.inputTranscription) {
                                setStatus('Listening...');
                                setIsListening(true);
                                currentTurnDataRef.current.user += message.serverContent.inputTranscription.text;
                                setCurrentTurn({ ...currentTurnDataRef.current });
                                thinkingTimeoutRef.current = window.setTimeout(() => { setStatus('Thinking...'); setIsListening(false); }, 1000);
                            }
                            if (message.serverContent?.outputTranscription) {
                                setStatus('Speaking...');
                                setIsListening(false);
                                currentTurnDataRef.current.model += message.serverContent.outputTranscription.text;
                                setCurrentTurn({ ...currentTurnDataRef.current });
                            }
                             if (message.serverContent?.turnComplete) {
                                setStatus('Listening...');
                                setIsListening(true);
                                setTranscription(prev => [...prev, currentTurnDataRef.current]);
                                currentTurnDataRef.current = { user: '', model: '' };
                                setCurrentTurn({ user: '', model: '' });
                            }

                            const audioData = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
                            if (audioData && outputAudioContextRef.current) {
                                nextStartTimeRef.current = Math.max(nextStartTimeRef.current, outputAudioContextRef.current.currentTime);
                                const audioBuffer = await decodeAudioData(decode(audioData), outputAudioContextRef.current, 24000, 1);
                                const source = outputAudioContextRef.current.createBufferSource();
                                source.buffer = audioBuffer;
                                source.connect(outputNode);
                                source.addEventListener('ended', () => { sourcesRef.current.delete(source); });
                                source.start(nextStartTimeRef.current);
                                nextStartTimeRef.current += audioBuffer.duration;
                                sourcesRef.current.add(source);
                            }

                            if (message.serverContent?.interrupted) {
                                for (const source of sourcesRef.current.values()) {
                                    source.stop();
                                }
                                sourcesRef.current.clear();
                                nextStartTimeRef.current = 0;
                                setStatus('Interrupted. Your turn.');
                                currentTurnDataRef.current.model = ''; // Clear partial model response
                                setCurrentTurn({ ...currentTurnDataRef.current });
                                setTimeout(() => { setStatus('Listening...'); setIsListening(true); }, 1500);
                            }
                        },
                        onerror: (e: ErrorEvent) => {
                            console.error('Live session error:', e);
                            setStatus('Error: Connection failed.');
                            setIsListening(false);
                        },
                        onclose: () => {
                            setStatus('Connection closed.');
                             setIsListening(false);
                        },
                    },
                    config: {
                        responseModalities: [Modality.AUDIO],
                        inputAudioTranscription: {},
                        outputAudioTranscription: {},
                        speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } } },
                        systemInstruction: 'You are a futuristic news assistant AI. Keep your responses brief and engaging. Your name is Cygnus.',
                    },
                });

            } catch (err) {
                console.error('Failed to start Live Agent:', err);
                setStatus(err instanceof Error ? `Error: ${err.message}` : 'An unknown error occurred.');
                 setIsListening(false);
            }
        };

        startSession();

        return () => {
            cleanup();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 animate-fade-in" onClick={onClose}>
            <div className="bg-brand-surface w-full max-w-2xl h-[70vh] rounded-lg shadow-2xl border border-brand-primary/30 flex flex-col animate-slide-up" onClick={e => e.stopPropagation()}>
                <header className="p-4 border-b border-brand-primary/20 flex justify-between items-center flex-shrink-0">
                    <h2 className="font-orbitron text-2xl text-brand-secondary">Live Conversation</h2>
                    <button onClick={onClose} className="text-brand-text-muted hover:text-brand-primary transition-colors">
                        <CloseIcon />
                    </button>
                </header>
                <div className="flex-grow p-6 overflow-y-auto space-y-4 flex flex-col">
                    <div className="flex-grow space-y-4">
                        {transcription.map((turn, index) => (
                             <div key={index} className="animate-fade-in">
                                <p><strong className="text-brand-primary font-semibold">You:</strong> {turn.user}</p>
                                <p><strong className="text-brand-secondary font-semibold">Cygnus:</strong> {turn.model}</p>
                            </div>
                        ))}
                         {(currentTurn.user || currentTurn.model) && (
                            <div>
                                 {currentTurn.user && <p className="text-brand-text-muted"><strong className="text-brand-primary font-semibold">You:</strong> {currentTurn.user}</p>}
                                 {currentTurn.model && <p className="text-brand-text-muted"><strong className="text-brand-secondary font-semibold">Cygnus:</strong> {currentTurn.model}</p>}
                            </div>
                        )}
                    </div>
                </div>
                <footer className="p-4 border-t border-brand-primary/20 text-center flex-shrink-0">
                     <div className="w-full h-24 flex items-center justify-center">
                       <AudioVisualizer analyserNode={analyserNodeRef.current} barColor="#6366f1" gap={2} />
                    </div>
                    <div className={`mt-4 font-mono text-brand-text-muted flex items-center justify-center gap-3 transition-opacity duration-300 ${isListening ? 'opacity-100 animate-pulse' : 'opacity-70'}`}>
                         <div className="relative flex h-3 w-3">
                            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${status.startsWith('Error') ? 'bg-brand-accent' : (isListening ? 'bg-brand-primary' : 'bg-brand-secondary')}`}></span>
                            <span className={`relative inline-flex rounded-full h-3 w-3 ${status.startsWith('Error') ? 'bg-brand-accent' : (isListening ? 'bg-brand-primary' : 'bg-brand-secondary')}`}></span>
                        </div>
                        <span>{status}</span>
                    </div>
                </footer>
            </div>
        </div>
    );
};

export default LiveAgent;
