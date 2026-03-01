interface EvalBarProps {
    evalPercentage: number;
    evalText: string;
}

export default function EvalBar({ evalPercentage, evalText }: EvalBarProps) {
    const whiteHeight = `${evalPercentage}%`;

    return (
        <div className="w-8 flex-shrink-0 bg-slate-800 rounded-sm border-2 border-slate-700 flex flex-col-reverse overflow-hidden relative shadow-inner">
            <div
                className="w-full bg-slate-200 transition-all duration-500 ease-in-out"
                style={{ height: whiteHeight }}
            />
            <div className={`absolute left-0 right-0 py-1 text-center text-xs font-bold z-10 mix-blend-difference text-white ${evalPercentage >= 50 ? 'top-1' : 'bottom-1'}`}>
                {evalText}
            </div>
            <div className="absolute top-1/2 left-0 right-0 h-px bg-slate-500/50 -translate-y-1/2" />
        </div>
    );
}
