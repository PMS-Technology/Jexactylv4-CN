export type LogLevel = 'error' | 'warn' | 'info' | 'debug' | 'trace';

export interface LogLine {
    text: string;
    level: LogLevel | null;
}

export type FilterValue = LogLevel | 'all';
