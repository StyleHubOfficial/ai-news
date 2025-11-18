
export interface NewsArticle {
    id: number;
    title: string;
    summary: string;
    content: string;
    image: string;
    category: string;
    source: string;
    url?: string; // Optional URL for sharing
    isSummaryLoading?: boolean;
    dataPoints?: { label: string; value: number }[];
    visualizationTitle?: string;
}

export interface ChatMessage {
    id: string;
    text?: string;
    sender: 'user' | 'bot';
    isLoading?: boolean;
    imageUrl?: string;
}

export interface SearchResult {
    text: string;
    sources: {
        uri: string;
        title: string;
    }[];
}

export type AnalysisResult = {
    title: string;
    content: string;
};