import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

type TaskType = 'simple' | 'timer' | 'youtube';

interface Task {
  id: number;
  title: string;
  description: string;
  icon: string;
  completed: boolean;
  type: TaskType;
  requiredSeconds?: number;
  url?: string;
}

const STORAGE_KEY = 'key-locker-progress';

const initialTasks: Task[] = [
  {
    id: 1,
    title: 'Stay on Page',
    description: 'Stay on this page for 60 seconds',
    icon: '⏱️',
    completed: false,
    type: 'timer',
    requiredSeconds: 60,
  },
  {
    id: 2,
    title: 'Explore the Vault',
    description: 'Stay on the vault page for 60 seconds',
    icon: '🏦',
    completed: false,
    type: 'timer',
    requiredSeconds: 60,
  },
  {
    id: 3,
    title: 'Watch the Showcase',
    description: 'Stay on the showcase page for 60 seconds',
    icon: '🎬',
    completed: false,
    type: 'timer',
    requiredSeconds: 60,
  },
  {
    id: 4,
    title: 'Review the Features',
    description: 'Stay on the features page for 60 seconds',
    icon: '✨',
    completed: false,
    type: 'timer',
    requiredSeconds: 60,
  },
  {
    id: 5,
    title: 'Subscribe to YouTube',
    description: 'Subscribe to our YouTube channel',
    icon: '▶️',
    completed: false,
    type: 'youtube',
    url: 'https://www.youtube.com/@SilasRoam',
  },
];

