import React from "react";

interface ImagePanelProps {
    image: string;
    title: string;
    badgeText?: string;
    /** Bounding box overlay style (optional, position: absolute) */
    activeBoxStyle?: React.CSSProperties;
    showBox?: boolean;
}

export default function ImagePanel({ image, title, badgeText, activeBoxStyle, showBox }: ImagePanelProps) {
    return (
        <div className="flex flex-col bg-slate-800 border border-slate-700 rounded-xl overflow-hidden shadow-xl sticky top-8 xl:col-span-1 lg:col-span-1 h-[max(600px,calc(100vh-8rem))]">
            <div className="p-4 bg-slate-900 border-b border-slate-700 flex justify-between items-center">
                <h3 className="font-semibold text-slate-200">{title}</h3>
                {badgeText && (
                    <span className="text-xs px-2 py-1 bg-indigo-500/20 text-indigo-300 rounded">
                        {badgeText}
                    </span>
                )}
            </div>
            <div className="flex-1 relative overflow-auto p-4 flex items-start justify-center">
                <div className="relative inline-block max-w-full">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                        src={image}
                        alt={title}
                        className="max-w-full h-auto rounded-md object-contain border border-slate-600"
                    />
                    {showBox && activeBoxStyle && (
                        <div
                            className="absolute border-2 border-red-500 bg-red-500/20 rounded shadow-[0_0_15px_rgba(239,68,68,0.5)] transition-all duration-300 z-10"
                            style={activeBoxStyle}
                        />
                    )}
                </div>
            </div>
        </div>
    );
}
