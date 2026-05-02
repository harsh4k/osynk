/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useEffect } from 'react';
import { CosmicCanvas } from './components/CosmicCanvas';
import { useGameStore, DifficultyMode } from './store/useGameStore';
import { Play, Trophy, Hash, Settings, LogOut, Pause, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function App() {
  const myColor = useGameStore((state) => state.myColor);
  const updateGame = useGameStore((state) => state.updateGame);
  const score = useGameStore((state) => state.score);
  const combo = useGameStore((state) => state.combo);
  const gameActive = useGameStore((state) => state.gameActive);
  const isPaused = useGameStore((state) => state.isPaused);
  const showFailScreen = useGameStore((state) => state.showFailScreen);
  const difficulty = useGameStore((state) => state.difficulty);
  const startGame = useGameStore((state) => state.startGame);
  const togglePause = useGameStore((state) => state.togglePause);
  const endGame = useGameStore((state) => state.endGame);
  const maxCombo = useGameStore((state) => state.maxCombo);

  const [settingsOpen, setSettingsOpen] = React.useState(false);

  useEffect(() => {
    const interval = setInterval(updateGame, 16); // 60fps update
    return () => clearInterval(interval);
  }, [updateGame]);

  const difficulties: { id: DifficultyMode; label: string; color: string; desc: string }[] = [
    { id: 'EASY', label: 'Easy', color: 'from-green-400 to-emerald-500', desc: 'Slow circles, big windows' },
    { id: 'NORMAL', label: 'Normal', color: 'from-blue-400 to-indigo-500', desc: 'The classic experience' },
    { id: 'INSANE', label: 'Insane', color: 'from-pink-500 to-rose-600', desc: 'Fast reflexes required' },
    { id: 'PRACTICE', label: 'Practice', color: 'from-amber-400 to-orange-500', desc: 'No combo loss on miss' },
  ];

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-zinc-950 text-white font-sans selection:bg-none">
      <CosmicCanvas />
      
      {/* UI Overlay */}
      <div className="absolute top-0 left-0 w-full h-full p-8 pointer-events-none flex flex-col justify-between z-10">
        
        {/* Fail Overlay */}
        <AnimatePresence>
          {showFailScreen && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-red-950/40 backdrop-blur-md flex items-center justify-center pointer-events-auto z-50"
            >
              <motion.div 
                initial={{ scale: 0.8, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                className="bg-zinc-900 p-12 rounded-[3rem] border-2 border-red-500/20 shadow-[0_0_50px_rgba(239,68,68,0.2)] text-center space-y-8"
              >
                <div className="space-y-2">
                  <h2 className="text-7xl font-black italic uppercase text-red-500 tracking-tighter font-display">FAILED</h2>
                  <p className="text-zinc-500 font-mono text-sm tracking-[0.2em]">STAY FOCUSED, TRY AGAIN</p>
                </div>

                <div className="flex flex-col gap-3">
                  <button 
                    onClick={() => startGame(difficulty)}
                    className="flex items-center justify-center gap-3 w-64 h-16 bg-white text-black rounded-2xl font-black text-xl uppercase italic hover:scale-105 active:scale-95 transition-all shadow-[0_0_20px_rgba(255,255,255,0.2)]"
                  >
                    <RefreshCw size={24} />
                    Retry Now
                  </button>
                  <button 
                    onClick={endGame}
                    className="flex items-center justify-center gap-3 w-64 h-14 bg-zinc-800 text-white rounded-2xl font-bold text-sm uppercase tracking-widest hover:bg-zinc-700 transition-all"
                  >
                    Back to Menu
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex justify-between items-start">
          <div className="flex flex-col gap-4">
            <AnimatePresence>
              {!gameActive && (
                <motion.div 
                  initial={{ x: -50, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  exit={{ x: -100, opacity: 0 }}
                  className="space-y-1"
                >
                  <h1 className="text-5xl font-black italic uppercase leading-none font-display">
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 drop-shadow-sm tracking-tight">Osyn</span>
                    <span className="text-white ml-0.5">k</span>
                  </h1>
                  <p className="text-[10px] text-zinc-500 font-mono tracking-[0.4em] uppercase pl-1">
                    Rhythm Engine v3.0
                  </p>
                </motion.div>
              )}
            </AnimatePresence>

            <AnimatePresence>
              {gameActive && (
                <motion.div
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  className="pointer-events-auto flex items-start gap-2"
                >
                  <button
                    onClick={() => setSettingsOpen(!settingsOpen)}
                    className="p-3 bg-white/5 hover:bg-white/10 backdrop-blur-md rounded-2xl border border-white/5 transition-all text-zinc-400 hover:text-white"
                  >
                    <Settings size={20} className={settingsOpen ? 'rotate-90 transition-transform' : 'transition-transform'} />
                  </button>

                  <AnimatePresence>
                    {settingsOpen && (
                      <motion.div
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -10 }}
                        className="flex flex-col gap-2 bg-zinc-900/80 backdrop-blur-xl p-2 rounded-2xl border border-white/5 shadow-2xl"
                      >
                        <button
                          onClick={togglePause}
                          className="flex items-center gap-3 px-4 py-2 hover:bg-white/5 rounded-xl transition-colors text-sm font-medium"
                        >
                          {isPaused ? <Play size={16} fill="currentColor" /> : <Pause size={16} fill="currentColor" />}
                          <span>{isPaused ? 'Resume' : 'Pause'}</span>
                        </button>
                        <hr className="border-white/5 mx-2" />
                        <button
                          onClick={() => {
                            setSettingsOpen(false);
                            endGame();
                          }}
                          className="flex items-center gap-3 px-4 py-2 hover:bg-red-500/10 text-red-400 rounded-xl transition-colors text-sm font-medium"
                        >
                          <LogOut size={16} />
                          <span>Exit Game</span>
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <AnimatePresence>
            {gameActive && (
              <motion.div 
                initial={{ opacity: 0, y: -20, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                className="flex flex-col items-end"
              >
                <div className="text-7xl font-black font-mono tracking-tighter tabular-nums drop-shadow-[0_0_15px_rgba(255,255,255,0.2)] text-white">
                  {score.toLocaleString()}
                </div>
                <div className="flex items-center gap-2 text-zinc-400 font-mono text-xs uppercase tracking-widest mt-1">
                  <Trophy size={12} className="text-yellow-500" />
                  <span>Max Combo: {maxCombo}</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="flex flex-col items-center justify-center flex-1">
          <AnimatePresence>
            {!gameActive && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 1.05, filter: 'blur(10px)' }}
                className="pointer-events-auto bg-zinc-950/60 backdrop-blur-2xl p-8 rounded-[2rem] border border-white/10 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.7)] flex flex-col items-center max-w-md w-full mx-auto"
              >
                <div className="text-center space-y-1 mb-8">
                  <h2 className="text-4xl font-black italic uppercase tracking-tighter bg-clip-text text-transparent bg-gradient-to-b from-white to-zinc-500 font-display">
                    Choose Your Fate
                  </h2>
                  <p className="text-zinc-500 text-[10px] font-mono tracking-[0.2em] uppercase">Rhythm Selection Protocol</p>
                </div>

                <div className="flex flex-col gap-3 w-full">
                  {difficulties.map((diff) => (
                    <motion.button
                      key={diff.id}
                      whileHover={{ x: 8, backgroundColor: 'rgba(255,255,255,0.08)' }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => startGame(diff.id)}
                      className="group relative flex items-center p-4 bg-white/5 rounded-2xl border border-white/5 transition-all text-left"
                    >
                      <div className={`w-1 h-8 rounded-full bg-gradient-to-b ${diff.color} mr-4 shrink-0 shadow-[0_0_15px_rgba(255,255,255,0.1)]`} />
                      <div className="flex-1">
                        <div className="flex justify-between items-baseline">
                          <span className="text-lg font-black uppercase italic tracking-tighter leading-none font-display">{diff.label}</span>
                          <span className="text-[9px] font-mono text-zinc-600 uppercase tracking-widest font-bold">{diff.id}</span>
                        </div>
                        <p className="text-zinc-500 text-[10px] mt-1 line-clamp-1">{diff.desc}</p>
                      </div>
                    </motion.button>
                  ))}
                </div>

                <div className="mt-8 flex items-center gap-6 text-zinc-700 text-[9px] uppercase tracking-[0.2em] font-bold">
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1">
                      <span className="bg-zinc-800 px-1.5 py-0.5 rounded text-zinc-400">Z</span>
                      <span className="bg-zinc-800 px-1.5 py-0.5 rounded text-zinc-400">X</span>
                    </div>
                    <span>Tap</span>
                  </div>
                  <div className="w-1 h-1 rounded-full bg-zinc-800" />
                  <div className="flex items-center gap-2">
                    <span className="bg-zinc-800 px-1.5 py-0.5 rounded text-zinc-400 italic">Click</span>
                    <span>Hit</span>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="flex justify-between items-end min-h-[160px]">
          <div className="flex items-center gap-6">
            {myColor && (
              <div className="flex items-center gap-3 bg-zinc-900/50 backdrop-blur-md px-4 py-2 rounded-full border border-white/5">
                <div className="w-3 h-3 rounded-full shadow-lg" style={{ backgroundColor: myColor, boxShadow: `0 0 15px ${myColor}` }} />
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400">Rhythm Core Synced</span>
              </div>
            )}
          </div>

          <AnimatePresence mode="popLayout">
            {gameActive && combo > 0 && (
              <motion.div
                key={combo}
                initial={{ opacity: 0, scale: 1.5, x: 50 }}
                animate={{ opacity: 1, scale: 1, x: 0 }}
                exit={{ opacity: 0, scale: 0.8, x: 20 }}
                transition={{ type: 'spring', damping: 20, stiffness: 300 }}
                className="pointer-events-none select-none text-[8rem] font-black italic text-white/90 drop-shadow-[0_0_30px_rgba(255,255,255,0.3)] leading-none font-display"
              >
                {combo}<span className="text-4xl ml-2 opacity-30 not-italic uppercase tracking-tighter">x</span>
              </motion.div>
            )}
          </AnimatePresence>
          
          {!gameActive && (
            <div className="flex flex-col items-end gap-1 opacity-40 hover:opacity-100 transition-opacity">
              <div className="text-right text-[10px] font-mono text-zinc-500 uppercase tracking-[0.3em]">
                Powered by AI Studio
              </div>
              <div className="h-0.5 w-12 bg-gradient-to-r from-transparent to-zinc-800" />
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
