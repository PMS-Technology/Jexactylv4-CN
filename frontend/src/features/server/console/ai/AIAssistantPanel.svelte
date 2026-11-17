<script lang="ts">
    import { Eraser, Send, Sparkles, Stethoscope } from '@lucide/svelte';
    import { app } from '$lib/stores/app.svelte';
    import type { ServerStore } from '$lib/stores/server.svelte';
    import {
        aiExecute,
        aiStepStream,
        type AiMessage,
        type AiPendingCall,
        type AiToolResult,
        type AiTurn,
    } from '$lib/api/serverAi';
    import Markdown from '$lib/components/markdown/Markdown.svelte';
    import Alert from '$lib/components/Alert.svelte';
    import { Button, Input, Spinner } from '$lib/ui';
    import Switch from '$lib/ui/Switch.svelte';
    import SegmentedRadio from '$lib/ui/radio-group/SegmentedRadio.svelte';
    import AIToolEntry from './AIToolEntry.svelte';
    import AIApprovalCard from './AIApprovalCard.svelte';
    import { cn } from '$lib/utils/cn';

    /**
     * The server assistant.
     *
     * The browser drives the tool loop: every turn asks the model what to do
     * next, runs the read-only tools right away and puts the changes in front
     * of the user. The crash diagnosis is the same loop with a fixed prompt and
     * with the write tools taken away, so it ends in a report rather than in a
     * conversation.
     */
    type Props = {
        store: ServerStore;
        class?: string;
    };

    let { store, class: className }: Props = $props();

    type Entry =
        | { kind: 'user'; id: string; text: string }
        | { kind: 'assistant'; id: string; text: string; pending: boolean }
        | {
              kind: 'tool';
              id: string;
              name: string;
              summary: string;
              arguments: Record<string, unknown>;
              status: 'running' | 'done' | 'error';
              output: string;
          }
        | { kind: 'approval'; id: string; calls: AiPendingCall[]; status: 'pending' | 'approved' | 'rejected' };

    /** The conversation as the model sees it. Not rendered, so it stays plain. */
    let modelMessages: AiMessage[] = [];

    let entries = $state<Entry[]>([]);
    let mode = $state<'chat' | 'diagnose'>('chat');
    let input = $state('');
    let busy = $state(false);
    let error = $state('');
    let bypass = $state(false);

    /** Set while an approval decision is being submitted, so the card can lock itself. */
    let deciding = $state(false);

    let resolveDecision: ((decision: 'approve' | 'reject') => void) | null = null;

    let counter = 0;
    const uid = () => `e${++counter}`;

    /** How many model turns one question may take before the panel gives up. */
    const MAX_TURNS = 15;

    const enabled = $derived(Boolean(app.flags?.ai.enabled));
    const allowed = $derived(
        store.can('ai.assistant') &&
            (Boolean(app.flags?.ai.user_access) ||
                Boolean(app.user?.rootAdmin) ||
                Boolean(app.user?.adminRoleId)),
    );
    const uuid = $derived(store.server?.uuid ?? '');

    const modes = [
        { value: 'chat', label: '日常排错' },
        { value: 'diagnose', label: '崩溃诊断' },
    ];

    function patchEntry(id: string, patch: Partial<Entry>) {
        entries = entries.map(entry => (entry.id === id ? ({ ...entry, ...patch } as Entry) : entry));
    }

    function addEntry(entry: Entry) {
        entries = [...entries, entry];
    }

    function clear() {
        modelMessages = [];
        entries = [];
        error = '';
    }

    function waitForDecision(): Promise<'approve' | 'reject'> {
        return new Promise(resolve => {
            resolveDecision = resolve;
        });
    }

    function decide(decision: 'approve' | 'reject') {
        deciding = true;
        resolveDecision?.(decision);
        resolveDecision = null;
    }

    function toolEntry(result: AiToolResult): Entry {
        return {
            kind: 'tool',
            id: result.id || uid(),
            name: result.name,
            summary: '',
            arguments: result.arguments ?? {},
            status: result.ok ? 'done' : 'error',
            output: result.output,
        };
    }

    /**
     * Run the loop until the model stops asking for tools.
     */
    async function run() {
        if (!uuid || busy) return;

        busy = true;
        error = '';
        deciding = false;

        // A runaway model must not keep the panel busy forever.
        let turns = 0;

        try {
            while (turns++ < MAX_TURNS) {
                const assistantId = uid();
                addEntry({ kind: 'assistant', id: assistantId, text: '', pending: true });

                let streamed = '';
                let turn: AiTurn | null = null;
                let streamError = '';

                await aiStepStream(
                    uuid,
                    {
                        messages: modelMessages,
                        mode,
                        bypass,
                        console_log: store.consoleLog,
                    },
                    event => {
                        if (event.type === 'text') {
                            streamed += event.text;
                            patchEntry(assistantId, { text: streamed });
                        } else if (event.type === 'error') {
                            streamError = event.message;
                        } else if (event.type === 'done') {
                            turn = event;
                        }
                    },
                );

                if (streamError) {
                    patchEntry(assistantId, { text: streamed || streamError, pending: false });
                    error = streamError;
                    break;
                }

                if (!turn) {
                    patchEntry(assistantId, { text: streamed || '助手没有返回内容。', pending: false });
                    break;
                }

                const finished = turn as AiTurn;
                patchEntry(assistantId, {
                    text: finished.assistant.content ?? streamed,
                    pending: false,
                });
                modelMessages = [...modelMessages, finished.assistant];

                for (const result of finished.executed) {
                    addEntry(toolEntry(result));
                    modelMessages = [
                        ...modelMessages,
                        { role: 'tool', tool_call_id: result.id, content: result.output },
                    ];
                }

                // The model has to see the outcome of the tools it asked for, so the
                // loop only ends when it answers without asking for anything.
                const askedForTools = (finished.assistant.tool_calls ?? []).length > 0;

                if (finished.pending.length === 0) {
                    if (askedForTools) {
                        continue;
                    }

                    break;
                }

                const approvalId = uid();
                addEntry({ kind: 'approval', id: approvalId, calls: finished.pending, status: 'pending' });

                const decision = await waitForDecision();
                patchEntry(approvalId, { status: decision === 'approve' ? 'approved' : 'rejected' });

                if (decision === 'approve') {
                    const { executed } = await aiExecute(uuid, finished.pending, store.consoleLog);

                    for (const result of executed) {
                        addEntry(toolEntry(result));
                        modelMessages = [
                            ...modelMessages,
                            { role: 'tool', tool_call_id: result.id, content: result.output },
                        ];
                    }
                } else {
                    for (const call of finished.pending) {
                        modelMessages = [
                            ...modelMessages,
                            {
                                role: 'tool',
                                tool_call_id: call.id,
                                content: '用户拒绝了这个操作，没有执行。请不要重复同样的请求，改为解释你会做什么并等待用户指示。',
                            },
                        ];
                    }
                }
            }
        } catch (e) {
            error = e instanceof Error ? e.message : String(e);
        } finally {
            busy = false;
            deciding = false;
            resolveDecision = null;
        }
    }

    function send() {
        const question = input.trim();
        if (!question || busy) return;

        input = '';
        addEntry({ kind: 'user', id: uid(), text: question });
        modelMessages = [...modelMessages, { role: 'user', content: question }];

        void run();
    }

    function diagnose() {
        if (busy) return;

        const question = '请分析这台服务器最近的崩溃原因，并给出修复步骤。';
        addEntry({ kind: 'user', id: uid(), text: '诊断这次崩溃' });
        modelMessages = [...modelMessages, { role: 'user', content: question }];

        void run();
    }

    function onKeydown(event: KeyboardEvent & { currentTarget: EventTarget & HTMLInputElement }) {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            send();
        }
    }
