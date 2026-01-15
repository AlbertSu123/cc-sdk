import { Session, createSession, resumeSession } from "../../src/index.ts";
import type { SessionOptions } from "../../src/types.ts";
import { config } from "../config.ts";

interface ManagedSession {
  session: Session;
  cliSessionId: string | null;
  options: SessionOptions;
  createdAt: Date;
  lastActivity: Date;
  status: "idle" | "busy";
}

class SessionManager {
  private sessions = new Map<string, ManagedSession>();
  private cleanupInterval: ReturnType<typeof setInterval> | null = null;

  constructor() {
    this.startCleanup();
  }

  create(options: SessionOptions = {}): string {
    const internalId = crypto.randomUUID();
    const session = createSession(options);

    this.sessions.set(internalId, {
      session,
      cliSessionId: null,
      options,
      createdAt: new Date(),
      lastActivity: new Date(),
      status: "idle",
    });

    return internalId;
  }

  resume(cliSessionId: string, options: SessionOptions = {}): string {
    const internalId = crypto.randomUUID();
    const session = resumeSession(cliSessionId, options);

    this.sessions.set(internalId, {
      session,
      cliSessionId,
      options,
      createdAt: new Date(),
      lastActivity: new Date(),
      status: "idle",
    });

    return internalId;
  }

  get(internalId: string): ManagedSession | undefined {
    const managed = this.sessions.get(internalId);
    if (managed) {
      managed.lastActivity = new Date();
    }
    return managed;
  }

  updateCliSessionId(internalId: string, cliSessionId: string): void {
    const managed = this.sessions.get(internalId);
    if (managed) {
      managed.cliSessionId = cliSessionId;
    }
  }

  setStatus(internalId: string, status: "idle" | "busy"): void {
    const managed = this.sessions.get(internalId);
    if (managed) {
      managed.status = status;
    }
  }

  list(): Array<{
    id: string;
    cliSessionId: string | null;
    status: string;
    createdAt: string;
    lastActivity: string;
  }> {
    return Array.from(this.sessions.entries()).map(([id, m]) => ({
      id,
      cliSessionId: m.cliSessionId,
      status: m.status,
      createdAt: m.createdAt.toISOString(),
      lastActivity: m.lastActivity.toISOString(),
    }));
  }

  close(internalId: string): boolean {
    const managed = this.sessions.get(internalId);
    if (managed) {
      managed.session.close();
      this.sessions.delete(internalId);
      return true;
    }
    return false;
  }

  private startCleanup(): void {
    this.cleanupInterval = setInterval(() => {
      const now = Date.now();
      for (const [id, managed] of this.sessions) {
        if (
          managed.status === "idle" &&
          now - managed.lastActivity.getTime() > config.SESSION_TIMEOUT_MS
        ) {
          console.log(`[SessionManager] Cleaning up stale session: ${id}`);
          managed.session.close();
          this.sessions.delete(id);
        }
      }
    }, 60 * 1000); // Check every minute
  }

  shutdown(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    for (const [, managed] of this.sessions) {
      managed.session.close();
    }
    this.sessions.clear();
  }
}

export const sessionManager = new SessionManager();
