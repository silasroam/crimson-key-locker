import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

type TaskType = 'ad' | 'youtube';

interface Task {
  id: number;
  title: string;
  description: string;
  icon: string;
  completed: boolean;
  type: TaskType;
  url?: string;
}

const STORAGE_KEY = 'key-locker-max-revenue';
const AD_SECONDS = 60;
const AD_ZONE = '11500503';
const AD_SRC = 'https://al5sm.com/tag.min.js';

const initialTasks: Task[] = [
  {
    id: 1,
    title: 'Step 1 — Unlock Vault',
    description: 'Watch an ad to begin',
    icon: '🔓',
    completed: false,
    type: 'ad',
  },
  {
    id: 2,
    title: 'Step 2 — Open Archive',
    description: 'Watch an ad to proceed',
    icon: '📂',
    completed: false,
    type: 'ad',
  },
  {
    id: 3,
    title: 'Step 3 — Access Chamber',
    description: 'Watch an ad to continue',
    icon: '🗝️',
    completed: false,
    type: 'ad',
  },
  {
    id: 4,
    title: 'Step 4 — Break Final Seal',
    description: 'Watch an ad to unlock',
    icon: '🔥',
    completed: false,
    type: 'ad',
  },
  {
    id: 5,
    title: 'Step 5 — Subscribe to YouTube',
    description: 'Subscribe to our channel',
    icon: '▶️',
    completed: false,
    type: 'youtube',
    url: 'https://www.youtube.com/@SilasRoam',
  },
];

function loadSavedState() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (e) {
    console.error('Failed to load saved state:', e);
  }
  return null;
}

