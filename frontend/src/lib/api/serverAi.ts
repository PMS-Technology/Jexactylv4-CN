import http from '$lib/api/http';

/**
 * The server assistant API.
 *
 * The assistant runs as a loop that the browser drives: `step` asks the model
 * for one turn and runs the read-only tools it asked for, `execute` runs the
 * calls the user approved. The streaming variant of `step` delivers the answer
 * token by token over server-sent events.
 */

export type AiMode = 'chat' | 'diagnose';

export interface AiToolCall {
    id: string;
    name: string;
    arguments: Record<string, unknown>;
}

export interface AiMessage {
    role: 'system' | 'user' | 'assistant' | 'tool';
    content?: string;
    tool_calls?: AiToolCall[];
    tool_call_id?: string;
}

export interface AiToolResult {
    id: string;
    name: string;
    arguments: Record<string, unknown>;
    ok: boolean;
    output: string;
}

export interface AiPendingCall extends AiToolCall {
    summary: string;
    mutates: boolean;
    known: boolean;
}

export interface AiTurn {
    assistant: AiMessage;
    executed: AiToolResult[];
    pending: AiPendingCall[];
    usage?: Record<string, number>;
    model?: string;
    provider?: string;
}

export interface AiStepPayload {
    messages: AiMessage[];
    mode?: AiMode;
    /** Run mutating tools without asking the user first. */
    bypass?: boolean;
    /** The recent console output, so the assistant can read the log. */
    console_log?: string[];
}

export type AiStreamEvent =
    | { type: 'text'; text: string }
    | { type: 'tool_call'; tool_call: { index?: number; id?: string; name?: string; arguments?: string } }
    | ({ type: 'done' } & AiTurn)
    | { type: 'error'; message: string };

/** One turn of the assistant, without streaming. */
export async function aiStep(uuid: string, payload: AiStepPayload): Promise<AiTurn> {
    const { data } = await http.post(`/api/client/servers/${uuid}/ai/assistant/step`, payload);

    return data as AiTurn;
}

/** Run the tool calls the user approved. */
export async function aiExecute(
    uuid: string,
    calls: AiToolCall[],
    consoleLog: string[] = [],
): Promise<{ executed: AiToolResult[] }> {
    const { data } = await http.post(`/api/client/servers/${uuid}/ai/assistant/execute`, {
        calls,
        console_log: consoleLog,
    });

    return data as { executed: AiToolResult[] };
}

/**
 * Stream one turn of the assistant.
 *
 * The browser cannot read a streamed axios response, so this uses fetch with
 * the same session cookie and CSRF header the rest of the client API uses.
 */
export async function aiStepStream(
    uuid: string,
    payload: AiStepPayload,
    onEvent: (event: AiStreamEvent) => void,
    signal?: AbortSignal,
): Promise<void> {
    const csrf = document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content ?? '';

    const response = await fetch(`/api/client/servers/${uuid}/ai/assistant/step`, {
        method: 'POST',
        credentials: 'include',
        headers: {
            'Content-Type': 'application/json',
            Accept: 'text/event-stream',
            'X-Requested-With': 'XMLHttpRequest',
            'X-CSRF-TOKEN': csrf,
        },
        body: JSON.stringify({ ...payload, stream: true }),
        signal,
    });

    if (!response.ok || !response.body) {
        let message = `请求失败（HTTP ${response.status}）`;

        try {
            const body = await response.json();
            message = body?.error ?? body?.message ?? message;
        } catch {
            // The body was not JSON; the status line is all we have.
        }

        throw new Error(message);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    for (;;) {
        const { done, value } = await reader.read();

        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        let boundary = buffer.indexOf('\n\n');
        while (boundary !== -1) {
            const chunk = buffer.slice(0, boundary);
            buffer = buffer.slice(boundary + 2);

            for (const line of chunk.split('\n')) {
                if (!line.startsWith('data:')) continue;

                const data = line.slice(5).trim();
                if (!data) continue;

                try {
                    onEvent(JSON.parse(data) as AiStreamEvent);
                } catch {
                    // A malformed frame is not worth breaking the stream over.
                }
            }

            boundary = buffer.indexOf('\n\n');
        }
    }
}
