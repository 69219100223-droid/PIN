/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type GameState = 'TITLE' | 'PLAYING' | 'GAMEOVER' | 'ENDING';

export interface KeyBindings {
  up: string;
  down: string;
  left: string;
  right: string;
  attack: string;
  skill: string;
}

export interface DialogueLine {
  speaker: 'Player' | 'NPC';
  text: string;
}

export interface GameOptions {
  soundEnabled: boolean;
  difficulty: 'easy' | 'normal' | 'hard';
  keyBindings: KeyBindings;
}
