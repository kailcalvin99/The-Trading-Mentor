import { motion } from 'framer-motion';

export function Scene1() {
  return (
    <motion.div 
      className="absolute inset-0 flex flex-col items-center justify-center z-10"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 1.1, filter: 'blur(10px)' }}
      transition={{ duration: 0.8 }}
    >
      <motion.div
        initial={{ scale: 0.5, y: 50, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 100, damping: 20, delay: 0.2 }}
        className="relative"
      >
        <motion.div 
          className="absolute inset-0 bg-[#00C896] blur-[100px] rounded-full opacity-30"
          animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        />
        <img 
          src={`${import.meta.env.BASE_URL}logo.png`}
          alt="ICT Trading Mentor Logo" 
          className="w-[15vw] h-[15vw] object-contain relative z-10"
        />
      </motion.div>

      <motion.h1 
        className="text-[4vw] font-display font-bold text-white mt-[2vh] tracking-tight"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1, duration: 0.8, ease: 'easeOut' }}
      >
        ICT TRADING MENTOR
      </motion.h1>

      <motion.div
        className="h-[2px] bg-[#00C896] mt-[1vh]"
        initial={{ width: 0, opacity: 0 }}
        animate={{ width: '20vw', opacity: 1 }}
        transition={{ delay: 1.5, duration: 0.8, ease: 'circOut' }}
      />
    </motion.div>
  );
}
