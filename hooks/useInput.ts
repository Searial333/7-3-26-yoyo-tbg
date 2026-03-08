
import React, { useState, useEffect, useRef } from 'react';
import type { InputState } from '../types';

export const TOUCH_CONFIG = {
  dpad: { x: 0.15, y: 0.75, radius: 0.12 },
  jump: { x: 0.85, y: 0.75, radius: 0.09 },
  dash: { x: 0.70, y: 0.85, radius: 0.07 },
  roll: { x: 0.80, y: 0.55, radius: 0.07 },
  shoot: { x: 0.9, y: 0.55, radius: 0.07 },
  throw: { x: 0.70, y: 0.65, radius: 0.07 },
  interact: { x: 0.85, y: 0.35, radius: 0.07 },
};

// Standard Gamepad Mapping (XInput style)
const GP = {
    A: 0,
    B: 1,
    X: 2,
    Y: 3,
    LB: 4,
    RB: 5,
    LT: 6,
    RT: 7,
    Back: 8,
    Start: 9,
    L3: 10,
    R3: 11,
    Up: 12,
    Down: 13,
    Left: 14,
    Right: 15,
};

const DEADZONE = 0.2;

const applyDeadzone = (val: number): number => {
    return Math.abs(val) > DEADZONE ? (val - Math.sign(val) * DEADZONE) / (1 - DEADZONE) : 0;
};

