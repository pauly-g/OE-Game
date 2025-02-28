/**
 * Debug Utilities
 * 
 * Changes:
 * - Initial setup: Error logging and debugging tools
 * - Renamed exported variable to avoid reserved keyword conflict
 * - Added dedicated debug method for detailed debugging information
 */

class GameDebugger {
  private static instance: GameDebugger;
  private logs: Array<{level: string, message: string, timestamp: Date, data?: any}> = [];
  private isEnabled: boolean = false;
  
  private constructor() {
    // Private constructor to enforce singleton
  }
  
  public static getInstance(): GameDebugger {
    if (!GameDebugger.instance) {
      GameDebugger.instance = new GameDebugger();
    }
    return GameDebugger.instance;
  }
  
  public enable(): void {
    this.isEnabled = true;
    this.info('Debug mode enabled');
    
    // Override console methods to capture logs
    const originalConsoleError = console.error;
    const originalConsoleWarn = console.warn;
    const originalConsoleLog = console.log;
    
    console.error = (...args: any[]) => {
      this.error(args[0], args.slice(1));
      originalConsoleError.apply(console, args);
    };
    
    console.warn = (...args: any[]) => {
      this.warn(args[0], args.slice(1));
      originalConsoleWarn.apply(console, args);
    };
    
    console.log = (...args: any[]) => {
      this.info(args[0], args.slice(1));
      originalConsoleLog.apply(console, args);
    };
    
    // Capture unhandled exceptions
    window.addEventListener('error', (event) => {
      this.error(`Unhandled error: ${event.message}`, {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        error: event.error
      });
    });
    
    // Capture unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.error(`Unhandled promise rejection: ${event.reason}`, {
        reason: event.reason
      });
    });
  }
  
  public disable(): void {
    this.isEnabled = false;
    this.info('Debug mode disabled');
  }
  
  public info(message: string, data?: any): void {
    if (!this.isEnabled) return;
    this.addLog('INFO', message, data);
  }
  
  public warn(message: string, data?: any): void {
    if (!this.isEnabled) return;
    this.addLog('WARN', message, data);
  }
  
  public error(message: string, data?: any): void {
    if (!this.isEnabled) return;
    this.addLog('ERROR', message, data);
  }

  public debug(message: string, data?: any): void {
    if (!this.isEnabled) return;
    this.addLog('DEBUG', message, data);
  }
  
  private addLog(level: string, message: string, data?: any): void {
    this.logs.push({
      level,
      message,
      timestamp: new Date(),
      data
    });
  }
  
  public getLogs(): Array<{level: string, message: string, timestamp: Date, data?: any}> {
    return [...this.logs];
  }
  
  public clearLogs(): void {
    this.logs = [];
  }
  
  public printLogs(): void {
    const logsJson = JSON.stringify(this.logs, null, 2);
    console.log('===== DEBUG LOGS =====');
    console.log(logsJson);
    console.log('=====================');
  }
  
  public downloadLogs(): void {
    const logsJson = JSON.stringify(this.logs, null, 2);
    const blob = new Blob([logsJson], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `game-debug-logs-${new Date().toISOString()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  public isDebugMode(): boolean {
    return this.isEnabled;
  }
}

export const gameDebugger = GameDebugger.getInstance();

// Debug key handler to download logs with Ctrl+D
document.addEventListener('keydown', (event) => {
  if (event.ctrlKey && event.key === 'd') {
    event.preventDefault();
    gameDebugger.printLogs();
    gameDebugger.downloadLogs();
  }
});
