
import React, { useRef, useEffect, useCallback } from 'react';
import type { GameState, World, InputState, Level, GameActions, Settings } from '../types';
import { createWorld, spawnActor, get } from '../game/ecs';
import { runSystems } from '../game/systems';
import type { Health } from '../game/components';
import { CHARACTER_PRESETS } from '../constants/characters';

interface GameCanvasProps {
  gameState: GameState;
  onStateUpdate: (newState: Partial<GameState>) => void;
  onCoinCollected: () => void;
  input: InputState;
  characterId: string;
  level: Level;
  settings: Settings;
}

const GameCanvas: React.FC<GameCanvasProps> = ({ gameState, onStateUpdate, onCoinCollected, input, characterId, level, settings }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const worldRef = useRef<World | null>(null);
  
  // Calculate canvas dimensions based on resolution setting
  const getResolutionDimensions = () => {
      switch (settings.resolution) {
          case '480p': return { width: 854, height: 480 };
          case '720p': return { width: 1280, height: 720 };
          case '1080p': return { width: 1920, height: 1080 };
          default: return { width: 1200, height: 675 }; // Default logical resolution
      }
  };

  const { width, height } = getResolutionDimensions();

  const initGame = useCallback(() => {
    if (!canvasRef.current) return;
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    const world = createWorld({
        onStateUpdate,
        onCoinCollected,
        level: level,
    });
    world.settings = settings; // Inject settings
    worldRef.current = world;
    
    const characterPreset = CHARACTER_PRESETS[characterId] || CHARACTER_PRESETS.TEDDY;
    const player = spawnActor(world, characterPreset, level.playerStart);
    world.playerId = player;

  }, [onStateUpdate, onCoinCollected, characterId, level]); // Settings removed from dependency to prevent re-init on setting change

  // Separate effect to update settings in the world without re-initializing everything
  useEffect(() => {
      if (worldRef.current) {
          worldRef.current.settings = settings;
      }
  }, [settings]);

  useEffect(() => {
    initGame();
  }, [initGame]);

  useEffect(() => {
    let animationFrameId: number;
    const gameLoop = () => {
      if (!worldRef.current || !canvasRef.current) {
        animationFrameId = requestAnimationFrame(gameLoop);
        return;
      }
      
      const world = worldRef.current;
      world.status = gameState.status;
      world.canInteract = gameState.canInteract;
      
      if (gameState.paused) {
        animationFrameId = requestAnimationFrame(gameLoop);
        return;
      }

      const now = performance.now();
      const dt = (now - (world.lastTime || now)) / 1000;
      world.lastTime = now;
      world.time += dt;

      runSystems(world, canvasRef.current, input);

      const playerHealth = get<Health>(world, 'health', world.playerId);
      if(playerHealth && (playerHealth.hp !== gameState.playerHealth || playerHealth.maxHp !== gameState.playerMaxHealth)) {
          onStateUpdate({
              playerHealth: playerHealth.hp,
              playerMaxHealth: playerHealth.maxHp,
          });
      }

      animationFrameId = requestAnimationFrame(gameLoop);
    };

    gameLoop();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [input, gameState.paused, gameState.status, gameState.canInteract, onStateUpdate, gameState.playerHealth, gameState.playerMaxHealth]);

  return <canvas ref={canvasRef} width={width} height={height} className="w-full h-full object-contain" />;
};

export default GameCanvas;
