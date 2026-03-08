
import type { Kinematics, Health, StateMachine, Abilities, Attachments, Transform, Input, RendererRef, Palette, Projectile, Yoyo, Jiggle, NPC } from './game/components';

// Core Types
export type EntityId = number;
export interface Vec2 { x: number; y: number; }
export type Facing = 1 | -1;
export type GameStatus = 'playing' | 'levelComplete' | 'gameOver';
export type LevelId = string;
export type LevelProgressState = 'locked' | 'unlocked' | 'completed';
export type LevelProgress = Record<LevelId, LevelProgressState>;

export interface Settings {
    musicVolume: number; // 0 to 1
    sfxVolume: number;   // 0 to 1
    resolution: '480p' | '720p' | '1080p';
    touchOpacity: number; // 0.1 to 1
    showDebug: boolean;
}

// Level Structure
export interface Platform {
  style: string;
  type: 'solid' | 'oneway' | 'bounce';
  x: number;
  y: number;
  w: number;
  h: number;
  moving?: {
    path: Vec2[];
    speed: number;
    currentIndex?: number;
    progress?: number;
  };
}

export interface Zone {
  type: 'ladder';
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Collectible {
    type: 'coin';
    x: number;
    y: number;
    id: string;
}

export interface EnemySpawn {
    type: 'patrol' | 'flyer';
    x: number;
    y: number;
    id: string;
    patrolBounds?: { left: number, right: number };
}

export interface NPCSpawn {
    type: 'shopkeeper';
    x: number;
    y: number;
    id: string;
}

export interface Checkpoint {
    id: string;
    x: number;
    y: number;
    w: number;
    h: number;
}

export interface Level {
  name: string;
  playerStart: Vec2;
  bounds: { top: number; right: number; bottom: number; left: number; };
  platforms: Platform[];
  zones: Zone[];
  collectibles: Collectible[];
  enemies: EnemySpawn[];
  npcs: NPCSpawn[];
  checkpoints: Checkpoint[];
  finishZone: { x: number; y: number; w: number; h: number; } | null;
}

// Game State & World
export interface LevelStats {
    time: number;
    coins: number;
    enemies: number;
    totalEnemies: number;
    totalCoins: number;
}

export interface GameState {
  status: GameStatus;
  paused: boolean;
  playerHealth: number;
  playerMaxHealth: number;
  currentLevelId: LevelId | null;
  shopOpen: boolean;
  canInteract: boolean;
  levelStats?: LevelStats;
}

export interface GameActions {
  onStateUpdate: (newState: Partial<GameState>) => void;
  createParticleBurst: (x: number, y: number, count: number, color: string, type?: string, options?: any) => void;
  setScreenShake: (magnitude: number, duration: number) => void;
  log: (message: string) => void;
  onCoinCollected: () => void;
}

export interface BackgroundLayer {
    sprite: string;
    depth: number; // 0 = sky (static), 1 = background, >1 = foreground
}

export interface FloatingText {
  text: string;
  x: number;
  y: number;
  life: number;
  maxLife: number;
  color: string;
  vy: number;
}

export interface MilkSplat {
  x: number;
  y: number;
  life: number;
  maxLife: number;
  radius: number;
}

export interface StinkCloud {
    x: number;
    y: number;
    radius: number;
    life: number;
    maxLife: number;
}

export interface HeartPickup {
  x: number;
  y: number;
  w: number;
  h: number;
  life: number; // in seconds
  vy: number;
  onGround: boolean;
}


export interface World {
  time: number;
  lastTime: number;
  dt: number;
  status: GameStatus;
  actions: {
      onStateUpdate: (newState: Partial<GameState>) => void;
      createParticleBurst: (x: number, y: number, count: number, color: string, type?: string, options?: any) => void;
      setScreenShake: (magnitude: number, duration: number) => void;
      log: (message: string) => void;
      collectCoin: () => void;
  };
  level: Level;
  settings: Settings;
  backgroundLayers: BackgroundLayer[];
  entities: Set<EntityId>;
  playerId: EntityId;
  components: Map<string, Map<EntityId, any>>;
  camera: { x: number; y: number; shakeMagnitude: number; shakeDuration: number; };
  particles: Particle[];
  floatingTexts: FloatingText[];
  milkSplats: MilkSplat[];
  stinkClouds: StinkCloud[];
  heartPickups: HeartPickup[];
  canInteract: boolean;
  respawnPlayer: boolean;
  activatedCheckpoints: Set<string>;
  
  // Stats & Cutscene
  enemiesDefeated: number;
  levelCoins: number;
  cutscene: 'none' | 'level_end';
  cutsceneTimer: number;
}

// Input
export interface InputState {
  left: boolean;
  right: boolean;
  up: boolean;
  down: boolean;
  jump: boolean;
  roll: boolean;
  dash: boolean;
  shoot: boolean;
  throw: boolean;
  bomb: boolean;
  interact: boolean;
  
  // Analog inputs
  leftStick: Vec2;
  rightStick: Vec2;

  // Edge-triggered flags
  jumpDown: boolean;
  rollDown: boolean;
  downDown: boolean;
  dashDown: boolean;
  shootDown: boolean;
  throwDown: boolean;
  bombDown: boolean;
  interactDown: boolean;
}

// Actor/Character
export interface ActorPreset {
  id: string;
  size: Vec2;
  physics: Partial<Kinematics>;
  abilities: string[];
  painterId: string;
  palette: Palette;
  attachments?: AttachmentSpec[];
  jiggle?: JiggleSpec[];
}

export interface AttachmentSpec {
  id: 'tailA' | 'tailB' | 'scarf' | 'hairL' | 'hairR' | 'hairFrontL' | 'hairFrontR' | 'hairBackL' | 'hairBackC' | 'hairBackR' | 'nevlin_hair_pink' | 'nevlin_hair_blue' | 'nevlin_hair_purple' | 'nevlin_hair_green' | 'nevlin_hair_yellow' | 'nevlin_hair_orange' | 'nevlin_hair_red';
  type: 'chain' | 'ribbon';
  anchor: Vec2;
  segments: number;
  segmentLength: number;
  colorA: string;
  colorB: string;
  widthA?: number;
  widthB?: number;

  // Common physics properties
  gravityFactor?: number;
  stiffness?: number;
  damping?: number;
  bounciness?: number;

  // Ribbon-specific aesthetic properties
  waveAmplitude?: number;
  waveFrequency?: number;
}

export interface JiggleSpec {
    id: string;
    stiffness: number; // How quickly it returns to rest
    damping: number;   // How quickly it stops oscillating
    mass: number;      // How much it resists acceleration
}


// ECS Component Types
export type ComponentName = 'transform' | 'kinematics' | 'state' | 'health' | 'abilities' | 'input' | 'renderer' | 'palette' | 'attachments' | 'projectile' | 'yoyo' | 'jiggle' | 'npc';

export type Component = Transform | Kinematics | StateMachine | Health | Abilities | Input | RendererRef | Palette | Attachments | Projectile | Yoyo | Jiggle | NPC;

// Particles
export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
  type: string;
}
