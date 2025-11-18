import React, { useState, useEffect, useRef, useCallback } from 'react';
import { generateSpeechFromText, generateNewsBroadcastSpeech } from '../services/geminiService';
import { decode, decodeAudioData } from '../utils/audioUtils';
import { NewsArticle } from '../types';
import { CloseIcon, SparklesIcon, UploadIcon } from './icons';
import AudioVisualizer from './AudioVisualizer';

interface AudioGenerationModalProps {
    articles: NewsArticle[];
    onClose: () => void;
}

type Mode = 'text' | 'article' | 'ai-conversation';
type Language = 'English' | 'Hindi' | 'Hinglish';
const progressMessages = ["Thinking... 💬", "Analyzing text...", "Synthesizing speech...", "Finalizing audio..."];

const AudioGenerationModal: React.FC<AudioGenerationModalProps> = ({ articles, onClose }) => {
    const [mode, setMode] = useState<Mode>('text');
    const [textInput, setTextInput] = useState('');
    const [aiTopicInput, setAiTopicInput] = useState('');
    const [selectedArticleId, setSelectedArticleId] = useState<number | null>(articles[0]?.id || null);
    const [language, setLanguage] = useState<Language>('English');
    
    const [status, setStatus] = useState<'idle' | 'generating' | 'playing' | 'error'>('idle');
    const [progressMessage, setProgressMessage] = useState('');
    const [error, setError] = useState('');

    // Audio Player State
    const [volume, setVolume] = useState(1);
    const [playbackRate, setPlaybackRate] = useState(1);

    const audioContextRef = useRef<AudioContext | null>(null);
    const sourceRef = useRef<AudioBufferSourceNode | null>(null);
    const gainNodeRef = useRef<GainNode | null>(null);
    const analyserNodeRef = useRef<AnalyserNode | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

     const stopAudio = useCallback(() => {
        if (sourceRef.current) {
            sourceRef.current.onended = null;
            sourceRef.current.stop();
            sourceRef.current = null;
        }
        setStatus('idle');
    }, []);

    useEffect(() => {
        return () => { // Cleanup on unmount
            stopAudio();
            if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
                audioContextRef.current.close();
            }
        }
    }, [stopAudio]);
    
    const playAudio = async (base64Audio: string) => {
        stopAudio();

        if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
             audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
             gainNodeRef.current = audioContextRef.current.createGain();
             analyserNodeRef.current = audioContextRef.current.createAnalyser();
             gainNodeRef.current.connect(analyserNodeRef.current);
             analyserNodeRef.current.connect(audioContextRef.current.destination);
        }
        const ctx = audioContextRef.current;
        const gainNode = gainNodeRef.current;
        if (!ctx || !gainNode) return;

        try {
            const audioBuffer = await decodeAudioData(decode(base64Audio), ctx, 24000, 1);
            const source = ctx.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(gainNode);
            
            gainNode.gain.value = volume;
            source.playbackRate.value = playbackRate;

            source.onended = () => {
                setStatus('idle');
                sourceRef.current = null;
            };

            source.start(0);
            sourceRef.current = source;
            setStatus('playing');
        } catch (e) {
            console.error(e);
            setError("Failed to decode and play audio.");
            setStatus('error');
        }
    };

    useEffect(() => {
        if (gainNodeRef.current) gainNodeRef.current.gain.value = volume;
    }, [volume]);

    useEffect(() => {
        if (sourceRef.current) sourceRef.current.playbackRate.value = playbackRate;
    }, [playbackRate]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file && file.type === 'text/plain') {
            const reader = new FileReader();
            reader.onload = (event) => {
                const text = event.target?.result;
                if (typeof text === 'string') {
                    setAiTopicInput(text);
                }
            };
            reader.onerror = () => {
                setError('Failed to read the file.');
                setStatus('error');
            };
            reader.readAsText(file);
        } else if (file) {
            setError('Please upload a valid .txt file.');
            setStatus('error');
        }
    };

    const handleGenerate = async () => {
        setError('');
        setStatus('generating');
        
        let intervalId = 0;
        let messageIndex = 0;
        intervalId = window.setInterval(() => {
            messageIndex = (messageIndex + 1) % progressMessages.length;
            setProgressMessage(progressMessages[messageIndex]);
        }, 1500);
        setProgressMessage(progressMessages[0]);

        try {
            let audioData: string | null = null;
            if (mode === 'text') {
                if (!textInput.trim()) throw new Error("Please enter some text to generate audio.");
                audioData = await generateSpeechFromText(textInput);
            } else if (mode === 'ai-conversation') {
                if (!aiTopicInput.trim()) throw new Error("Please enter a topic or upload a file to generate a conversation.");
                audioData = await generateNewsBroadcastSpeech(aiTopicInput, language);
            } else {
                const article = articles.find(a => a.id === selectedArticleId);
                if (!article) throw new Error("Please select a valid article.");
                audioData = await generateNewsBroadcastSpeech(article.content, language);
            }
            
            if (audioData) {
                await playAudio(audioData);
            } else {
                throw new Error("Audio generation failed to produce data.");
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An unknown error occurred.');
            setStatus('error');
        } finally {
            clearInterval(intervalId);
        }
    };

    const selectedArticle = articles.find(a => a.id === selectedArticleId);

    return (
        <div className="fixed inset-0 bg-brand-bg/95 backdrop-blur-lg flex items-center justify-center z-[60] p-4 animate-fade-in" onClick={onClose}>
            <div className="bg-black/50 w-full max-w-3xl rounded-lg shadow-2xl border border-brand-primary/30 flex flex-col animate-slide-up relative" onClick={e => e.stopPropagation()}>
                <header className="p-4 flex justify-between items-center border-b border-brand-primary/20">
                    <h2 className="font-orbitron text-xl text-brand-secondary">Audio Synthesis Agent</h2>
                    <button onClick={onClose} className="text-brand-text-muted hover:text-brand-primary transition-colors">
                        <CloseIcon />
                    </button>
                </header>
                
                <div className="p-6 space-y-6">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                        <div className="bg-brand-bg/50 border border-brand-primary/20 rounded-full p-1 flex gap-1 w-min">
                            <button onClick={() => setMode('text')} className={`px-4 py-1.5 rounded-full font-semibold transition-colors text-sm ${mode === 'text' ? 'bg-brand-primary text-white' : 'text-brand-text-muted hover:bg-brand-surface'}`}>Text-to-Speech</button>
                            <button onClick={() => setMode('article')} className={`px-4 py-1.5 rounded-full font-semibold transition-colors text-sm ${mode === 'article' ? 'bg-brand-primary text-white' : 'text-brand-text-muted hover:bg-brand-surface'}`}>Article Broadcast</button>
                            <button onClick={() => setMode('ai-conversation')} className={`px-4 py-1.5 rounded-full font-semibold transition-colors text-sm flex items-center gap-2 ${mode === 'ai-conversation' ? 'bg-brand-primary text-white' : 'text-brand-text-muted hover:bg-brand-surface'}`}>
                                <SparklesIcon/> AI Conversation
                            </button>
                        </div>
                         <div className={`flex items-center gap-2 transition-opacity duration-300 ${mode === 'text' ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
                            {(['English', 'Hindi', 'Hinglish'] as Language[]).map(lang => (
                                <button key={lang} onClick={() => setLanguage(lang)} className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${language === lang ? 'bg-brand-secondary text-white' : 'bg-brand-bg hover:bg-brand-primary/20'}`}>
                                    {lang}
                                </button>
                            ))}
                        </div>
                    </div>

                    {mode === 'text' && (
                        <textarea 
                            value={textInput}
                            onChange={e => setTextInput(e.target.value)}
                            placeholder="Type or paste text here to generate a single-speaker narration..."
                            className="w-full h-32 bg-brand-bg border-2 border-brand-secondary/50 rounded-lg p-4 focus:outline-none focus:border-brand-primary transition-colors text-brand-text"
                        />
                    )}
                    {mode === 'article' && (
                        <div>
                             <select 
                                value={selectedArticleId || ''} 
                                onChange={e => setSelectedArticleId(Number(e.target.value))}
                                className="w-full bg-brand-bg border-2 border-brand-secondary/50 rounded-full py-2 px-4 focus:outline-none focus:border-brand-primary transition-colors text-brand-text mb-2"
                             >
                                {articles.map(article => <option key={article.id} value={article.id}>{article.title}</option>)}
                            </select>
                            <p className="text-sm text-brand-text-muted h-10 overflow-hidden">{selectedArticle?.summary}</p>
                        </div>
                    )}
                    {mode === 'ai-conversation' && (
                         <div className="relative">
                            <textarea 
                                value={aiTopicInput}
                                onChange={e => setAiTopicInput(e.target.value)}
                                placeholder="Describe a topic... The AI will generate a news-style conversation about it. You can also upload a .txt file."
                                className="w-full h-32 bg-brand-bg border-2 border-brand-secondary/50 rounded-lg p-4 focus:outline-none focus:border-brand-primary transition-colors text-brand-text pr-28"
                            />
                            <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept=".txt" />
                            <button 
                                onClick={() => fileInputRef.current?.click()} 
                                className="absolute bottom-3 right-3 flex items-center gap-2 px-3 py-1.5 bg-brand-bg border border-brand-secondary/50 rounded-full text-sm font-semibold text-brand-text-muted hover:bg-brand-surface hover:text-brand-text transition-colors"
                            >
                                <UploadIcon className="h-4 w-4" />
                                Upload
                            </button>
                        </div>
                    )}
                </div>

                <div className="px-6 pb-6 text-center min-h-[80px] flex flex-col justify-center">
                    {status === 'idle' && (
                        <button onClick={handleGenerate} className="bg-gradient-to-br from-brand-primary to-brand-secondary text-white font-bold py-3 px-8 rounded-full text-lg transform hover:scale-105 transition-transform duration-300 self-center">
                           Synthesize Audio
                        </button>
                    )}
                    {status === 'generating' && (
                        <div className="animate-fade-in font-mono text-lg text-brand-text-muted">{progressMessage}</div>
                    )}
                    {status === 'error' && (
                        <div className="animate-fade-in text-brand-accent">
                            <p>Error: {error}</p>
                            <button onClick={handleGenerate} className="mt-2 text-sm underline">Try Again</button>
                        </div>
                    )}
                </div>
                 {status === 'playing' && (
                    <footer className="p-4 border-t border-brand-primary/20 bg-black/20 flex items-center justify-between gap-4 animate-fade-in">
                        <AudioVisualizer analyserNode={analyserNodeRef.current} width={150} height={40} barColor="#6366f1" />
                        <div className="flex items-center gap-6">
                            <div className="flex items-center gap-2">
                                <span className="text-xs font-semibold">VOL</span>
                                <input 
                                    type="range" 
                                    min="0" max="1" step="0.01" 
                                    value={volume} 
                                    onChange={(e) => setVolume(Number(e.target.value))}
                                    className="w-24 h-1 bg-brand-bg rounded-lg appearance-none cursor-pointer"
                                />
                            </div>
                             <div className="flex items-center gap-2 bg-brand-bg p-1 rounded-full">
                                {[1, 1.5, 2].map(rate => (
                                    <button 
                                        key={rate} 
                                        onClick={() => setPlaybackRate(rate)}
                                        className={`px-2 py-0.5 text-xs font-semibold rounded-full ${playbackRate === rate ? 'bg-brand-primary text-white' : 'text-brand-text-muted hover:bg-brand-primary/20'}`}
                                    >
                                       {rate}x
                                    </button>
                                ))}
                            </div>
                        </div>
                        <button onClick={stopAudio} className="bg-brand-accent text-white font-bold py-2 px-4 rounded-full text-sm hover:bg-opacity-80 transition-colors">
                            Stop
                        </button>
                    </footer>
                )}
            </div>
        </div>
    );
};

export default AudioGenerationModal;
