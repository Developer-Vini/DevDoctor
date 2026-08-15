import ora from 'ora';

export interface Spinner {
  start(text: string): void;
  stop(): Promise<void>;
}

export function createSpinner(enabled: boolean): Spinner {
  if (!enabled) {
    return { start() {}, stop: async () => {} };
  }

  let instance: ReturnType<typeof ora> | null = null;
  return {
    start(text) {
      instance = ora({ text, isEnabled: true }).start();
    },
    async stop() {
      if (instance !== null) {
        await instance.stop();
        instance = null;
      }
    },
  };
}
