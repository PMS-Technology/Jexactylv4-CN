import { useEffect, useMemo, useRef, useState } from 'react';
import copy from 'copy-to-clipboard';
import useFlash from '@/plugins/useFlash';
import type { ConsoleState } from '../consoleState';
import {
    buildFilterPredicate,
    clearSearchHighlights,
    colorize,
    getHighlightVersion,
    highlightAppendedRange,
    rewriteTerminal,
    toggleFilter,
} from '../consoleFiltering';
import type { FilterValue, LogLine } from '../consoleTypes';
import BaseTerminal, { type BaseTerminalHandle } from './BaseTerminal';
import ConsoleActionButtons from './ConsoleActionButtons';
import ConsoleFilterPills from './ConsoleFilterPills';
import { SearchIcon, XIcon } from './icons';
import ShareModal from './ShareModal';

interface Props {
    lines: LogLine[];
    consoleState: ConsoleState;
    sendCommand: (command: string) => void;
    showCommandInput: boolean;
    disableCommandInput: boolean;
    loading: boolean;
    onClear: () => void;
    clearDisabled?: boolean;
    shareDisabled?: boolean;
}

export default ({
    lines,
    consoleState,
    sendCommand,
    showCommandInput,
    disableCommandInput,
    loading,
    onClear,
    clearDisabled,
    shareDisabled,
}: Props) => {
    const { addFlash, clearFlashes } = useFlash();
    const terminalRef = useRef<BaseTerminalHandle>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeFilters, setActiveFilters] = useState<Set<FilterValue>>(() => new Set(['all']));
    const [fullscreen, setFullscreen] = useState(false);
    const [sharing, setSharing] = useState(false);
    const [shareUrl, setShareUrl] = useState('');
    const [ready, setReady] = useState(false);
    const lastWrittenIndex = useRef(0);
    const searchTimer = useRef<ReturnType<typeof setTimeout>>();

    const presentLevels = useMemo(() => {
        const levels = new Set<'debug' | 'trace'>();
        for (const line of lines) {
            if (line.level === 'debug') levels.add('debug');
            if (line.level === 'trace') levels.add('trace');
            if (levels.size === 2) break;
        }
        return levels;
    }, [lines]);

    const predicateFor = (query: string) => {
        const levelPred = buildFilterPredicate(activeFilters);
        const trimmed = query.trim().toLowerCase();
        if (!levelPred && !trimmed) return null;
        return (line: LogLine) => {
            if (levelPred && !levelPred(line)) return false;
            if (trimmed && !line.text.toLowerCase().includes(trimmed)) return false;
            return true;
        };
    };

    const rewriteFiltered = (query = searchQuery) => {
        const term = terminalRef.current?.terminal;
        if (!term) return;
        const current = consoleState.getOutput();
        if (loading && current.length === 0) {
            terminalRef.current?.clearEmptyState();
            lastWrittenIndex.current = 0;
            return;
        }
        if (current.length === 0) {
            terminalRef.current?.writeEmptyState();
            lastWrittenIndex.current = 0;
            return;
        }
        terminalRef.current?.clearEmptyState();
        rewriteTerminal(term, current, predicateFor(query), query.trim().toLowerCase());
        lastWrittenIndex.current = current.length;
    };

    useEffect(() => {
        if (!ready) return;
        rewriteFiltered();
    }, [activeFilters, loading, ready]);

    useEffect(() => {
        const term = terminalRef.current?.terminal;
        if (!term || !ready) return;
        if (lines.length === 0) {
            if (loading) {
                terminalRef.current?.clearEmptyState();
                lastWrittenIndex.current = 0;
                return;
            }
            terminalRef.current?.writeEmptyState();
            lastWrittenIndex.current = 0;
            return;
        }
        if (terminalRef.current?.showingEmptyState || lines.length < lastWrittenIndex.current) {
            rewriteFiltered();
            return;
        }
        const predicate = predicateFor(searchQuery);
        const appended: string[] = [];
        for (let i = lastWrittenIndex.current; i < lines.length; i++) {
            const line = lines[i];
            if (line && (!predicate || predicate(line))) appended.push(colorize(line));
        }
        if (appended.length > 0) {
            terminalRef.current?.clearEmptyState();
            const buffer = term.buffer.active;
            const data = buffer.cursorX === 0 ? appended.join('\r\n') : '\r\n' + appended.join('\r\n');
            const fromRow = buffer.baseY + buffer.cursorY;
            const version = getHighlightVersion(term);
            term.write(data, () => highlightAppendedRange(term, fromRow, version));
        }
        lastWrittenIndex.current = lines.length;
    }, [lines, ready]);

    useEffect(() => {
        if (!fullscreen) return;
        const previous = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        const onKey = (event: KeyboardEvent) => {
            if (event.key === 'Escape') setFullscreen(false);
        };
        window.addEventListener('keydown', onKey, true);
        return () => {
            document.body.style.overflow = previous;
            window.removeEventListener('keydown', onKey, true);
        };
    }, [fullscreen]);

    const handleShare = async () => {
        const predicate = predicateFor(searchQuery);
        const content = (predicate ? lines.filter(predicate) : lines)
            .map(line => line.text.replace(/\u001b\[[0-9;]*m/g, ''))
            .join('\n');
        if (!content) return;
        setSharing(true);
        clearFlashes('console:share');
        try {
            const response = await fetch('https://api.mclo.gs/1/log', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: new URLSearchParams({ content }),
            });
            const data = (await response.json()) as { success?: boolean; url?: string };
            if (data.success && data.url) {
                setShareUrl(data.url);
                copy(data.url);
            } else {
                addFlash({ key: 'console:share', type: 'error', message: 'Failed to share logs' });
            }
        } catch {
            addFlash({ key: 'console:share', type: 'error', message: 'Failed to share logs' });
        } finally {
            setSharing(false);
        }
    };

    return (
        <div
            className={fullscreen ? 'fixed inset-0 z-[15] flex min-h-0 flex-1 flex-col gap-4 bg-[var(--surface-1)] p-6 py-8' : 'flex min-h-0 flex-1 flex-col gap-4'}
        >
            <div className={'flex flex-col gap-2'}>
                <label className={'mc-input mc-input--medium w-full'}>
                    <SearchIcon aria-hidden={'true'} />
                    <input
                        value={searchQuery}
                        placeholder={'Search logs'}
                        aria-label={'Search logs'}
                        onChange={event => {
                            const value = event.target.value;
                            setSearchQuery(value);
                            if (searchTimer.current) clearTimeout(searchTimer.current);
                            searchTimer.current = setTimeout(() => rewriteFiltered(value), 200);
                        }}
                    />
                    {searchQuery && (
                        <button
                            type={'button'}
                            aria-label={'Clear input'}
                            className={'flex h-5 w-5 items-center justify-center border-0 bg-transparent p-0'}
                            style={{ color: 'var(--color-secondary)' }}
                            onClick={() => {
                                setSearchQuery('');
                                rewriteFiltered('');
                            }}
                        >
                            <XIcon className={'h-5 w-5'} />
                        </button>
                    )}
                </label>
                <div className={'flex items-center justify-between'}>
                    <ConsoleFilterPills
                        presentLevels={presentLevels}
                        value={activeFilters}
                        onToggle={value => setActiveFilters(current => toggleFilter(current, value))}
                    />
                    <ConsoleActionButtons
                        showClear
                        hasLogs={lines.length > 0}
                        shareDisabled={shareDisabled || sharing}
                        sharing={sharing}
                        fullscreen={fullscreen}
                        clearDisabled={clearDisabled}
                        onClear={() => {
                            if (clearDisabled) return;
                            const term = terminalRef.current?.terminal;
                            if (term) clearSearchHighlights(term);
                            terminalRef.current?.reset();
                            lastWrittenIndex.current = 0;
                            onClear();
                        }}
                        onShare={handleShare}
                        onToggleFullscreen={() => setFullscreen(value => !value)}
                    />
                </div>
            </div>
            <BaseTerminal
                ref={terminalRef}
                showInput={showCommandInput}
                disableInput={disableCommandInput || loading}
                disabledInputPlaceholder={disableCommandInput ? 'Server is not running' : 'Server is not running'}
                fullscreen={fullscreen}
                emptyStateType={'server'}
                loading={loading}
                onCommand={command => {
                    if (disableCommandInput || loading) return;
                    sendCommand(command);
                }}
                onReady={() => {
                    setReady(true);
                }}
            />
            <ShareModal open={!!shareUrl} url={shareUrl} onClose={() => setShareUrl('')} />
        </div>
    );
};
