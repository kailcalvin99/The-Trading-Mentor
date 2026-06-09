import { useState, useEffect, useRef, useCallback } from "react";

const CELEBRATION_SEEN_KEY = "ict-graduation-celebrated";

interface GraduationCelebrationProps {
  userName?: string;
  onClose: () => void;
}

function useConfettiCanvas(canvasRef: React.RefObject<HTMLCanvasElement | null>, active: boolean) {
  useEffect(() => {
    if (!active) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    function resize() {
      if (!canvas) return;
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    }
    resize();
    window.addEventListener("resize", resize);

    const colors = [
      "#FFD700", "#FF6B6B", "#00C896", "#818CF8", "#06B6D4",
      "#F59E0B", "#EC4899", "#8B5CF6", "#10B981", "#EF4444",
      "#FF9800", "#E91E63", "#00BCD4", "#FFEB3B", "#9C27B0",
    ];

    interface Particle {
      x: number; y: number;
      vx: number; vy: number;
      w: number; h: number;
      color: string;
      rotation: number;
      rotationSpeed: number;
      life: number;
      maxLife: number;
      shape: "rect" | "circle" | "star";
      gravity: number;
      wobble: number;
      wobbleSpeed: number;
    }

    const particles: Particle[] = [];

    function spawnBurst(cx: number, cy: number, count: number) {
      for (let i = 0; i < count; i++) {
        const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.5;
        const speed = 4 + Math.random() * 12;
        particles.push({
          x: cx, y: cy,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 6,
          w: 6 + Math.random() * 10,
          h: 4 + Math.random() * 8,
          color: colors[Math.floor(Math.random() * colors.length)],
          rotation: Math.random() * Math.PI * 2,
          rotationSpeed: (Math.random() - 0.5) * 0.3,
          life: 1,
          maxLife: 120 + Math.random() * 100,
          shape: ["rect", "circle", "star"][Math.floor(Math.random() * 3)] as Particle["shape"],
          gravity: 0.08 + Math.random() * 0.04,
          wobble: Math.random() * Math.PI * 2,
          wobbleSpeed: 0.02 + Math.random() * 0.04,
        });
      }
    }

    function drawStar(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
      ctx.beginPath();
      for (let i = 0; i < 5; i++) {
        const angle = (i * Math.PI * 2) / 5 - Math.PI / 2;
        const outerX = x + Math.cos(angle) * r;
        const outerY = y + Math.sin(angle) * r;
        if (i === 0) ctx.moveTo(outerX, outerY);
        else ctx.lineTo(outerX, outerY);
        const innerAngle = angle + Math.PI / 5;
        ctx.lineTo(x + Math.cos(innerAngle) * r * 0.4, y + Math.sin(innerAngle) * r * 0.4);
      }
      ctx.closePath();
      ctx.fill();
    }

    const W = () => canvas?.width || window.innerWidth;
    const H = () => canvas?.height || window.innerHeight;

    spawnBurst(W() * 0.5, H() * 0.3, 80);
    setTimeout(() => spawnBurst(W() * 0.2, H() * 0.4, 60), 300);
    setTimeout(() => spawnBurst(W() * 0.8, H() * 0.4, 60), 600);
    setTimeout(() => spawnBurst(W() * 0.5, H() * 0.5, 100), 1200);
    setTimeout(() => spawnBurst(W() * 0.3, H() * 0.2, 50), 1800);
    setTimeout(() => spawnBurst(W() * 0.7, H() * 0.2, 50), 2200);
    setTimeout(() => spawnBurst(W() * 0.5, H() * 0.3, 120), 3000);

    const streamInterval = setInterval(() => {
      for (let i = 0; i < 3; i++) {
        particles.push({
          x: Math.random() * W(),
          y: -10,
          vx: (Math.random() - 0.5) * 2,
          vy: 1 + Math.random() * 3,
          w: 6 + Math.random() * 8,
          h: 4 + Math.random() * 6,
          color: colors[Math.floor(Math.random() * colors.length)],
          rotation: Math.random() * Math.PI * 2,
          rotationSpeed: (Math.random() - 0.5) * 0.2,
          life: 1,
          maxLife: 200 + Math.random() * 100,
          shape: ["rect", "circle", "star"][Math.floor(Math.random() * 3)] as Particle["shape"],
          gravity: 0.02,
          wobble: Math.random() * Math.PI * 2,
          wobbleSpeed: 0.02 + Math.random() * 0.02,
        });
      }
    }, 100);

    let animId: number;
    function animate() {
      if (!ctx || !canvas) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx + Math.sin(p.wobble) * 1.5;
        p.y += p.vy;
        p.vy += p.gravity;
        p.vx *= 0.99;
        p.rotation += p.rotationSpeed;
        p.wobble += p.wobbleSpeed;
        p.life -= 1 / p.maxLife;

        if (p.life <= 0 || p.y > canvas.height + 20) {
          particles.splice(i, 1);
          continue;
        }

        ctx.save();
        ctx.globalAlpha = Math.min(1, p.life * 2);
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.fillStyle = p.color;

        if (p.shape === "rect") {
          ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        } else if (p.shape === "circle") {
          ctx.beginPath();
          ctx.arc(0, 0, p.w / 2, 0, Math.PI * 2);
          ctx.fill();
        } else {
          drawStar(ctx, 0, 0, p.w / 2);
        }
        ctx.restore();
      }

      animId = requestAnimationFrame(animate);
    }
    animId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animId);
      clearInterval(streamInterval);
      window.removeEventListener("resize", resize);
    };
  }, [active, canvasRef]);
}

