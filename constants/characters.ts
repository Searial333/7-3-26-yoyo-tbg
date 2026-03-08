
import type { ActorPreset } from '../types';

const SHARED_PHYSICS = {
  gravity: 3600,
  runSpeed: 7.5 * 60, 
  runAcceleration: 30 * 60,
  runFriction: 0.85,
  maxRollSpeed: 13 * 60,
  rollSpeedBoost: 5 * 60,
  wallSlideSpeed: 3.4 * 60,
  jumpForce: 22 * 60, 
  wallJumpXBoost: 10 * 60,
  wallJumpYForce: 18 * 60,
  airAcceleration: 15 * 60,
  airFriction: 0.97,
  maxAirSpeed: 8.0 * 60,
  coyoteFrames: 10,
  maxJumps: 2,
  dashSpeed: 26 * 60, 
  dashDuration: 0.15,
  dashCooldown: 0.5,
  bottleChargeTime: 1.2,
  bottleLaserDuration: 0.4,
  // Mario-style
  tripleJumpForces: [22 * 60, 26 * 60, 32 * 60] as [number, number, number], // Normal, Higher, Highest
  longJumpForce: { x: 12 * 60, y: 16 * 60 } // Fast horizontal, lower vertical
};


export const CHARACTER_PRESETS: { [key: string]: ActorPreset } = {
    TEDDY: {
        id: 'teddy',
        size: { x: 20 * 4, y: 24 * 4 },
        physics: SHARED_PHYSICS,
        abilities: ['run', 'jump', 'doubleJump', 'roll', 'wallSlide', 'slam', 'climb', 'dash', 'bottleBlaster', 'yoyo', 'diaperBomb'],
        painterId: 'pixel:teddy',
        palette: {
          body_shadow: '#6a3805', body: '#8B4513', body_light: '#A0522D',
          vest_shadow: '#4a2e1d', vest: '#5a3a22', vest_light: '#6d4c38',
          snout: '#D2B48C', snout_dark: '#C19A6B', nose: '#4a2e1d', eye: '#000',
          bandana: '#5b21b6', bandana_dark: '#4c1d95', bandana_highlight: '#7c3aed',
        },
        attachments: [
          { id: 'tailA', type: 'chain', anchor: { x: 28, y: 24 }, segments: 8, segmentLength: 6, colorA: '#5b21b6', colorB: '#7c3aed', gravityFactor: 0.7, stiffness: 8, damping: 0.96 },
          { id: 'tailB', type: 'chain', anchor: { x: 36, y: 24 }, segments: 8, segmentLength: 6, colorA: '#5b21b6', colorB: '#7c3aed', gravityFactor: 0.7, stiffness: 8, damping: 0.96 },
        ],
    },
};