interface TimerProgress {
  [taskId: number]: number;
}

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
  const [unlocked, setUnlocked] = useState(false);
  const [showReward, setShowReward] = useState(false);
  const [shake, setShake] = useState(false);
  const [timerProgress, setTimerProgress] = useState<TimerProgress>(() => {
    const saved = loadSavedState();
    return saved?.timerProgress || {};
  });
  const [isPageActive, setIsPageActive] = useState(true);
  const [youtubeVerified, setYoutubeVerified] = useState<Record<number, boolean>>(() => {
    const saved = loadSavedState();
    return saved?.youtubeVerified || {};
  });
  const [checkingYoutube, setCheckingYoutube] = useState<number | null>(null);

  const timerRef = useRef<number | null>(null);
  const lastTickRef = useRef<number>(Date.now());

  const completedCount = tasks.filter((t) => t.completed).length;
  const totalTasks = tasks.length;
  const isAllComplete = completedCount === totalTasks;

  // Save progress to localStorage
  useEffect(() => {
    const state = { tasks, timerProgress, youtubeVerified };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      console.error('Failed to save state:', e);
    }
  }, [tasks, timerProgress, youtubeVerified]);

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

  // Timer logic for time-based tasks
  useEffect(() => {
    const activeTimerTasks = tasks.filter(
      (t) => t.type === 'timer' && !t.completed
    );

    if (activeTimerTasks.length === 0 || !isPageActive) {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      return;
    }

    lastTickRef.current = Date.now();

    timerRef.current = window.setInterval(() => {
      const now = Date.now();
      const delta = (now - lastTickRef.current) / 1000;
      lastTickRef.current = now;

      setTimerProgress((prev) => {
        const newProgress = { ...prev };
        let changed = false;

        activeTimerTasks.forEach((task) => {
          const current = newProgress[task.id] || 0;
          const next = Math.min(current + delta, task.requiredSeconds || 60);
          if (next !== current) {
            newProgress[task.id] = next;
            changed = true;
          }
        });

        if (!changed) return prev;
        return newProgress;
      });
    }, 250);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [tasks, isPageActive]);

  // Check if any timer tasks are complete
  useEffect(() => {
    const timerTasks = tasks.filter((t) => t.type === 'timer' && !t.completed);
    if (timerTasks.length === 0) return;

    const newlyCompleted = timerTasks.filter(
      (t) => (timerProgress[t.id] || 0) >= (t.requiredSeconds || 60)
    );

    if (newlyCompleted.length > 0) {
      setTasks((prev) =>
        prev.map((task) =>
          newlyCompleted.some((nc) => nc.id === task.id)
            ? { ...task, completed: true }
            : task
        )
      );
    }
  }, [timerProgress, tasks]);

  const completeTask = useCallback(
    (id: number) => {
      if (unlocked) return;
      setTasks((prev) =>
        prev.map((task) =>
          task.id === id && !task.completed ? { ...task, completed: true } : task
        )
      );
    },
    [unlocked]
  );

  const resetAll = useCallback(() => {
    setTasks(initialTasks.map((t) => ({ ...t, completed: false })));
    setTimerProgress({});
    setYoutubeVerified({});
    setUnlocked(false);
    setShowReward(false);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (e) {
      console.error('Failed to clear storage:', e);
    }
  }, []);

  useEffect(() => {
    if (isAllComplete && !unlocked) {
      const timer = setTimeout(() => {
        setUnlocked(true);
        setShowReward(true);
      }, 600);
      return () => clearTimeout(timer);
    }
  }, [isAllComplete, unlocked]);

  const handleBoxClick = () => {
    if (!isAllComplete) {
      setShake(true);
      setTimeout(() => setShake(false), 500);
    }
  };

  const handleYoutubeCheck = (task: Task) => {
    if (task.completed || unlocked) return;
    setCheckingYoutube(task.id);

    // Simulate verification check
    setTimeout(() => {
      setYoutubeVerified((prev) => ({ ...prev, [task.id]: true }));
      setCheckingYoutube(null);
    }, 1500);
  };

  const formatTime = (seconds: number) => {
    const remaining = Math.max(0, Math.ceil(seconds));
    const mins = Math.floor(remaining / 60);
    const secs = remaining % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const renderTaskAction = (task: Task) => {
    if (task.completed) {
      return (
        <span className="shrink-0 px-4 py-2 rounded-lg text-sm font-semibold bg-crimson-500/10 text-crimson-400 border border-crimson-500/20 cursor-default">
          Done
        </span>
      );
    }

    if (task.type === 'timer') {
      const progress = timerProgress[task.id] || 0;
      const required = task.requiredSeconds || 60;
      const percent = Math.min(100, (progress / required) * 100);
      const isActive = isPageActive && !unlocked;

      return (
        <div className="shrink-0 flex flex-col items-end gap-1.5">
          <div className="flex items-center gap-2">
            <span
              className={`text-xs font-mono font-semibold ${
                isActive ? 'text-crimson-400' : 'text-white/40'
              }`}
            >
              {formatTime(required - progress)}
            </span>
            {isActive ? (
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-crimson-500 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-crimson-500" />
              </span>
            ) : (
              <span className="w-2 h-2 rounded-full bg-white/20" />
            )}
          </div>
          <div className="w-24 h-1.5 rounded-full bg-void-600 overflow-hidden">
            <motion.div
              className="h-full rounded-full bg-crimson-gradient"
              animate={{ width: `${percent}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
          {!isActive && (
            <span className="text-[10px] text-white/40 uppercase tracking-wider">
              Paused
            </span>
          )}
        </div>
      );
    }

    if (task.type === 'youtube') {
      const verified = youtubeVerified[task.id];
      return (
        <div className="shrink-0 flex flex-col items-end gap-2">
          <a
            href={task.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white bg-[#FF0000] hover:bg-[#CC0000] transition-all duration-300 shadow-[0_0_20px_-4px_rgba(255,0,0,0.5)] hover:shadow-[0_0_30px_-4px_rgba(255,0,0,0.8)]"
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

    return (
      <button
        onClick={() => completeTask(task.id)}
        disabled={unlocked}
        className="shrink-0 px-4 py-2 rounded-lg text-sm font-semibold btn-crimson !px-4 !py-2 !text-sm"
      >
        Complete
      </button>
    );
  };

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Background decorative elements */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-crimson-radial opacity-60" />
        <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-crimson-radial opacity-40" />
        <div className="absolute top-1/3 left-0 w-[300px] h-[300px] bg-crimson-radial opacity-30" />
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

      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        {/* Header */}
        <header className="flex items-center justify-between mb-8 sm:mb-12">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            className="flex items-center gap-3"
          >
            <div className="w-10 h-10 rounded-xl bg-crimson-gradient flex items-center justify-center shadow-crimson-glow">
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
            <div>
              <h1 className="font-display font-bold text-xl sm:text-2xl tracking-tight">
                Key <span className="text-gradient-crimson">Locker</span>
              </h1>
              <p className="text-xs text-white/40 -mt-0.5">Secure Vault System</p>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="glass-card px-4 py-2 flex items-center gap-2"
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
            <span className="text-sm font-medium text-white/80">
              {isPageActive ? 'System Online' : 'System Paused'}
            </span>
          </motion.div>
        </header>

        {/* Main content */}
        <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-start">
          {/* Left: Reward Box */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="flex flex-col items-center"
          >
            <div className="relative w-full max-w-md">
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
                  className="glass-card p-8 sm:p-10 cursor-pointer select-none"
                  onClick={handleBoxClick}
                >
                  <div className="flex flex-col items-center gap-6">
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
                        className={`w-28 h-28 sm:w-36 sm:h-36 rounded-2xl flex items-center justify-center transition-all duration-500 ${
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
                            className="w-16 h-16 sm:w-20 sm:h-20 text-white"
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
                            className="w-16 h-16 sm:w-20 sm:h-20 text-crimson-400"
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
                          className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full bg-crimson-600 flex items-center justify-center shadow-crimson-glow-sm"
                        >
                          <svg
                            className="w-4 h-4 text-white"
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
                    <div className="text-center">
                      <h2 className="font-display font-bold text-2xl sm:text-3xl mb-2">
                        {unlocked ? (
                          <span className="shimmer-text">Reward Unlocked!</span>
                        ) : (
                          <span className="text-white/90">Locked Reward</span>
                        )}
                      </h2>
                      <p className="text-white/50 text-sm sm:text-base">
                        {unlocked
                          ? 'Congratulations! Your reward is ready.'
                          : `Complete all ${totalTasks} tasks to unlock`}
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
                    <div className="glass-card p-8 text-center max-w-sm w-full border-crimson-500/30 shadow-crimson-glow-lg">
                      <motion.div
                        animate={{ rotate: [0, 10, -10, 0] }}
                        transition={{ duration: 2, repeat: Infinity }}
                        className="text-6xl mb-4"
                      >
                        🎁
                      </motion.div>
                      <h3 className="font-display font-bold text-2xl mb-2 text-gradient-crimson">
                        Reward Claimed!
                      </h3>
                      <p className="text-white/60 text-sm mb-6">
                        You've unlocked a special bonus. Check your inventory to claim it.
                      </p>
                      <button onClick={resetAll} className="btn-ghost w-full">
                        Reset & Play Again
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
            <div className="glass-card p-6 sm:p-8">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="font-display font-bold text-xl sm:text-2xl">
                    Mission <span className="text-gradient-crimson">Tasks</span>
                  </h2>
                  <p className="text-white/40 text-sm mt-1">
                    Complete all tasks to unlock the reward
                  </p>
                </div>
                <div className="glass-card px-4 py-2 text-center">
                  <div className="text-2xl font-bold text-crimson-400">
                    {completedCount}
                    <span className="text-white/30 text-lg">/{totalTasks}</span>
                  </div>
                  <div className="text-[10px] uppercase tracking-wider text-white/40">
                    Complete
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                {tasks.map((task, index) => (
                  <motion.div
                    key={task.id}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.4, delay: 0.4 + index * 0.1 }}
                    className={`glass-card glass-card-hover p-4 flex items-center gap-4 ${
                      task.completed ? 'border-crimson-500/30' : ''
                    }`}
                  >
                    <div
                      className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl shrink-0 transition-all duration-300 ${
                        task.completed
                          ? 'bg-crimson-gradient shadow-crimson-glow-sm'
                          : 'bg-void-700 border border-white/5'
                      }`}
                    >
                      {task.completed ? (
                        <motion.svg
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ type: 'spring', stiffness: 300, damping: 15 }}
                          className="w-6 h-6 text-white"
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
                        <span className="opacity-60">{task.icon}</span>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <h3
                        className={`font-semibold text-sm sm:text-base truncate ${
                          task.completed ? 'text-white/60 line-through' : 'text-white'
                        }`}
                      >
                        {task.title}
                      </h3>
                      <p className="text-white/40 text-xs sm:text-sm truncate">
                        {task.description}
                      </p>
                    </div>

                    {renderTaskAction(task)}
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
                    className="mt-6 p-4 rounded-xl bg-crimson-500/10 border border-crimson-500/30 flex items-center gap-3"
                  >
                    <motion.span
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{ duration: 1, repeat: Infinity }}
                      className="text-2xl"
                    >
                      ⚡
                    </motion.span>
                    <div>
                      <p className="font-semibold text-crimson-300 text-sm">
                        All tasks complete!
                      </p>
                      <p className="text-white/50 text-xs">
                        Your reward is being unlocked...
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </div>

        {/* Footer */}
        <footer className="mt-12 text-center">
          <p className="text-white/30 text-sm">
            © 2024 Key Locker. All rights reserved.
          </p>
        </footer>
      </div>
    </div>
  );
}

export default App;