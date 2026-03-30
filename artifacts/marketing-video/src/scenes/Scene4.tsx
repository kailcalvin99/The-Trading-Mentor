import { motion } from 'framer-motion';

export function Scene4() {
  return (
    <motion.div 
      className="absolute inset-0 flex flex-col items-center justify-center z-10"
      initial={{ opacity: 0, rotateX: 90 }}
      animate={{ opacity: 1, rotateX: 0 }}
      exit={{ opacity: 0, scale: 2 }}
      transition={{ duration: 1, type: 'spring', damping: 20 }}
      style={{ perspective: 1000 }}
    >
      <motion.div 
        className="z-10 text-center"
        initial={{ y: 50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.5, duration: 0.8 }}
      >
        <motion.div
          className="text-[#00C896] text-[1.5vw] tracking-[0.2em] font-bold mb-[1vh]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
        >
          24/7 AVAILABILITY
        </motion.div>
        
        <h2 className="text-[5vw] leading-[1] font-display font-bold text-white drop-shadow-2xl">
          Your Personal <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#00C896] to-emerald-200">
            AI Mentor
          </span>
        </h2>
      </motion.div>

      <div className="absolute bottom-[10vh] flex flex-col gap-[1.5vh] w-[40vw] z-10">
        <motion.div 
          className="self-end bg-gray-800/80 backdrop-blur-md p-[1vw] rounded-2xl rounded-tr-none border border-gray-700 max-w-[80%]"
          initial={{ opacity: 0, y: 20, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ delay: 1.5, type: 'spring' }}
        >
          <p className="text-white text-[1.2vw]">Is there a Fair Value Gap on the 15m NQ chart right now?</p>
        </motion.div>
        
        <motion.div 
          className="self-start bg-[#00C896]/20 backdrop-blur-md p-[1vw] rounded-2xl rounded-tl-none border border-[#00C896]/40 max-w-[80%]"
          initial={{ opacity: 0, y: 20, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ delay: 2.2, type: 'spring' }}
        >
          <p className="text-[#e0fff4] text-[1.2vw]">Yes, there's a bullish FVG between 15020 and 15045 formed during the NY AM session.</p>
        </motion.div>
      </div>
    </motion.div>
  );
}
