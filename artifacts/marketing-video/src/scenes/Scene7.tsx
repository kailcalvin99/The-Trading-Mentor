import { motion } from 'framer-motion';

export function Scene7() {
  return (
    <motion.div 
      className="absolute inset-0 flex flex-col items-center justify-center z-40 bg-[#0A0F0A]"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 0.95, filter: 'blur(10px)' }}
      transition={{ duration: 1 }}
    >
      <motion.div
        initial={{ scale: 1.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
        className="flex flex-col items-center"
      >
        <img 
          src={`${import.meta.env.BASE_URL}logo.png`}
          alt="ICT Trading Mentor Logo" 
          className="w-[12vw] h-[12vw] object-contain mb-[3vh]"
        />
        <h1 className="text-[4vw] font-display font-bold text-white tracking-tight">
          ICT TRADING MENTOR
        </h1>
        
        <motion.div 
          className="mt-[4vh] text-[#00C896] text-[1.5vw] font-mono tracking-widest bg-[#00C896]/10 px-[2vw] py-[1vh] rounded-full border border-[#00C896]/30"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.8 }}
        >
          ICTMENTOR.AI
        </motion.div>
      </motion.div>
    </motion.div>
  );
}
