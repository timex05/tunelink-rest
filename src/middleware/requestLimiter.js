const crypto = require("crypto");

const cooldownMiddleware = (baseWaitTimeMs = 1000, maxWaitTimeMs = 2 * 60 * 60 * 1000) => {
  // Stores last call time and failure count per user/IP
  const userState = new Map();

  const formatTime = (ms) => {
    const totalSeconds = Math.ceil(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${hours}h ${minutes}m ${seconds}s`;
  };

  return (req, res, next) => {
    const key = crypto
            .createHash("sha256")
            .update(req.ip + req.headers["user-agent"])
            .digest("hex");
    const now = Date.now();

    let state = userState.get(key) || { lastTime: 0, attempts: 0 };

    const waitTime = Math.min(baseWaitTimeMs * 2 ** state.attempts, maxWaitTimeMs);
    console.log(`RequestLimiter: User ${key} has made ${state.attempts} attempts. Wait time is ${waitTime}ms.`);

    if (now - state.lastTime < waitTime) {
      const remaining = Math.ceil((waitTime - (now - state.lastTime)) / 1000);
      return res.status(429).json({
        message: `Please wait ${formatTime(remaining)} before calling this route again.`
      });
    }

    // Reset attempt if cooldown has passed
    if (now - state.lastTime >= waitTime && state.attempts > 5) {
      state.attempts = 0;
    } else {
      state.attempts += 1;
    }

    state.lastTime = now;
    userState.set(key, state);

    next();
  };
};

module.exports = cooldownMiddleware;
