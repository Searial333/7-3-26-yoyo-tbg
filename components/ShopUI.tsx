import React, { useState } from 'react';

interface ShopUIProps {
    coins: number;
    lifeCost: number;
    onBuyLife: () => boolean;
    onClose: () => void;
}

const ShopUI: React.FC<ShopUIProps> = ({ coins, lifeCost, onBuyLife, onClose }) => {
    const [feedback, setFeedback] = useState('');

    const handleBuy = () => {
        const success = onBuyLife();
        if (success) {
            setFeedback('Purchase successful!');
        } else {
            setFeedback("Not enough coins!");
        }
        setTimeout(() => setFeedback(''), 2000);
    };

    const canAfford = coins >= lifeCost;

    return (
        <div className="absolute inset-0 bg-black/70 flex items-center justify-center z-40 backdrop-blur-sm" onClick={onClose}>
            <div className="bg-[#0b1220] border-2 border-[#1e2c42] rounded-lg p-8 text-center shadow-2xl w-full max-w-lg animate-fade-in-up" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-4xl font-bold text-yellow-300 tracking-widest">SHOP</h2>
                    <div className="bg-[#10161f] border border-[#2a3647] rounded-lg px-4 py-2">
                        <span className="text-2xl font-bold text-white">💰 {coins}</span>
                    </div>
                </div>

                <div className="space-y-4">
                    {/* Item Row */}
                    <div className="bg-[#10161f]/50 p-4 rounded-lg flex items-center justify-between border border-transparent hover:border-[#2a3647] transition-all">
                        <div className="flex items-center gap-4">
                            <span className="text-4xl">❤️</span>
                            <div>
                                <h3 className="text-2xl font-semibold text-white text-left">Extra Life</h3>
                                <p className="text-lg text-yellow-400 font-bold">Cost: {lifeCost} Coins</p>
                            </div>
                        </div>
                        <button 
                            onClick={handleBuy}
                            disabled={!canAfford}
                            className="bg-green-600 text-white rounded-lg px-6 py-3 text-xl font-bold hover:bg-green-500 transition-colors disabled:bg-gray-600 disabled:text-gray-400 disabled:cursor-not-allowed transform hover:scale-105 active:scale-95"
                        >
                            Buy
                        </button>
                    </div>
                     {/* More items can be added here */}
                </div>
                
                {feedback && (
                    <p className={`mt-4 text-lg font-semibold ${feedback.includes('successful') ? 'text-green-400' : 'text-red-400'}`}>
                        {feedback}
                    </p>
                )}

                <button onClick={onClose} className="mt-8 bg-[#10161f] text-white border border-[#2a3647] rounded-lg px-8 py-3 text-xl hover:bg-[#1a2330] transition-colors">
                    Close
                </button>
            </div>
        </div>
    );
};

export default ShopUI;
