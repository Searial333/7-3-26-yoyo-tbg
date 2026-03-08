
import React, { useState } from 'react';
import type { Settings } from '../types';

interface SettingsMenuProps {
    settings: Settings;
    onUpdate: (newSettings: Settings) => void;
    onClose: () => void;
}

const SettingsMenu: React.FC<SettingsMenuProps> = ({ settings, onUpdate, onClose }) => {
    const [activeTab, setActiveTab] = useState<'audio' | 'video' | 'controls'>('audio');

    const handleChange = (key: keyof Settings, value: any) => {
        onUpdate({ ...settings, [key]: value });
    };

    return (
        <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-50 backdrop-blur-md animate-fade-in">
            <div className="bg-[#0f172a] border border-[#334155] rounded-xl shadow-2xl w-full max-w-2xl h-[80vh] flex flex-col overflow-hidden">
                {/* Header */}
                <div className="p-6 border-b border-[#334155] flex justify-between items-center bg-[#1e293b]">
                    <h2 className="text-3xl font-bold text-white tracking-widest flex items-center gap-3">
                        <span className="text-yellow-400">⚙️</span> SETTINGS
                    </h2>
                    <button 
                        onClick={onClose}
                        className="text-gray-400 hover:text-white transition-colors text-2xl font-bold px-3 py-1 rounded hover:bg-[#334155]"
                    >
                        ✕
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex bg-[#0f172a] border-b border-[#334155]">
                    {['audio', 'video', 'controls'].map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab as any)}
                            className={`flex-1 py-4 text-center font-bold tracking-wider transition-colors ${
                                activeTab === tab 
                                ? 'bg-[#334155] text-yellow-400 border-b-2 border-yellow-400' 
                                : 'text-gray-400 hover:text-white hover:bg-[#1e293b]'
                            }`}
                        >
                            {tab.toUpperCase()}
                        </button>
                    ))}
                </div>

                {/* Content */}
                <div className="flex-1 p-8 overflow-y-auto">
                    {activeTab === 'audio' && (
                        <div className="space-y-8 animate-fade-in">
                            <div className="space-y-2">
                                <div className="flex justify-between items-center mb-1">
                                    <label className="text-white font-semibold text-lg">Music Volume</label>
                                    <span className="text-yellow-400 font-mono">{Math.round(settings.musicVolume * 100)}%</span>
                                </div>
                                <input 
                                    type="range" min="0" max="1" step="0.05"
                                    value={settings.musicVolume}
                                    onChange={(e) => handleChange('musicVolume', parseFloat(e.target.value))}
                                    className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-yellow-400 hover:accent-yellow-300"
                                />
                            </div>

                            <div className="space-y-2">
                                <div className="flex justify-between items-center mb-1">
                                    <label className="text-white font-semibold text-lg">Sound Effects</label>
                                    <span className="text-yellow-400 font-mono">{Math.round(settings.sfxVolume * 100)}%</span>
                                </div>
                                <input 
                                    type="range" min="0" max="1" step="0.05"
                                    value={settings.sfxVolume}
                                    onChange={(e) => handleChange('sfxVolume', parseFloat(e.target.value))}
                                    className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-yellow-400 hover:accent-yellow-300"
                                />
                            </div>
                        </div>
                    )}

                    {activeTab === 'video' && (
                        <div className="space-y-8 animate-fade-in">
                            <div className="space-y-4">
                                <label className="text-white font-semibold text-lg block">Resolution Preset</label>
                                <div className="grid grid-cols-3 gap-4">
                                    {['480p', '720p', '1080p'].map((res) => (
                                        <button
                                            key={res}
                                            onClick={() => handleChange('resolution', res)}
                                            className={`py-3 rounded-lg border-2 font-bold transition-all ${
                                                settings.resolution === res
                                                ? 'border-yellow-400 bg-yellow-400/20 text-yellow-400'
                                                : 'border-gray-600 bg-gray-800 text-gray-400 hover:border-gray-400 hover:text-white'
                                            }`}
                                        >
                                            {res}
                                        </button>
                                    ))}
                                </div>
                                <p className="text-sm text-gray-500 italic">
                                    Note: Game logic always runs at 1200x675. This setting affects the display sharpness and rendering buffer.
                                </p>
                            </div>

                            <div className="flex items-center justify-between p-4 bg-gray-800 rounded-lg border border-gray-700">
                                <div>
                                    <label className="text-white font-semibold text-lg block">Debug Overlay</label>
                                    <span className="text-gray-400 text-sm">Show hitboxes and performance stats</span>
                                </div>
                                <button 
                                    onClick={() => handleChange('showDebug', !settings.showDebug)}
                                    className={`w-14 h-8 rounded-full p-1 transition-colors ${settings.showDebug ? 'bg-green-500' : 'bg-gray-600'}`}
                                >
                                    <div className={`w-6 h-6 bg-white rounded-full shadow-md transform transition-transform ${settings.showDebug ? 'translate-x-6' : 'translate-x-0'}`} />
                                </button>
                            </div>
                        </div>
                    )}

                    {activeTab === 'controls' && (
                        <div className="space-y-8 animate-fade-in">
                            <div className="space-y-2">
                                <div className="flex justify-between items-center mb-1">
                                    <label className="text-white font-semibold text-lg">On-Screen Controls Opacity</label>
                                    <span className="text-yellow-400 font-mono">{Math.round(settings.touchOpacity * 100)}%</span>
                                </div>
                                <input 
                                    type="range" min="0" max="1" step="0.1"
                                    value={settings.touchOpacity}
                                    onChange={(e) => handleChange('touchOpacity', parseFloat(e.target.value))}
                                    className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-yellow-400 hover:accent-yellow-300"
                                />
                            </div>
                            
                            <div className="p-4 bg-blue-900/30 border border-blue-800 rounded-lg">
                                <h4 className="text-blue-200 font-bold mb-2">Keyboard Shortcuts</h4>
                                <ul className="text-gray-300 space-y-1 text-sm grid grid-cols-2 gap-2">
                                    <li><span className="text-white font-mono bg-gray-700 px-1 rounded">WASD / Arrows</span> Move</li>
                                    <li><span className="text-white font-mono bg-gray-700 px-1 rounded">Space</span> Jump</li>
                                    <li><span className="text-white font-mono bg-gray-700 px-1 rounded">Shift</span> Roll</li>
                                    <li><span className="text-white font-mono bg-gray-700 px-1 rounded">X</span> Dash</li>
                                    <li><span className="text-white font-mono bg-gray-700 px-1 rounded">C</span> Shoot</li>
                                    <li><span className="text-white font-mono bg-gray-700 px-1 rounded">V</span> Yo-Yo</li>
                                    <li><span className="text-white font-mono bg-gray-700 px-1 rounded">Z</span> Diaper Bomb</li>
                                    <li><span className="text-white font-mono bg-gray-700 px-1 rounded">E</span> Interact</li>
                                    <li><span className="text-white font-mono bg-gray-700 px-1 rounded">P / ESC</span> Pause</li>
                                </ul>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-[#334155] bg-[#1e293b] flex justify-end">
                    <button 
                        onClick={onClose}
                        className="bg-yellow-500 hover:bg-yellow-400 text-black font-bold py-2 px-8 rounded-lg transition-colors shadow-lg"
                    >
                        Return to Game
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SettingsMenu;
