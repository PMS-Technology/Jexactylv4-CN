import type { Terminal } from 'xterm';
import { Terminal as XTerm } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import { SearchAddon } from 'xterm-addon-search';
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { ChevronDownIcon, TerminalSquareIcon } from './icons';
import 'xterm/css/xterm.css';

const FROG = [
    '\x1B[32m     _    _ \x1B[37m',
    '\x1B[32m    (o)--(o)      \x1B[37m',
    '\x1B[32m   /.______.\\\x1B[37m',
    '\x1B[32m   \\________/     \x1B[37m',
    '\x1B[32m  ./        \\.    \x1B[37m',
    '\x1B[32m ( .        , )\x1B[37m',
    '\x1B[32m  \\ \\_\\\\ //_/ /\x1B[37m',
    '\x1B[32m   ~~  ~~  ~~\x1B[37m',
];

const EMPTY_STATE_BUBBLES: Record<string, string[]> = {
    server: [
        '   __________________________________________________',
        ' /  Welcome to your \x1B[32mModrinth Server\x1B[37m!                  \\',
        '|   Press the green start button to start your server! |',
        ' \\____________________________________________________/',
    ],
};

const theme = {
    background: '#1d1f23',
    foreground: '#b0bac5',
    cursor: '#b0bac5',
    cursorAccent: '#1d1f23',
    selectionBackground: 'rgba(128, 128, 128, 0.3)',
    black: '#1d1f23',
    red: '#ff496e',
    green: '#1bd96a',
    yellow: '#ffa347',
    blue: '#4f9cff',
    magenta: '#c78aff',
    cyan: '#96a2b0',
    white: '#b0bac5',
    brightBlack: '#42444a',
    brightRed: '#ff496e',
    brightGreen: '#1bd96a',
    brightYellow: '#ffa347',
    brightBlue: '#4f9cff',
    brightMagenta: '#c78aff',
    brightCyan: '#96a2b0',
    brightWhite: '#ffffff',
};

export interface BaseTerminalHandle {
    terminal: Terminal | null;
    fit: () => void;
    reset: () => void;
    writeEmptyState: () => void;
    clearEmptyState: () => void;
    showingEmptyState: boolean;
}

interface Props {
    showInput?: boolean;
    disableInput?: boolean;
    disableInputTooltip?: string;
    disabledInputPlaceholder?: string;
    fullscreen?: boolean;
    emptyStateType?: 'server';
    loading?: boolean;
    onCommand: (command: string) => void;
    onReady: (terminal: Terminal) => void;
}

