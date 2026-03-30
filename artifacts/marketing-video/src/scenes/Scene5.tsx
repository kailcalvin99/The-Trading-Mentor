import { motion } from 'framer-motion';

export function Scene5() {
  return (
    <motion.div 
      className="absolute inset-0 flex flex-col items-center justify-center bg-[#00C896] z-20"
      initial={{ clipPath: 'circle(0% at 50% 50%)' }}
      animate={{ clipPath: 'circle(150% at 50% 50%)' }}
      exit={{ clipPath: 'polygon(50% 0%, 50% 0%, 50% 100%, 50% 100%)' }}
      transition={{ duration: 1, ease: [0.76, 0, 0.24, 1] }}
    >
      <motion.div 
        className="text-center"
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.6, duration: 0.8 }}
      >
        <motion.div
          className="bg-black text-white text-[1.2vw] font-bold px-[1.5vw] py-[0.5vh] rounded-full inline-block mb-[2vh]"
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.8 }}
        >
          LIMITED AVAILABILITY
        </motion.div>
        
        <h2 className="text-[6vw] leading-[1] font-display font-black text-[#0A0F0A] uppercase tracking-tight">
          We're Looking <br/> For Beta Testers
        </h2>
        
        <motion.p 
          className="text-[#0A0F0A]/80 text-[2vw] font-medium mt-[2vh] max-w-[50vw] mx-auto"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2 }}
        >
          No experience needed. Just test the app.
        </motion.p>
      </motion.div>

      <motion.div 
        className="flex gap-[1.5vw] mt-[5vh]"
        initial={{ y: 50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 1.5, type: 'spring' }}
      >
        {[
          { value: '00', label: 'DAYS' },
          { value: '14', label: 'HOURS' },
          { value: '59', label: 'MINUTES' }
        ].map((time, i) => (
          <div key={i} className="flex flex-col items-center">
            <div className="bg-[#0A0F0A] text-white text-[3vw] font-mono font-bold w-[6vw] h-[6vw] flex items-center justify-center rounded-lg shadow-xl">
              {time.value}
            </div>
            <span className="text-[#0A0F0A] font-bold text-[0.8vw] mt-[1vh]">{time.label}</span>
          </div>
        ))}
      </motion.div>
    </motion.div>
  );
}
