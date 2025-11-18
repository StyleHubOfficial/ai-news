
import React from 'react';

interface ChartProps {
    data: { label: string; value: number }[];
    title: string;
}

const InteractiveChart: React.FC<ChartProps> = ({ data, title }) => {
    const chartHeight = 300;
    const chartWidth = 500;
    const yAxisPadding = 40;
    const xAxisPadding = 30;
    const usableWidth = chartWidth - yAxisPadding;
    const barPadding = 10;
    const maxValue = Math.max(...data.map(d => d.value)) * 1.1; // Add 10% padding
    const barWidth = (usableWidth / data.length) - barPadding;

    const yValueToPixel = (value: number) => chartHeight - xAxisPadding - (value / maxValue) * (chartHeight - xAxisPadding);

    return (
        <div className="p-4 bg-brand-bg rounded-lg">
            <h4 className="font-orbitron text-lg text-center mb-4 text-brand-secondary">{title}</h4>
            <div className="relative flex justify-center">
                <svg width={chartWidth} height={chartHeight} className="text-brand-text-muted">
                    {/* Y Axis */}
                    <line x1={yAxisPadding} y1={0} x2={yAxisPadding} y2={chartHeight - xAxisPadding} stroke="currentColor" />
                    {/* Y Axis Labels */}
                    {[0, 0.25, 0.5, 0.75, 1].map(tick => {
                        const tickValue = Math.round(maxValue * tick);
                        const y = yValueToPixel(tickValue);
                        return (
                             <g key={tick} className="text-xs">
                                <text x={yAxisPadding - 8} y={y} textAnchor="end" alignmentBaseline="middle" fill="currentColor">{tickValue}</text>
                                <line x1={yAxisPadding - 4} y1={y} x2={yAxisPadding} y2={y} stroke="currentColor" />
                            </g>
                        )
                    })}
                   
                    {/* X Axis */}
                    <line x1={yAxisPadding} y1={chartHeight-xAxisPadding} x2={chartWidth} y2={chartHeight - xAxisPadding} stroke="currentColor" />

                    {data.map((d, i) => {
                        const barHeight = (d.value / maxValue) * (chartHeight - xAxisPadding);
                        const x = yAxisPadding + i * (barWidth + barPadding);
                        const y = chartHeight - xAxisPadding - barHeight;
                        return (
                            <g key={d.label} className="group">
                                <rect
                                    x={x}
                                    y={y}
                                    width={barWidth}
                                    height={barHeight}
                                    className="fill-brand-primary group-hover:fill-brand-secondary transition-colors"
                                />
                                <title>{`${d.label}: ${d.value}`}</title>
                                <text x={x + barWidth / 2} y={chartHeight - xAxisPadding + 15} textAnchor="middle" className="text-xs fill-current">{d.label}</text>
                            </g>
                        );
                    })}
                </svg>
            </div>
        </div>
    );
};

export default InteractiveChart;
