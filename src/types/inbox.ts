export type InboxEvent = {
  _id: string;
  createdAt: string;
  updatedAt?: string;
  message: string;
  resolved?: boolean;
  resolvedAt?: string | null;
  stack: string | null;
  url: string | null;
  method?: string | null;
  errorCode?: string | null;
  isOperational?: boolean | null;
  service?: string | null;
  occurrences?: number;
  issueNumber?: number;
  affectedIpCount?: number | null;
  affectedUrlCount?: number | null;
  multiUser?: boolean | null;
  type?: ErrorType;
  severity?: ErrorSeverity;
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
  occurrenceDetails: {
    occurrences: number;
    firstSeen: string;
    lastSeen: string;
    spanMs: number;
    frequencyPerDay: number;
    frequencyPerHour: number;
  };
};
export interface PaginationData {
  dataPerPage: number;
  offSet: number;
  currentPage: number;
}
export enum ErrorType {
  all = "all",
  caught = "caught",
  uncaught = "uncaught",
}

export enum ErrorSeverity {
  low = "low",
  medium = "medium",
  high = "high",
  critical = "critical",
}