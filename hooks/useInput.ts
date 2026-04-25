import React, { useEffect, useRef, useState } from 'react';
import type { InputState, Vec2 } from '../types';
import { GAME_TOUCH_CONFIG, type GameTouchControlId } from '../constants/touchConfig';

// Standard Xbox / XInput-style mapping.
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

const DEADZONE = 0.22;

const EMPTY_INPUT: InputState = {
  left: false,
  right: false,
  up: false,
  down: false,
  jump: false,
  roll: false,
  dash: false,
  shoot: false,
  throw: false,
  bomb: false,
  interact: false,
  leftStick: { x: 0, y: 0 },
  rightStick: { x: 0, y: 0 },
  jumpDown: false,
  rollDown: false,
  downDown: false,
  dashDown: false,
  shootDown: false,
  throwDown: false,
  bombDown: false,
  interactDown: false,
};

const interactiveSelector = [
  'button',
  'a',
  'input',
  'select',
  'textarea',
  '[role="button"]',
  '[data-ui="true"]',
  '[data-touch-ui="true"]',
].join(',');

function cloneInput(input: InputState): InputState {
  return {
    ...input,
    leftStick: { ...input.leftStick },
    rightStick: { ...input.rightStick },
  };
}

function applyDeadzone(value: number): number {
  if (Math.abs(value) <= DEADZONE) return 0;
  return (value - Math.sign(value) * DEADZONE) / (1 - DEADZONE);
}

function clampStick(x: number, y: number): Vec2 {
  const mag = Math.hypot(x, y);
  if (mag <= 1) return { x, y };
  return { x: x / mag, y: y / mag };
}

function safeGetGamepads(): Gamepad[] {
  try {
    return Array.from(navigator.getGamepads?.() ?? []).filter(Boolean) as Gamepad[];
  } catch {
    return [];
  }
}

function isUiTouchTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false;
  return Boolean(target.closest(interactiveSelector));
}

interface TouchRuntime {
  leftStickId: number | null;
  rightStickId: number | null;
  buttonTouches: Map<number, GameTouchControlId>;
  leftStick: Vec2;
  rightStick: Vec2;
  buttons: Partial<Record<GameTouchControlId, boolean>>;
}

function createTouchRuntime(): TouchRuntime {
  return {
    leftStickId: null,
    rightStickId: null,
    buttonTouches: new Map(),
    leftStick: { x: 0, y: 0 },
    rightStick: { x: 0, y: 0 },
    buttons: {},
  };
}

function getNormalizedTouch(touch: Touch, rect: DOMRect) {
  return {
    x: (touch.clientX - rect.left) / rect.width,
    y: (touch.clientY - rect.top) / rect.height,
  };
}

function distanceToControl(x: number, y: number, id: GameTouchControlId): number {
  const cfg = GAME_TOUCH_CONFIG[id];
  return Math.hypot(x - cfg.cx, y - cfg.cy);
}

function classifyTouch(x: number, y: number): GameTouchControlId | null {
  const candidates: GameTouchControlId[] = ['leftStick', 'rightStick', 'dpad', 'a', 'b', 'x', 'y', 'lb', 'rb', 'lt', 'rt'];
  let best: GameTouchControlId | null = null;
  let bestDistance = Number.POSITIVE_INFINITY;

  for (const id of candidates) {
    const cfg = GAME_TOUCH_CONFIG[id];
    const dist = distanceToControl(x, y, id);
    if (dist <= cfg.radius && dist < bestDistance) {
      best = id;
      bestDistance = dist;
    }
  }

  return best;
}

function updateStickFromTouch(runtime: TouchRuntime, touch: Touch, rect: DOMRect, id: 'leftStick' | 'rightStick') {
  const cfg = GAME_TOUCH_CONFIG[id];
  const pos = getNormalizedTouch(touch, rect);
  const gate = cfg.gateRadius ?? cfg.radius;
  const aspect = rect.width / rect.height;
  const dx = (pos.x - cfg.cx) / gate;
  const dy = ((pos.y - cfg.cy) * aspect) / gate;
  const stick = clampStick(dx, dy);
  runtime[id] = stick;
}