</script>

<div class={cn('flex flex-col overflow-hidden rounded-lg border border-border bg-card', className)}>
    <!-- Header ------------------------------------------------------------- -->
    <div class="flex flex-wrap items-center gap-3 border-b border-border px-3 py-2">
        <div class="flex items-center gap-2 text-sm font-medium">
            <Sparkles class="size-4 text-primary" />
            AI 助手
        </div>

        <SegmentedRadio
            items={modes}
            bind:value={mode}
            columns={2}
            aria-label="助手模式"
            class="w-56"
            itemClass="py-1 text-xs"
        />

        <div class="ms-auto flex items-center gap-3">
            <label class="flex cursor-pointer items-center gap-2 text-xs text-muted-foreground">
                <Switch bind:checked={bypass} aria-label="自动执行修改" />
                自动执行修改
            </label>
            <Button variant="ghost" size="sm" onclick={clear} disabled={busy || entries.length === 0}>
                <Eraser class="size-3.5" />
                清空
            </Button>
        </div>
    </div>

    <!-- Body ---------------------------------------------------------------- -->
    <div class="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
        {#if !enabled}
            <Alert variant="warning" title="AI 模块未启用">
                管理员还没有启用 JexpanelAI 模块，助手暂时无法使用。
            </Alert>
        {:else if !allowed}
            <Alert variant="warning" title="没有使用权限">
                你没有这台服务器的 AI 助手权限（ai.assistant）。
            </Alert>
        {:else if entries.length === 0}
            <div class="flex h-full flex-col items-center justify-center gap-2 py-10 text-center">
                {#if mode === 'diagnose'}
                    <Stethoscope class="size-8 text-muted-foreground/60" />
                    <p class="text-sm font-medium">崩溃诊断</p>
                    <p class="max-w-md text-xs text-muted-foreground">
                        读取服务器的控制台输出、配置文件与启动参数，输出一份包含结论、证据、原因分析、修复步骤和回滚方案的诊断报告。诊断过程只读，不会修改任何内容。
                    </p>
                    <Button size="sm" class="mt-2" onclick={diagnose} disabled={busy}>
                        <Stethoscope class="size-3.5" />
                        开始诊断
                    </Button>
                {:else}
                    <Sparkles class="size-8 text-muted-foreground/60" />
                    <p class="text-sm font-medium">日常排错</p>
                    <p class="max-w-md text-xs text-muted-foreground">
                        描述你遇到的问题，助手会读取服务器状态、日志和文件来排查。需要修改服务器时，助手会先把要做的操作列出来，等你确认。
                    </p>
                {/if}
            </div>
        {:else}
            {#each entries as entry (entry.id)}
                {#if entry.kind === 'user'}
                    <div class="flex justify-end">
                        <div
                            class="max-w-[85%] rounded-lg rounded-br-sm bg-primary px-3 py-2 text-sm text-primary-foreground"
                        >
                            {entry.text}
                        </div>
                    </div>
                {:else if entry.kind === 'assistant'}
                    <div class="max-w-[95%]">
                        {#if entry.text}
                            <Markdown content={entry.text} />
                        {:else if entry.pending}
                            <div class="flex items-center gap-2 text-xs text-muted-foreground">
                                <Spinner size="sm" />
                                正在思考…
                            </div>
                        {/if}
                    </div>
                {:else if entry.kind === 'tool'}
                    <AIToolEntry
                        name={entry.name}
                        arguments={entry.arguments}
                        status={entry.status}
                        output={entry.output}
                    />
                {:else}
                    <AIApprovalCard
                        calls={entry.calls}
                        status={entry.status}
                        busy={deciding}
                        onDecide={decide}
                    />
                {/if}
            {/each}
        {/if}

        {#if error}
            <Alert variant="destructive" title="助手出错">{error}</Alert>
        {/if}
    </div>

    <!-- Composer ------------------------------------------------------------ -->
    {#if enabled && allowed}
        <div class="border-t border-border p-3">
            {#if mode === 'diagnose'}
                <Button size="sm" variant="outline" onclick={diagnose} disabled={busy}>
                    <Stethoscope class="size-3.5" />
                    重新诊断
                </Button>
            {:else}
                <div class="flex items-center gap-2">
                    <Input
                        bind:value={input}
                        placeholder="描述你遇到的问题…"
                        aria-label="向 AI 助手提问"
                        disabled={busy}
                        onkeydown={onKeydown}
                    />
                    <Button size="sm" onclick={send} disabled={busy || !input.trim()}>
                        <Send class="size-3.5" />
                        发送
                    </Button>
                </div>
                {#if bypass}
                    <p class="mt-2 text-2xs text-warning">
                        自动执行已开启：助手对服务器的任何修改都会直接生效，不再逐条询问。
                    </p>
                {/if}
            {/if}
        </div>
    {/if}
</div>
