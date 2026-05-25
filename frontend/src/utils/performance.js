// 防抖函数
export function debounce(fn, delay = 300) {
  let timer = null;
  return function(...args) {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      fn.apply(this, args);
    }, delay);
  };
}

// 节流函数
export function throttle(fn, limit = 300) {
  let inThrottle = false;
  return function(...args) {
    if (!inThrottle) {
      fn.apply(this, args);
      inThrottle = true;
      setTimeout(() => {
        inThrottle = false;
      }, limit);
    }
  };
}

// 请求缓存
const requestCache = new Map();

export function cachedRequest(fn, ttl = 60000) {
  return async function(...args) {
    const key = JSON.stringify(args);
    const cached = requestCache.get(key);
    
    if (cached && Date.now() - cached.timestamp < ttl) {
      return cached.data;
    }
    
    const data = await fn.apply(this, args);
    requestCache.set(key, {
      data,
      timestamp: Date.now()
    });
    
    return data;
  };
}

// 清除请求缓存
export function clearRequestCache() {
  requestCache.clear();
}
