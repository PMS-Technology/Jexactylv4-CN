import { detectLogLevel } from './logLevel';
import type { LogLevel, LogLine } from './consoleTypes';

const ARCHIVE_CAPACITY = 500_000;
const ENTRY_START_RE = /^\[\d{2}:\d{2}:\d{2}\]/;
const batchTimeout = 300;
const initialBatchSize = 256;

const LogLevelCode = {
    None: 0,
    Trace: 1,
    Debug: 2,
    Info: 3,
    Warn: 4,
    Error: 5,
} as const;

type LogLevelCode = (typeof LogLevelCode)[keyof typeof LogLevelCode];

function encodeLevel(level: LogLevel | null): LogLevelCode {
    if (!level) return LogLevelCode.None;
    switch (level) {
        case 'trace':
            return LogLevelCode.Trace;
        case 'debug':
            return LogLevelCode.Debug;
        case 'info':
            return LogLevelCode.Info;
        case 'warn':
            return LogLevelCode.Warn;
        case 'error':
            return LogLevelCode.Error;
    }
}

function decodeLevel(code: LogLevelCode): LogLevel | null {
    switch (code) {
        case LogLevelCode.Trace:
            return 'trace';
        case LogLevelCode.Debug:
            return 'debug';
        case LogLevelCode.Info:
            return 'info';
        case LogLevelCode.Warn:
            return 'warn';
        case LogLevelCode.Error:
            return 'error';
        default:
            return null;
    }
}

class ColumnarRingBuffer {
    texts: (string | undefined)[];
    levels: Uint8Array;
    private head = 0;
    private _size = 0;

    constructor(readonly capacity: number) {
        this.texts = new Array(capacity);
        this.levels = new Uint8Array(capacity);
    }

    get size(): number {
        return this._size;
    }

    push(text: string, level: LogLevel | null): boolean {
        const wrapped = this._size === this.capacity;
        this.texts[this.head] = text;
        this.levels[this.head] = encodeLevel(level);
        this.head = (this.head + 1) % this.capacity;
        if (!wrapped) this._size++;
        return wrapped;
    }

    toArray(): LogLine[] {
        if (this._size === 0) return [];
        const start = this._size === this.capacity ? this.head : 0;
        const result = new Array<LogLine>(this._size);
        for (let i = 0; i < this._size; i++) {
            const physical = (start + i) % this.capacity;
            result[i] = {
                text: this.texts[physical] as string,
                level: decodeLevel(this.levels[physical] as LogLevelCode),
            };
        }
        return result;
    }

    clear(): void {
        this.texts = new Array(this.capacity);
        this.levels = new Uint8Array(this.capacity);
        this.head = 0;
        this._size = 0;
    }
}

function groupContinuations(lines: LogLine[]): LogLine[] {
    if (lines.length <= 1) return lines;

    const groups: LogLine[][] = [];
    for (const line of lines) {
        if (ENTRY_START_RE.test(line.text)) {
            groups.push([line]);
        } else if (groups.length > 0) {
            let target = groups.length - 1;
            const lastEntry = groups[target]?.[0];
            if (lastEntry && lastEntry.level !== 'error' && lastEntry.level !== 'warn') {
                if (line.level === 'error' || line.level === null) {
                    for (let i = groups.length - 2; i >= 0; i--) {
                        const head = groups[i]?.[0];
                        if (head && (head.level === 'error' || head.level === 'warn')) {
                            target = i;
                            break;
                        }
                    }
                }
            }
            groups[target]?.push(line);
        } else {
            groups.push([line]);
        }
    }

    return groups.flat();
}

export function createConsoleState() {
    const archive = new ColumnarRingBuffer(ARCHIVE_CAPACITY);
    let output: LogLine[] = [];
    const listeners = new Set<() => void>();
    let lineBuffer: LogLine[] = [];
    let batchTimer: ReturnType<typeof setTimeout> | null = null;
    let version = 0;

    const notify = () => {
        version++;
        listeners.forEach(listener => listener());
    };

    const flushBuffer = () => {
        if (lineBuffer.length === 0) return;
        const arr = output;
        const lines = groupContinuations(lineBuffer);
        let didWrap = false;

        for (const line of lines) {
            if (archive.push(line.text, line.level)) didWrap = true;
            arr.push(line);
        }

        if (didWrap) {
            const evictedCount = Math.max(0, arr.length - archive.size);
            if (evictedCount > 0) arr.splice(0, evictedCount);
        }

        lineBuffer = [];
        batchTimer = null;
        notify();
    };

    const addLines = (lines: LogLine[]) => {
        if (lines.length === 0) return;
        if (output.length === 0 && lines.length >= initialBatchSize) {
            lineBuffer = lines;
            flushBuffer();
            return;
        }
        lineBuffer.push(...lines);
        if (!batchTimer) {
            batchTimer = setTimeout(flushBuffer, batchTimeout);
        }
    };

    const addLegacyLog = (message: string) => {
        const logLines = message
            .split(/[\r\n]+/)
            .filter(line => line)
            .map(text => ({ text, level: detectLogLevel(text) }));

        let parentLevel: LogLevel | null = null;
        for (const line of logLines) {
            if (ENTRY_START_RE.test(line.text)) {
                parentLevel = line.level;
            } else if (line.level === null && parentLevel !== null) {
                line.level = parentLevel;
            }
        }

        addLines(logLines);
    };

    const clear = () => {
        archive.clear();
        output = [];
        lineBuffer = [];
        if (batchTimer) {
            clearTimeout(batchTimer);
            batchTimer = null;
        }
        notify();
    };

    return {
        getOutput: () => output,
        getVersion: () => version,
        subscribe: (listener: () => void) => {
            listeners.add(listener);
            return () => listeners.delete(listener);
        },
        addLegacyLog,
        clear,
        flush: flushBuffer,
    };
}

export type ConsoleState = ReturnType<typeof createConsoleState>;
