
import React, { useState, useCallback, useEffect, useRef } from 'react';
import GameCanvas from './components/GameCanvas';
import Overworld from './components/Overworld';
import ShopUI from './components/ShopUI';
import SettingsMenu from './components/SettingsMenu';
import type { GameStatus, GameState, LevelProgress, LevelId, Settings, LevelStats } from './types';
import { useInput } from './hooks/useInput';
import { TouchControls } from './components/TouchControls';
import { LEVEL_ORDER, LEVELS } from './constants/levels';


const Heart: React.FC<{ filled: boolean, isNew: boolean, isDamaged: boolean, atFullHealth: boolean }> = ({ filled, isNew, isDamaged, atFullHealth }) => (
  <div className={`w-8 h-8 rounded-md transition-all duration-300 ${filled ? 'bg-green-400 shadow-[0_0_8px_rgba(0,255,200,.3)]' : 'bg-red-500 shadow-[0_0_8px_rgba(255,0,0,.2)]'} ${isNew ? 'animate-heart-pulse' : ''} ${isDamaged ? 'animate-heart-damage' : ''} ${atFullHealth && filled ? 'animate-full-health-pulse' : ''}`}></div>
);

const GameOverlay: React.FC<{ 
    status: GameStatus; 
    onRetry: () => void; 
    onContinue: () => void;
    onExit: () => void;
    onNextLevel: () => void;
    lives: number;
    coins: number;
    continueCost: number;
    stats?: LevelStats;
    levelId: LevelId | null;
}> = ({ status, onRetry, onContinue, onExit, onNextLevel, lives, coins, continueCost, stats, levelId }) => {
  if (status === 'playing') return null;

  const isGameOver = status === 'gameOver';
  const title = isGameOver ? 'GAME OVER' : 'LEVEL CLEARED!';
  const hasNextLevel = levelId && LEVEL_ORDER.indexOf(levelId) < LEVEL_ORDER.length - 2; // -2 because Shop is last

  const canRetry = lives > 0;
  const canContinue = coins >= continueCost;

  return (
    <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-50 animate-fade-in">
      <div className="bg-[#0b1220] border-2 border-[#1e2c42] rounded-xl p-8 text-center shadow-2xl w-full max-w-lg">
        <h2 className={`text-5xl font-bold mb-8 tracking-widest drop-shadow-md ${isGameOver ? 'text-red-500' : 'text-yellow-400'}`}>{title}</h2>
        
        {!isGameOver && stats && (
            <div className="grid grid-cols-2 gap-4 mb-8 text-left bg-[#10161f] p-4 rounded-lg border border-gray-700">
                <div className="text-gray-400 font-bold">⏱️ TIME</div>
                <div className="text-white text-right font-mono text-xl">{stats.time.toFixed(2)}s</div>
                
                <div className="text-gray-400 font-bold">💰 COINS</div>
                <div className="text-white text-right font-mono text-xl text-yellow-300">{stats.coins} <span className="text-sm text-gray-500">/ {stats.totalCoins}</span></div>
                
                <div className="text-gray-400 font-bold">👾 ENEMIES</div>
                <div className="text-white text-right font-mono text-xl text-red-300">{stats.enemies} <span className="text-sm text-gray-500">/ {stats.totalEnemies}</span></div>
            </div>
        )}

        <div className="flex flex-col gap-4">
            {isGameOver && (
                <>
                    <button onClick={onRetry} disabled={!canRetry} className="bg-blue-600 text-white border-2 border-blue-400 rounded-lg px-8 py-3 text-xl font-bold hover:bg-blue-500 transition-transform active:scale-95 disabled:bg-gray-700 disabled:border-gray-600 disabled:text-gray-500 disabled:cursor-not-allowed">
                        Retry (Lives: {lives})
                    </button>
                    <button onClick={onContinue} disabled={!canContinue} className="bg-purple-600 text-white border-2 border-purple-400 rounded-lg px-8 py-3 text-xl font-bold hover:bg-purple-500 transition-transform active:scale-95 disabled:bg-gray-700 disabled:border-gray-600 disabled:text-gray-500 disabled:cursor-not-allowed">
                        Continue ({continueCost} Coins)
                    </button>
                </>
            )}
            
            {!isGameOver && (
                <button onClick={onNextLevel} disabled={!hasNextLevel} className="bg-green-600 text-white border-2 border-green-400 rounded-lg px-8 py-3 text-xl font-bold hover:bg-green-500 transition-transform active:scale-95 disabled:hidden">
                    Next Level ➜
                </button>
            )}

            <button onClick={onExit} className="bg-gray-700 text-white border-2 border-gray-500 rounded-lg px-8 py-3 text-xl font-bold hover:bg-gray-600 transition-transform active:scale-95">
                {isGameOver ? 'Exit to Map' : 'Return to Map'}
            </button>
        </div>
      </div>
    </div>
  );
};


