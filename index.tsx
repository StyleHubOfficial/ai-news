import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

console.log('index.tsx: Starting React app...');

// Add error boundary for better debugging
class ErrorBoundary extends React.Component<{children: React.ReactNode}, {hasError: boolean}> {
    constructor(props: {children: React.ReactNode}) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError(error: any) {
        return { hasError: true };
    }

    componentDidCatch(error: any, errorInfo: any) {
        console.error('React Error Boundary caught an error:', error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="h-screen flex items-center justify-center bg-red-900 text-white">
                    <div className="text-center">
                        <h2 className="text-2xl font-bold mb-4">Something went wrong</h2>
                        <p>Check the console for details</p>
                        <button 
                            className="mt-4 px-4 py-2 bg-white text-red-900 rounded"
                            onClick={() => window.location.reload()}
                        >
                            Reload Page
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

// Safe root element access with fallback
const rootElement = document.getElementById('root');
if (!rootElement) {
    // Create root element if it doesn't exist
    const newRoot = document.createElement('div');
    newRoot.id = 'root';
    newRoot.className = 'h-full';
    document.body.appendChild(newRoot);
    
    console.log('Created root element');
    
    const root = ReactDOM.createRoot(newRoot);
    root.render(
        <React.StrictMode>
            <ErrorBoundary>
                <App />
            </ErrorBoundary>
        </React.StrictMode>
    );
} else {
    console.log('Found existing root element');
    
    const root = ReactDOM.createRoot(rootElement);
    root.render(
        <React.StrictMode>
            <ErrorBoundary>
                <App />
            </ErrorBoundary>
        </React.StrictMode>
    );
}

console.log('index.tsx: React app rendered successfully');