export default function GraduationCelebration({ userName = "Graduate", onClose }: GraduationCelebrationProps) {
  const [phase, setPhase] = useState(0);
  const [showConfetti, setShowConfetti] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  useConfettiCanvas(canvasRef, showConfetti);

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    timers.push(setTimeout(() => setPhase(1), 300));
    timers.push(setTimeout(() => setPhase(2), 1500));
    timers.push(setTimeout(() => { setPhase(3); setShowConfetti(true); }, 3000));
    timers.push(setTimeout(() => setPhase(4), 4500));
    timers.push(setTimeout(() => setPhase(5), 6000));

    try {
      if (audioRef.current) {
        audioRef.current.volume = 0.5;
        audioRef.current.play().catch(() => {});
      }
    } catch {}

    return () => timers.forEach(clearTimeout);
  }, []);

  const handleClose = useCallback(() => {
    localStorage.setItem(CELEBRATION_SEEN_KEY, "true");
    onClose();
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/90 backdrop-blur-md">
      <audio ref={audioRef} src={`${import.meta.env.BASE_URL}celebration-music.mp3`} />

      <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none" style={{ width: "100%", height: "100%" }} />

      <div className="relative z-10 flex flex-col items-center justify-center text-center px-4 max-w-2xl mx-auto">
        <div className={`transition-all duration-1000 ${phase >= 1 ? "opacity-100 scale-100" : "opacity-0 scale-50"}`}>
          <div className="relative inline-block mb-2">
            <div className={`transition-all duration-700 ${phase >= 2 ? "translate-y-[-40px] opacity-0" : "translate-y-0 opacity-100"}`}>
              <svg viewBox="0 0 200 180" className="w-48 h-44 mx-auto drop-shadow-2xl" style={{ filter: "drop-shadow(0 0 30px rgba(255,215,0,0.4))" }}>
                <rect x="40" y="60" width="120" height="100" rx="10" fill="#8B4513" stroke="#654321" strokeWidth="3" />
                <rect x="45" y="65" width="110" height="90" rx="8" fill="#A0522D" />
                <rect x="90" y="60" width="20" height="100" rx="2" fill="#FFD700" />
                <rect x="40" y="100" width="120" height="20" rx="2" fill="#FFD700" />
                <circle cx="100" cy="110" r="12" fill="#FF6B6B" stroke="#FFD700" strokeWidth="2" />
                <rect x="30" y="45" width="140" height="25" rx="8" fill="#8B4513" stroke="#654321" strokeWidth="3" className={`transition-all duration-1000 origin-bottom ${phase >= 2 ? "-translate-y-16 -rotate-[30deg]" : ""}`} />
                <path d="M95 45 Q100 15 105 45" fill="none" stroke="#FFD700" strokeWidth="3" className={`transition-all duration-700 ${phase >= 2 ? "opacity-0" : "opacity-100"}`} />
                <circle cx="100" cy="15" r="8" fill="#FF6B6B" className={`transition-all duration-700 ${phase >= 2 ? "opacity-0 -translate-y-4" : "opacity-100"}`} />
              </svg>
            </div>

            <div className={`absolute inset-0 flex items-center justify-center transition-all duration-1000 ease-out ${phase >= 2 ? "opacity-100 translate-y-0" : "opacity-0 translate-y-20"}`}>
              <div className={`transition-all duration-1000 ease-out ${phase >= 3 ? "scale-100 rotate-0" : "scale-50 rotate-12"}`}>
                <svg viewBox="0 0 320 240" className="w-80 h-60 mx-auto" style={{ filter: "drop-shadow(0 10px 40px rgba(255,215,0,0.5))" }}>
                  <defs>
                    <linearGradient id="diplomaBg" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#FFF8E7" />
                      <stop offset="100%" stopColor="#F5E6C8" />
                    </linearGradient>
                    <linearGradient id="goldBorder" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#FFD700" />
                      <stop offset="50%" stopColor="#FFA500" />
                      <stop offset="100%" stopColor="#FFD700" />
                    </linearGradient>
                    <linearGradient id="sealGold" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#FFD700" />
                      <stop offset="100%" stopColor="#B8860B" />
                    </linearGradient>
                  </defs>
                  <rect x="10" y="10" width="300" height="220" rx="8" fill="url(#diplomaBg)" stroke="url(#goldBorder)" strokeWidth="4" />
                  <rect x="20" y="20" width="280" height="200" rx="5" fill="none" stroke="#D4AF37" strokeWidth="1.5" strokeDasharray="4 2" />
                  <text x="160" y="55" textAnchor="middle" fill="#8B4513" fontSize="14" fontWeight="bold" fontFamily="serif">CERTIFICATE OF COMPLETION</text>
                  <line x1="60" y1="62" x2="260" y2="62" stroke="#D4AF37" strokeWidth="1" />
                  <text x="160" y="85" textAnchor="middle" fill="#666" fontSize="9" fontFamily="serif">This is to certify that</text>
                  <text x="160" y="110" textAnchor="middle" fill="#8B4513" fontSize="18" fontWeight="bold" fontFamily="serif" fontStyle="italic">{userName}</text>
                  <line x1="80" y1="116" x2="240" y2="116" stroke="#D4AF37" strokeWidth="0.5" />
                  <text x="160" y="138" textAnchor="middle" fill="#666" fontSize="8" fontFamily="serif">has successfully completed the</text>
                  <text x="160" y="156" textAnchor="middle" fill="#00C896" fontSize="13" fontWeight="bold" fontFamily="serif">ICT Trading Academy</text>
                  <text x="160" y="172" textAnchor="middle" fill="#666" fontSize="7" fontFamily="serif">All 39 Lessons & Final Examination</text>
                  <circle cx="260" cy="195" r="18" fill="url(#sealGold)" stroke="#B8860B" strokeWidth="2" />
                  <text x="260" y="192" textAnchor="middle" fill="#8B4513" fontSize="6" fontWeight="bold">ICT AI</text>
                  <text x="260" y="202" textAnchor="middle" fill="#8B4513" fontSize="5">CERTIFIED</text>
                  {[...Array(12)].map((_, i) => {
                    const angle = (i * 30 * Math.PI) / 180;
                    return (
                      <circle key={i} cx={260 + Math.cos(angle) * 15} cy={195 + Math.sin(angle) * 15} r="1" fill="#B8860B" />
                    );
                  })}
                  <path d="M245 213 L255 230 L260 220 L265 230 L275 213" fill="#FF0000" opacity="0.8" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        <div className={`transition-all duration-1000 ease-out ${phase >= 4 ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
          <h1 className="text-5xl md:text-7xl font-extrabold mb-3 bg-gradient-to-r from-yellow-300 via-amber-400 to-yellow-500 bg-clip-text text-transparent" style={{ textShadow: "0 0 40px rgba(255,215,0,0.3)" }}>
            CONGRATULATIONS!
          </h1>
          <div className="flex items-center justify-center gap-2 mb-2">
            {["🎉", "🏆", "🎓", "⭐", "🎊"].map((e, i) => (
              <span key={i} className="text-4xl animate-bounce" style={{ animationDelay: `${i * 0.15}s` }}>{e}</span>
            ))}
          </div>
        </div>

        <div className={`transition-all duration-1000 ease-out ${phase >= 5 ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
          <p className="text-xl text-white/90 mb-2 font-medium">
            You've mastered the ICT Trading Academy!
          </p>
          <p className="text-sm text-white/60 mb-6 max-w-md mx-auto">
            All 39 lessons completed. All quizzes passed. You are now an ICT-certified trader ready to conquer the markets.
          </p>

          <div className="flex flex-wrap gap-3 justify-center mb-8">
            {[
              { label: "39/39 Lessons", icon: "📚" },
              { label: "Quiz Passed", icon: "✅" },
              { label: "ICT Certified", icon: "🏅" },
              { label: "Course Graduate", icon: "🎓" },
            ].map((badge, i) => (
              <div key={i} className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl px-4 py-2 flex items-center gap-2">
                <span className="text-lg">{badge.icon}</span>
                <span className="text-sm font-semibold text-white/90">{badge.label}</span>
              </div>
            ))}
          </div>

          <button
            onClick={handleClose}
            className="bg-gradient-to-r from-yellow-400 to-amber-500 text-black font-bold py-4 px-10 rounded-2xl text-lg hover:scale-105 transition-transform shadow-lg shadow-yellow-500/30"
          >
            Accept Your Diploma
          </button>
        </div>
      </div>

      <div className="absolute top-6 right-6 z-20">
        <button onClick={handleClose} className="text-white/40 hover:text-white/80 transition-colors text-sm">
          Skip
        </button>
      </div>
    </div>
  );
}

export function useGraduationCheck() {
  const [showCelebration, setShowCelebration] = useState(false);

  useEffect(() => {
    const check = () => {
      try {
        const unlocked = localStorage.getItem("ict-academy-unlocked") === "true";
        const alreadySeen = localStorage.getItem(CELEBRATION_SEEN_KEY) === "true";
        if (unlocked && !alreadySeen) {
          setShowCelebration(true);
        }
      } catch {}
    };
    check();
    const interval = setInterval(check, 3000);
    return () => clearInterval(interval);
  }, []);

  return { showCelebration, closeCelebration: () => setShowCelebration(false) };
}
