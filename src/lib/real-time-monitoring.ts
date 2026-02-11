'use client';

import React from 'react';

// Real-time monitoring service
export interface RealTimeMetrics {
  activeUsers: number;
  currentPageViews: number;
  serverLoad: number;
  responseTime: number;
  errorRate: number;
  timestamp: string;
}

export interface Alert {
  id: string;
  type: 'error_rate' | 'response_time' | 'server_load' | 'user_activity';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  timestamp: string;
  resolved: boolean;
  metadata?: Record<string, any>;
}

class RealTimeMonitoringService {
  private ws: WebSocket | null = null;
  private metrics: RealTimeMetrics[] = [];
  private alerts: Alert[] = [];
  private subscribers: Set<(metrics: RealTimeMetrics) => void> = new Set();
  private alertSubscribers: Set<(alert: Alert) => void> = new Set();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private isInitialized = false;

  constructor() {
    this.initialize();
  }

  private initialize() {
    if (typeof window === 'undefined') return;

    this.isInitialized = true;
    this.connectWebSocket();
    this.startMetricsCollection();
    this.setupAlertThresholds();
  }

  private connectWebSocket() {
    if (!process.env.NEXT_PUBLIC_WEBSOCKET_URL) {
      console.warn('WebSocket URL not configured, using polling fallback');
      this.startPollingFallback();
      return;
    }

    try {
      this.ws = new WebSocket(process.env.NEXT_PUBLIC_WEBSOCKET_URL);

      this.ws.onopen = () => {
        console.log('Real-time monitoring connected');
        this.reconnectAttempts = 0;
        this.reconnectDelay = 1000;
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.handleWebSocketMessage(data);
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };

      this.ws.onclose = () => {
        console.log('Real-time monitoring disconnected');
        this.attemptReconnect();
      };

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        this.createAlert({
          type: 'error_rate',
          severity: 'medium',
          message: 'Real-time monitoring connection failed',
          metadata: { error: error.toString() }
        });
      };
    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
      this.startPollingFallback();
    }
  }

  private handleWebSocketMessage(data: any) {
    switch (data.type) {
      case 'metrics':
        this.updateMetrics(data.payload);
        break;
      case 'alert':
        this.handleAlert(data.payload);
        break;
      default:
        console.warn('Unknown WebSocket message type:', data.type);
    }
  }

  private startPollingFallback() {
    // Fallback to HTTP polling if WebSocket is not available
    setInterval(async () => {
      try {
        const response = await fetch('/api/monitoring/metrics');
        if (response.ok) {
          const metrics = await response.json();
          this.updateMetrics(metrics);
        }
      } catch (error) {
        console.error('Failed to fetch metrics:', error);
      }
    }, 30000); // Poll every 30 seconds
  }

  private startMetricsCollection() {
    // Collect client-side metrics every 10 seconds
    setInterval(() => {
      const metrics: RealTimeMetrics = {
        activeUsers: this.getActiveUsers(),
        currentPageViews: this.getCurrentPageViews(),
        serverLoad: this.getServerLoad(),
        responseTime: this.getAverageResponseTime(),
        errorRate: this.getErrorRate(),
        timestamp: new Date().toISOString()
      };

      this.updateMetrics(metrics);
    }, 10000);
  }

  private getActiveUsers(): number {
    // Estimate active users based on recent activity
    const recentActivity = localStorage.getItem('recentActivity');
    if (recentActivity) {
      const activities = JSON.parse(recentActivity);
      const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
      return activities.filter((timestamp: number) => timestamp > fiveMinutesAgo).length;
    }
    return 0;
  }

  private getCurrentPageViews(): number {
    // Get current page views from localStorage or estimate
    const pageViews = localStorage.getItem('pageViews');
    return pageViews ? parseInt(pageViews) : 0;
  }

  private getServerLoad(): number {
    // This would typically come from server metrics
    // For now, return a simulated value
    return Math.random() * 100;
  }

  private getAverageResponseTime(): number {
    // Get average response time from performance monitoring
    const responseTimes = JSON.parse(localStorage.getItem('responseTimes') || '[]');
    if (responseTimes.length === 0) return 0;
    const sum = responseTimes.reduce((acc: number, time: number) => acc + time, 0);
    return sum / responseTimes.length;
  }

  private getErrorRate(): number {
    // Calculate error rate from recent errors
    const errors = JSON.parse(localStorage.getItem('recentErrors') || '[]');
    const requests = JSON.parse(localStorage.getItem('recentRequests') || '[]');
    if (requests.length === 0) return 0;
    return (errors.length / requests.length) * 100;
  }

  private updateMetrics(metrics: RealTimeMetrics) {
    this.metrics.push(metrics);
    
    // Keep only last 100 metrics
    if (this.metrics.length > 100) {
      this.metrics = this.metrics.slice(-100);
    }

    // Notify subscribers
    this.subscribers.forEach(callback => callback(metrics));
  }

  private setupAlertThresholds() {
    // Check for alert conditions every 30 seconds
    setInterval(() => {
      this.checkAlertConditions();
    }, 30000);
  }

  private checkAlertConditions() {
    const latestMetrics = this.metrics[this.metrics.length - 1];
    if (!latestMetrics) return;

    // Check response time alert
    if (latestMetrics.responseTime > 2000) {
      this.createAlert({
        type: 'response_time',
        severity: 'high',
        message: `High response time detected: ${latestMetrics.responseTime}ms`,
        metadata: { responseTime: latestMetrics.responseTime }
      });
    }

    // Check error rate alert
    if (latestMetrics.errorRate > 5) {
      this.createAlert({
        type: 'error_rate',
        severity: 'critical',
        message: `High error rate detected: ${latestMetrics.errorRate}%`,
        metadata: { errorRate: latestMetrics.errorRate }
      });
    }

    // Check server load alert
    if (latestMetrics.serverLoad > 80) {
      this.createAlert({
        type: 'server_load',
        severity: 'medium',
        message: `High server load detected: ${latestMetrics.serverLoad}%`,
        metadata: { serverLoad: latestMetrics.serverLoad }
      });
    }

    // Check user activity alert
    if (latestMetrics.activeUsers < 10 && this.metrics.length > 10) {
      const previousMetrics = this.metrics[this.metrics.length - 10];
      if (previousMetrics && previousMetrics.activeUsers > 50) {
        this.createAlert({
          type: 'user_activity',
          severity: 'medium',
          message: `Unusual drop in user activity: ${latestMetrics.activeUsers} active users`,
          metadata: { 
            currentUsers: latestMetrics.activeUsers,
            previousUsers: previousMetrics.activeUsers
          }
        });
      }
    }
  }

  private createAlert(alertData: Omit<Alert, 'id' | 'timestamp' | 'resolved'>) {
    const alert: Alert = {
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      resolved: false,
      ...alertData
    };

    this.alerts.push(alert);
    
    // Keep only last 50 alerts
    if (this.alerts.length > 50) {
      this.alerts = this.alerts.slice(-50);
    }

    // Notify alert subscribers
    this.alertSubscribers.forEach(callback => callback(alert));

    // Send alert to monitoring service
    this.sendAlertToService(alert);
  }

  private handleAlert(alert: Alert) {
    this.alerts.push(alert);
    this.alertSubscribers.forEach(callback => callback(alert));
  }

  private sendAlertToService(alert: Alert) {
    if (process.env.NEXT_PUBLIC_ALERT_WEBHOOK) {
      fetch(process.env.NEXT_PUBLIC_ALERT_WEBHOOK, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(alert)
      }).catch(() => {
        // Silently fail webhook requests
      });
    }
  }

  private attemptReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
      return;
    }

    setTimeout(() => {
      this.reconnectAttempts++;
      this.reconnectDelay = Math.min(this.reconnectDelay * 2, 30000); // Exponential backoff, max 30s
      console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
      this.connectWebSocket();
    }, this.reconnectDelay);
  }

  // Public API
  subscribe(callback: (metrics: RealTimeMetrics) => void) {
    this.subscribers.add(callback);
    return () => this.subscribers.delete(callback);
  }

  subscribeToAlerts(callback: (alert: Alert) => void) {
    this.alertSubscribers.add(callback);
    return () => this.alertSubscribers.delete(callback);
  }

  getMetrics(): RealTimeMetrics[] {
    return [...this.metrics];
  }

  getLatestMetrics(): RealTimeMetrics | null {
    return this.metrics.length > 0 ? this.metrics[this.metrics.length - 1] : null;
  }

  getAlerts(): Alert[] {
    return [...this.alerts];
  }

  getUnresolvedAlerts(): Alert[] {
    return this.alerts.filter(alert => !alert.resolved);
  }

  resolveAlert(alertId: string) {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.resolved = true;
      this.sendAlertToService(alert);
    }
  }

  clearAlerts() {
    this.alerts = [];
  }

  getMetricsSummary() {
    if (this.metrics.length === 0) return null;

    const latest = this.metrics[this.metrics.length - 1];
    const previous = this.metrics.length > 1 ? this.metrics[this.metrics.length - 2] : latest;

    return {
      current: latest,
      previous,
      trends: {
        activeUsers: latest.activeUsers - previous.activeUsers,
        responseTime: latest.responseTime - previous.responseTime,
        errorRate: latest.errorRate - previous.errorRate,
        serverLoad: latest.serverLoad - previous.serverLoad
      }
    };
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.subscribers.clear();
    this.alertSubscribers.clear();
  }
}

