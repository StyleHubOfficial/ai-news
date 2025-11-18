
import React, { useRef, useEffect } from 'react';

interface AudioVisualizerProps {
    analyserNode: AnalyserNode | null;
    barColor?: string;
    gap?: number;
    width?: number;
    height?: number;
}

const AudioVisualizer: React.FC<AudioVisualizerProps> = ({ 
    analyserNode, 
    barColor = '#0ea5e9', 
    gap = 2,
    width = 300,
    height = 100
}) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        if (!analyserNode || !canvasRef.current) return;

        analyserNode.fftSize = 128;
        const bufferLength = analyserNode.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        
        let animationFrameId: number;

        const draw = () => {
            animationFrameId = requestAnimationFrame(draw);
            analyserNode.getByteFrequencyData(dataArray);

            ctx.clearRect(0, 0, canvas.width, canvas.height);
            
            const barWidth = (canvas.width / bufferLength);
            let x = 0;

            for (let i = 0; i < bufferLength; i++) {
                const barHeight = Math.pow(dataArray[i] / 255, 2) * canvas.height;
                
                ctx.fillStyle = barColor;
                ctx.fillRect(x, canvas.height - barHeight, barWidth - gap, barHeight);
                x += barWidth;
            }
        };

        draw();

        return () => {
            cancelAnimationFrame(animationFrameId);
        };
    }, [analyserNode, barColor, gap]);

    return <canvas ref={canvasRef} width={width} height={height} />;
};

export default AudioVisualizer;
