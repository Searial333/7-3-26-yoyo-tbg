
import React, { useState, useEffect, useCallback } from 'react';
import type { LevelProgress, LevelId } from '../types';
import { LEVEL_ORDER, LEVEL_COORDS, LEVELS, LEVEL_GRAPH } from '../constants/levels';

interface OverworldProps {
    levelProgress: LevelProgress;
    onSelectLevel: (levelId: LevelId) => void;
}

const Overworld: React.FC<OverworldProps> = ({ levelProgress, onSelectLevel }) => {
    const [selectedId, setSelectedId] = useState<LevelId>('1-1');

    const handleKeyDown = useCallback((e: KeyboardEvent) => {
        const connections = LEVEL_GRAPH[selectedId];
        let nextId: LevelId | undefined;

        if (e.key === 'ArrowRight') nextId = connections.right;
        else if (e.key === 'ArrowLeft') nextId = connections.left;
        else if (e.key === 'ArrowUp') nextId = connections.up;
        else if (e.key === 'ArrowDown') nextId = connections.down;
        else if (e.key === 'Enter' || e.key === ' ') {
            if (levelProgress[selectedId] !== 'locked') {
                onSelectLevel(selectedId);
            }
        }
        
        if (nextId && levelProgress[nextId] !== 'locked') {
            setSelectedId(nextId);
        }
    }, [selectedId, onSelectLevel, levelProgress]);

    useEffect(() => {
        window.addEventListener('keydown', handleKeyDown);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [handleKeyDown]);
    
    const getStatusStyles = (id: LevelId, isSelected: boolean) => {
        const status = levelProgress[id];
        let baseClasses = 'w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-all duration-300 transform ';

        if (id === 'SHOP') {
            baseClasses = 'w-14 h-14 rounded-lg flex items-center justify-center font-bold text-lg transition-all duration-300 transform ';
             baseClasses += 'bg-indigo-600 border-2 border-indigo-400 text-white shadow-lg ';
        } else if (status === 'locked') {
            baseClasses += 'bg-gray-800 text-gray-600 cursor-not-allowed border-2 border-gray-700';
        } else if (status === 'completed') {
            baseClasses += 'bg-green-600 border-2 border-green-400 text-white shadow-lg';
        } else { // unlocked
            baseClasses += 'bg-yellow-500 border-2 border-yellow-300 text-black animate-bounce-slight shadow-lg';
        }
        
        if (isSelected) {
            baseClasses += ' scale-125 ring-4 ring-white ring-offset-2 ring-offset-black/50 z-20';
        } else {
            baseClasses += ' hover:scale-110 z-10';
        }
        return baseClasses;
    };

    return (
        <div className="w-full h-full bg-[#1a4785] p-0 relative flex items-center justify-center overflow-hidden">
            {/* --- OCEAN PATTERN --- */}
            <div className="absolute inset-0 opacity-10" style={{ 
                backgroundImage: 'radial-gradient(#4a7ac9 2px, transparent 2px)', 
                backgroundSize: '30px 30px' 
            }}></div>

            {/* --- ISLAND MAP SVG --- */}
            <svg className="absolute w-full h-full top-0 left-0 pointer-events-none" preserveAspectRatio="xMidYMid slice" viewBox="0 0 1200 675">
                <defs>
                    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
                        <feDropShadow dx="5" dy="5" stdDeviation="5" floodColor="#000" floodOpacity="0.5"/>
                    </filter>
                    <linearGradient id="islandGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" style={{ stopColor: '#81C784' }} />
                        <stop offset="100%" style={{ stopColor: '#4CAF50' }} />
                    </linearGradient>
                    <pattern id="grassPattern" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
                        <circle cx="20" cy="20" r="2" fill="#388E3C" opacity="0.3"/>
                    </pattern>
                </defs>

                {/* Island Shape */}
                <path d="M100,450 Q150,600 400,650 Q700,700 900,600 Q1100,500 1150,300 Q1100,100 800,50 Q500,0 200,100 Q50,200 100,450 Z" 
                      fill="url(#islandGrad)" filter="url(#shadow)" />
                
                {/* Texture overlay */}
                <path d="M100,450 Q150,600 400,650 Q700,700 900,600 Q1100,500 1150,300 Q1100,100 800,50 Q500,0 200,100 Q50,200 100,450 Z" 
                      fill="url(#grassPattern)" />

                {/* Decorations: Trees */}
                {[
                    {x: 200, y: 200}, {x: 250, y: 180}, {x: 180, y: 250}, // Forest left
                    {x: 950, y: 350}, {x: 900, y: 380}, {x: 1000, y: 320}, // Forest right
                    {x: 600, y: 100}, {x: 650, y: 80} // North
                ].map((pos, i) => (
                    <g key={i} transform={`translate(${pos.x}, ${pos.y}) scale(0.8)`}>
                        <circle cx="0" cy="-10" r="15" fill="#2E7D32" />
                        <circle cx="-10" cy="5" r="15" fill="#2E7D32" />
                        <circle cx="10" cy="5" r="15" fill="#2E7D32" />
                    </g>
                ))}

                {/* Decorations: Mountains */}
                <path d="M700,200 L750,120 L800,200 Z" fill="#795548" />
                <path d="M730,120 L750,120 L740,140 Z" fill="#FFF" opacity="0.8" /> {/* Snow cap */}
                <path d="M750,220 L820,100 L890,220 Z" fill="#5D4037" />
                <path d="M800,100 L820,100 L810,130 Z" fill="#FFF" opacity="0.8" />

                {/* Path Lines */}
                {Object.entries(LEVEL_GRAPH).map(([startId, connections]) => 
                    Object.values(connections).map(endId => {
                        if (!endId) return null;
                        
                        // Parse percentage coordinates to pixels roughly
                        const parseCoord = (p: string) => parseInt(p) * (p.includes('x') ? 12 : 6.75); // rough scale mapping
                        
                        // We need to use the style values from LEVEL_COORDS which are percentages
                        const startPct = LEVEL_COORDS[startId as LevelId];
                        const endPct = LEVEL_COORDS[endId as LevelId];
                        
                        const sx = parseFloat(startPct.x) * 12;
                        const sy = parseFloat(startPct.y) * 6.75;
                        const ex = parseFloat(endPct.x) * 12;
                        const ey = parseFloat(endPct.y) * 6.75;

                        const isUnlocked = levelProgress[endId as LevelId] !== 'locked';
                        
                        return (
                             <path 
                                key={`path_${startId}_${endId}`}
                                d={`M${sx},${sy} Q${(sx+ex)/2},${(sy+ey)/2 - 20} ${ex},${ey}`}
                                stroke={isUnlocked ? "#DDAA55" : "#5d4037"}
                                strokeWidth="6" 
                                strokeDasharray="10 5"
                                fill="none"
                                strokeLinecap="round"
                            />
                        )
                    })
                )}
            </svg>

            <h1 className="absolute top-8 text-5xl font-bold text-[#FFF] tracking-widest drop-shadow-md z-30" style={{ textShadow: '2px 2px 0 #000' }}>JUNGLE ISLAND</h1>

            {LEVEL_ORDER.map((id) => {
                const coords = LEVEL_COORDS[id];
                const isSelected = id === selectedId;
                const status = levelProgress[id];
                
                return (
                    <div 
                        key={id} 
                        className="absolute flex flex-col items-center"
                        style={{ left: coords.x, top: coords.y, transform: 'translate(-50%, -50%)', zIndex: 10 }}
                    >
                        <button
                            onClick={() => {
                                if (status !== 'locked') {
                                     setSelectedId(id);
                                     onSelectLevel(id);
                                }
                            }}
                            className={getStatusStyles(id, isSelected)}
                            aria-label={`Level ${id}`}
                        >
                            {id === 'SHOP' ? '🛖' : (status === 'completed' ? '★' : id.split('-')[1])}
                        </button>
                        <div className={`mt-1 px-2 py-0.5 rounded bg-black/50 backdrop-blur-sm text-white text-xs font-bold transition-opacity ${isSelected ? 'opacity-100' : 'opacity-0'}`}>
                            {LEVELS[id].name}
                        </div>
                    </div>
                );
            })}
            
            <div className="absolute bottom-4 right-4 text-white/50 text-sm">
                Press Arrow Keys to Navigate • Space/Enter to Select
            </div>
        </div>
    );
};

export default Overworld;