// Singleton instance
export const realTimeMonitor = new RealTimeMonitoringService();

// React hook for real-time monitoring
export function useRealTimeMonitoring() {
  const [metrics, setMetrics] = React.useState<RealTimeMetrics[]>([]);
  const [alerts, setAlerts] = React.useState<Alert[]>([]);
  const [isConnected, setIsConnected] = React.useState(false);

  React.useEffect(() => {
    // Subscribe to metrics updates
    const unsubscribeMetrics = realTimeMonitor.subscribe((newMetrics) => {
      setMetrics(prev => [...prev.slice(-99), newMetrics]);
    });

    // Subscribe to alerts
    const unsubscribeAlerts = realTimeMonitor.subscribeToAlerts((alert) => {
      setAlerts(prev => [...prev, alert]);
    });

    // Get initial data
    setMetrics(realTimeMonitor.getMetrics());
    setAlerts(realTimeMonitor.getAlerts());

    return () => {
      unsubscribeMetrics();
      unsubscribeAlerts();
    };
  }, []);

  return {
    metrics,
    alerts,
    unresolvedAlerts: alerts.filter(alert => !alert.resolved),
    latestMetrics: metrics.length > 0 ? metrics[metrics.length - 1] : null,
    metricsSummary: realTimeMonitor.getMetricsSummary(),
    resolveAlert: realTimeMonitor.resolveAlert.bind(realTimeMonitor),
    clearAlerts: realTimeMonitor.clearAlerts.bind(realTimeMonitor)
  };
}
