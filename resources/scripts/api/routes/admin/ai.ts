import http from '@/api/http';

export const handleQuery = (query: string): Promise<string> => {
    return new Promise((resolve, reject) => {
        http.post(`/api/application/ai/query`, { query })
            .then(({ data }) => resolve(data))
            .catch(reject);
    });
};

export interface AISettings {
    key?: string | boolean;
    enabled?: boolean;
    user_access?: boolean;
    format?: AIFormat;
    model?: string;
    base_url?: string;
    project?: string;
    location?: string;
    models?: string[];
}

export type AIFormat =
    | 'anthropic_messages'
    | 'command_code'
    | 'opencode_zen'
    | 'opencode_go'
    | 'openrouter'
    | 'google_ai_studio'
    | 'google_vertex_ai'
    | 'openai_chat'
    | 'openai_responses'
    | 'ollama_chat'
    | 'zed'
    | 'anthropic_claude_code'
    | 'google_antigravity'
    | 'google_gemini_cli'
    | 'github_copilot'
    | 'openai_codex'
    | 'xai_grok_build';

export const updateSettings = (settings: AISettings): Promise<void> => {
    return new Promise((resolve, reject) => {
        http.put(`/api/application/ai/settings`, settings)
            .then(() => resolve())
            .catch(reject);
    });
};

export const syncModels = (): Promise<string[]> => {
    return new Promise((resolve, reject) => {
        http.post(`/api/application/ai/models/sync`)
            .then(({ data }) => resolve(data))
            .catch(reject);
    });
};
