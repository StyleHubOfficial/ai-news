
import React from 'react';
import { SearchResult } from '../types';
import { CloseIcon } from './icons';

interface SearchResultsModalProps {
    result: SearchResult;
    onClose: () => void;
    isLoading: boolean;
}

const SearchResultsModal: React.FC<SearchResultsModalProps> = ({ result, onClose, isLoading }) => {
    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 animate-fade-in" onClick={onClose}>
            <div className="bg-brand-surface w-full max-w-3xl max-h-[90vh] rounded-lg shadow-2xl border border-brand-primary/30 flex flex-col animate-slide-up" onClick={(e) => e.stopPropagation()}>
                <header className="p-4 border-b border-brand-primary/20 flex justify-between items-center">
                    <h2 className="font-orbitron text-2xl text-brand-secondary">Search Results</h2>
                    <button onClick={onClose} className="text-brand-text-muted hover:text-brand-primary transition-colors">
                        <CloseIcon />
                    </button>
                </header>
                <div className="p-6 flex-grow overflow-y-auto">
                    {isLoading ? (
                        <div className="flex justify-center items-center h-full">
                            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-brand-primary"></div>
                        </div>
                    ) : (
                        <div>
                            <div className="prose prose-invert max-w-none text-brand-text-muted mb-6" dangerouslySetInnerHTML={{ __html: result.text.replace(/\n/g, '<br />') }}></div>
                            
                            {result.sources && result.sources.length > 0 && (
                                <div>
                                    <h3 className="font-orbitron text-lg text-brand-primary mb-3">Sources:</h3>
                                    <ul className="space-y-2">
                                        {result.sources.map((source, index) => (
                                            <li key={index} className="truncate">
                                                <a href={source.uri} target="_blank" rel="noopener noreferrer" className="text-brand-secondary hover:underline underline-offset-2">
                                                    {source.title || source.uri}
                                                </a>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default SearchResultsModal;
