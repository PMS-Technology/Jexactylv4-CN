<script lang="ts">
    import { onMount } from 'svelte';
    import { Terminal } from '@xterm/xterm';
    import { FitAddon } from '@xterm/addon-fit';
    import { SearchAddon } from '@xterm/addon-search';
    import { WebLinksAddon } from '@xterm/addon-web-links';
    import { ChevronsRight, Maximize2, Minimize2 } from '@lucide/svelte';
    import type { ServerStore } from '$lib/stores/server.svelte';
    import { SocketEvent, SocketRequest } from '$lib/api/definitions/events';
    import { websocketEvent } from '$lib/stores/server.svelte';
    import { ScrollDownHelperAddon } from '$lib/websocket/ScrollDownHelperAddon';
    import Spinner from '$lib/ui/Spinner.svelte';
    import { cn } from '$lib/utils/cn';

    import '@xterm/xterm/css/xterm.css';

    /**
     * Live console, ported from console/Console.tsx. Terminal output arrives over the
     * socket as `console output` (and friends) and is written straight into xterm; the
     * command input keeps a persisted history (ArrowUp/Down) and sends commands as
     * `send command` events.
     */
    let { store, expand = false, onToggleExpand }: { store: ServerStore; expand?: boolean; onToggleExpand?: () => void } =
        $props();

    // Ported verbatim from the legacy Console.tsx — the palette is part of the look.
    const theme = {
        background: '#000000',
        cursor: 'transparent',
        black: '#000000',
        red: '#E54B4B',
        green: '#9ECE58',
        yellow: '#FAED70',
        blue: '#396FE2',
        magenta: '#BB80B3',
        cyan: '#2DDAFD',
        white: '#d0d0d0',
        brightBlack: 'rgba(255, 255, 255, 0.2)',
        brightRed: '#FF5370',
        brightGreen: '#C3E88D',
        brightYellow: '#FFCB6B',
        brightBlue: '#82AAFF',
        brightMagenta: '#C792EA',
        brightCyan: '#89DDFF',
        brightWhite: '#ffffff',
        selectionBackground: '#FAF089',
    };

    const TERMINAL_PRELUDE = '\n\u001b[1m\u001b[33mEverest Container: \u001b[0m';

    let container: HTMLDivElement;

    // The Terminal is created once per mount; rows only apply at creation, like the
    // legacy useMemo(() => new Terminal(), []).
    const terminal = new Terminal({
        disableStdin: true,
        cursorStyle: 'underline',
        allowTransparency: true,
        fontSize: 12,
        fontFamily: "ui-monospace, 'SF Mono', 'JetBrains Mono', Menlo, monospace",
        theme,
        allowProposedApi: true,
        rows: expand ? 45 : 30,
    });
    const fitAddon = new FitAddon();
    const searchAddon = new SearchAddon();
    const scrollDownHelperAddon = new ScrollDownHelperAddon();

    onMount(() => {
        terminal.open(container);
        terminal.loadAddon(fitAddon);
        terminal.loadAddon(searchAddon);
        terminal.loadAddon(new WebLinksAddon());
        terminal.loadAddon(scrollDownHelperAddon);
        fitAddon.fit();

        // Ported key handling: copy instead of interrupt, Escape closes the search bar.
        terminal.attachCustomKeyEventHandler(event => {
            if ((event.ctrlKey || event.metaKey) && event.key === 'c') {
                document.execCommand('copy');
                return false;
            } else if ((event.ctrlKey || event.metaKey) && event.key === 'f') {
                event.preventDefault();
                searchAddon.findNext('');
                return false;
            }
            return true;
        });

        const onResize = () => terminal.element && fitAddon.fit();
        window.addEventListener('resize', onResize);

        return () => {
            window.removeEventListener('resize', onResize);
            terminal.dispose();
        };
    });

    // Re-fit after the min-height transition settles, otherwise xterm measures mid-animation.
    $effect(() => {
        expand;
        const timeout = window.setTimeout(() => terminal.element && fitAddon.fit(), 500);

        return () => window.clearTimeout(timeout);
    });

    const handleConsoleOutput = (line: string, prelude = false) =>
        terminal.writeln((prelude ? TERMINAL_PRELUDE : '') + line.replace(/(?:\r\n|\r|\n)$/im, '') + '\u001b[0m');

    const handleDaemonErrorOutput = (line: string) =>
        terminal.writeln(TERMINAL_PRELUDE + '\u001b[1m\u001b[41m' + line.replace(/(?:\r\n|\r|\n)$/im, '') + '\u001b[0m\n');

    const handlePowerChangeEvent = (state: string) =>
        terminal.writeln(TERMINAL_PRELUDE + 'Server marked as ' + state + '...\u001b[0m\n');

    const handleTransferStatus = (status: string) => {
        if (status === 'failure') {
            terminal.writeln(TERMINAL_PRELUDE + 'Transfer has failed.\u001b[0m\n');
        }
    };

    // Attach the output listeners once the socket is live and ask Wings to replay the
    // recent output buffer. The clear-on-connect matches the legacy behaviour except we
    // keep it during transfers.
    websocketEvent(store, SocketEvent.STATUS, (state: string) => handlePowerChangeEvent(state));
    websocketEvent(store, SocketEvent.CONSOLE_OUTPUT, (line: string) => handleConsoleOutput(line));
    websocketEvent(store, SocketEvent.INSTALL_OUTPUT, (line: string) => handleConsoleOutput(line));
    websocketEvent(store, SocketEvent.TRANSFER_LOGS, (line: string) => handleConsoleOutput(line));
    websocketEvent(store, SocketEvent.TRANSFER_STATUS, (status: string) => handleTransferStatus(status));
    websocketEvent(store, SocketEvent.DAEMON_MESSAGE, (line: string) => handleConsoleOutput(line, true));
    websocketEvent(store, SocketEvent.DAEMON_ERROR, (line: string) => handleDaemonErrorOutput(line));

    $effect(() => {
        if (!store.connected || !store.instance) return;

        if (!store.server?.isTransferring) {
            terminal.clear();
        }
        store.instance.send(SocketRequest.SEND_LOGS);
    });

    // Command history, persisted per server like the legacy usePersistedState key.
    const historyKey = $derived(`${store.server?.id ?? 'unknown'}:command_history`);

    function readHistory(): string[] {
        try {
            return JSON.parse(localStorage.getItem(historyKey) ?? '[]');
        } catch {
            return [];
        }
    }

    let command = $state('');
    let history = $state<string[]>(readHistory());
    let historyIndex = $state(-1);

    $effect(() => {
        // historyKey changes when switching servers; reload once that happens.
        historyKey;
        history = readHistory();
        historyIndex = -1;
    });

    function onCommandKeydown(event: KeyboardEvent & { currentTarget: EventTarget & HTMLInputElement }) {
        if (event.key === 'ArrowUp') {
            const newIndex = Math.min(historyIndex + 1, history.length - 1);
            historyIndex = newIndex;
            command = history[newIndex] ?? '';

            // By default, up arrow will also bring the cursor to the start of the line,
            // so we'll preventDefault to keep it at the end.
            event.preventDefault();
        }

        if (event.key === 'ArrowDown') {
            const newIndex = Math.max(historyIndex - 1, -1);
            historyIndex = newIndex;
            command = history[newIndex] ?? '';
        }

        if (event.key === 'Enter' && command.length > 0) {
            const entry = command;
            history = [entry, ...history].slice(0, 32);
            historyIndex = -1;
            try {
                localStorage.setItem(historyKey, JSON.stringify(history));
            } catch {
                // Private browsing; history just won't persist.
            }

            store.instance?.send('send command', entry);
            command = '';
        }
    }
