export type UseStore<T> = [
  () => T, // Get the state
  (updater: (state: T) => T) => void // Update the state
];

export default class Store<T> {
  private state: T;
  private listeners: ((newState: T) => void)[];

  constructor(initialState: T) {
    this.state = initialState;
    this.listeners = [];
  }

  getState(): T {
    return this.state;
  }

  setState(updater: (prevState: T) => T): void {
    const newState = updater(this.state);
    this.state = newState;
    this.notifyListeners();
  }

  subscribe(listener: (newState: T) => void): () => void {
    this.listeners.push(listener);
    return () => {
      // Return an unsubscribe function
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notifyListeners(): void {
    for (const listener of this.listeners) {
      listener(this.state);
    }
  }
}
