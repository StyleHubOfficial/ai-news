
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { generateVideo } from '../services/geminiService';
import { CloseIcon, UploadIcon, ImageIcon } from './icons';

interface VideoGenerationModalProps {
    initialPrompt?: string;
    initialImage?: File;
    onClose: () => void;
}

type Mode = 'text' | 'image';
type AspectRatio = '16:9' | '9:16';

const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve((reader.result as string).split(',')[1]);
        reader.onerror = error => reject(error);
    });
};

const VideoGenerationModal: React.FC<VideoGenerationModalProps> = ({ initialPrompt, initialImage, onClose }) => {
    const [mode, setMode] = useState<Mode>(initialImage ? 'image' : 'text');
    const [prompt, setPrompt] = useState(initialPrompt || '');
    const [imageFile, setImageFile] = useState<File | null>(initialImage || null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [aspectRatio, setAspectRatio] = useState<AspectRatio>('16:9');
    
    const [status, setStatus] = useState<'idle' | 'generating' | 'done' | 'error'>('idle');
    const [progressMessage, setProgressMessage] = useState('');
    const [videoUrl, setVideoUrl] = useState<string | null>(null);
    const [error, setError] = useState('');
    
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (imageFile) {
            const previewUrl = URL.createObjectURL(imageFile);
            setImagePreview(previewUrl);
            return () => URL.revokeObjectURL(previewUrl);
        }
        setImagePreview(null);
    }, [imageFile]);

    const handleGenerate = async () => {
        setStatus('generating');
        setError('');

        if (mode === 'image' && !imageFile) {
            setError("Please upload an image to generate a video.");
            setStatus('error');
            return;
        }

        if (mode === 'text' && !prompt.trim()) {
            setError("Please enter a prompt to generate a video.");
            setStatus('error');
            return;
        }

        try {
            let imagePayload;
            if (mode === 'image' && imageFile) {
                const data = await fileToBase64(imageFile);
                imagePayload = { data, mimeType: imageFile.type };
            }
            const url = await generateVideo({ 
                prompt: prompt.trim() || undefined,
                image: imagePayload,
                aspectRatio
            }, setProgressMessage);

            setVideoUrl(url);
            setStatus('done');
        } catch (err) {
            console.error(err);
            setError(err instanceof Error ? err.message : 'An unknown error occurred.');
            setStatus('error');
        }
    };
    
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setImageFile(file);
        }
    };

    useEffect(() => {
        return () => {
            if (videoUrl) {
                URL.revokeObjectURL(videoUrl);
            }
        };
    }, [videoUrl]);

    const renderIdleState = () => (
        <div className="w-full max-w-2xl mx-auto flex flex-col items-center">
             <div className="bg-brand-bg/50 border border-brand-primary/20 rounded-full p-1 mb-8 flex gap-1">
                <button onClick={() => setMode('text')} className={`px-8 py-2 rounded-full font-semibold transition-colors ${mode === 'text' ? 'bg-brand-primary text-white' : 'text-brand-text-muted hover:bg-brand-surface'}`}>From Text</button>
                <button onClick={() => setMode('image')} className={`px-8 py-2 rounded-full font-semibold transition-colors ${mode === 'image' ? 'bg-brand-primary text-white' : 'text-brand-text-muted hover:bg-brand-surface'}`}>From Image</button>
            </div>
            
            {mode === 'text' && (
                <textarea 
                    value={prompt}
                    onChange={e => setPrompt(e.target.value)}
                    placeholder="e.g., A neon hologram of a cat driving at top speed"
                    className="w-full h-32 bg-brand-bg border-2 border-brand-secondary/50 rounded-lg p-4 focus:outline-none focus:border-brand-primary transition-colors text-brand-text mb-4"
                />
            )}
            
            {mode === 'image' && (
                <div className="w-full flex flex-col items-center mb-4">
                    <input type="file" accept="image/*" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
                    <button onClick={() => fileInputRef.current?.click()} className="w-full h-48 border-2 border-dashed border-brand-secondary/50 rounded-lg flex items-center justify-center hover:border-brand-primary transition-colors text-brand-text-muted hover:text-brand-text">
                        {imagePreview ? (
                            <img src={imagePreview} alt="upload preview" className="max-h-full max-w-full object-contain rounded-md" />
                        ) : (
                             <div className="text-center">
                                <UploadIcon className="h-12 w-12 mx-auto" />
                                <p>Click to upload an image</p>
                            </div>
                        )}
                    </button>
                     <input
                        type="text"
                        value={prompt}
                        onChange={e => setPrompt(e.target.value)}
                        placeholder="Optional: Add a prompt to guide the animation..."
                        className="w-full mt-4 bg-brand-bg border-2 border-brand-secondary/50 rounded-full py-2 px-4 focus:outline-none focus:border-brand-primary transition-colors text-brand-text"
                    />
                </div>
            )}
            
            <div className="flex items-center gap-4 mb-6">
                <span className="font-semibold">Aspect Ratio:</span>
                 <div className="bg-brand-bg/50 border border-brand-primary/20 rounded-full p-1 flex gap-1">
                    <button onClick={() => setAspectRatio('16:9')} className={`px-4 py-1 rounded-full font-semibold transition-colors text-sm ${aspectRatio === '16:9' ? 'bg-brand-primary text-white' : 'text-brand-text-muted hover:bg-brand-surface'}`}>16:9 (Landscape)</button>
                    <button onClick={() => setAspectRatio('9:16')} className={`px-4 py-1 rounded-full font-semibold transition-colors text-sm ${aspectRatio === '9:16' ? 'bg-brand-primary text-white' : 'text-brand-text-muted hover:bg-brand-surface'}`}>9:16 (Portrait)</button>
                </div>
            </div>

            <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noopener noreferrer" className="text-sm text-brand-text-muted hover:text-brand-primary mb-4 block">Note: Video generation may incur billing charges.</a>
            <button onClick={handleGenerate} className="bg-gradient-to-br from-brand-primary to-brand-secondary text-white font-bold py-3 px-8 rounded-full text-lg transform hover:scale-105 transition-transform duration-300">
                Generate Video
            </button>
        </div>
    );
    
    return (
        <div className="fixed inset-0 bg-brand-bg/95 backdrop-blur-lg flex items-center justify-center z-[60] p-4 animate-fade-in" onClick={onClose}>
            <div className="bg-black/50 w-full max-w-5xl h-full max-h-[90vh] rounded-lg shadow-2xl border border-brand-primary/30 flex flex-col animate-slide-up relative" onClick={e => e.stopPropagation()}>
                <header className="absolute top-0 left-0 right-0 p-4 flex justify-between items-center z-10 bg-gradient-to-b from-black/50 to-transparent">
                    <h2 className="font-orbitron text-xl text-brand-secondary drop-shadow-lg">Video Synthesis</h2>
                    <button onClick={onClose} className="text-brand-text-muted hover:text-brand-primary transition-colors">
                        <CloseIcon />
                    </button>
                </header>
                
                <div className="flex-grow flex items-center justify-center p-8">
                    {status === 'idle' && renderIdleState()}
                    {status === 'generating' && (
                        <div className="text-center animate-fade-in">
                            <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-brand-primary mx-auto"></div>
                            <p className="font-mono text-lg mt-6 text-brand-text-muted">{progressMessage}</p>
                        </div>
                    )}
                    {status === 'error' && (
                        <div className="text-center animate-fade-in p-4">
                             <h3 className="font-orbitron text-3xl text-brand-accent mb-4">Generation Failed</h3>
                             <p className="text-brand-text-muted mb-6">{error}</p>
                             <button onClick={handleGenerate} className="bg-brand-secondary text-white font-bold py-2 px-6 rounded-full hover:bg-opacity-80 transition-colors">
                                Try Again
                            </button>
                        </div>
                    )}
                    {status === 'done' && videoUrl && (
                        <video src={videoUrl} controls autoPlay className="w-full h-full object-contain animate-fade-in rounded-md" />
                    )}
                </div>
            </div>
        </div>
    );
};

export default VideoGenerationModal;