function computeInput(keys: Record<string, boolean>, touch: TouchRuntime, gamepad: Gamepad | null, previous: InputState): InputState {
  const gpBtn = (index: number) => {
    const button = gamepad?.buttons[index];
    if (!button) return false;
    return button.pressed || button.value > 0.25;
  };

  let lx = gamepad ? applyDeadzone(gamepad.axes[0] ?? 0) : 0;
  let ly = gamepad ? applyDeadzone(gamepad.axes[1] ?? 0) : 0;
  let rx = gamepad ? applyDeadzone(gamepad.axes[2] ?? 0) : 0;
  let ry = gamepad ? applyDeadzone(gamepad.axes[3] ?? 0) : 0;

  if (Math.hypot(touch.leftStick.x, touch.leftStick.y) > 0.05) {
    lx = touch.leftStick.x;
    ly = touch.leftStick.y;
  }

  if (Math.hypot(touch.rightStick.x, touch.rightStick.y) > 0.05) {
    rx = touch.rightStick.x;
    ry = touch.rightStick.y;
  }

  if (keys.KeyA || keys.ArrowLeft || touch.buttons.dpad && touch.leftStick.x < -0.2) lx = -1;
  if (keys.KeyD || keys.ArrowRight || touch.buttons.dpad && touch.leftStick.x > 0.2) lx = 1;
  if (keys.KeyW || keys.ArrowUp || touch.buttons.dpad && touch.leftStick.y < -0.2) ly = -1;
  if (keys.KeyS || keys.ArrowDown || touch.buttons.dpad && touch.leftStick.y > 0.2) ly = 1;

  const input: InputState = {
    leftStick: { x: lx, y: ly },
    rightStick: { x: rx, y: ry },

    left: lx < -0.45 || gpBtn(GP.Left),
    right: lx > 0.45 || gpBtn(GP.Right),
    up: ly < -0.45 || gpBtn(GP.Up),
    down: ly > 0.45 || gpBtn(GP.Down),

    jump: Boolean(keys.Space || keys.KeyK || gpBtn(GP.A) || touch.buttons.a),
    roll: Boolean(keys.ShiftLeft || keys.ShiftRight || gpBtn(GP.B) || touch.buttons.b),
    dash: Boolean(keys.KeyX || keys.KeyJ || gpBtn(GP.X) || touch.buttons.x),
    shoot: Boolean(keys.KeyC || gpBtn(GP.Y) || gpBtn(GP.RT) || touch.buttons.y || touch.buttons.rt),
    throw: Boolean(keys.KeyV || gpBtn(GP.RB) || touch.buttons.rb),
    bomb: Boolean(keys.KeyZ || gpBtn(GP.LB) || touch.buttons.lb),
    interact: Boolean(keys.KeyE || gpBtn(GP.LT) || touch.buttons.lt),

    jumpDown: false,
    rollDown: false,
    downDown: false,
    dashDown: false,
    shootDown: false,
    throwDown: false,
    bombDown: false,
    interactDown: false,
  };

  input.jumpDown = input.jump && !previous.jump;
  input.rollDown = input.roll && !previous.roll;
  input.downDown = input.down && !previous.down;
  input.dashDown = input.dash && !previous.dash;
  input.shootDown = input.shoot && !previous.shoot;
  input.throwDown = input.throw && !previous.throw;
  input.bombDown = input.bomb && !previous.bomb;
  input.interactDown = input.interact && !previous.interact;

  return input;
}

export function consumeInputEdges(inputRef: React.MutableRefObject<InputState>) {
  inputRef.current.jumpDown = false;
  inputRef.current.rollDown = false;
  inputRef.current.downDown = false;
  inputRef.current.dashDown = false;
  inputRef.current.shootDown = false;
  inputRef.current.throwDown = false;
  inputRef.current.bombDown = false;
  inputRef.current.interactDown = false;
}

