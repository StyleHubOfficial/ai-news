
import React from 'react';
import { NewsArticle } from '../types';
import { BookmarkIcon } from './icons';

interface ReelCardProps {
    article: NewsArticle;
    onClick: (article: NewsArticle) => void;
    onToggleSave: (articleId: number) => void;
    isSaved: boolean;
}

const ReelCard: React.FC<ReelCardProps> = ({ article, onClick, onToggleSave, isSaved }) => {
    
    const handleSaveClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        onToggleSave(article.id);
    };

    return (
        <div
            className="h-screen w-full flex-shrink-0 snap-start relative flex flex-col justify-end p-8 text-white"
        >
            <div className="absolute inset-0">
                <img src={article.image} alt={article.title} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent"></div>
            </div>

            <div className="absolute top-8 right-8 z-20">
                <button 
                    onClick={handleSaveClick} 
                    className="p-3 bg-black/50 rounded-full text-white hover:text-brand-primary transition-colors backdrop-blur-sm"
                    aria-label={isSaved ? "Unsave article" : "Save article"}
                >
                    <BookmarkIcon isSaved={isSaved} className="h-8 w-8" />
                </button>
            </div>
            
            <div className="relative z-10 animate-slide-up">
                <span className="bg-brand-primary text-brand-bg font-bold text-xs uppercase px-2 py-1 rounded">{article.category}</span>
                <h2 className="font-orbitron text-3xl md:text-4xl mt-2 mb-4 drop-shadow-lg">{article.title}</h2>
                <p className="text-brand-text-muted text-sm md:text-base max-w-2xl mb-6 drop-shadow-md">
                    {article.isSummaryLoading ? 'Loading summary...' : article.summary}
                </p>
                 <button 
                    onClick={() => onClick(article)}
                    className="bg-brand-secondary/80 backdrop-blur-sm font-semibold py-2 px-6 rounded-full hover:bg-brand-secondary transition-colors"
                >
                    Read More
                </button>
            </div>
        </div>
    );
};

export default ReelCard;