export type InboxEvent = {
  _id: string;
  createdAt: string;
  updatedAt?: string;
  message: string;
  stack: string | null;
  url: string | null;
  method?: string | null;
  errorCode?: string | null;
  isOperational?: boolean | null;
  service?: string | null;
  occurrences?: number;
  data?: {
    source?: string;
    route?: string | null;
    url?: string | null;
    ip?: string | null;
    user_agent?: string | null;
    userId?: string | null;
    query?: Record<string, unknown>;
    params?: Record<string, unknown>;
    body?: Record<string, unknown>;
    errorName?: string;
    extra?: {
      environment?: string;
      service?: string;
      method?: string;
      errorCode?: string;
      httpStatus?: number;
      helper?: string;
      cron?: string;
      [key: string]: unknown;
    };
    [key: string]: unknown;
  } | null;
};