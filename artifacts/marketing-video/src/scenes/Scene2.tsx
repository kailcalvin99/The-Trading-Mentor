import { motion } from 'framer-motion';

export function Scene2() {
  return (
    <motion.div 
      className="absolute inset-0 flex items-center justify-between px-[8vw] z-10"
      initial={{ opacity: 0, x: 100 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -100, filter: 'blur(5px)' }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="w-1/2">
        <motion.div
          initial={{ opacity: 0, scaleX: 0 }}
          animate={{ opacity: 1, scaleX: 1 }}
          transition={{ delay: 0.3, duration: 0.6 }}
          className="w-[5vw] h-[4px] bg-[#00C896] mb-[2vh] origin-left"
        />
        <motion.h2 
          className="text-[4.5vw] leading-[1.1] font-display font-bold text-white tracking-tighter"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.6 }}
        >
          Learn <span className="text-[#00C896]">ICT</span><br />Concepts
        </motion.h2>
        <motion.p
          className="text-[1.8vw] text-gray-400 mt-[2vh] font-sans max-w-[30vw]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.9, duration: 0.8 }}
        >
          Master the algorithms. Understand the matrix.
        </motion.p>
      </div>

      <div className="w-1/2 relative h-full flex items-center justify-center">
        <motion.div 
          className="w-[35vw] h-[25vw] relative rounded-xl overflow-hidden shadow-[0_0_50px_rgba(0,200,150,0.15)] border border-[#00C896]/20 bg-[#0A0F0A]/80 backdrop-blur-sm"
          initial={{ opacity: 0, scale: 0.8, rotateY: 20 }}
          animate={{ opacity: 1, scale: 1, rotateY: 0 }}
          transition={{ delay: 0.6, duration: 1, type: 'spring' }}
          style={{ perspective: 1000 }}
        >
          <svg className="w-full h-full absolute inset-0 p-4" viewBox="0 0 100 100" preserveAspectRatio="none">
            <motion.path 
              d="M 0 80 Q 20 80, 30 60 T 60 50 T 80 20 T 100 30" 
              fill="none" 
              stroke="#00C896" 
              strokeWidth="2"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ delay: 1.2, duration: 1.5, ease: "easeInOut" }}
            />
            <motion.path 
              d="M 0 80 L 0 100 L 100 100 L 100 30 Q 80 20, 60 50 T 30 60 T 0 80" 
              fill="rgba(0, 200, 150, 0.1)" 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 2, duration: 1 }}
            />
            {[10, 25, 40, 55, 70, 85].map((x, i) => (
              <motion.rect
                key={i}
                x={x}
                y={60 - i*5}
                width={2}
                height={15}
                fill={i % 2 === 0 ? "#00C896" : "#ff4444"}
                initial={{ scaleY: 0, opacity: 0 }}
                animate={{ scaleY: 1, opacity: 1 }}
                transition={{ delay: 1.5 + i*0.1, duration: 0.4 }}
                className="origin-bottom"
              />
            ))}
          </svg>
        </motion.div>
      </div>
    </motion.div>
  );
}
