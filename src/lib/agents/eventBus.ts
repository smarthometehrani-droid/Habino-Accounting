export type AgentName = 
  | 'DiagnosticAgent' 
  | 'IdeaAgent' 
  | 'RoadmapAgent' 
  | 'NeedsEvaluatorAgent' 
  | 'CoderAgent' 
  | 'SystemOrchestrator';

export type AgentEventSeverity = 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL' | 'SUCCESS';

export interface AgentEventMessage {
  id: string;
  sourceAgent: AgentName;
  targetAgent?: AgentName | 'BROADCAST';
  eventType: string;
  severity: AgentEventSeverity;
  payload: any;
  timestamp: string;
  tenantId?: string;
  correlationId?: string;
}

type EventListener = (msg: AgentEventMessage) => void;

class AgentEventBus {
  private listeners: Map<string, Set<EventListener>> = new Map();
  private messageHistory: AgentEventMessage[] = [];
  private maxHistorySize: number = 200;

  constructor() {
    this.listeners.set('BROADCAST', new Set());
  }

  public publish(
    sourceAgent: AgentName,
    eventType: string,
    payload: any,
    targetAgent: AgentName | 'BROADCAST' = 'BROADCAST',
    severity: AgentEventSeverity = 'INFO',
    tenantId: string = 'tenant-main',
    correlationId?: string
  ): AgentEventMessage {
    const msg: AgentEventMessage = {
      id: `evt-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
      sourceAgent,
      targetAgent,
      eventType,
      severity,
      payload,
      timestamp: new Date().toISOString(),
      tenantId,
      correlationId: correlationId || `cor-${Date.now()}`
    };

    // Store in history
    this.messageHistory.unshift(msg);
    if (this.messageHistory.length > this.maxHistorySize) {
      this.messageHistory.pop();
    }

    // Deliver to targeted listeners
    if (targetAgent && targetAgent !== 'BROADCAST') {
      const targeted = this.listeners.get(targetAgent);
      if (targeted) {
        targeted.forEach(listener => {
          try {
            listener(msg);
          } catch (e) {
            console.error(`[EventBus] Error delivering to ${targetAgent}:`, e);
          }
        });
      }
    }

    // Deliver to broadcast listeners
    const broadcastListeners = this.listeners.get('BROADCAST');
    if (broadcastListeners) {
      broadcastListeners.forEach(listener => {
        try {
          listener(msg);
        } catch (e) {
          console.error('[EventBus] Error delivering broadcast:', e);
        }
      });
    }

    return msg;
  }

  public subscribe(channel: AgentName | 'BROADCAST', listener: EventListener): () => void {
    if (!this.listeners.has(channel)) {
      this.listeners.set(channel, new Set());
    }
    const channelSet = this.listeners.get(channel)!;
    channelSet.add(listener);

    return () => {
      channelSet.delete(listener);
    };
  }

  public getHistory(count: number = 50, tenantId?: string): AgentEventMessage[] {
    if (tenantId) {
      return this.messageHistory.filter(m => !m.tenantId || m.tenantId === tenantId).slice(0, count);
    }
    return this.messageHistory.slice(0, count);
  }

  public clearHistory(): void {
    this.messageHistory = [];
  }
}

export const agentEventBus = new AgentEventBus();
