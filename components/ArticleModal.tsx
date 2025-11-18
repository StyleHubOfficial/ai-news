
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { NewsArticle, AnalysisResult } from '../types';
import { getFastSummary, getDeepAnalysis, generateNewsBroadcastSpeech } from '../services/geminiService';
import { CloseIcon, ListIcon, BrainIcon, VolumeIcon, ChartIcon, ShareIcon, TwitterIcon, FacebookIcon, MailIcon, LinkIcon, BookmarkIcon, SparklesIcon } from './icons';
import { decode, decodeAudioData } from '../utils/audioUtils';
import AudioVisualizer from './AudioVisualizer';
import InteractiveChart from './InteractiveChart';

type Language = 'English' | 'Hindi' | 'Hinglish';
type ActiveTab = 'full' | 'summary' | 'analysis' | 'data' | 'custom';

interface ArticleModalProps {
    article: NewsArticle;
    onClose: () => void;
    onToggleSave: (articleId: number) => void;
    isSaved: boolean;
}

const ArticleModal: React.FC<ArticleModalProps> = ({ article, onClose, onToggleSave, isSaved }) => {
    const [activeTab, setActiveTab] = useState<ActiveTab>('full');
    const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isShareOpen, setShareOpen] = useState(false);
    const [copyStatus, setCopyStatus] = useState('Copy Link');
    const [language, setLanguage] = useState<Language>('English');
    const [customTopic, setCustomTopic] = useState('');

    // Audio Player State
    const [isPlaying, setIsPlaying] = useState(false);
    const [volume, setVolume] = useState(1);
    const [playbackRate, setPlaybackRate] = useState(1);
    
    const audioContextRef = useRef<AudioContext | null>(null);
    const sourceRef = useRef<AudioBufferSourceNode | null>(null);
    const gainNodeRef = useRef<GainNode | null>(null);
    const analyserNodeRef = useRef<AnalyserNode | null>(null);
    
    const shareButtonRef = useRef<HTMLButtonElement>(null);

    const stopAudio = useCallback(() => {
        if (sourceRef.current) {
            sourceRef.current.onended = null;
            sourceRef.current.stop();
            sourceRef.current = null;
        }
        setIsPlaying(false);
    }, []);

    const playAudio = useCallback(async (base64Audio: string) => {
        stopAudio();

        if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
            const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
            audioContextRef.current = new AudioContext({ sampleRate: 24000 });
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
                setIsPlaying(false);
                sourceRef.current = null;
            };

            source.start(0);
            sourceRef.current = source;
            setIsPlaying(true);
        } catch (error) {
            console.error("Failed to play audio:", error);
            setIsPlaying(false);
        }
    }, [stopAudio, volume, playbackRate]);
    
    useEffect(() => {
        if (gainNodeRef.current) gainNodeRef.current.gain.value = volume;
    }, [volume]);

    useEffect(() => {
        if (sourceRef.current) sourceRef.current.playbackRate.value = playbackRate;
    }, [playbackRate]);

    const handleGenerate = useCallback(async (type: 'summary' | 'analysis') => {
        setIsLoading(true);
        setAnalysisResult(null);
        try {
            const generator = type === 'summary' ? getFastSummary : getDeepAnalysis;
            const content = await generator(article.content);
            setAnalysisResult({
                title: type === 'summary' ? 'AI Summary' : 'AI Deep Analysis',
                content: content
            });
        } catch (error) {
            console.error(`Failed to generate ${type}:`, error);
            setAnalysisResult({
                title: 'Error',
                content: `Could not generate ${type}. Please try again later.`
            });
        } finally {
            setIsLoading(false);
        }
    }, [article.content]);

    const handleTextToSpeech = async () => {
        if (isPlaying) {
            stopAudio();
            return;
        }
        if (activeTab === 'data') return;

        let textToRead = '';
        if (activeTab === 'custom') {
            if (!customTopic.trim()) {
                // Ideally, show a small error message to the user
                console.error("Custom topic is empty.");
                return;
            }
            textToRead = customTopic;
        } else if (activeTab !== 'full' && analysisResult) {
            textToRead = analysisResult.content;
        } else {
            textToRead = article.content;
        }

        setIsLoading(true);
        const audioData = await generateNewsBroadcastSpeech(textToRead, language);
        setIsLoading(false);
        if (audioData) {
            playAudio(audioData);
        }
    };
    
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            stopAudio();
            if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
                audioContextRef.current.close();
            }
        }
    }, [onClose, stopAudio]);

    const handleCopyLink = () => {
        const url = article.url || window.location.href;
        navigator.clipboard.writeText(url).then(() => {
            setCopyStatus('Copied!');
            setTimeout(() => setCopyStatus('Copy Link'), 2000);
        });
    };

    const renderContent = () => {
        if (isLoading && !analysisResult && !isPlaying) {
            return (
                <div className="flex justify-center items-center h-64">
                    <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-brand-primary"></div>
                </div>
            );
        }
        
        if (activeTab === 'data' && article.dataPoints) {
            return <InteractiveChart data={article.dataPoints} title={article.visualizationTitle || 'Data Visualization'} />
        }

        if (activeTab === 'custom') {
            return (
                <div>
                    <h3 className="font-orbitron text-2xl mb-2 text-brand-primary">Generate from Topic</h3>
                    <p className="text-brand-text-muted mb-4 text-sm">Describe a topic or paste text below. The AI will generate and read a news-style broadcast about it in your chosen language.</p>
                    <textarea
                        className="w-full h-48 bg-brand-bg border-2 border-brand-secondary/50 rounded-lg p-4 focus:outline-none focus:border-brand-primary transition-colors text-brand-text"
                        value={customTopic}
                        onChange={(e) => setCustomTopic(e.target.value)}
                        placeholder="e.g., The latest advancements in quantum computing and their potential impact on cryptography..."
                    />
                </div>
            );
        }

        if (activeTab !== 'full' && analysisResult) {
            return (
                <div>
                    <h3 className="font-orbitron text-2xl mb-4 text-brand-primary">{analysisResult.title}</h3>
                    <div className="prose prose-invert max-w-none text-brand-text-muted whitespace-pre-wrap" dangerouslySetInnerHTML={{ __html: analysisResult.content.replace(/\n/g, '<br />') }} />
                </div>
            );
        }

        return (
            <div>
                 <h3 className="font-orbitron text-2xl mb-4 text-brand-primary">Full Article</h3>
                <p className="text-brand-text-muted whitespace-pre-wrap">{article.content}</p>
            </div>
        );
    };

    const articleUrl = encodeURIComponent(article.url || window.location.href);
    const articleTitle = encodeURIComponent(article.title);

    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 animate-fade-in" onClick={onClose}>
            <div className="bg-brand-surface w-full max-w-4xl max-h-[90vh] rounded-lg shadow-2xl border border-brand-primary/30 flex flex-col animate-slide-up" onClick={(e) => e.stopPropagation()}>
                <header className="p-4 border-b border-brand-primary/20 flex justify-between items-center">
                    <h2 className="font-orbitron text-2xl text-brand-secondary">{article.title}</h2>
                    <button onClick={onClose} className="text-brand-text-muted hover:text-brand-primary transition-colors">
                        <CloseIcon />
                    </button>
                </header>
                <div className="p-6 flex-grow overflow-y-auto">
                    {renderContent()}
                </div>
                
                {isPlaying && (
                    <div className="p-4 border-t border-brand-primary/20 bg-black/20 flex items-center gap-4 animate-fade-in">
                        <AudioVisualizer analyserNode={analyserNodeRef.current} width={150} height={40} barColor="#0ea5e9" />
                        <div className="flex-grow flex items-center gap-4">
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
                    </div>
                )}

                <footer className="p-4 border-t border-brand-primary/20 space-y-4">
                    <div className="flex flex-wrap gap-2 justify-start items-center">
                        <button onClick={() => { setActiveTab('full'); setAnalysisResult(null); }} className={`px-4 py-2 rounded font-semibold text-sm transition-colors ${activeTab === 'full' ? 'bg-brand-primary text-white' : 'bg-brand-bg hover:bg-brand-primary/20'}`}>
                           Full Text
                        </button>
                        <button onClick={() => { setActiveTab('summary'); handleGenerate('summary'); }} className={`px-4 py-2 rounded font-semibold text-sm transition-colors flex items-center gap-2 ${activeTab === 'summary' ? 'bg-brand-primary text-white' : 'bg-brand-bg hover:bg-brand-primary/20'}`}>
                            <ListIcon /> Summary
                        </button>
                        <button onClick={() => { setActiveTab('analysis'); handleGenerate('analysis'); }} className={`px-4 py-2 rounded font-semibold text-sm transition-colors flex items-center gap-2 ${activeTab === 'analysis' ? 'bg-brand-primary text-white' : 'bg-brand-bg hover:bg-brand-primary/20'}`}>
                            <BrainIcon /> Analysis
                        </button>
                        <button onClick={() => { setActiveTab('custom'); setAnalysisResult(null); }} className={`px-4 py-2 rounded font-semibold text-sm transition-colors flex items-center gap-2 ${activeTab === 'custom' ? 'bg-brand-primary text-white' : 'bg-brand-bg hover:bg-brand-primary/20'}`}>
                            <SparklesIcon /> AI Topic
                        </button>
                        {article.dataPoints && (
                             <button onClick={() => { setActiveTab('data'); setAnalysisResult(null); }} className={`px-4 py-2 rounded font-semibold text-sm transition-colors flex items-center gap-2 ${activeTab === 'data' ? 'bg-brand-primary text-white' : 'bg-brand-bg hover:bg-brand-primary/20'}`}>
                                <ChartIcon /> Data
                            </button>
                        )}
                    </div>
                    <div className="flex flex-wrap gap-4 justify-between items-center">
                        <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold mr-2">Language:</span>
                            {(['English', 'Hindi', 'Hinglish'] as Language[]).map(lang => (
                                 <button key={lang} onClick={() => setLanguage(lang)} className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${language === lang ? 'bg-brand-secondary text-white' : 'bg-brand-bg hover:bg-brand-primary/20'}`}>
                                    {lang}
                                </button>
                            ))}
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="relative">
                                 <button ref={shareButtonRef} onClick={() => setShareOpen(p => !p)} className="p-2 rounded font-semibold text-sm bg-brand-bg hover:bg-brand-primary/20 transition-colors flex items-center gap-2">
                                    <ShareIcon />
                                </button>
                                {isShareOpen && (
                                    <div className="absolute bottom-full right-0 mb-2 w-48 bg-brand-bg border border-brand-primary/20 rounded-lg shadow-lg p-2 z-10 animate-fade-in">
                                        <a href={`https://twitter.com/intent/tweet?url=${articleUrl}&text=${articleTitle}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 px-3 py-2 text-sm hover:bg-brand-surface rounded">
                                            <TwitterIcon /> Share on X
                                        </a>
                                        <a href={`https://www.facebook.com/sharer/sharer.php?u=${articleUrl}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 px-3 py-2 text-sm hover:bg-brand-surface rounded">
                                            <FacebookIcon /> Share on Facebook
                                        </a>
                                         <a href={`mailto:?subject=${articleTitle}&body=Check%20out%20this%20article:%20${articleUrl}`} className="flex items-center gap-3 px-3 py-2 text-sm hover:bg-brand-surface rounded">
                                            <MailIcon /> Share via Email
                                        </a>
                                        <button onClick={handleCopyLink} className="w-full flex items-center gap-3 px-3 py-2 text-sm hover:bg-brand-surface rounded">
                                            <LinkIcon /> {copyStatus}
                                        </button>
                                    </div>
                                )}
                            </div>
                            <button onClick={() => onToggleSave(article.id)} className={`px-4 py-2 rounded font-semibold text-sm transition-colors flex items-center gap-2 ${isSaved ? 'bg-brand-secondary text-white' : 'bg-brand-bg hover:bg-brand-primary/20'}`}>
                               <BookmarkIcon isSaved={isSaved} /> {isSaved ? 'Saved' : 'Save'}
                            </button>
                             <button onClick={handleTextToSpeech} disabled={(isLoading && !isPlaying) || activeTab === 'data'} className="px-4 py-2 rounded font-semibold text-sm bg-brand-accent text-white hover:bg-opacity-80 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed min-w-[150px] justify-center">
                                {isPlaying ? 'Stop' : <VolumeIcon />} {isPlaying ? 'Playing...' : (isLoading ? 'Generating...' : 'Read Aloud')}
                            </button>
                        </div>
                    </div>
                </footer>
            </div>
        </div>
    );
};

export default ArticleModal;