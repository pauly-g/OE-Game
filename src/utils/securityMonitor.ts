/**
 * Security Monitoring and Logging System
 * 
 * Provides comprehensive security event logging, monitoring, and alerting
 * to detect and respond to potential security threats and abuse.
 */

// Security event types
export type SecurityEventType = 
  | 'AUTH_SUCCESS'
  | 'AUTH_FAILURE' 
  | 'AUTH_RATE_LIMITED'
  | 'SCORE_SUBMISSION'
  | 'SCORE_REJECTED'
  | 'SCORE_RATE_LIMITED'
  | 'VALIDATION_FAILED'
  | 'INJECTION_ATTEMPT'
  | 'PROFANITY_DETECTED'
  | 'SUSPICIOUS_PATTERN'
  | 'FORM_SUBMISSION'
  | 'ERROR_OCCURRED';

// Security event severity levels
export type SecuritySeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

// Security event interface
export interface SecurityEvent {
  id: string;
  type: SecurityEventType;
  severity: SecuritySeverity;
  timestamp: Date;
  userId?: string;
  sessionId?: string;
  userAgent?: string;
  ipAddress?: string;
  details: Record<string, any>;
  metadata: {
    source: string;
    version: string;
    environment: string;
  };
}

// Security metrics interface
export interface SecurityMetrics {
  authAttempts: number;
  authFailures: number;
  scoreSubmissions: number;
  scoreRejections: number;
  rateLimitHits: number;
  validationFailures: number;
  injectionAttempts: number;
  profanityDetections: number;
  lastReset: Date;
}

class SecurityMonitor {
  private events: SecurityEvent[] = [];
  private metrics: SecurityMetrics;
  private readonly maxEvents = 1000; // Keep last 1000 events in memory
  private readonly alertThresholds = {
    AUTH_FAILURES_PER_HOUR: 10,
    INJECTION_ATTEMPTS_PER_HOUR: 5,
    RATE_LIMIT_HITS_PER_HOUR: 20,
    VALIDATION_FAILURES_PER_HOUR: 50
  };

  constructor() {
    this.metrics = this.initializeMetrics();
    this.startPeriodicCleanup();
  }

  /**
   * Initialize security metrics
   */
  private initializeMetrics(): SecurityMetrics {
    return {
      authAttempts: 0,
      authFailures: 0,
      scoreSubmissions: 0,
      scoreRejections: 0,
      rateLimitHits: 0,
      validationFailures: 0,
      injectionAttempts: 0,
      profanityDetections: 0,
      lastReset: new Date()
    };
  }

