/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Skull, RotateCcw, Home, Swords, Heart, Shield } from 'lucide-react';
import { GameState, GameOptions } from './types';
import TitleScreen from './components/TitleScreen';
import GameCanvas from './components/GameCanvas';
import EndingScreen from './components/EndingScreen';

export default function App() {
  const [gameState, setGameState] = useState<GameState>('TITLE');
  const [score, setScore] = useState<number>(0);

  // User configured Options & Keybindings
  const [options, setOptions] = useState<GameOptions>({
    soundEnabled: true,
    difficulty: 'normal',
    keyBindings: {
      up: 'KeyW',
      down: 'KeyS',
      left: 'KeyA',
      right: 'KeyD',
      attack: 'KeyP',
      skill: 'KeyO',
    },
  });

  const handleStartGame = () => {
    setScore(0);
    setGameState('PLAYING');
  };

  const handleGameOver = (finalScore: number) => {
    setScore(finalScore);
    setGameState('GAMEOVER');
  };

  const handleWinGame = (finalScore: number) => {
    setScore(finalScore);
    setGameState('ENDING');
  };

  const handleReturnToTitle = () => {
    setGameState('TITLE');
  };

  return (
    <div className="w-full h-screen bg-slate-950 font-sans text-slate-100 selection:bg-indigo-500/30 selection:text-white">
      <AnimatePresence mode="wait">
        {gameState === 'TITLE' && (
          <motion.div
            key="title"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="w-full h-full"
          >
            <TitleScreen
              options={options}
              setOptions={setOptions}
              onStartGame={handleStartGame}
            />
          </motion.div>
        )}

        {gameState === 'PLAYING' && (
          <motion.div
            key="playing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="w-full h-full"
          >
            <GameCanvas
              options={options}
              onGameOver={handleGameOver}
              onWinGame={handleWinGame}
            />
          </motion.div>
        )}

        {gameState === 'GAMEOVER' && (
          <motion.div
            key="gameover"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="w-full h-full relative flex items-center justify-center bg-slate-950 overflow-hidden"
          >
            {/* Dark Red Vignette background */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(127,29,29,0.25)_0%,rgba(2,6,23,0.95)_100%)] pointer-events-none" />
            <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.01)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.01)_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none" />

            <div className="relative z-10 max-w-md w-full mx-4 bg-slate-900/90 border border-red-500/20 p-8 rounded-3xl shadow-2xl flex flex-col items-center text-center gap-6 backdrop-blur-md">
              <div className="flex flex-col items-center gap-1.5">
                <div className="w-16 h-16 bg-red-600/10 rounded-full border border-red-500/30 flex items-center justify-center text-red-500 mb-2 animate-pulse">
                  <Skull className="w-8 h-8" />
                </div>
                <h1 className="text-3xl font-black tracking-tight text-white uppercase bg-gradient-to-r from-red-400 to-orange-400 bg-clip-text text-transparent">
                  ARENA DEFEAT
                </h1>
                <p className="text-xs text-red-400 font-mono tracking-widest uppercase">
                  พ่ายแพ้ในการประลอง! พลังหมดสิ้นแล้ว
                </p>
              </div>

              {/* Stats Card */}
              <div className="w-full bg-black/40 border border-slate-800/80 p-4 rounded-xl flex items-center justify-between font-mono text-sm">
                <span className="text-slate-400">Enemies Defeated:</span>
                <span className="text-red-400 font-bold text-base">{score} Kills</span>
              </div>

              {/* Actions */}
              <div className="flex flex-col gap-3 w-full">
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={handleStartGame}
                  id="try_again_btn"
                  className="w-full py-3.5 bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 text-white font-sans font-bold rounded-xl shadow-lg shadow-red-950/40 flex items-center justify-center gap-2 cursor-pointer transition-colors"
                >
                  <RotateCcw className="w-4 h-4" />
                  TRY AGAIN (ลองใหม่)
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={handleReturnToTitle}
                  id="gameover_return_title_btn"
                  className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-sans font-medium rounded-xl border border-slate-700/40 flex items-center justify-center gap-2 cursor-pointer transition-colors"
                >
                  <Home className="w-4 h-4" />
                  TITLE SCREEN
                </motion.button>
              </div>
            </div>
          </motion.div>
        )}

        {gameState === 'ENDING' && (
          <motion.div
            key="ending"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="w-full h-full"
          >
            <EndingScreen
              score={score}
              onReturnToTitle={handleReturnToTitle}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
