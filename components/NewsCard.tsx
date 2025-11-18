
import React from 'react';
import { NewsArticle } from '../types';
import { BookmarkIcon } from './icons';

interface NewsCardProps {
    article: NewsArticle;
    onClick: (article: NewsArticle) => void;
    onToggleSave: (articleId: number) => void;
    isSaved: boolean;
}

const NewsCard: React.FC<NewsCardProps> = ({ article, onClick, onToggleSave, isSaved }) => {
    
    const handleSaveClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        onToggleSave(article.id);
    };

    return (
        <div 
            className={`bg-brand-surface rounded-lg overflow-hidden shadow-lg border group
                        border-brand-primary/20 hover:border-brand-primary/60 
                        transition-all duration-300 transform hover:-translate-y-1 cursor-pointer
                        ${article.isSummaryLoading ? 'animate-pulse' : ''}`}
            onClick={() => onClick(article)}
        >
            <div className="relative">
                <img src={article.image} alt={article.title} className="w-full h-56 object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent"></div>
                
                <div className="absolute top-2 right-2 z-10">
                    <button 
                        onClick={handleSaveClick} 
                        className="p-2 bg-black/50 rounded-full text-white hover:text-brand-primary transition-colors backdrop-blur-sm"
                        aria-label={isSaved ? "Unsave article" : "Save article"}
                    >
                        <BookmarkIcon isSaved={isSaved} />
                    </button>
                </div>

                <div className="absolute bottom-0 left-0 p-4">
                    <span className="bg-brand-primary text-brand-bg font-bold text-xs uppercase px-2 py-1 rounded">{article.category}</span>
                    <h2 className="font-orbitron text-xl text-white mt-2 group-hover:text-brand-primary transition-colors">{article.title}</h2>
                </div>
            </div>
             <div className="p-4 h-[88px] flex items-center">
                 {article.isSummaryLoading ? (
                    <div className="w-full">
                        <div className="space-y-3">
                            <div className="h-3 bg-slate-700 rounded w-4/5"></div>
                            <div className="h-3 bg-slate-700 rounded"></div>
                            <div className="h-3 bg-slate-700 rounded w-2/4"></div>
                        </div>
                    </div>
                ) : (
                    <p className="text-brand-text-muted text-sm">{article.summary}</p>
                )}
            </div>
        </div>
    );
};

export default NewsCard;
