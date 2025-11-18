
import React, { useState } from 'react';
import { SearchIcon, SettingsIcon, GridIcon, ReelsIcon, BookmarkIcon } from './icons';

interface HeaderProps {
    onSearch: (query: string) => void;
    isSearching: boolean;
    onPersonalizeClick: () => void;
    viewMode: 'grid' | 'reels';
    onToggleViewMode: () => void;
    showSavedOnly: boolean;
    onToggleShowSaved: () => void;
}

const Header: React.FC<HeaderProps> = ({ 
    onSearch, isSearching, onPersonalizeClick, 
    viewMode, onToggleViewMode, showSavedOnly, onToggleShowSaved 
}) => {
    const [query, setQuery] = useState('');

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        onSearch(query);
    };

    return (
        <header className="bg-brand-surface/50 backdrop-blur-sm sticky top-0 z-40 border-b border-brand-primary/20">
            <div className="container mx-auto px-4 py-3 flex justify-between items-center gap-4">
                <div className="flex items-center gap-4 md:gap-6 flex-shrink-0">
                     <div className="flex items-center gap-3">
                        <h1 className="font-orbitron text-2xl font-bold text-brand-primary">
                            <span className="text-brand-secondary">G</span>-NEWS
                        </h1>
                        <div className="hidden md:flex items-center gap-3">
                             <div className="w-px h-6 bg-brand-text-muted/30"></div>
                             <span className="font-orbitron text-sm text-brand-text-muted tracking-wider">
                                NEWS HUB
                            </span>
                        </div>
                    </div>
                     <button onClick={onPersonalizeClick} className="p-2 text-brand-text-muted hover:text-brand-primary transition-colors rounded-full hover:bg-brand-bg" aria-label="Personalize Feed">
                        <SettingsIcon />
                    </button>
                    <button onClick={onToggleShowSaved} className={`p-2 transition-colors rounded-full hover:bg-brand-bg ${showSavedOnly ? 'text-brand-secondary' : 'text-brand-text-muted hover:text-brand-primary'}`} aria-label="Show Saved Articles">
                        <BookmarkIcon isSaved={showSavedOnly} />
                    </button>
                    <button onClick={onToggleViewMode} className="p-2 text-brand-text-muted hover:text-brand-primary transition-colors rounded-full hover:bg-brand-bg" aria-label="Toggle View Mode">
                        {viewMode === 'grid' ? <ReelsIcon /> : <GridIcon />}
                    </button>
                </div>
                <form onSubmit={handleSearch} className="w-full max-w-md">
                    <div className="relative">
                        <input
                            type="text"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="Ask about current events..."
                            className="w-full bg-brand-bg border-2 border-brand-secondary/50 rounded-full py-2 pl-10 pr-4 focus:outline-none focus:border-brand-primary transition-colors text-brand-text"
                            disabled={isSearching}
                        />
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <SearchIcon />
                        </div>
                         {isSearching && (
                            <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-brand-primary"></div>
                            </div>
                        )}
                    </div>
                </form>
            </div>
        </header>
    );
};

export default Header;
