export type TeddySoulTitle =
  | 'Patchwork Teddy'
  | 'String-Slinger Teddy'
  | 'Milk Marshal Teddy'
  | 'Diaper Doom Teddy'
  | 'Hug-Hero Teddy'
  | 'Treasure Teddy'
  | 'Blur-Bear Teddy'
  | 'Gentle Guardian Teddy'
  | 'Tantrum Titan Teddy';

export interface SoulActionCounters {
  yoyoUses: number;
  bottleShots: number;
  diaperBombs: number;
  rolls: number;
  dashes: number;
  rescues: number;
  secretsFound: number;
  enemiesDefeated: number;
  damageTaken: number;
  deaths: number;
}

export interface SoulProfile {
  title: TeddySoulTitle;
  counters: SoulActionCounters;
  unlockedPatchIds: string[];
  memoryTone: 'bright' | 'balanced' | 'gloomed' | 'glitched';
}

export const createDefaultSoulProfile = (): SoulProfile => ({
  title: 'Patchwork Teddy',
  counters: {
    yoyoUses: 0,
    bottleShots: 0,
    diaperBombs: 0,
    rolls: 0,
    dashes: 0,
    rescues: 0,
    secretsFound: 0,
    enemiesDefeated: 0,
    damageTaken: 0,
    deaths: 0,
  },
  unlockedPatchIds: [],
  memoryTone: 'balanced',
});

export function deriveSoulTitle(counters: SoulActionCounters): TeddySoulTitle {
  const scores: Array<[TeddySoulTitle, number]> = [
    ['String-Slinger Teddy', counters.yoyoUses * 3],
    ['Milk Marshal Teddy', counters.bottleShots * 3],
    ['Diaper Doom Teddy', counters.diaperBombs * 4],
    ['Blur-Bear Teddy', counters.dashes * 2 + counters.rolls],
    ['Hug-Hero Teddy', counters.rescues * 6],
    ['Treasure Teddy', counters.secretsFound * 8],
    ['Gentle Guardian Teddy', counters.rescues * 4 - counters.enemiesDefeated],
    ['Tantrum Titan Teddy', counters.damageTaken * 2 + counters.enemiesDefeated],
  ];

  scores.sort((a, b) => b[1] - a[1]);
  return scores[0]?.[1] > 0 ? scores[0][0] : 'Patchwork Teddy';
}

export function deriveMemoryTone(counters: SoulActionCounters): SoulProfile['memoryTone'] {
  if (counters.deaths >= 9 || counters.damageTaken >= 24) return 'glitched';
  if (counters.enemiesDefeated > counters.rescues * 3 + 10) return 'gloomed';
  if (counters.rescues + counters.secretsFound >= 6) return 'bright';
  return 'balanced';
}