export const useInput = (containerRef: React.RefObject<HTMLElement>): InputState => {
  const [keys, setKeys] = useState<Record<string, boolean>>({});
  const [gamepad, setGamepad] = useState<Gamepad | null>(null);
  const [touchInput, setTouchInput] = useState<Record<string, boolean>>({});
  
  const previousInput = useRef<InputState>({
      left: false, right: false, up: false, down: false,
      jump: false, roll: false, dash: false, shoot: false, throw: false, bomb: false, interact: false,
      leftStick: { x: 0, y: 0 }, rightStick: { x: 0, y: 0 },
      jumpDown: false, rollDown: false, downDown: false, dashDown: false, shootDown: false, throwDown: false, bombDown: false, interactDown: false
  });

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => setKeys(prev => ({ ...prev, [e.code]: true }));
    const handleKeyUp = (e: KeyboardEvent) => setKeys(prev => ({ ...prev, [e.code]: false }));

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  useEffect(() => {
      const updateGamepad = () => {
          const gp = navigator.getGamepads()[0];
          setGamepad(gp);
          requestAnimationFrame(updateGamepad);
      };
      const frameId = requestAnimationFrame(updateGamepad);
      return () => cancelAnimationFrame(frameId);
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || !('ontouchstart' in window)) return;

    const activeTouches = new Map<number, { x: number; y: number }>();

    const calculateTouchInput = () => {
      const newState: Record<string, boolean> = {};
      const rect = el.getBoundingClientRect();

      for (const touch of activeTouches.values()) {
        const normalizedX = (touch.x - rect.left) / rect.width;
        const normalizedY = (touch.y - rect.top) / rect.height;

        // D-pad (Movement)
        const dx = normalizedX - TOUCH_CONFIG.dpad.x;
        const dy = normalizedY - TOUCH_CONFIG.dpad.y;
        if (Math.hypot(dx, dy) < TOUCH_CONFIG.dpad.radius) {
          if (Math.abs(dx) > Math.abs(dy)) {
            newState[dx > 0 ? 'moveRight' : 'moveLeft'] = true;
          } else {
            newState[dy > 0 ? 'moveDown' : 'moveUp'] = true;
          }
        }
        
        // Buttons
        const checkBtn = (key: string, cfg: any) => {
            const bdx = normalizedX - cfg.x;
            const bdy = normalizedY - cfg.y;
            if (Math.hypot(bdx, bdy) < cfg.radius) newState[key] = true;
        }
        checkBtn('jump', TOUCH_CONFIG.jump);
        checkBtn('dash', TOUCH_CONFIG.dash);
        checkBtn('roll', TOUCH_CONFIG.roll);
        checkBtn('shoot', TOUCH_CONFIG.shoot);
        checkBtn('throw', TOUCH_CONFIG.throw);
        checkBtn('interact', TOUCH_CONFIG.interact);
      }
      setTouchInput(newState);
    };

    const handleTouchStart = (e: TouchEvent) => {
      e.preventDefault();
      Array.from(e.changedTouches).forEach(t => activeTouches.set(t.identifier, { x: t.clientX, y: t.clientY }));
      calculateTouchInput();
    };
    const handleTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      Array.from(e.changedTouches).forEach(t => activeTouches.set(t.identifier, { x: t.clientX, y: t.clientY }));
      calculateTouchInput();
    };
    const handleTouchEnd = (e: TouchEvent) => {
      e.preventDefault();
      Array.from(e.changedTouches).forEach(t => activeTouches.delete(t.identifier));
      calculateTouchInput();
    };

    el.addEventListener('touchstart', handleTouchStart, { passive: false });
    el.addEventListener('touchmove', handleTouchMove, { passive: false });
    el.addEventListener('touchend', handleTouchEnd, { passive: false });
    el.addEventListener('touchcancel', handleTouchEnd, { passive: false });

    return () => {
      el.removeEventListener('touchstart', handleTouchStart);
      el.removeEventListener('touchmove', handleTouchMove);
      el.removeEventListener('touchend', handleTouchEnd);
      el.removeEventListener('touchcancel', handleTouchEnd);
    };
  }, [containerRef]);

  // --- CONTROL MAPPING ---

  // Gamepad Axes
  let lx = 0, ly = 0, rx = 0, ry = 0;
  if (gamepad) {
      lx = applyDeadzone(gamepad.axes[0]);
      ly = applyDeadzone(gamepad.axes[1]);
      rx = applyDeadzone(gamepad.axes[2]);
      ry = applyDeadzone(gamepad.axes[3]);
  }

  // Keyboard Movement (WASD) -> Left Stick
  if (lx === 0 && ly === 0) {
      if (keys.KeyA || touchInput.moveLeft) lx = -1;
      if (keys.KeyD || touchInput.moveRight) lx = 1;
      if (keys.KeyW || touchInput.moveUp) ly = -1;
      if (keys.KeyS || touchInput.moveDown) ly = 1;
  }

  // Keyboard Aiming (Arrows) -> Right Stick
  if (rx === 0 && ry === 0) {
      if (keys.ArrowLeft) rx = -1;
      if (keys.ArrowRight) rx = 1;
      if (keys.ArrowUp) ry = -1;
      if (keys.ArrowDown) ry = 1;
  }

  const gpBtn = (i: number) => gamepad?.buttons[i]?.pressed ?? false;

  const input: InputState = {
      // Analog Sticks
      leftStick: { x: lx, y: ly },
      rightStick: { x: rx, y: ry },

      // Movement Flags (Derived from Left Stick)
      left: lx < -0.5 || gpBtn(GP.Left),
      right: lx > 0.5 || gpBtn(GP.Right),
      up: ly < -0.5 || gpBtn(GP.Up),
      down: ly > 0.5 || gpBtn(GP.Down),

      // Actions
      jump: keys.Space || gpBtn(GP.A) || !!touchInput.jump,
      roll: keys.ShiftLeft || keys.ShiftRight || gpBtn(GP.B) || !!touchInput.roll,
      dash: keys.KeyX || gpBtn(GP.X) || !!touchInput.dash,
      shoot: keys.KeyC || gpBtn(GP.Y) || gpBtn(GP.RT) || !!touchInput.shoot,
      throw: keys.KeyV || gpBtn(GP.RB) || !!touchInput.throw,
      bomb: keys.KeyZ || gpBtn(GP.LB),
      interact: keys.KeyE || gpBtn(GP.Y) || !!touchInput.interact,

      // Triggers (Calculated below)
      jumpDown: false, rollDown: false, downDown: false, dashDown: false, 
      shootDown: false, throwDown: false, bombDown: false, interactDown: false
  };

  // Edge Detection
  const prev = previousInput.current;
  input.jumpDown = input.jump && !prev.jump;
  input.rollDown = input.roll && !prev.roll;
  input.downDown = input.down && !prev.down;
  input.dashDown = input.dash && !prev.dash;
  input.shootDown = input.shoot && !prev.shoot;
  input.throwDown = input.throw && !prev.throw;
  input.bombDown = input.bomb && !prev.bomb;
  input.interactDown = input.interact && !prev.interact;

  previousInput.current = input;

  return input;
};
        