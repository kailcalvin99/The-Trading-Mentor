import { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Scene1 } from './scenes/Scene1';
import { Scene2 } from './scenes/Scene2';
import { Scene3 } from './scenes/Scene3';
import { Scene4 } from './scenes/Scene4';
import { Scene5 } from './scenes/Scene5';
import { Scene6 } from './scenes/Scene6';
import { Scene7 } from './scenes/Scene7';

const SCENE_DURATIONS = [
  3000,
  4000,
  4000,
  4000,
  5000,
  4000,
  3000,
];

export default function App() {
  const [currentScene, setCurrentScene] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => {
      setCurrentScene((prev) => (prev + 1) % SCENE_DURATIONS.length);
    }, SCENE_DURATIONS[currentScene]);
    return () => clearTimeout(timer);
  }, [currentScene]);

  return (
    <div className="w-full h-screen bg-[#0A0F0A] overflow-hidden flex items-center justify-center">
      <div className="w-full h-full relative overflow-hidden bg-[#0A0F0A]">
        <motion.div 
          className="absolute inset-0 opacity-30"
          animate={{
            background: currentScene % 2 === 0 
              ? 'radial-gradient(circle at 20% 50%, rgba(0, 200, 150, 0.15) 0%, transparent 60%)'
              : 'radial-gradient(circle at 80% 50%, rgba(0, 200, 150, 0.15) 0%, transparent 60%)'
          }}
          transition={{ duration: 2, ease: 'easeInOut' }}
        />
        
        <div className="absolute inset-0 opacity-20" style={{
          backgroundImage: 'linear-gradient(rgba(0,200,150,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(0,200,150,0.03) 1px, transparent 1px)',
          backgroundSize: '40px 40px'
        }} />

        <motion.div
          className="absolute w-[30vw] h-[30vw] rounded-full bg-[#00C896] blur-[150px] opacity-5"
          animate={{
            x: currentScene < 3 ? '-20vw' : '60vw',
            y: currentScene % 2 === 0 ? '-10vh' : '20vh',
          }}
          transition={{ duration: 3, ease: 'easeInOut' }}
        />

        <AnimatePresence mode="wait">
          {currentScene === 0 && <Scene1 key="s1" />}
          {currentScene === 1 && <Scene2 key="s2" />}
          {currentScene === 2 && <Scene3 key="s3" />}
          {currentScene === 3 && <Scene4 key="s4" />}
          {currentScene === 4 && <Scene5 key="s5" />}
          {currentScene === 5 && <Scene6 key="s6" />}
          {currentScene === 6 && <Scene7 key="s7" />}
        </AnimatePresence>
      </div>
    </div>
  );
}
