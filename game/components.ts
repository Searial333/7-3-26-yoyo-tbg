
import type { Vec2, Facing, AttachmentSpec, EntityId, JiggleSpec } from '../types';

export interface Transform {
  pos: Vec2;
  vel: Vec2;
  size: Vec2;
  facing: Facing;
  onGround: boolean;
  onWall: -1 | 0 | 1;
  groundY: number;
  onLadder: boolean;
  lastCheckpoint: Vec2;
}

export interface Kinematics {
  gravity: number;
  runSpeed: number;
  runAcceleration: number;
  runFriction: number;
  maxRollSpeed: number;
  rollSpeedBoost: number;
  wallSlideSpeed: number;
  jumpForce: number;
  wallJumpXBoost: number;
  wallJumpYForce: number;
  airAcceleration: number;
  airFriction: number;
  maxAirSpeed: number;
  coyoteFrames: number;
  maxJumps: number;
  dashSpeed: number;
  dashDuration: number;
  dashCooldown: number;
  bottleChargeTime: number;
  bottleLaserDuration: number;
  // Mario-style movement params
  tripleJumpForces: [number, number, number]; // [Normal, High, Super]
  longJumpForce: { x: number, y: number };
}

export interface StateMachine {
  state: string;
  animTime: number;
  invulnFrames: number;
  respawnFrames: number;
  timers: Record<string, number>;
  enemyId?: string;
  patrolBounds?: { left: number, right: number };
  // Movement state
  tripleJumpStage: 0 | 1 | 2;
  lastLandTime: number;
}

export interface Health {
  hp: number;
  maxHp: number;
  dead: boolean;
}

export interface Abilities {
  active?: string;
  available: Set<string>;
  context: Record<string, any>; // jumpsLeft, coyote, rollMomentum, etc.
}

export interface Input {
  left: boolean; right: boolean; up: boolean; down: boolean;
  jump: boolean; roll: boolean;
  jumpDown: boolean; rollDown: boolean; downDown: boolean;
}

export interface RendererRef {
  painterId: string;
}

export interface Palette {
  [name: string]: string;
}

export interface Attachments {
  list: AttachmentSpec[];
}

export interface Projectile {
    owner: EntityId;
    damage: number;
    life: number;
    type: string;
}

export interface Yoyo {
    owner: EntityId;
    state: 'active' | 'latched' | 'retracting';
    trick: 'none' | 'sleeper' | 'walkTheDog';
    length: number;
    maxLength: number;
    targetPos: Vec2; // Where the player wants the yoyo to be (based on stick input)
    stiffness: number;
    damping: number;
    rotation: number; // Visual rotation tracker
    stringNodes: Vec2[]; // Physics nodes for string
}

export interface NPC {
    type: 'shopkeeper';
    interactionState: 'idle' | 'prompting';
}

// A single jiggle point's state
export interface JigglePoint {
    spec: JiggleSpec;
    pos: Vec2;
    vel: Vec2;
    anchor: Vec2;
}

// The component attached to an entity, which can hold multiple jiggle points
export type Jiggle = Record<string, JigglePoint>;
