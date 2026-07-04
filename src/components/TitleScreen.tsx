/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Volume2, VolumeX, Keyboard, Play, Settings, X, RotateCcw } from 'lucide-react';
import { KeyBindings, GameOptions } from '../types';

interface TitleScreenProps {
  options: GameOptions;
  setOptions: React.Dispatch<React.SetStateAction<GameOptions>>;
  onStartGame: () => void;
}

export default function TitleScreen({ options, setOptions, onStartGame }: TitleScreenProps) {
  const [showOptions, setShowOptions] = useState(false);
  const [listeningKey, setListeningKey] = useState<keyof KeyBindings | null>(null);

  // Default bindings to reset to
  const defaultBindings: KeyBindings = {
    up: 'KeyW',
    down: 'KeyS',
    left: 'KeyA',
    right: 'KeyD',
    attack: 'KeyP',
    skill: 'KeyO',
  };

  const friendlyKeyName = (code: string) => {
    if (code.startsWith('Key')) return code.slice(3);
    if (code.startsWith('Arrow')) return code.replace('Arrow', 'Arrow ');
    if (code === 'Space') return 'Spacebar';
    return code;
  };

  // Listen for key presses when changing keybindings
  useEffect(() => {
    if (!listeningKey) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      e.preventDefault();
      setOptions((prev) => ({
        ...prev,
        keyBindings: {
          ...prev.keyBindings,
          [listeningKey]: e.code,
        },
      }));
      setListeningKey(null);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [listeningKey, setOptions]);

  return (
    <div className="relative w-full h-screen bg-slate-950 flex flex-col items-center justify-center overflow-hidden text-white select-none">
      {/* Dynamic Background Effects */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(30,41,59,0.5)_0%,rgba(2,6,23,0.8)_100%)]" />
      
      {/* Decorative Grid Lines */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:32px_32px]" />

      {/* Title Content */}
      <div className="relative z-10 flex flex-col items-center justify-between h-full py-16 px-4 max-w-lg w-full">
        
        {/* Game Logo */}
        <motion.div
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className="flex flex-col items-center mt-4"
        >
          <img
            src="https://res.cloudinary.com/dsucg33fv/image/upload/v1782709347/logo_i8827v.png"
            alt="Game Logo"
            className="w-80 md:w-96 drop-shadow-[0_10px_15px_rgba(59,130,246,0.3)] pointer-events-none"
            id="title_logo_img"
          />
          <p className="text-blue-400 font-mono text-xs tracking-[0.3em] mt-3 uppercase">
            Retro 2.5D Battle Arena
          </p>
        </motion.div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-4 w-full px-8 mb-4">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onStartGame}
            id="start_game_btn"
            className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-sans font-bold text-lg rounded-xl shadow-lg shadow-indigo-900/40 border border-blue-400/20 flex items-center justify-center gap-2 cursor-pointer transition-colors"
          >
            <Play className="w-5 h-5 fill-current" />
            START ARENA
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowOptions(true)}
            id="open_options_btn"
            className="w-full py-3.5 bg-slate-900 hover:bg-slate-800 text-slate-200 font-sans font-medium rounded-xl border border-slate-700/50 flex items-center justify-center gap-2 cursor-pointer transition-colors"
          >
            <Settings className="w-5 h-5" />
            CONTROLS & OPTIONS
          </motion.button>
        </div>

        {/* Footer/How to Play info */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.8 }}
          className="flex flex-col items-center text-center gap-2 font-mono text-xs text-slate-400 mt-2"
        >
          <div className="flex items-center gap-4 bg-slate-900/80 px-4 py-2.5 rounded-lg border border-slate-800/80">
            <span>Move: <strong className="text-white">WASD / Arrows</strong></span>
            <span className="text-slate-600">|</span>
            <span>Attack: <strong className="text-white">P</strong></span>
            <span className="text-slate-600">|</span>
            <span>Skill: <strong className="text-white">O</strong></span>
          </div>
          <p className="mt-2 text-[10px] text-slate-500">
            Defeat 10 Enemies to summon the Boss. Enter Warp to Finish!
          </p>
        </motion.div>
      </div>

      {/* Options Modal Dialog */}
      <AnimatePresence>
        {showOptions && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl flex flex-col gap-5"
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2 text-indigo-400 font-bold">
                  <Keyboard className="w-5 h-5" />
                  <span>CUSTOM CONTROLS</span>
                </div>
                <button
                  onClick={() => {
                    setShowOptions(false);
                    setListeningKey(null);
                  }}
                  id="close_options_btn"
                  className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Instructions */}
              <p className="text-xs text-slate-400 leading-relaxed font-sans">
                Click on any binding slot below and then press any key on your keyboard to customize your gameplay controls.
              </p>

              {/* Bindings Settings Form */}
              <div className="flex flex-col gap-2.5 max-h-[280px] overflow-y-auto pr-1">
                {(Object.keys(options.keyBindings) as Array<keyof KeyBindings>).map((key) => (
                  <div key={key} className="flex items-center justify-between bg-slate-950/60 hover:bg-slate-950/90 border border-slate-800/40 p-2.5 rounded-xl transition-all">
                    <span className="text-xs text-slate-300 font-mono capitalize">
                      {key === 'up' && 'Walk Up (เดินขึ้น)'}
                      {key === 'down' && 'Walk Down (เดินลง)'}
                      {key === 'left' && 'Walk Left (เดินซ้าย)'}
                      {key === 'right' && 'Walk Right (เดินขวา)'}
                      {key === 'attack' && 'Punch / Hit (ต่อย)'}
                      {key === 'skill' && 'Special Skill (สกิลระเบิดพลัง)'}
                    </span>
                    
                    <button
                      onClick={() => setListeningKey(listeningKey === key ? null : key)}
                      id={`bind_btn_${key}`}
                      className={`min-w-[100px] text-xs font-mono py-1.5 px-3 rounded-lg border text-center transition-all cursor-pointer ${
                        listeningKey === key
                          ? 'bg-blue-600/30 border-blue-500 text-blue-300 animate-pulse'
                          : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-100'
                      }`}
                    >
                      {listeningKey === key ? 'Press key...' : friendlyKeyName(options.keyBindings[key])}
                    </button>
                  </div>
                ))}
              </div>

              {/* Option Presets & Reset */}
              <div className="flex items-center justify-between border-t border-slate-800 pt-4 mt-1">
                <button
                  onClick={() => {
                    setOptions((prev) => ({ ...prev, keyBindings: { ...defaultBindings } }));
                    setListeningKey(null);
                  }}
                  id="reset_controls_btn"
                  className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-100 cursor-pointer transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Reset to Defaults
                </button>

                <button
                  onClick={() => {
                    setShowOptions(false);
                    setListeningKey(null);
                  }}
                  id="save_options_btn"
                  className="bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs py-2 px-5 rounded-lg shadow-md transition-colors cursor-pointer"
                >
                  Save & Apply
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
