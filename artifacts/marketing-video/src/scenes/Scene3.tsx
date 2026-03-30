import { motion } from 'framer-motion';

export function Scene3() {
  return (
    <motion.div 
      className="absolute inset-0 flex flex-row-reverse items-center justify-between px-[8vw] z-10"
      initial={{ opacity: 0, scale: 1.1 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, y: -100 }}
      transition={{ duration: 0.8, ease: 'easeInOut' }}
    >
      <div className="w-1/2 pl-[4vw]">
        <motion.h2 
          className="text-[4.5vw] leading-[1.1] font-display font-bold text-white tracking-tighter"
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4, duration: 0.7 }}
        >
          Practice With <br/><span className="text-[#00C896]">Live Markets</span>
        </motion.h2>
        <motion.div 
          className="flex gap-[1vw] mt-[3vh]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
        >
          {['ES', 'NQ', 'DXY'].map((ticker, i) => (
            <motion.div 
              key={ticker}
              className="px-[1.5vw] py-[0.5vh] rounded-full border border-[#00C896]/30 bg-[#00C896]/10 text-[#00C896] text-[1vw] font-mono font-bold"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 1.2 + i * 0.1, type: 'spring' }}
            >
              {ticker}
            </motion.div>
          ))}
        </motion.div>
      </div>

      <div className="w-1/2 relative h-full flex items-center justify-center">
        <motion.div 
          className="w-[35vw] h-[25vw] relative rounded-xl overflow-hidden shadow-2xl border border-gray-800 bg-black/50 backdrop-blur-md flex flex-col p-[2vw]"
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.8 }}
        >
          <div className="flex-1 flex flex-col gap-[1vw] justify-center">
            {[
              { type: 'BUY', price: '4120.50', size: '2', color: '#00C896' },
              { type: 'SELL', price: '4125.75', size: '2', color: '#ff4444' }
            ].map((order, i) => (
              <motion.div 
                key={i}
                className="flex justify-between items-center bg-gray-900/50 p-[1vw] rounded-lg border border-gray-800"
                initial={{ x: -50, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 1.5 + i*0.4, type: 'spring' }}
              >
                <span className="font-bold text-[1.2vw]" style={{ color: order.color }}>{order.type}</span>
                <span className="text-white font-mono text-[1.2vw]">{order.price}</span>
                <span className="text-gray-400 text-[1vw]">x{order.size}</span>
              </motion.div>
            ))}
            
            <motion.div 
              className="mt-[1vw] text-center"
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 2.5, type: 'spring' }}
            >
              <div className="text-[#00C896] font-bold text-[2vw]">+ $525.00</div>
              <div className="text-gray-500 text-[0.8vw] uppercase tracking-wider">Simulated P&L</div>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}
