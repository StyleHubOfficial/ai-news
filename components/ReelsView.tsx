
import React from 'react';
import { NewsArticle } from '../types';
import ReelCard from './ReelCard';

interface ReelsViewProps {
    articles: NewsArticle[];
    onCardClick: (article: NewsArticle) => void;
    onToggleSave: (articleId: number) => void;
    savedArticles: Set<number>;
}

const ReelsView: React.FC<ReelsViewProps> = ({ articles, onCardClick, onToggleSave, savedArticles }) => {
    if (articles.length === 0) {
        return (
            <div className="h-[calc(100vh-68px)] flex flex-col justify-center items-center text-center text-brand-text-muted p-4">
                 <h3 className="text-2xl font-orbitron">No articles found.</h3>
                <p className="mt-2">Try adjusting your selections or view your saved articles.</p>
            </div>
        );
    }

    return (
        <div className="h-[calc(100vh-68px)] w-full overflow-y-auto snap-y snap-mandatory">
            {articles.map(article => (
                <ReelCard 
                    key={article.id} 
                    article={article} 
                    onClick={onCardClick} 
                    onToggleSave={onToggleSave}
                    isSaved={savedArticles.has(article.id)}
                />
            ))}
        </div>
    );
};

export default ReelsView;