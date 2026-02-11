// ConnectivityManager — Multi-signal online/offline detection
// Uses navigator.onLine + event listeners + periodic heartbeat

type ConnectivityCallback = (isOnline: boolean) => void;

class ConnectivityManagerClass {
  private static instance: ConnectivityManagerClass;
  private listeners: Set<ConnectivityCallback> = new Set();
  private _isOnline: boolean = typeof navigator !== 'undefined' ? navigator.onLine : true;
  private heartbeatInterval: ReturnType<typeof setInterval> | null = null;
  private readonly HEARTBEAT_INTERVAL = 30000; // 30 seconds
  private readonly HEARTBEAT_TIMEOUT = 5000; // 5 seconds

  private constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', this.handleOnline);
      window.addEventListener('offline', this.handleOffline);
      this.startHeartbeat();
    }
  }

  static getInstance(): ConnectivityManagerClass {
    if (!ConnectivityManagerClass.instance) {
      ConnectivityManagerClass.instance = new ConnectivityManagerClass();
    }
    return ConnectivityManagerClass.instance;
  }

  get isOnline(): boolean {
    return this._isOnline;
  }

  subscribe(callback: ConnectivityCallback): void {
    this.listeners.add(callback);
  }

  unsubscribe(callback: ConnectivityCallback): void {
    this.listeners.delete(callback);
  }

  private handleOnline = () => {
    this.setOnline(true);
  };

  private handleOffline = () => {
    this.setOnline(false);
  };

  private setOnline(value: boolean) {
    if (this._isOnline !== value) {
      this._isOnline = value;
      this.notifyListeners();
    }
  }

  private notifyListeners() {
    this.listeners.forEach((cb) => {
      try {
        cb(this._isOnline);
      } catch {
        // ignore callback errors
      }
    });
  }

  private startHeartbeat() {
    this.heartbeatInterval = setInterval(async () => {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.HEARTBEAT_TIMEOUT);

        // Ping a lightweight endpoint to verify real connectivity
        const response = await fetch('/manifest.json', {
          method: 'HEAD',
          signal: controller.signal,
          cache: 'no-store',
        });
        clearTimeout(timeoutId);

        if (response.ok && !this._isOnline) {
          this.setOnline(true);
        }
      } catch {
        // Only mark offline if navigator also says offline
        // This prevents false negatives from CORS/firewall issues
        if (!navigator.onLine) {
          this.setOnline(false);
        }
      }
    }, this.HEARTBEAT_INTERVAL);
  }

  destroy() {
    if (typeof window !== 'undefined') {
      window.removeEventListener('online', this.handleOnline);
      window.removeEventListener('offline', this.handleOffline);
    }
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
    this.listeners.clear();
  }
}

export const connectivityManager = ConnectivityManagerClass.getInstance();
