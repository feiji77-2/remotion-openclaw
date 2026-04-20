export interface PollingError extends Error {
  status?: number;
  code?: string | null;
  details?: unknown;
}

interface StartPollingLoopOptions<T> {
  load: () => Promise<T>;
  onData: (value: T) => void;
  onError?: (error: PollingError, failureCount: number) => boolean | void;
  shouldStop?: (value: T) => boolean;
  intervalMs?: number;
  maxIntervalMs?: number;
  maxConsecutiveErrors?: number;
}

export function startPollingLoop<T>({
  load,
  onData,
  onError,
  shouldStop,
  intervalMs = 1500,
  maxIntervalMs = 6000,
  maxConsecutiveErrors = 3,
}: StartPollingLoopOptions<T>) {
  let cancelled = false;
  let timer: number | null = null;
  let failureCount = 0;

  const clear = () => {
    if (timer !== null) {
      window.clearTimeout(timer);
      timer = null;
    }
  };

  const schedule = (delay: number) => {
    clear();
    timer = window.setTimeout(() => {
      void tick();
    }, delay);
  };

  const tick = async () => {
    if (cancelled) {
      return;
    }

    try {
      const value = await load();
      failureCount = 0;
      onData(value);
      if (shouldStop?.(value)) {
        clear();
        return;
      }
      schedule(intervalMs);
    } catch (error) {
      failureCount += 1;
      const shouldContinue = onError?.(error as PollingError, failureCount);
      if (shouldContinue === false || failureCount >= maxConsecutiveErrors) {
        clear();
        return;
      }
      schedule(Math.min(maxIntervalMs, intervalMs * 2 ** (failureCount - 1)));
    }
  };

  schedule(intervalMs);

  return () => {
    cancelled = true;
    clear();
  };
}

interface WaitForJobOptions<T> {
  load: () => Promise<T>;
  isDone: (value: T) => boolean;
  getError?: (value: T) => string | null | undefined;
  intervalMs?: number;
  timeoutMs?: number;
}

export async function waitForJob<T>({
  load,
  isDone,
  getError,
  intervalMs = 1200,
  timeoutMs = 240000,
}: WaitForJobOptions<T>) {
  const start = Date.now();

  while (Date.now() - start <= timeoutMs) {
    const value = await load();

    if (isDone(value)) {
      const errorMessage = getError?.(value);
      if (errorMessage) {
        throw new Error(errorMessage);
      }
      return value;
    }

    await new Promise((resolve) => window.setTimeout(resolve, intervalMs));
  }

  throw new Error(`任务等待超时（>${Math.round(timeoutMs / 1000)}s）`);
}
