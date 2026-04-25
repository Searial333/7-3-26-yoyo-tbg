export type GameTouchControlId =
  | 'leftStick'
  | 'rightStick'
  | 'dpad'
  | 'a'
  | 'b'
  | 'x'
  | 'y'
  | 'lb'
  | 'rb'
  | 'lt'
  | 'rt';

export type GameTouchControlKind = 'stick' | 'dpad' | 'button' | 'shoulder' | 'trigger';

export interface GameTouchControlConfig {
  id: GameTouchControlId;
  label: string;
  kind: GameTouchControlKind;
  cx: number;
  cy: number;
  radius: number;
  gateRadius?: number;
}

export const GAME_TOUCH_CONFIG: Record<GameTouchControlId, GameTouchControlConfig> = {
  leftStick: { id: 'leftStick', label: 'L', kind: 'stick', cx: 0.18, cy: 0.74, radius: 0.145, gateRadius: 0.095 },
  rightStick: { id: 'rightStick', label: 'R', kind: 'stick', cx: 0.82, cy: 0.74, radius: 0.125, gateRadius: 0.085 },
  dpad: { id: 'dpad', label: 'D', kind: 'dpad', cx: 0.18, cy: 0.50, radius: 0.105 },

  lt: { id: 'lt', label: 'LT', kind: 'trigger', cx: 0.17, cy: 0.13, radius: 0.065 },
  lb: { id: 'lb', label: 'LB', kind: 'shoulder', cx: 0.29, cy: 0.16, radius: 0.06 },
  rb: { id: 'rb', label: 'RB', kind: 'shoulder', cx: 0.71, cy: 0.16, radius: 0.06 },
  rt: { id: 'rt', label: 'RT', kind: 'trigger', cx: 0.83, cy: 0.13, radius: 0.065 },

  y: { id: 'y', label: 'Y', kind: 'button', cx: 0.86, cy: 0.43, radius: 0.055 },
  x: { id: 'x', label: 'X', kind: 'button', cx: 0.80, cy: 0.52, radius: 0.055 },
  b: { id: 'b', label: 'B', kind: 'button', cx: 0.92, cy: 0.52, radius: 0.055 },
  a: { id: 'a', label: 'A', kind: 'button', cx: 0.86, cy: 0.61, radius: 0.06 },
};

export const GAME_TOUCH_CONTROLS = Object.values(GAME_TOUCH_CONFIG);
