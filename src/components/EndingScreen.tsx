/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Award, ArrowRight, Home, Flame, Shield, Heart } from 'lucide-react';
import { DialogueLine } from '../types';

interface EndingScreenProps {
  score: number;
  onReturnToTitle: () => void;
}

export default function EndingScreen({ score, onReturnToTitle }: EndingScreenProps) {
  const [currentLineIndex, setCurrentLineIndex] = useState(0);
  const [typedText, setTypedText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [npcFrame, setNpcFrame] = useState(0);
  const [playerFrame, setPlayerFrame] = useState(0);

  const dialogue: DialogueLine[] = [
    { speaker: 'NPC', text: 'โอ้โห! คุณทำได้จริงๆ! คุณปราบปีศาจยักษ์ใหญ่แห่งอารีน่าได้สำเร็จแล้ว! ช่างเหลือเชื่อจริงๆ!' },
    { speaker: 'Player', text: 'มันไม่ง่ายเลยจริงๆ... แต่ฉันต้องทุ่มสุดตัวเพื่อปกป้องมิติแห่งนี้ให้กลับมาสงบสุขอีกครั้ง!' },
    { speaker: 'NPC', text: 'ความกล้าหาญและความคล่องแคล่วของคุณนั้นหาตัวจับยากมาก! เพลงดาบและทักษะช่างน่าทึ่ง!' },
    { speaker: 'Player', text: 'ต้องขอบคุณน้ำยาฟื้นฟูพลังวิเศษ (Potion) ที่ช่วยประคองชีวิตของฉันไว้ในสนามรบ' },
    { speaker: 'NPC', text: 'ฮ่าฮ่า! ใช่แล้ว ยาศักดิ์สิทธิ์พวกนั้นถูกทิ้งไว้เพื่อผู้กล้าเช่นคุณ และคุณก็ใช้มันได้คุ้มค่าที่สุด!' },
    { speaker: 'Player', text: 'ตอนนี้ ประตูด่านได้พาฉันมาถึงที่นี่ พลังความมืดของบอสได้สลายหายไปจนหมดสิ้นแล้ว' },
    { speaker: 'NPC', text: 'ในฐานะผู้พิทักษ์ดั้งเดิม ขอส่งมอบเหรียญเกียรติยศสูงสุดนี้ให้แก่คุณ... แชมเปี้ยนตัวจริง!' },
    { speaker: 'Player', text: 'ขอบคุณมาก! ฉันจะจดจำการต่อสู้อันมีเกียรติในอารีน่าแห่งนี้ตลอดไป ความสงบสุขได้กลับคืนมาแล้ว!' }
  ];

  // Animated sprites in CSS
  useEffect(() => {
    const interval = setInterval(() => {
      setNpcFrame((f) => (f + 1) % 4);
      setPlayerFrame((f) => (f + 1) % 4);
    }, 180);
    return () => clearInterval(interval);
  }, []);

  // Text typing effect
  useEffect(() => {
    if (currentLineIndex >= dialogue.length) {
      setTypedText('');
      setIsTyping(false);
      return;
    }
    const fullText = dialogue[currentLineIndex].text;
    setTypedText('');
    setIsTyping(true);

    let charIndex = 0;
    const typingInterval = setInterval(() => {
      if (charIndex < fullText.length) {
        setTypedText((prev) => prev + fullText[charIndex]);
        charIndex++;
      } else {
        setIsTyping(false);
        clearInterval(typingInterval);
      }
    }, 30);

    return () => clearInterval(typingInterval);
  }, [currentLineIndex]);

  const handleNextLine = () => {
    if (currentLineIndex >= dialogue.length) return;

    if (isTyping) {
      // Skip typing
      setTypedText(dialogue[currentLineIndex].text);
      setIsTyping(false);
    } else {
      if (currentLineIndex < dialogue.length - 1) {
        setCurrentLineIndex((prev) => prev + 1);
      } else {
        // Dialogue finished
        setCurrentLineIndex(dialogue.length);
      }
    }
  };

  const currentSpeaker = currentLineIndex < dialogue.length ? dialogue[currentLineIndex].speaker : null;

  return (
    <div className="relative w-full h-screen bg-slate-950 flex flex-col items-center justify-center overflow-hidden text-white select-none">
      {/* Background Visual Elements */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(15,23,42,0.6)_0%,rgba(2,6,23,0.95)_100%)]" />
      <div className="absolute top-0 left-0 w-full h-1/2 bg-[linear-gradient(to_bottom,rgba(99,102,241,0.05)_0%,transparent_100%)] pointer-events-none" />
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.01)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.01)_1px,transparent_1px)] bg-[size:24px_24px]" />

      {/* Floating particles in background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/3 w-2 h-2 bg-indigo-500 rounded-full blur-[2px] animate-pulse opacity-40" />
        <div className="absolute top-1/2 left-2/3 w-3 h-3 bg-blue-500 rounded-full blur-[3px] animate-ping opacity-30 duration-1000" />
        <div className="absolute top-2/3 left-1/4 w-1.5 h-1.5 bg-sky-400 rounded-full blur-[1px] animate-pulse opacity-50" />
      </div>

      <div className="relative z-10 w-full max-w-4xl h-full flex flex-col justify-between py-12 px-6">
        
        {/* Stage Area */}
        <div className="flex-1 flex flex-col items-center justify-center relative">
          
          {/* Victory Arch / Portal Effect behind */}
          <div className="absolute w-72 h-72 bg-indigo-600/10 rounded-full blur-3xl -z-10 animate-pulse" />
          
          <div className="flex items-center justify-between w-full max-w-2xl px-12 md:px-20 mt-8 relative">
            
            {/* Player Character Container */}
            <div className="flex flex-col items-center gap-2">
              <motion.div
                animate={
                  currentSpeaker === 'Player'
                    ? { y: [0, -6, 0], scale: 1.05 }
                    : { y: 0, scale: 0.95 }
                }
                transition={currentSpeaker === 'Player' ? { repeat: Infinity, duration: 1 } : {}}
                className={`relative w-36 h-36 flex items-center justify-center rounded-2xl transition-all duration-300 ${
                  currentSpeaker === 'Player' 
                    ? 'ring-4 ring-blue-500/50 bg-blue-950/40 shadow-lg shadow-blue-500/20' 
                    : 'opacity-70 bg-slate-900/40 border border-slate-800'
                }`}
              >
                {/* CSS Animated Player Sprite */}
                <div
                  className="w-32 h-32"
                  style={{
                    backgroundImage: `url('https://raw.githubusercontent.com/banyapon/banyapon.github.io/refs/heads/main/studio/images/player.png')`,
                    backgroundSize: '512px 512px', // 4 cols of 128px, 4 rows of 128px
                    backgroundPositionX: `${-playerFrame * 128}px`,
                    backgroundPositionY: `${-3 * 128}px`, // Row 3 is Dance! Perfect for Victory
                    imageRendering: 'pixelated',
                  }}
                />
                <div className="absolute -bottom-2 bg-blue-600 text-[10px] font-mono px-2.5 py-0.5 rounded-full border border-blue-400 font-bold tracking-wider">
                  HERO
                </div>
              </motion.div>
            </div>

            {/* Middle Award/Banner Indicator */}
            {currentLineIndex < dialogue.length && (
              <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-1 opacity-20 pointer-events-none md:opacity-40">
                <Award className="w-12 h-12 text-yellow-400 animate-spin-slow" />
                <span className="text-[10px] font-mono tracking-widest text-yellow-500">VICTORY</span>
              </div>
            )}

            {/* NPC Character Container */}
            <div className="flex flex-col items-center gap-2">
              <motion.div
                animate={
                  currentSpeaker === 'NPC'
                    ? { y: [0, -6, 0], scale: 1.05 }
                    : { y: 0, scale: 0.95 }
                }
                transition={currentSpeaker === 'NPC' ? { repeat: Infinity, duration: 1 } : {}}
                className={`relative w-36 h-36 flex items-center justify-center rounded-2xl transition-all duration-300 ${
                  currentSpeaker === 'NPC' 
                    ? 'ring-4 ring-indigo-500/50 bg-indigo-950/40 shadow-lg shadow-indigo-500/20' 
                    : 'opacity-70 bg-slate-900/40 border border-slate-800'
                }`}
              >
                {/* CSS Animated NPC Sprite */}
                <div
                  className="w-32 h-32 scale-x-[-1]" // Turn to face the player (NPC faces left)
                  style={{
                    backgroundImage: `url('https://res.cloudinary.com/dsucg33fv/image/upload/v1782439980/npc1_pdraha.png')`,
                    backgroundSize: '512px 512px', // 4 cols, 2 rows? Actually it is 4 frames, 2 rows (512x256px total, or 512x512px)
                    backgroundPositionX: `${-npcFrame * 128}px`,
                    backgroundPositionY: `${-0 * 128}px`, // Row 0 is idle, perfect for talking!
                    imageRendering: 'pixelated',
                  }}
                />
                <div className="absolute -bottom-2 bg-indigo-600 text-[10px] font-mono px-2.5 py-0.5 rounded-full border border-indigo-400 font-bold tracking-wider">
                  ELDER
                </div>
              </motion.div>
            </div>

          </div>

          {/* Decorative Stage Floor shadow */}
          <div className="w-2/3 h-5 bg-black/40 rounded-full blur-[4px] mt-6 -z-10" />

        </div>

        {/* Dialogue Box or Summary Screen */}
        <div className="w-full">
          <AnimatePresence mode="wait">
            {currentLineIndex < dialogue.length ? (
              /* RPG Dialogue Box */
              <motion.div
                key="dialogue"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -30 }}
                onClick={handleNextLine}
                id="dialogue_box"
                className="w-full bg-slate-900/90 border-2 border-indigo-500/40 hover:border-indigo-400/70 p-6 rounded-2xl shadow-xl backdrop-blur-md cursor-pointer relative overflow-hidden transition-all"
              >
                {/* Speaker Tag */}
                <div className="flex items-center gap-2 mb-3">
                  <div className={`w-2.5 h-2.5 rounded-full ${dialogue[currentLineIndex].speaker === 'Player' ? 'bg-blue-500 animate-pulse' : 'bg-indigo-500'}`} />
                  <span className={`font-mono text-sm uppercase tracking-widest font-bold ${dialogue[currentLineIndex].speaker === 'Player' ? 'text-blue-400' : 'text-indigo-400'}`}>
                    {dialogue[currentLineIndex].speaker === 'Player' ? 'HERO' : 'ELDER SHAMAN'}
                  </span>
                </div>

                {/* Main Dialogue Text */}
                <div className="min-h-[60px] text-slate-100 font-sans text-base leading-relaxed md:text-lg">
                  {typedText}
                  <span className="inline-block w-2.5 h-4 ml-1 bg-indigo-400 animate-blink" />
                </div>

                {/* Press key indicator */}
                <div className="absolute right-4 bottom-4 flex items-center gap-1.5 text-[10px] font-mono text-slate-500">
                  <span>คลิกเพื่อถัดไป</span>
                  <ArrowRight className="w-3.5 h-3.5 animate-bounce-horizontal" />
                </div>
              </motion.div>
            ) : (
              /* Final Stats / Victory Screen */
              <motion.div
                key="summary"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="w-full bg-gradient-to-b from-indigo-950/60 to-slate-950/90 border border-indigo-500/30 p-8 rounded-3xl shadow-2xl backdrop-blur-lg flex flex-col items-center text-center gap-6"
              >
                <div>
                  <Award className="w-16 h-16 text-yellow-400 drop-shadow-[0_0_10px_rgba(234,179,8,0.4)] mx-auto mb-2 animate-bounce" />
                  <h2 className="text-2xl md:text-3xl font-sans font-black tracking-tight text-white bg-gradient-to-r from-yellow-200 via-indigo-200 to-yellow-200 bg-clip-text text-transparent">
                    CONGRATULATIONS, CHAMPION!
                  </h2>
                  <p className="text-xs text-indigo-300 font-mono tracking-wider mt-1 uppercase">
                    คุณได้ปราบปีศาจทั้งหมดและกู้ความสงบสุขสำเร็จแล้ว!
                  </p>
                </div>

                {/* Score and stats */}
                <div className="grid grid-cols-3 gap-4 w-full max-w-md bg-black/40 p-4 rounded-xl border border-slate-800/80">
                  <div className="flex flex-col items-center">
                    <Flame className="w-5 h-5 text-red-400 mb-1" />
                    <span className="text-[10px] text-slate-400 font-mono uppercase">Enemies</span>
                    <span className="text-lg font-mono font-bold text-slate-100">{score} Defeated</span>
                  </div>
                  <div className="flex flex-col items-center border-x border-slate-800/80">
                    <Shield className="w-5 h-5 text-indigo-400 mb-1" />
                    <span className="text-[10px] text-slate-400 font-mono uppercase">Bosses</span>
                    <span className="text-lg font-mono font-bold text-slate-100">1 Slain</span>
                  </div>
                  <div className="flex flex-col items-center">
                    <Heart className="w-5 h-5 text-green-400 mb-1" />
                    <span className="text-[10px] text-slate-400 font-mono uppercase">Status</span>
                    <span className="text-lg font-mono font-bold text-green-400">SURVIVED</span>
                  </div>
                </div>

                {/* Actions */}
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={onReturnToTitle}
                  id="ending_return_title_btn"
                  className="py-3 px-8 bg-indigo-600 hover:bg-indigo-500 text-white font-sans font-bold text-sm rounded-xl border border-indigo-400/20 shadow-lg shadow-indigo-900/40 flex items-center gap-2 cursor-pointer transition-colors"
                >
                  <Home className="w-4 h-4" />
                  RETURN TO TITLE SCREEN
                </motion.button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

      </div>
    </div>
  );
}
