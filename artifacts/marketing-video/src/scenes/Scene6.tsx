import { motion } from 'framer-motion';

export function Scene6() {
  return (
    <motion.div 
      className="absolute inset-0 flex items-center justify-center bg-[#0A0F0A] z-30"
      initial={{ clipPath: 'polygon(0% 0%, 100% 0%, 100% 0%, 0% 0%)' }}
      animate={{ clipPath: 'polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)' }}
      exit={{ opacity: 0, scale: 1.1 }}
      transition={{ duration: 0.8, ease: 'easeInOut' }}
    >
      <div className="w-[80vw] h-[70vh] rounded-[2vw] border border-[#00C896]/30 bg-gradient-to-br from-[#0A0F0A] to-[#0A1A12] shadow-[0_0_100px_rgba(0,200,150,0.1)] relative overflow-hidden flex items-center justify-between px-[6vw]">
        
        <div className="absolute top-0 right-0 w-[40vw] h-[40vw] bg-[#00C896] rounded-full blur-[120px] opacity-10 translate-x-1/2 -translate-y-1/2"></div>

        <div className="w-[50%] z-10">
          <motion.div
            className="flex items-center gap-[0.5vw] mb-[2vh]"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 }}
          >
            <div className="w-[1vw] h-[1vw] bg-[#00C896] rounded-sm"></div>
            <span className="text-[#00C896] font-bold tracking-widest text-[1vw]">SPECIAL OFFER</span>
          </motion.div>

          <motion.h2 
            className="text-[5vw] leading-[1] font-display font-bold text-white mb-[2vh]"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
          >
            Founders <br/> Discount
          </motion.h2>

          <motion.ul 
            className="space-y-[1.5vh]"
            initial="hidden"
            animate="visible"
            variants={{
              visible: { transition: { staggerChildren: 0.2, delayChildren: 1 } }
            }}
          >
            {['Early Access to AI Mentor', 'Massive Lifetime Savings', 'Limited to first 500 spots'].map((text, i) => (
              <motion.li 
                key={i}
                className="flex items-center gap-[1vw] text-[1.5vw] text-gray-300"
                variants={{
                  hidden: { opacity: 0, x: -20 },
                  visible: { opacity: 1, x: 0 }
                }}
              >
                <svg className="w-[1.5vw] h-[1.5vw] text-[#00C896] flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
                {text}
              </motion.li>
            ))}
          </motion.ul>
        </div>

        <div className="w-[40%] z-10 flex flex-col items-center">
          <motion.div 
            className="w-full aspect-[3/4] bg-gradient-to-b from-[#111A15] to-[#0A0F0A] border border-[#00C896]/20 rounded-2xl flex flex-col items-center justify-center p-[2vw] relative shadow-2xl"
            initial={{ opacity: 0, y: 50, rotateZ: -5 }}
            animate={{ opacity: 1, y: 0, rotateZ: 0 }}
            transition={{ delay: 0.8, type: 'spring', damping: 15 }}
          >
            <div className="absolute -top-[1.5vw] bg-[#00C896] text-black font-bold text-[1vw] px-[1.5vw] py-[0.5vw] rounded-full">
              LIFETIME DEAL
            </div>
            <div className="text-gray-400 text-[1.5vw] line-through decoration-red-500/50 mb-[1vh]">$99/mo</div>
            <div className="text-white text-[4vw] font-bold font-display leading-none mb-[1vh]">$29<span className="text-[1.5vw] text-gray-400">/mo</span></div>
            <div className="w-full h-[1px] bg-gradient-to-r from-transparent via-gray-700 to-transparent my-[2vh]"></div>
            <div className="text-center text-[#00C896] font-medium text-[1vw]">Lock in this price forever.</div>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}