const BaseTerminal = forwardRef<BaseTerminalHandle, Props>(
    (
        {
            showInput,
            disableInput,
            disabledInputPlaceholder = 'Server is not running',
            fullscreen,
            emptyStateType,
            loading,
            onCommand,
            onReady,
        },
        ref,
    ) => {
        const containerRef = useRef<HTMLDivElement>(null);
        const termRef = useRef<Terminal | null>(null);
        const fitRef = useRef<FitAddon | null>(null);
        const [command, setCommand] = useState('');
        const [isAtBottom, setIsAtBottom] = useState(true);
        const [showingEmptyState, setShowingEmptyState] = useState(false);
        const onReadyRef = useRef(onReady);
        onReadyRef.current = onReady;

        const fit = () => {
            const addon = fitRef.current;
            const term = termRef.current;
            if (!addon || !term) return;
            const dims = addon.proposeDimensions();
            if (dims) term.resize(dims.cols, dims.rows);
        };

        const scrollToBottom = () => {
            termRef.current?.scrollToBottom();
            setIsAtBottom(true);
            let calls = 0;
            const interval = window.setInterval(() => {
                termRef.current?.scrollToBottom();
                if (++calls >= 10) window.clearInterval(interval);
            }, 25);
        };

        useImperativeHandle(ref, () => ({
            get terminal() {
                return termRef.current;
            },
            fit,
            reset: () => {
                termRef.current?.reset();
                setShowingEmptyState(false);
            },
            writeEmptyState: () => {
                const term = termRef.current;
                if (!term || !emptyStateType) return;
                term.reset();
                const bubble = EMPTY_STATE_BUBBLES[emptyStateType];
                if (bubble) term.write([...bubble, ...FROG].join('\r\n'));
                setShowingEmptyState(true);
            },
            clearEmptyState: () => {
                if (!showingEmptyState) return;
                termRef.current?.reset();
                setShowingEmptyState(false);
            },
            get showingEmptyState() {
                return showingEmptyState;
            },
        }));

        useEffect(() => {
            const container = containerRef.current;
            if (!container || termRef.current) return;
            const term = new XTerm({
                disableStdin: true,
                scrollback: 100000,
                convertEol: true,
                fontFamily: 'monospace',
                fontSize: 14,
                lineHeight: 1.5,
                allowProposedApi: true,
                theme,
            });
            const fitAddon = new FitAddon();
            const searchAddon = new SearchAddon();
            term.loadAddon(fitAddon);
            term.loadAddon(searchAddon);
            term.open(container);
            term.write('\x1b[?25l');
            const dims = fitAddon.proposeDimensions();
            if (dims) term.resize(dims.cols, dims.rows);
            term.attachCustomKeyEventHandler(event => {
                if (event.type !== 'keydown') return true;
                const mod = event.ctrlKey || event.metaKey;
                if (!mod) return true;
                if (event.key.toLowerCase() === 'a') {
                    event.preventDefault();
                    term.selectAll();
                    return false;
                }
                if (event.key.toLowerCase() === 'c') return false;
                return true;
            });
            term.onScroll(() => {
                const buffer = term.buffer.active;
                setIsAtBottom(buffer.baseY - buffer.viewportY <= 2);
            });
            term.onWriteParsed(() => {
                const buffer = term.buffer.active;
                if (buffer.baseY - buffer.viewportY <= 2) term.scrollToBottom();
            });
            termRef.current = term;
            fitRef.current = fitAddon;
            onReadyRef.current(term);

            const observer = new ResizeObserver(() => {
                const next = fitAddon.proposeDimensions();
                if (next) term.resize(next.cols, next.rows);
            });
            observer.observe(container);

            const onPointerDown = (event: PointerEvent) => {
                if (!term.hasSelection()) return;
                if (event.target instanceof Node && container.contains(event.target)) return;
                term.clearSelection();
            };
            const onKeyDown = (event: KeyboardEvent) => {
                if (!event.metaKey || event.key.toLowerCase() !== 'a') return;
                const active = document.activeElement;
                if (!(event.target instanceof Node && container.contains(event.target)) && !(active && container.contains(active))) {
                    return;
                }
                event.preventDefault();
                term.selectAll();
            };
            document.addEventListener('pointerdown', onPointerDown);
            document.addEventListener('keydown', onKeyDown, true);

            return () => {
                observer.disconnect();
                document.removeEventListener('pointerdown', onPointerDown);
                document.removeEventListener('keydown', onKeyDown, true);
                term.dispose();
                termRef.current = null;
            };
        }, []);

        useEffect(() => {
            const timeout = window.setTimeout(fit, 50);
            return () => window.clearTimeout(timeout);
        }, [fullscreen]);

        const submit = () => {
            if (disableInput) return;
            const cmd = command.trim();
            if (!cmd) return;
            onCommand(cmd);
            setCommand('');
        };

        return (
            <div className={'mc-terminal'} style={fullscreen ? { minHeight: 0, height: '100%' } : undefined}>
                <div className={'relative min-h-0 flex-1 overflow-hidden pb-2 pt-1'}>
                    <div ref={containerRef} className={'h-full w-full'} />
                    {loading && <div className={'mc-loading'} aria-hidden={'true'} />}
                    {!isAtBottom && (
                        <div className={'absolute bottom-4 right-4 z-10'}>
                            <button type={'button'} className={'mc-icon-button'} aria-label={'Scroll to bottom'} onClick={scrollToBottom}>
                                <ChevronDownIcon />
                            </button>
                        </div>
                    )}
                </div>
                {showInput && (
                    <div className={'mc-command-bar'}>
                        <label
                            className={'mc-input mc-input--medium w-full'}
                            style={disableInput ? { cursor: 'not-allowed', opacity: 0.5 } : undefined}
                            title={disableInput ? disabledInputPlaceholder : undefined}
                        >
                            <TerminalSquareIcon aria-hidden={'true'} />
                            <input
                                value={command}
                                disabled={disableInput}
                                placeholder={disableInput ? disabledInputPlaceholder : 'Send a command'}
                                onChange={event => setCommand(event.target.value)}
                                onKeyDown={event => {
                                    if (event.key === 'Enter') submit();
                                }}
                            />
                        </label>
                    </div>
                )}
            </div>
        );
    },
);

export default BaseTerminal;