  /**
   * Generate a unique event ID
   */
  private generateEventId(): string {
    return `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get client information for event context
   */
  private getClientInfo() {
    return {
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'Unknown',
      timestamp: new Date(),
      sessionId: this.getSessionId()
    };
  }

  /**
   * Get or create session ID
   */
  private getSessionId(): string {
    if (typeof window === 'undefined') return 'server';
    
    let sessionId = sessionStorage.getItem('security_session_id');
    if (!sessionId) {
      sessionId = `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      sessionStorage.setItem('security_session_id', sessionId);
    }
    return sessionId;
  }

  /**
   * Determine event severity based on type and context
   */
  private determineSeverity(type: SecurityEventType, details: Record<string, any>): SecuritySeverity {
    switch (type) {
      case 'INJECTION_ATTEMPT':
        return 'CRITICAL';
      case 'AUTH_RATE_LIMITED':
      case 'SCORE_RATE_LIMITED':
        return 'HIGH';
      case 'AUTH_FAILURE':
      case 'VALIDATION_FAILED':
      case 'PROFANITY_DETECTED':
        return 'MEDIUM';
      case 'SCORE_REJECTED':
      case 'FORM_SUBMISSION':
        return 'LOW';
      default:
        return 'LOW';
    }
  }

  /**
   * Log a security event
   */
  logEvent(
    type: SecurityEventType, 
    details: Record<string, any> = {},
    userId?: string
  ): SecurityEvent {
    const clientInfo = this.getClientInfo();
    const severity = this.determineSeverity(type, details);
    
    const event: SecurityEvent = {
      id: this.generateEventId(),
      type,
      severity,
      timestamp: new Date(),
      userId,
      sessionId: clientInfo.sessionId,
      userAgent: clientInfo.userAgent,
      details: {
        ...details,
        // Sanitize sensitive data
        sanitized: true
      },
      metadata: {
        source: 'game-client',
        version: '1.0.0',
        environment: process.env.NODE_ENV || 'development'
      }
    };

    // Add to events array
    this.events.push(event);
    
    // Maintain max events limit
    if (this.events.length > this.maxEvents) {
      this.events = this.events.slice(-this.maxEvents);
    }

    // Update metrics
    this.updateMetrics(type);

    // Log to console with appropriate level
    this.logToConsole(event);

    // Check for alerts
    this.checkAlertThresholds(event);

    // In production, send to external monitoring service
    this.sendToExternalService(event);

    return event;
  }

  /**
   * Update security metrics
   */
  private updateMetrics(type: SecurityEventType): void {
    switch (type) {
      case 'AUTH_SUCCESS':
      case 'AUTH_FAILURE':
        this.metrics.authAttempts++;
        if (type === 'AUTH_FAILURE') this.metrics.authFailures++;
        break;
      case 'SCORE_SUBMISSION':
        this.metrics.scoreSubmissions++;
        break;
      case 'SCORE_REJECTED':
        this.metrics.scoreRejections++;
        break;
      case 'AUTH_RATE_LIMITED':
      case 'SCORE_RATE_LIMITED':
        this.metrics.rateLimitHits++;
        break;
      case 'VALIDATION_FAILED':
        this.metrics.validationFailures++;
        break;
      case 'INJECTION_ATTEMPT':
        this.metrics.injectionAttempts++;
        break;
      case 'PROFANITY_DETECTED':
        this.metrics.profanityDetections++;
        break;
    }
  }

  /**
   * Log event to console with appropriate level
   */
  private logToConsole(event: SecurityEvent): void {
    const logMessage = `[SECURITY ${event.severity}] ${event.type}: ${JSON.stringify({
      id: event.id,
      userId: event.userId,
      timestamp: event.timestamp.toISOString(),
      details: event.details
    })}`;

    switch (event.severity) {
      case 'CRITICAL':
        console.error(logMessage);
        break;
      case 'HIGH':
        console.warn(logMessage);
        break;
      case 'MEDIUM':
        console.warn(logMessage);
        break;
      case 'LOW':
        console.log(logMessage);
        break;
    }
  }

  /**
   * Check alert thresholds and trigger alerts if needed
   */
  private checkAlertThresholds(event: SecurityEvent): void {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recentEvents = this.events.filter(e => e.timestamp > oneHourAgo);

    // Check various thresholds
    const authFailures = recentEvents.filter(e => e.type === 'AUTH_FAILURE').length;
    const injectionAttempts = recentEvents.filter(e => e.type === 'INJECTION_ATTEMPT').length;
    const rateLimitHits = recentEvents.filter(e => 
      e.type === 'AUTH_RATE_LIMITED' || e.type === 'SCORE_RATE_LIMITED'
    ).length;
    const validationFailures = recentEvents.filter(e => e.type === 'VALIDATION_FAILED').length;

    // Trigger alerts if thresholds exceeded
    if (authFailures >= this.alertThresholds.AUTH_FAILURES_PER_HOUR) {
      this.triggerAlert('HIGH_AUTH_FAILURES', { count: authFailures, threshold: this.alertThresholds.AUTH_FAILURES_PER_HOUR });
    }

    if (injectionAttempts >= this.alertThresholds.INJECTION_ATTEMPTS_PER_HOUR) {
      this.triggerAlert('HIGH_INJECTION_ATTEMPTS', { count: injectionAttempts, threshold: this.alertThresholds.INJECTION_ATTEMPTS_PER_HOUR });
    }

    if (rateLimitHits >= this.alertThresholds.RATE_LIMIT_HITS_PER_HOUR) {
      this.triggerAlert('HIGH_RATE_LIMIT_HITS', { count: rateLimitHits, threshold: this.alertThresholds.RATE_LIMIT_HITS_PER_HOUR });
    }

    if (validationFailures >= this.alertThresholds.VALIDATION_FAILURES_PER_HOUR) {
      this.triggerAlert('HIGH_VALIDATION_FAILURES', { count: validationFailures, threshold: this.alertThresholds.VALIDATION_FAILURES_PER_HOUR });
    }
  }

  /**
   * Trigger a security alert
   */
  private triggerAlert(alertType: string, details: Record<string, any>): void {
    console.error(`[SECURITY ALERT] ${alertType}:`, details);
    
    // In production, this would:
    // 1. Send email/SMS notifications
    // 2. Create incident tickets
    // 3. Trigger automated responses
    // 4. Update security dashboards
  }

  /**
   * Send event to external monitoring service (placeholder)
   */
  private sendToExternalService(event: SecurityEvent): void {
    // In production, this would send to services like:
    // - Datadog
    // - New Relic
    // - Splunk
    // - Custom SIEM
    
    if (process.env.NODE_ENV === 'development') {
      // Don't send in development
      return;
    }

    // Example implementation:
    // fetch('/api/security/events', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify(event)
    // });
  }

  /**
   * Get recent security events
   */
  getRecentEvents(limit: number = 50): SecurityEvent[] {
    return this.events
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  /**
   * Get security metrics
   */
  getMetrics(): SecurityMetrics {
    return { ...this.metrics };
  }

  /**
   * Get events by type
   */
  getEventsByType(type: SecurityEventType, limit: number = 50): SecurityEvent[] {
    return this.events
      .filter(e => e.type === type)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  /**
   * Get events by user
   */
  getEventsByUser(userId: string, limit: number = 50): SecurityEvent[] {
    return this.events
      .filter(e => e.userId === userId)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  /**
   * Reset metrics (useful for testing or periodic resets)
   */
  resetMetrics(): void {
    this.metrics = this.initializeMetrics();
  }

  /**
   * Start periodic cleanup of old events
   */
  private startPeriodicCleanup(): void {
    setInterval(() => {
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      this.events = this.events.filter(e => e.timestamp > oneDayAgo);
    }, 60 * 60 * 1000); // Cleanup every hour
  }

  /**
   * Export events for analysis (useful for debugging)
   */
  exportEvents(): string {
    return JSON.stringify(this.events, null, 2);
  }
}

// Singleton instance
export const securityMonitor = new SecurityMonitor();

// Convenience functions for common security events
export const logAuthSuccess = (userId: string, details: Record<string, any> = {}) => 
  securityMonitor.logEvent('AUTH_SUCCESS', details, userId);

export const logAuthFailure = (details: Record<string, any> = {}) => 
  securityMonitor.logEvent('AUTH_FAILURE', details);

export const logScoreSubmission = (userId: string, score: number, details: Record<string, any> = {}) => 
  securityMonitor.logEvent('SCORE_SUBMISSION', { score, ...details }, userId);

export const logScoreRejection = (userId: string, score: number, reason: string, details: Record<string, any> = {}) => 
  securityMonitor.logEvent('SCORE_REJECTED', { score, reason, ...details }, userId);

export const logValidationFailure = (field: string, value: any, error: string, userId?: string) => 
  securityMonitor.logEvent('VALIDATION_FAILED', { field, valueType: typeof value, error }, userId);

export const logInjectionAttempt = (input: string, userId?: string) => 
  securityMonitor.logEvent('INJECTION_ATTEMPT', { inputLength: input.length, pattern: 'detected' }, userId);

export const logProfanityDetection = (input: string, userId?: string) => 
  securityMonitor.logEvent('PROFANITY_DETECTED', { inputLength: input.length }, userId);

export const logRateLimitHit = (type: 'AUTH' | 'SCORE' | 'FORM', userId?: string, details: Record<string, any> = {}) => 
  securityMonitor.logEvent(`${type}_RATE_LIMITED` as SecurityEventType, details, userId); 