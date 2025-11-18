
import React, { useState } from 'react';
import { CloseIcon } from './icons';

interface Preferences {
    categories: string[];
    sources: string[];
}

interface PersonalizationModalProps {
    allCategories: string[];
    allSources: string[];
    currentPreferences: Preferences;
    onSave: (newPreferences: Preferences) => void;
    onClose: () => void;
}

const PersonalizationModal: React.FC<PersonalizationModalProps> = ({
    allCategories,
    allSources,
    currentPreferences,
    onSave,
    onClose
}) => {
    const [selectedCategories, setSelectedCategories] = useState<string[]>(currentPreferences.categories);
    const [selectedSources, setSelectedSources] = useState<string[]>(currentPreferences.sources);

    const handleCategoryToggle = (category: string) => {
        setSelectedCategories(prev =>
            prev.includes(category) ? prev.filter(c => c !== category) : [...prev, category]
        );
    };

    const handleSourceToggle = (source: string) => {
        setSelectedSources(prev =>
            prev.includes(source) ? prev.filter(s => s !== source) : [...prev, source]
        );
    };

    const handleSave = () => {
        onSave({ categories: selectedCategories, sources: selectedSources });
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 animate-fade-in" onClick={onClose}>
            <div className="bg-brand-surface w-full max-w-2xl rounded-lg shadow-2xl border border-brand-primary/30 flex flex-col animate-slide-up" onClick={(e) => e.stopPropagation()}>
                <header className="p-4 border-b border-brand-primary/20 flex justify-between items-center">
                    <h2 className="font-orbitron text-2xl text-brand-secondary">Personalize Your Feed</h2>
                    <button onClick={onClose} className="text-brand-text-muted hover:text-brand-primary transition-colors">
                        <CloseIcon />
                    </button>
                </header>
                <div className="p-6 flex-grow overflow-y-auto space-y-6">
                    <div>
                        <h3 className="font-orbitron text-lg text-brand-primary mb-3">Categories</h3>
                        <div className="flex flex-wrap gap-2">
                            {allCategories.map(cat => (
                                <button key={cat} onClick={() => handleCategoryToggle(cat)} className={`px-3 py-1.5 rounded-full text-sm font-semibold transition-colors ${selectedCategories.includes(cat) ? 'bg-brand-primary text-white' : 'bg-brand-bg hover:bg-brand-primary/20'}`}>
                                    {cat}
                                </button>
                            ))}
                        </div>
                    </div>
                     <div>
                        <h3 className="font-orbitron text-lg text-brand-primary mb-3">Sources</h3>
                        <div className="flex flex-wrap gap-2">
                             {allSources.map(src => (
                                <button key={src} onClick={() => handleSourceToggle(src)} className={`px-3 py-1.5 rounded-full text-sm font-semibold transition-colors ${selectedSources.includes(src) ? 'bg-brand-primary text-white' : 'bg-brand-bg hover:bg-brand-primary/20'}`}>
                                    {src}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
                <footer className="p-4 border-t border-brand-primary/20 flex justify-end gap-4">
                     <button onClick={onClose} className="px-4 py-2 rounded font-semibold text-sm bg-brand-bg hover:bg-brand-primary/20">
                        Cancel
                    </button>
                    <button onClick={handleSave} className="px-4 py-2 rounded font-semibold text-sm bg-brand-secondary text-white hover:bg-opacity-80">
                        Save Preferences
                    </button>
                </footer>
            </div>
        </div>
    );
};

export default PersonalizationModal;