function App() {
  const [tasks, setTasks] = useState<Task[]>(() => {
    const saved = loadSavedState();
    if (saved?.tasks) {
      return saved.tasks;
    }
    return initialTasks;
  });
  const [countdowns, setCountdowns] = useState<Record<number, number>>(() => {
    const saved = loadSavedState();
    return saved?.countdowns || {};
  });
  const [youtubeVerified, setYoutubeVerified] = useState<Record<number, boolean>>(() => {
    const saved = loadSavedState();
    return saved?.youtubeVerified || {};
  });
  const [unlocked, setUnlocked] = useState(false);
  const [showReward, setShowReward] = useState(false);
  const [shake, setShake] = useState(false);
  const [checkingYoutube, setCheckingYoutube] = useState<number | null>(null);
  const [isPageActive, setIsPageActive] = useState(true);

  const timerRef = useRef<number | null>(null);

  const currentStepIndex = tasks.findIndex((t) => !t.completed);
  const isAllComplete = currentStepIndex === -1;
  const totalTasks = tasks.length;
  const completedCount = tasks.filter((t) => t.completed).length;

  // Save progress to localStorage
  useEffect(() => {
    const state = { tasks, countdowns, youtubeVerified };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      console.error('Failed to save state:', e);
    }
  }, [tasks, countdowns, youtubeVerified]);

  // Track page visibility
  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsPageActive(document.visibilityState === 'visible');
    };

    const handleFocus = () => setIsPageActive(true);
    const handleBlur = () => setIsPageActive(false);

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);
    window.addEventListener('blur', handleBlur);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('blur', handleBlur);
    };
  }, []);

  // Countdown ticking — only decrements when page is active
  useEffect(() => {
    if (currentStepIndex === -1) return;
    const currentTask = tasks[currentStepIndex];
    if (!currentTask || currentTask.completed || currentTask.type !== 'ad') return;

    const remaining = countdowns[currentTask.id];
    if (remaining === undefined || remaining <= 0 || !isPageActive) return;

    let lastTick = Date.now();

    timerRef.current = window.setInterval(() => {
      const now = Date.now();
      const delta = (now - lastTick) / 1000;
      lastTick = now;

      setCountdowns((prev) => {
        const current = prev[currentTask.id] || 0;
        const next = Math.max(0, current - delta);
        return { ...prev, [currentTask.id]: next };
      });
    }, 250);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [currentStepIndex, tasks, isPageActive]);

  // Complete the ad step when its countdown reaches zero
  useEffect(() => {
    if (currentStepIndex === -1) return;
    const currentTask = tasks[currentStepIndex];
    if (!currentTask || currentTask.completed || currentTask.type !== 'ad') return;

    const remaining = countdowns[currentTask.id];
    if (remaining === undefined) return;

    if (remaining <= 0) {
      setTasks((prev) =>
        prev.map((t) =>
          t.id === currentTask.id ? { ...t, completed: true } : t
        )
      );
      setCountdowns((prev) => {
        const next = { ...prev };
        delete next[currentTask.id];
        return next;
      });
    }
  }, [countdowns, currentStepIndex, tasks]);

  // Monetag ad trigger — SYNCHRONOUS, fires immediately in the click handler
  const triggerAd = () => {
    try {
      const s = document.createElement('script');
      s.dataset.zone = AD_ZONE;
      s.src = AD_SRC;
      s.async = true;
      document.body.appendChild(s);
    } catch (e) {
      console.error('Failed to trigger ad:', e);
    }
  };

  // Handle ad step click — fires on FIRST click: ad → timer → state
  const handleTaskClick = (task: Task) => {
    if (task.completed || unlocked || isAllComplete) return;

    // 1. Trigger ad IMMEDIATELY (synchronous, not via useEffect)
    triggerAd();

    // 2. Start countdown timer
    setCountdowns((prev) => ({ ...prev, [task.id]: AD_SECONDS }));
  };

  const resetAll = () => {
    setTasks(initialTasks.map((t) => ({ ...t, completed: false })));
    setCountdowns({});
    setYoutubeVerified({});
    setUnlocked(false);
    setShowReward(false);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (e) {
      console.error('Failed to clear storage:', e);
    }
  };

  const handleBoxClick = () => {
    if (!isAllComplete || unlocked) {
      setShake(true);
      setTimeout(() => setShake(false), 500);
    }
  };

  const handleGetKey = () => {
    if (!isAllComplete || unlocked) return;
    setUnlocked(true);
    setTimeout(() => {
      setShowReward(true);
    }, 1000);
  };

  const handleYoutubeCheck = (task: Task) => {
    if (task.completed || unlocked) return;
    setCheckingYoutube(task.id);

    setTimeout(() => {
      setYoutubeVerified((prev) => ({ ...prev, [task.id]: true }));
      setTasks((prev) =>
        prev.map((t) =>
          t.id === task.id ? { ...t, completed: true } : t
        )
      );
      setCheckingYoutube(null);
    }, 1500);
  };

  const renderTaskAction = (task: Task, index: number) => {
    // Completed task
    if (task.completed) {
      return (
        <span className="shrink-0 w-full sm:w-auto px-4 py-2 rounded-lg text-sm font-semibold bg-crimson-500/10 text-crimson-400 border border-crimson-500/20 cursor-default text-center">
          Done
        </span>
      );
    }

    // Locked until previous step is fully completed
    if (index > currentStepIndex) {
      return (
        <span className="shrink-0 w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold bg-void-600/50 text-white/30 border border-white/5 cursor-not-allowed">
          <svg
            className="w-3.5 h-3.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
            />
          </svg>
          Locked
        </span>
      );
    }

    // Current ad step — fires synchronously on FIRST click
    if (task.type === 'ad') {
      const remaining = countdowns[task.id];
      const isCounting = remaining !== undefined && remaining > 0;

      if (isCounting) {
        const percent = ((AD_SECONDS - remaining) / AD_SECONDS) * 100;
        return (
          <div className="shrink-0 w-full sm:w-36 flex flex-col items-center sm:items-end gap-1.5">
            <div className="flex items-center gap-2 w-full justify-center sm:justify-end">
              <motion.span
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                className="w-3 h-3 border-2 border-crimson-400 border-t-transparent rounded-full"
              />
              <span className="text-xs font-mono font-semibold text-crimson-400">
                {Math.ceil(remaining)}s
              </span>
            </div>
            <div className="w-full h-1.5 rounded-full bg-void-600 overflow-hidden">
              <motion.div
                className="h-full rounded-full bg-crimson-gradient"
                animate={{ width: `${percent}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
            <button
              disabled
              className="w-full px-3 py-1.5 rounded-lg text-xs font-semibold bg-void-700 text-white/40 border border-white/10 cursor-not-allowed"
            >
              Wait ({Math.ceil(remaining)}s)...
            </button>
          </div>
        );
      }

      return (
        <button
          type="button"
          onClick={() => handleTaskClick(task)}
          className="btn-crimson !px-4 !py-2 !text-sm shrink-0 w-full sm:w-auto"
        >
          <span className="flex items-center justify-center gap-2">
            <span className="text-lg leading-none">📺</span>
            Watch Ad
          </span>
        </button>
      );
    }

    // YouTube step
    if (task.type === 'youtube') {
      const verified = youtubeVerified[task.id];
      return (
        <div className="shrink-0 w-full sm:w-auto flex flex-col items-stretch sm:items-end gap-2">
          <a
            href={task.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white bg-[#FF0000] hover:bg-[#CC0000] transition-all duration-300 shadow-[0_0_20px_-4px_rgba(255,0,0,0.5)] hover:shadow-[0_0_30px_-4px_rgba(255,0,0,0.8)]"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
            </svg>
            Subscribe
          </a>
          <button
            onClick={() => handleYoutubeCheck(task)}
            disabled={verified || checkingYoutube === task.id || unlocked}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all duration-300 ${
              verified
                ? 'bg-crimson-500/10 text-crimson-400 border border-crimson-500/20 cursor-default'
                : 'btn-ghost !px-4 !py-1.5 !text-xs'
            }`}
          >
            {checkingYoutube === task.id ? (
              <span className="flex items-center gap-2">
                <motion.span
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  className="w-3 h-3 border-2 border-crimson-400 border-t-transparent rounded-full"
                />
                Checking...
              </span>
            ) : verified ? (
              'Verified ✓'
            ) : (
              'Check Subscription'
            )}
          </button>
        </div>
      );
    }

    return null;
  };

  return (
    <div className="min-h-dvh w-full max-w-full relative overflow-x-hidden flex flex-col">
      {/* Background decorative elements */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] max-w-full h-[600px] bg-crimson-radial opacity-60" />
        <div className="absolute bottom-0 right-0 w-[400px] max-w-full h-[400px] bg-crimson-radial opacity-40" />
        <div className="absolute top-1/3 left-0 w-[300px] max-w-full h-[300px] bg-crimson-radial opacity-30" />
      </div>

      {/* Floating particles */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {[...Array(12)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 rounded-full bg-crimson-500/40"
            style={{
              left: `${(i * 8.3) % 100}%`,
              top: `${(i * 13.7) % 100}%`,
            }}
            animate={{
              y: [0, -30, 0],
              opacity: [0.2, 0.8, 0.2],
            }}
            transition={{
              duration: 4 + (i % 5),
              repeat: Infinity,
              delay: i * 0.4,
            }}
          />
        ))}
      </div>

      <div className="relative z-10 w-full max-w-full flex-1 mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
        {/* Header */}
        <header className="flex flex-col sm:flex-row items-center sm:items-center justify-between gap-3 mb-6 sm:mb-10">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            className="flex items-center gap-3 w-full sm:w-auto"
          >
            <div className="w-10 h-10 rounded-xl bg-crimson-gradient flex items-center justify-center shadow-crimson-glow shrink-0">
              <svg
                className="w-5 h-5 text-white"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"
                />
              </svg>
            </div>
            <div className="min-w-0">
              <h1 className="font-display font-bold text-lg sm:text-2xl tracking-tight truncate">
                Key <span className="text-gradient-crimson">Locker</span>
              </h1>
              <p className="text-xs text-white/40 -mt-0.5">Secure Vault System</p>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="glass-card px-3 py-1.5 sm:px-4 sm:py-2 flex items-center gap-2 shrink-0 w-full sm:w-auto justify-center"
          >
            <span className="relative flex h-2.5 w-2.5">
              <span
                className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                  isPageActive ? 'bg-crimson-500' : 'bg-white/30'
                }`}
              />
              <span
                className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
                  isPageActive ? 'bg-crimson-500' : 'bg-white/30'
                }`}
              />
            </span>
            <span className="text-xs sm:text-sm font-medium text-white/80">
              {isPageActive ? 'System Online' : 'System Paused'}
            </span>
          </motion.div>
        </header>

        {/* Main content */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-10 items-start w-full">
          {/* Left: Reward Box */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="flex flex-col items-center w-full"
          >
            <div className="relative w-full max-w-md mx-auto">
              {/* Glow behind box */}
              <div
                className={`absolute inset-0 rounded-full blur-3xl transition-all duration-700 ${
                  unlocked
                    ? 'bg-crimson-600/30 scale-110'
                    : 'bg-crimson-600/10'
                }`}
              />

              {/* Locked/Unlocked Box */}
              <motion.div
                animate={shake ? { x: [0, -10, 10, -10, 10, 0] } : {}}
                transition={{ duration: 0.5 }}
                className="relative"
              >
                <motion.div
                  animate={
                    unlocked
                      ? {
                          rotateY: [0, 180, 360],
                          scale: [1, 1.1, 1],
                        }
                      : {}
                  }
                  transition={{ duration: 1.2, ease: 'easeInOut' }}
                  className="glass-card p-5 sm:p-8 cursor-pointer select-none w-full"
                  onClick={handleBoxClick}
                >
                  <div className="flex flex-col items-center gap-4 sm:gap-6 w-full">
                    {/* Box icon */}
                    <motion.div
                      animate={
                        unlocked
                          ? { scale: [1, 1.2, 1], rotate: [0, -5, 5, 0] }
                          : { y: [0, -8, 0] }
                      }
                      transition={
                        unlocked
                          ? { duration: 0.8, repeat: Infinity, repeatDelay: 1 }
                          : { duration: 3, repeat: Infinity }
                      }
                      className="relative"
                    >
                      <div
                        className={`w-24 h-24 sm:w-32 sm:h-32 rounded-2xl flex items-center justify-center transition-all duration-500 ${
                          unlocked
                            ? 'bg-crimson-gradient shadow-crimson-glow-lg'
                            : 'bg-void-700 border border-crimson-500/20 shadow-crimson-glow'
                        }`}
                      >
                        {unlocked ? (
                          <motion.svg
                            initial={{ scale: 0, rotate: -180 }}
                            animate={{ scale: 1, rotate: 0 }}
                            transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                            className="w-14 h-14 sm:w-20 sm:h-20 text-white"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                            />
                          </motion.svg>
                        ) : (
                          <svg
                            className="w-14 h-14 sm:w-20 sm:h-20 text-crimson-400"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={1.5}
                              d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                            />
                          </svg>
                        )}
                      </div>

                      {/* Lock indicator */}
                      {!unlocked && (
                        <motion.div
                          animate={{ scale: [1, 1.1, 1] }}
                          transition={{ duration: 2, repeat: Infinity }}
                          className="absolute -bottom-2 -right-2 w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-crimson-600 flex items-center justify-center shadow-crimson-glow-sm"
                        >
                          <svg
                            className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                            />
                          </svg>
                        </motion.div>
                      )}
                    </motion.div>

                    {/* Status text */}
                    <div className="text-center w-full">
                      <h2 className="font-display font-bold text-xl sm:text-2xl mb-1 sm:mb-2">
                        {unlocked ? (
                          <span className="shimmer-text">Reward Unlocked!</span>
                        ) : (
                          <span className="text-white/90">
                            {isAllComplete ? 'All Steps Complete!' : 'Locked Reward'}
                          </span>
                        )}
                      </h2>
                      <p className="text-white/50 text-sm sm:text-base px-2">
                        {unlocked
                          ? 'Congratulations! Your key is ready.'
                          : isAllComplete
                            ? 'Press GET ACCESS KEY to claim your reward.'
                            : `Complete all ${totalTasks} steps to unlock`}
                      </p>
                    </div>

                    {/* Progress bar */}
                    <div className="w-full">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-xs font-medium text-white/50 uppercase tracking-wider">
                          Progress
                        </span>
                        <span className="text-sm font-bold text-crimson-400">
                          {completedCount}/{totalTasks}
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-void-600 overflow-hidden">
                        <motion.div
                          className="h-full rounded-full bg-crimson-gradient"
                          animate={{ width: `${(completedCount / totalTasks) * 100}%` }}
                          transition={{ type: 'spring', stiffness: 100, damping: 20 }}
                        />
                      </div>
                    </div>

                    {/* Get Access Key button — only active when ALL steps complete */}
                    <AnimatePresence>
                      {isAllComplete && !unlocked && (
                        <motion.button
                          initial={{ opacity: 0, y: 10, scale: 0.9 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.9 }}
                          whileTap={{ scale: 0.97 }}
                          onClick={handleGetKey}
                          className="btn-crimson w-full !py-3 sm:!py-4 !text-sm sm:!text-base font-bold tracking-widest"
                        >
                          <span className="flex items-center justify-center gap-2">
                            <span className="text-lg sm:text-xl leading-none">🔑</span>
                            GET ACCESS KEY
                          </span>
                        </motion.button>
                      )}
                    </AnimatePresence>
                  </div>
                </motion.div>
              </motion.div>

              {/* Reward reveal */}
              <AnimatePresence>
                {showReward && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.5, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.5 }}
                    transition={{ type: 'spring', stiffness: 200, damping: 20 }}
                    className="absolute inset-0 flex items-center justify-center"
                  >
                    <div className="glass-card p-6 sm:p-8 text-center max-w-sm w-full border-crimson-500/30 shadow-crimson-glow-lg">
                      <motion.div
                        animate={{ rotate: [0, 10, -10, 0] }}
                        transition={{ duration: 2, repeat: Infinity }}
                        className="text-6xl mb-4"
                      >
                        🎁
                      </motion.div>
                      <h3 className="font-display font-bold text-2xl mb-2 text-gradient-crimson">
                        Key Claimed!
                      </h3>
                      <p className="text-white/60 text-sm mb-6">
                        You've unlocked your access key. Check your inventory to claim it.
                      </p>
                      <button onClick={resetAll} className="btn-ghost w-full">
                        Reset & Start Again
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>

          {/* Right: Tasks */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="w-full"
          >
            <div className="glass-card p-4 sm:p-6 w-full">
              <div className="flex items-center justify-between gap-3 mb-4 sm:mb-6">
                <div className="min-w-0">
                  <h2 className="font-display font-bold text-lg sm:text-xl">
                    Mission <span className="text-gradient-crimson">Steps</span>
                  </h2>
                  <p className="text-white/40 text-xs sm:text-sm mt-1">
                    Complete steps in order
                  </p>
                </div>
                <div className="glass-card px-3 py-1.5 sm:px-4 sm:py-2 text-center shrink-0">
                  <div className="text-xl sm:text-2xl font-bold text-crimson-400">
                    {completedCount}
                    <span className="text-white/30 text-base sm:text-lg">/{totalTasks}</span>
                  </div>
                  <div className="text-[9px] sm:text-[10px] uppercase tracking-wider text-white/40">
                    Complete
                  </div>
                </div>
              </div>

              <div className="space-y-2 sm:space-y-3">
                {tasks.map((task, index) => (
                  <motion.div
                    key={task.id}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.4, delay: 0.3 + index * 0.1 }}
                    className={`glass-card glass-card-hover p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center gap-3 w-full ${
                      task.completed
                        ? 'border-crimson-500/30'
                        : index === currentStepIndex
                          ? 'border-crimson-500/40 shadow-crimson-glow-sm'
                          : ''
                    }`}
                  >
                    <div className="flex items-center gap-3 w-full sm:w-auto">
                      <div
                        className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center text-xl sm:text-2xl shrink-0 transition-all duration-300 ${
                          task.completed
                            ? 'bg-crimson-gradient shadow-crimson-glow-sm'
                            : index === currentStepIndex
                              ? 'bg-crimson-500/10 border border-crimson-500/30'
                              : 'bg-void-700 border border-white/5'
                        }`}
                      >
                        {task.completed ? (
                          <motion.svg
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ type: 'spring', stiffness: 300, damping: 15 }}
                            className="w-5 h-5 sm:w-6 sm:h-6 text-white"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2.5}
                              d="M5 13l4 4L19 7"
                            />
                          </motion.svg>
                        ) : (
                          <span className={index > currentStepIndex ? 'opacity-30' : 'opacity-60'}>
                            {task.icon}
                          </span>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-[10px] font-bold uppercase tracking-wider ${
                              task.completed
                                ? 'text-crimson-400'
                                : index === currentStepIndex
                                  ? 'text-crimson-300'
                                  : 'text-white/30'
                            }`}
                          >
                            Step {index + 1}/{totalTasks}
                          </span>
                          {index === currentStepIndex && !task.completed && (
                            <span className="text-[10px] font-semibold uppercase tracking-wider bg-crimson-500/20 text-crimson-300 px-1.5 py-0.5 rounded-full border border-crimson-500/30">
                              Active
                            </span>
                          )}
                        </div>
                        <h3
                          className={`font-semibold text-sm truncate ${
                            task.completed ? 'text-white/60 line-through' : 'text-white'
                          }`}
                        >
                          {task.title}
                        </h3>
                        <p className="text-white/40 text-xs truncate">
                          {task.description}
                        </p>
                      </div>
                    </div>

                    <div className="w-full sm:w-auto sm:shrink-0 flex justify-start sm:justify-end">
                      {renderTaskAction(task, index)}
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* All complete banner */}
              <AnimatePresence>
                {isAllComplete && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="mt-4 sm:mt-6 p-3 sm:p-4 rounded-xl bg-crimson-500/10 border border-crimson-500/30 flex items-center gap-3"
                  >
                    <motion.span
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{ duration: 1, repeat: Infinity }}
                      className="text-xl sm:text-2xl"
                    >
                      ⚡
                    </motion.span>
                    <div>
                      <p className="font-semibold text-crimson-300 text-sm">
                        All steps complete!
                      </p>
                      <p className="text-white/50 text-xs">
                        Click GET ACCESS KEY to unlock your reward.
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </div>

        {/* Footer */}
        <footer className="mt-8 sm:mt-12 text-center">
          <p className="text-white/30 text-xs sm:text-sm">
            © 2024 Key Locker. All rights reserved.
          </p>
        </footer>
      </div>
    </div>
  );
}

export default App;