const App: React.FC = () => {
  const [gameKey, setGameKey] = useState(Date.now());
  const [characterId, setCharacterId] = useState('TEDDY');
  const [view, setView] = useState<'overworld' | 'level'>('overworld');
  const [showSettings, setShowSettings] = useState(false);
  
  const [totalCoins, setTotalCoins] = useState(0);
  const [lives, setLives] = useState(3);
  const CONTINUE_COST = 25;
  const LIFE_COST = 50;

  // Settings State with Persistence
  const [settings, setSettings] = useState<Settings>(() => {
      const saved = localStorage.getItem('gameSettings');
      if (saved) {
          try {
              return JSON.parse(saved);
          } catch (e) { console.error("Failed to parse settings", e); }
      }
      return {
          musicVolume: 0.5,
          sfxVolume: 0.8,
          resolution: '720p',
          touchOpacity: 0.5,
          showDebug: false,
      };
  });

  const updateSettings = (newSettings: Settings) => {
      setSettings(newSettings);
      localStorage.setItem('gameSettings', JSON.stringify(newSettings));
  };

  const [levelProgress, setLevelProgress] = useState<LevelProgress>(() => {
      const progress: LevelProgress = {};
      LEVEL_ORDER.forEach((id) => {
          progress[id] = 'locked';
      });
      progress['1-1'] = 'unlocked';
      progress['SHOP'] = 'unlocked'; // Shop is always available
      return progress;
  });

  const [gameState, setGameState] = useState<GameState>({
    status: 'playing',
    paused: false,
    playerHealth: 3,
    playerMaxHealth: 3,
    currentLevelId: null,
    shopOpen: false,
    canInteract: false,
  });
  
  const gameContainerRef = useRef<HTMLDivElement>(null);
  const input = useInput(gameContainerRef);
  const [isTouchDevice, setIsTouchDevice] = useState(false);

  useEffect(() => {
    setIsTouchDevice('ontouchstart' in window || navigator.maxTouchPoints > 0);
  }, []);


  const [animatedHeart, setAnimatedHeart] = useState<number | null>(null);
  const [damagedHeart, setDamagedHeart] = useState<number | null>(null);
  const prevHealthRef = useRef(gameState.playerHealth);

  useEffect(() => {
    if (gameState.playerHealth > prevHealthRef.current) {
        setAnimatedHeart(prevHealthRef.current);
        const timer = setTimeout(() => setAnimatedHeart(null), 600);
        return () => clearTimeout(timer);
    } else if (gameState.playerHealth < prevHealthRef.current) {
        setDamagedHeart(gameState.playerHealth);
        const timer = setTimeout(() => setDamagedHeart(null), 600);
        return () => clearTimeout(timer);
    }
  }, [gameState.playerHealth]);

  useEffect(() => {
    prevHealthRef.current = gameState.playerHealth;
  }, [gameState.playerHealth]);


  const handleStateUpdate = useCallback((newState: Partial<GameState>) => {
    setGameState(prev => {
        const nextState = { ...prev, ...newState };
        if(newState.status === 'levelComplete' && prev.currentLevelId && prev.currentLevelId !== 'SHOP') {
            const currentLevelIndex = LEVEL_ORDER.indexOf(prev.currentLevelId);
            const nextLevelId = LEVEL_ORDER[currentLevelIndex + 1];

            setLevelProgress(prevProgress => {
                const newProgress = {...prevProgress};
                newProgress[prev.currentLevelId!] = 'completed';
                if(nextLevelId && newProgress[nextLevelId] === 'locked') {
                    newProgress[nextLevelId] = 'unlocked';
                }
                return newProgress;
            });
        }
        return nextState;
    });
  }, []);
  
  const handleCoinCollected = useCallback(() => setTotalCoins(c => c + 1), []);

  const handleBuyLife = useCallback(() => {
    if (totalCoins >= LIFE_COST) {
        setTotalCoins(c => c - LIFE_COST);
        setLives(l => l + 1);
        return true;
    }
    return false;
  }, [totalCoins]);

  const handleExitToMap = useCallback(() => {
      setView('overworld');
      setGameState(prev => ({...prev, status: 'playing', paused: false, shopOpen: false, currentLevelId: null, canInteract: false }));
  }, []);
  
  const handleRestart = useCallback(() => {
    setGameKey(Date.now());
    setGameState(prev => ({
        ...prev,
        status: 'playing',
        paused: false,
        playerHealth: 3,
        playerMaxHealth: 3,
        shopOpen: false,
        canInteract: false,
        levelStats: undefined
    }));
  }, []);

  const handleRetry = useCallback(() => {
      if (lives > 0) {
          setLives(l => l - 1);
          handleRestart();
      }
  }, [lives, handleRestart]);

  const handleContinue = useCallback(() => {
      if (totalCoins >= CONTINUE_COST) {
          setTotalCoins(c => c - CONTINUE_COST);
          handleRestart();
      }
  }, [totalCoins, handleRestart]);

  const handleSelectLevel = useCallback((levelId: LevelId) => {
      if (levelProgress[levelId] === 'locked') return;
      setGameState(prev => ({ ...prev, currentLevelId: levelId }));
      setView('level');
      handleRestart();
  }, [levelProgress, handleRestart]);

  const handleNextLevel = useCallback(() => {
      if (gameState.currentLevelId) {
          const currentIdx = LEVEL_ORDER.indexOf(gameState.currentLevelId);
          const nextId = LEVEL_ORDER[currentIdx + 1];
          if (nextId) {
              handleSelectLevel(nextId);
          }
      }
  }, [gameState.currentLevelId, handleSelectLevel]);

  // When character changes, restart the game (if in a level) or do nothing (if on map)
  useEffect(() => {
      if (view === 'level') {
        handleRestart();
      }
  }, [characterId, view, handleRestart]);

  useEffect(() => {
    if (input.interactDown && gameState.canInteract && !gameState.shopOpen && view === 'level') {
        handleStateUpdate({ shopOpen: true, paused: true });
    }
  }, [input.interactDown, gameState.canInteract, gameState.shopOpen, view, handleStateUpdate]);


  useEffect(() => {
    const handlePause = (e: KeyboardEvent) => {
      if (e.key === 'p' || e.key === 'P' || e.key === 'Escape') {
        setGameState(prev => {
            if(prev.shopOpen) {
                return { ...prev, shopOpen: false, paused: false }; // Escape closes shop and unpauses
            }
            if(showSettings) {
                setShowSettings(false);
                return { ...prev, paused: false };
            }
            if(prev.status === 'playing' && view === 'level') {
               return { ...prev, paused: !prev.paused };
            }
            return prev;
        });
      }
    };
    window.addEventListener('keydown', handlePause);
    return () => window.removeEventListener('keydown', handlePause);
  }, [view, showSettings]);

  const toggleSettings = () => {
      setShowSettings(prev => {
          const next = !prev;
          // Auto-pause when opening settings in a level
          if (view === 'level' && gameState.status === 'playing') {
              handleStateUpdate({ paused: next });
          }
          return next;
      });
  };

  const isOverlayVisible = gameState.status !== 'playing' && !gameState.shopOpen && !showSettings;
  const atFullHealth = gameState.playerHealth === gameState.playerMaxHealth;

  return (
    <div className="w-screen h-screen bg-[#0c0f14] flex flex-col items-center justify-center p-4 font-mono">
      <div ref={gameContainerRef} className="relative w-full max-w-7xl aspect-[16/9] bg-[#0a0f1a] border border-[#1d2735] rounded-lg shadow-2xl overflow-hidden touch-none group">
        
        {/* Settings Button */}
        <button 
            onClick={toggleSettings}
            className="absolute top-4 right-4 z-50 text-3xl bg-black/40 hover:bg-black/60 p-2 rounded-full backdrop-blur-sm transition-all text-white border border-white/10 hover:border-white/30"
            title="Settings"
        >
            ⚙️
        </button>

        {showSettings && (
            <SettingsMenu 
                settings={settings} 
                onUpdate={updateSettings} 
                onClose={toggleSettings} 
            />
        )}

        {view === 'overworld' && (
            <Overworld 
                levelProgress={levelProgress}
                onSelectLevel={handleSelectLevel}
            />
        )}
        {view === 'level' && gameState.currentLevelId && (
            <GameCanvas
              key={gameKey}
              characterId={characterId}
              onStateUpdate={handleStateUpdate}
              onCoinCollected={handleCoinCollected}
              gameState={gameState}
              input={input}
              level={LEVELS[gameState.currentLevelId]}
              settings={settings}
            />
        )}
        
        {view === 'level' && isTouchDevice && <TouchControls input={input} opacity={settings.touchOpacity} />}
        
        {view === 'level' && gameState.shopOpen && (
            <ShopUI 
                coins={totalCoins}
                onBuyLife={() => handleBuyLife()}
                onClose={() => handleStateUpdate({ shopOpen: false, paused: false })}
                lifeCost={LIFE_COST}
            />
        )}

        {view === 'level' && gameState.paused && !gameState.shopOpen && !showSettings && (
          <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-50">
            <div className="bg-[#0b1220] border border-[#1e2c42] rounded-lg p-8 text-center">
              <h2 className="text-4xl font-bold mb-6 text-white tracking-widest">PAUSED</h2>
              <div className="flex flex-col gap-4">
                  <button onClick={() => handleStateUpdate({ paused: false })} className="bg-[#10161f] text-white border border-[#2a3647] rounded-lg px-8 py-3 text-xl hover:bg-[#1a2330]">
                    Resume
                  </button>
                  <button onClick={toggleSettings} className="bg-[#10161f] text-white border border-[#2a3647] rounded-lg px-8 py-3 text-xl hover:bg-[#1a2330]">
                    Settings
                  </button>
                  <button onClick={handleExitToMap} className="bg-[#10161f] text-white border border-[#2a3647] rounded-lg px-8 py-3 text-xl hover:bg-[#1a2330]">
                    Exit Level
                  </button>
              </div>
            </div>
          </div>
        )}

        {view === 'level' && isOverlayVisible && (
            <GameOverlay 
                status={gameState.status} 
                onRetry={handleRetry} 
                onContinue={handleContinue} 
                onExit={handleExitToMap} 
                onNextLevel={handleNextLevel}
                lives={lives} 
                coins={totalCoins} 
                continueCost={CONTINUE_COST}
                stats={gameState.levelStats}
                levelId={gameState.currentLevelId}
            />
        )}

        {view === 'level' && (
            <div className="absolute top-4 left-4 bg-black/50 border border-[#1d2735] p-3 rounded-lg backdrop-blur-sm pointer-events-auto z-10 flex flex-col gap-2 transition-opacity duration-300 group-hover:opacity-100 opacity-50">
              <div className="flex items-center gap-2">
                <span className="text-xl font-bold text-yellow-300">❤️</span>
                <span className="text-2xl font-bold text-white">{lives}</span>
              </div>
              <div className="flex items-center gap-2">
                 <span className="text-xl font-bold text-yellow-400">💰</span>
                 <span className="text-2xl font-bold text-white">{totalCoins}</span>
              </div>
              <div className="flex items-center gap-2 pt-2 border-t border-white/20 mt-2">
                {Array.from({ length: gameState.playerMaxHealth }).map((_, i) => <Heart key={i} filled={i < gameState.playerHealth} isNew={i === animatedHeart} isDamaged={i === damagedHeart} atFullHealth={atFullHealth} />)}
              </div>
            </div>
        )}
      </div>
      <div className="text-gray-500 mt-2 text-center text-xs sm:text-sm">
        Controls: <span className="font-bold text-gray-400">← →</span> move · <span className="font-bold text-gray-400">Space</span> jump · <span className="font-bold text-gray-400">Shift</span> roll · <span className="font-bold text-gray-400">X</span> dash · <span className="font-bold text-gray-400">C</span> shoot · <span className="font-bold text-gray-400">V</span> throw · <span className="font-bold text-gray-400">E</span> interact · <span className="font-bold text-gray-400">P/Esc</span> pause
      </div>
    </div>
  );
};

export default App;
