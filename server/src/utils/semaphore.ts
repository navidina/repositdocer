// A simple semaphore for limiting concurrency
export class Semaphore {
  private tasks: (() => void)[] = [];
  private count: number;

  constructor(private max: number) {
    this.count = max;
  }

  async acquire(): Promise<void> {
    if (this.count > 0) {
      this.count--;
      return;
    }

    return new Promise<void>((resolve) => {
      this.tasks.push(resolve);
    });
  }

  release(): void {
    this.count++;
    if (this.tasks.length > 0) {
      this.count--;
      const next = this.tasks.shift();
      if (next) next();
    }
  }
}