export const useInput = (containerRef: React.RefObject<HTMLElement>) => {
  const keysRef = useRef<Record<string, boolean>>({});
  const touchRef = useRef<TouchRuntime>(createTouchRuntime());
  const previousRef = useRef<InputState>(cloneInput(EMPTY_INPUT));
  const inputRef = useRef<InputState>(cloneInput(EMPTY_INPUT));
  const gamepadRef = useRef<Gamepad | null>(null);
  const [input, setInput] = useState<InputState>(() => cloneInput(EMPTY_INPUT));
  const [gamepadName, setGamepadName] = useState<string>('');

  const recompute = () => {
    const next = computeInput(keysRef.current, touchRef.current, gamepadRef.current, previousRef.current);
    inputRef.current = next;
    previousRef.current = cloneInput(next);
    setInput(cloneInput(next));
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      keysRef.current[e.code] = true;
      recompute();
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      keysRef.current[e.code] = false;
      recompute();
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  useEffect(() => {
    let frameId = 0;
    let lastName = '';

    const poll = () => {
      const pad = safeGetGamepads()[0] ?? null;
      gamepadRef.current = pad;
      const nextName = pad?.id ?? '';
      if (nextName !== lastName) {
        lastName = nextName;
        setGamepadName(nextName);
      }
      recompute();
      frameId = requestAnimationFrame(poll);
    };

    frameId = requestAnimationFrame(poll);
    return () => cancelAnimationFrame(frameId);
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || !('ontouchstart' in window)) return;

    const runtime = touchRef.current;

    const handleTouchStart = (e: TouchEvent) => {
      if (isUiTouchTarget(e.target)) return;
      const rect = el.getBoundingClientRect();
      let claimed = false;

      for (const t of Array.from(e.changedTouches)) {
        const pos = getNormalizedTouch(t, rect);
        const id = classifyTouch(pos.x, pos.y);
        if (!id) continue;
        claimed = true;

        if (id === 'leftStick' && runtime.leftStickId === null) {
          runtime.leftStickId = t.identifier;
          updateStickFromTouch(runtime, t, rect, 'leftStick');
        } else if (id === 'rightStick' && runtime.rightStickId === null) {
          runtime.rightStickId = t.identifier;
          updateStickFromTouch(runtime, t, rect, 'rightStick');
        } else if (id === 'dpad') {
          runtime.buttonTouches.set(t.identifier, 'dpad');
          const cfg = GAME_TOUCH_CONFIG.dpad;
          const aspect = rect.width / rect.height;
          runtime.leftStick = clampStick((pos.x - cfg.cx) / cfg.radius, ((pos.y - cfg.cy) * aspect) / cfg.radius);
          runtime.buttons.dpad = true;
        } else {
          runtime.buttonTouches.set(t.identifier, id);
          runtime.buttons[id] = true;
        }
      }

      if (claimed) {
        e.preventDefault();
        recompute();
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      const rect = el.getBoundingClientRect();
      let claimed = false;

      for (const t of Array.from(e.changedTouches)) {
        if (runtime.leftStickId === t.identifier) {
          claimed = true;
          updateStickFromTouch(runtime, t, rect, 'leftStick');
        }
        if (runtime.rightStickId === t.identifier) {
          claimed = true;
          updateStickFromTouch(runtime, t, rect, 'rightStick');
        }
        if (runtime.buttonTouches.get(t.identifier) === 'dpad') {
          claimed = true;
          const pos = getNormalizedTouch(t, rect);
          const cfg = GAME_TOUCH_CONFIG.dpad;
          const aspect = rect.width / rect.height;
          runtime.leftStick = clampStick((pos.x - cfg.cx) / cfg.radius, ((pos.y - cfg.cy) * aspect) / cfg.radius);
        }
      }

      if (claimed) {
        e.preventDefault();
        recompute();
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      let claimed = false;

      for (const t of Array.from(e.changedTouches)) {
        if (runtime.leftStickId === t.identifier) {
          runtime.leftStickId = null;
          runtime.leftStick = { x: 0, y: 0 };
          claimed = true;
        }
        if (runtime.rightStickId === t.identifier) {
          runtime.rightStickId = null;
          runtime.rightStick = { x: 0, y: 0 };
          claimed = true;
        }

        const btn = runtime.buttonTouches.get(t.identifier);
        if (btn) {
          runtime.buttonTouches.delete(t.identifier);
          runtime.buttons[btn] = false;
          if (btn === 'dpad') runtime.leftStick = { x: 0, y: 0 };
          claimed = true;
        }
      }

      if (claimed) {
        e.preventDefault();
        recompute();
      }
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

  return {
    input,
    inputRef,
    gamepadConnected: Boolean(gamepadName),
    gamepadName,
    consumeEdges: () => consumeInputEdges(inputRef),
  };
};