</script>

<div
    class={cn(
        'relative flex w-full flex-col rounded-lg bg-black/90 p-2 transition-all duration-500 ease-linear',
        expand ? 'min-h-[48rem]' : 'min-h-[16rem]',
    )}
>
    {#if !store.connected}
        <div class="absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-background/60">
            <Spinner />
        </div>
    {/if}

    <div class="relative min-w-0 flex-1 overflow-hidden rounded-t p-1 font-mono text-sm sm:p-2">
        <div bind:this={container} class="h-full"></div>
    </div>

    {#if store.can('control.console')}
        <div class="relative">
            <input
                type="text"
                bind:value={command}
                placeholder="输入命令…"
                aria-label="控制台命令输入"
                disabled={!store.instance || !store.connected}
                onkeydown={onCommandKeydown}
                autocorrect="off"
                autocapitalize="none"
                class="w-full rounded-b border-0 border-b-2 border-transparent bg-zinc-900 py-2 pr-16 pl-16
                       font-mono text-sm text-slate-100 outline-none transition-colors duration-100
                       focus:border-cyan-500 active:border-cyan-500
                       placeholder:text-muted-foreground/60 disabled:opacity-50"
            />
            <span class="pointer-events-none absolute top-0 left-0 flex h-full select-none items-center px-3 text-slate-100">
                <ChevronsRight class="size-4" />
            </span>
            {#if onToggleExpand}
                <button
                    type="button"
                    class="absolute top-0 right-0 flex h-full select-none items-center px-3 text-slate-100/80
                           transition-colors hover:text-green-400"
                    aria-label={expand ? '收起控制台' : '展开控制台'}
                    onclick={onToggleExpand}
                >
                    {#if expand}
                        <Minimize2 class="size-4" />
                    {:else}
                        <Maximize2 class="size-4" />
                    {/if}
                </button>
            {/if}
        </div>
    {/if}
</div>
