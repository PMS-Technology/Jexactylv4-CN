<?php

namespace Everest\Services\AI;

use Illuminate\Support\Arr;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Http;
use Illuminate\Http\Client\PendingRequest;

class AIProviderService
{
    private array $modelRoutes = [];

    public function query(string $prompt): string
    {
        $format = (string) config('modules.ai.format', 'google_ai_studio');
        $model = (string) config('modules.ai.model');

        if ($model === '') {
            throw new \RuntimeException('An AI model must be configured.');
        }

        [$protocol, $url] = $this->resolveQuery($format, $model);
        $response = $this->request($format, $protocol)->post($url, $this->payload($format, $protocol, $model, $prompt));
        $response->throw();

        $text = in_array($protocol, ['zed', 'codex'], true)
            ? $this->extractEventStream($response->body())
            : $this->extractText($protocol, $response->json());
        if ($text === '') {
            throw new \RuntimeException('The AI provider returned no text.');
        }

        return $text;
    }

    public function models(): array
    {
        $format = (string) config('modules.ai.format', 'google_ai_studio');
        $url = $this->modelsUrl($format);
        if ($url === null) {
            return [];
        }

        $protocol = in_array($format, ['anthropic_messages', 'anthropic_claude_code'], true)
            ? 'anthropic'
            : $format;
        $response = $this->request($format, $protocol)->get($url);
        $response->throw();
        $data = $response->json();

        $records = $data['data'] ?? $data['models'] ?? [];
        foreach ($records as $record) {
            if (!is_array($record) || !is_string($record['id'] ?? null)) {
                continue;
            }

            $route = $this->routeFromMetadata($record);
            if ($route !== null) {
                $this->modelRoutes[$record['id']] = $route;
            }
        }

        $models = match ($format) {
            'ollama_chat' => Arr::pluck($data['models'] ?? [], 'name'),
            'google_ai_studio' => array_map(
                fn (array $model) => Str::after((string) ($model['name'] ?? ''), 'models/'),
                array_filter($data['models'] ?? [], fn (array $model) => in_array('generateContent', $model['supportedGenerationMethods'] ?? [], true))
            ),
            default => Arr::pluck($data['data'] ?? $data['models'] ?? [], 'id'),
        };

        $models = array_values(array_unique(array_filter($models, 'is_string')));
        sort($models);

        return $models;
    }

    public function modelRoutes(): array
    {
        return $this->modelRoutes;
    }

    private function resolveQuery(string $format, string $model): array
    {
        $base = $this->baseUrl($format);

        return match ($format) {
            'anthropic_messages', 'anthropic_claude_code' => ['anthropic', $this->endpoint($base, '/v1/messages')],
            'command_code' => $this->resolveCommandCode($base, $model),
            'opencode_zen', 'opencode_go' => $this->resolveOpenCode($base, $model, $format === 'opencode_go'),
            'openrouter', 'openai_chat' => ['chat', $this->endpoint($base, '/chat/completions')],
            'openai_responses', 'xai_grok_build' => ['responses', $this->endpoint($base, '/responses')],
            'openai_codex' => ['codex', $this->endpoint($base, '/responses')],
            'google_ai_studio' => ['gemini', $this->endpoint($base, '/models/' . rawurlencode($model) . ':generateContent')],
            'google_vertex_ai' => ['gemini', $this->vertexUrl($base, $model)],
            'ollama_chat' => ['ollama', $this->endpoint($base, '/api/chat')],
            'zed' => ['zed', $this->endpoint($base, '/completions')],
            'google_antigravity', 'google_gemini_cli' => ['google_internal', rtrim($base, '/') . ':generateContent'],
            'github_copilot' => $this->resolveCopilot($base, $model),
            default => throw new \RuntimeException("Unsupported AI API format: {$format}"),
        };
    }

    private function resolveOpenCode(string $base, string $model, bool $go): array
    {
        $route = $this->storedRoute($model);
        if ($route !== null) {
            return [$route, $this->protocolUrl($base, $route, $model)];
        }

        if (Str::startsWith($model, 'gemini-')) {
            return ['gemini', $this->endpoint($base, '/models/' . rawurlencode($model) . ':generateContent')];
        }

        $messages = Str::startsWith($model, $go ? ['minimax-', 'qwen'] : ['claude-', 'qwen']);
        if ($messages) {
            return ['anthropic', $this->endpoint($base, '/messages')];
        }

        $responses = Str::startsWith($model, ['gpt-', 'grok-', 'muse-']);

        return [$responses ? 'responses' : 'chat', $this->endpoint($base, $responses ? '/responses' : '/chat/completions')];
    }

    private function resolveCommandCode(string $base, string $model): array
    {
        $route = $this->storedRoute($model);
        if ($route === null) {
            $route = Str::startsWith($model, 'claude-') ? 'anthropic' : 'chat';
        }

        return [$route, $this->protocolUrl($base, $route, $model)];
    }

    private function resolveCopilot(string $base, string $model): array
    {
        $route = $this->storedRoute($model);
        if ($route !== null) {
            $path = $route === 'anthropic' ? '/v1/messages' : null;

            return [$route, $path === null ? $this->protocolUrl($base, $route, $model) : $this->endpoint($base, $path)];
        }

        $responses = Str::startsWith($model, ['gpt-5', 'o1', 'o3', 'o4']);

        return [$responses ? 'responses' : 'chat', $this->endpoint($base, $responses ? '/responses' : '/chat/completions')];
    }

    private function payload(string $format, string $protocol, string $model, string $prompt): array
    {
        $payload = match ($protocol) {
            'anthropic' => ['model' => $model, 'max_tokens' => 4096, 'messages' => [['role' => 'user', 'content' => $prompt]]],
            'chat' => ['model' => $model, 'messages' => [['role' => 'user', 'content' => $prompt]], 'stream' => false],
            'responses' => ['model' => $model, 'input' => $prompt, 'stream' => false],
            'codex' => ['model' => $model, 'input' => $prompt, 'stream' => true, 'store' => false],
            'gemini' => ['contents' => [['role' => 'user', 'parts' => [['text' => $prompt]]]]],
            'ollama' => ['model' => $model, 'messages' => [['role' => 'user', 'content' => $prompt]], 'stream' => false],
            'google_internal' => [
                'model' => $model,
                'project' => (string) config('modules.ai.project'),
                'user_prompt_id' => (string) Str::uuid(),
                'request' => ['contents' => [['role' => 'user', 'parts' => [['text' => $prompt]]]]],
            ],
            'zed' => [
                'provider' => $this->zedProvider($model),
                'model' => $model,
                'provider_request' => $this->zedPayload($model, $prompt),
            ],
            default => throw new \RuntimeException("Unsupported AI protocol: {$protocol}"),
        };

        if ($format === 'google_vertex_ai') {
            unset($payload['model']);
        }

        return $payload;
    }

    private function extractText(string $protocol, mixed $data): string
    {
        if (!is_array($data)) {
            return '';
        }

        $parts = match ($protocol) {
            'anthropic' => array_map(fn ($item) => $item['text'] ?? '', array_filter($data['content'] ?? [], fn ($item) => ($item['type'] ?? null) === 'text')),
            'chat' => [(string) data_get($data, 'choices.0.message.content', '')],
            'responses' => $this->responseTexts($data['output'] ?? []),
            'gemini' => Arr::pluck(data_get($data, 'candidates.0.content.parts', []), 'text'),
            'ollama' => [(string) data_get($data, 'message.content', '')],
            'google_internal' => Arr::pluck(data_get($data, 'response.candidates.0.content.parts', []), 'text'),
            default => [],
        };

        return trim(implode('', array_filter($parts, 'is_string')));
    }

    private function responseTexts(array $output): array
    {
        $texts = [];
        foreach ($output as $item) {
            foreach ($item['content'] ?? [] as $content) {
                if (($content['type'] ?? null) === 'output_text' && is_string($content['text'] ?? null)) {
                    $texts[] = $content['text'];
                }
            }
        }

        return $texts;
    }

    private function extractEventStream(string $body): string
    {
        $texts = [];
        foreach (preg_split('/\r?\n/', trim($body)) ?: [] as $line) {
            $line = Str::startsWith($line, 'data:') ? trim(Str::after($line, 'data:')) : $line;
            if ($line === '' || $line === '[DONE]') {
                continue;
            }

            $data = json_decode($line, true);
            if (!is_array($data)) {
                continue;
            }

            $event = $data['event'] ?? $data;
            $texts = array_merge($texts, $this->eventTexts($event));
        }

        return trim(implode('', $texts));
    }

    private function eventTexts(array $event): array
    {
        $delta = data_get($event, 'delta.text', data_get($event, 'delta'));
        $text = data_get($event, 'choices.0.message.content', data_get($event, 'choices.0.delta.content'));
        if (is_string($delta) && in_array($event['type'] ?? null, ['response.output_text.delta', 'content_block_delta'], true)) {
            return [$delta];
        }
        if (is_string($text)) {
            return [$text];
        }

        $responseTexts = $this->responseTexts($event['output'] ?? data_get($event, 'response.output', []));
        if ($responseTexts !== []) {
            return $responseTexts;
        }

        $gemini = Arr::pluck(data_get($event, 'candidates.0.content.parts', []), 'text');
        if ($gemini !== []) {
            return array_values(array_filter($gemini, 'is_string'));
        }

        $anthropic = data_get($event, 'content_block.text', data_get($event, 'content.0.text'));

        return is_string($anthropic) ? [$anthropic] : [];
    }

    private function request(string $format, string $protocol): PendingRequest
    {
        $key = (string) config('modules.ai.key');
        $headers = ['Accept' => 'application/json', 'User-Agent' => 'Jexactyl-AI/4'];

        if ($protocol === 'anthropic') {
            $headers['anthropic-version'] = '2023-06-01';
            if (in_array($format, ['anthropic_messages', 'command_code'], true)) {
                $headers['x-api-key'] = $key;
            } else {
                $headers['Authorization'] = 'Bearer ' . $key;
            }
        } elseif ($format === 'google_ai_studio') {
            $headers['x-goog-api-key'] = $key;
        } elseif ($key !== '') {
            $headers['Authorization'] = 'Bearer ' . $key;
        }
        if ($format === 'anthropic_claude_code') {
            $headers['anthropic-beta'] = 'oauth-2025-04-20';
        }

        if (in_array($format, ['opencode_zen', 'opencode_go'], true)) {
            $headers['x-opencode-session'] = (string) Str::uuid();
        }
        if ($format === 'github_copilot') {
            $headers['X-GitHub-Api-Version'] = '2026-06-01';
            $headers['Editor-Version'] = 'Jexactyl/4';
            $headers['X-Initiator'] = 'user';
        }
        if ($format === 'openai_codex' && config('modules.ai.project')) {
            $headers['ChatGPT-Account-Id'] = (string) config('modules.ai.project');
        }

        return Http::acceptJson()->asJson()->timeout(120)->withHeaders($headers);
    }

    private function modelsUrl(string $format): ?string
    {
        $base = $this->baseUrl($format);

        return match ($format) {
            'anthropic_messages', 'anthropic_claude_code' => $this->endpoint($base, '/v1/models?limit=1000'),
            'command_code' => $this->endpoint($base, '/models'),
            'opencode_zen', 'opencode_go', 'openrouter', 'openai_chat', 'openai_responses', 'github_copilot', 'openai_codex', 'xai_grok_build', 'zed' => $this->endpoint($base, '/models'),
            'google_ai_studio' => $this->endpoint($base, '/models'),
            'ollama_chat' => $this->endpoint($base, '/api/tags'),
            default => null,
        };
    }

    private function baseUrl(string $format): string
    {
        $custom = rtrim((string) config('modules.ai.base_url'), '/');
        if ($custom !== '') {
            return $custom;
        }

        return match ($format) {
            'anthropic_messages', 'anthropic_claude_code' => 'https://api.anthropic.com',
            'command_code' => 'https://api.commandcode.ai/provider/v1',
            'opencode_zen' => 'https://opencode.ai/zen/v1',
            'opencode_go' => 'https://opencode.ai/zen/go/v1',
            'openrouter' => 'https://openrouter.ai/api/v1',
            'google_ai_studio' => 'https://generativelanguage.googleapis.com/v1beta',
            'google_vertex_ai' => $this->vertexBaseUrl(),
            'openai_chat', 'openai_responses' => 'https://api.openai.com/v1',
            'ollama_chat' => 'http://localhost:11434',
            'zed' => throw new \RuntimeException('A Zed API base URL must be configured.'),
            'google_antigravity' => 'https://daily-cloudcode-pa.googleapis.com/v1internal',
            'google_gemini_cli' => 'https://cloudcode-pa.googleapis.com/v1internal',
            'github_copilot' => 'https://api.githubcopilot.com',
            'openai_codex' => 'https://chatgpt.com/backend-api/codex',
            'xai_grok_build' => 'https://api.x.ai/v1',
            default => throw new \RuntimeException("Unsupported AI API format: {$format}"),
        };
    }

    private function vertexBaseUrl(): string
    {
        $location = (string) config('modules.ai.location', 'global');

        return $location === 'global'
            ? 'https://aiplatform.googleapis.com/v1'
            : "https://{$location}-aiplatform.googleapis.com/v1";
    }

    private function vertexUrl(string $base, string $model): string
    {
        $project = rawurlencode((string) config('modules.ai.project'));
        $location = rawurlencode((string) config('modules.ai.location', 'global'));
        if ($project === '') {
            throw new \RuntimeException('A Google Cloud project ID must be configured for Vertex AI.');
        }

        return $this->endpoint($base, "/projects/{$project}/locations/{$location}/publishers/google/models/" . rawurlencode($model) . ':generateContent');
    }

    private function endpoint(string $base, string $path): string
    {
        $basePath = (string) parse_url($base, PHP_URL_PATH);
        if (Str::endsWith($basePath, '/v1') && Str::startsWith($path, '/v1/')) {
            $path = Str::after($path, '/v1');
        }

        return rtrim($base, '/') . '/' . ltrim($path, '/');
    }

    private function zedProvider(string $model): string
    {
        return match (true) {
            Str::startsWith($model, 'claude-') => 'anthropic',
            Str::startsWith($model, 'gemini-') => 'google',
            Str::startsWith($model, 'grok-') => 'x_ai',
            default => 'open_ai',
        };
    }

    private function routeFromMetadata(array $model): ?string
    {
        $endpoints = $model['supported_endpoints'] ?? data_get($model, 'capabilities.supported_endpoints', []);
        if (!is_array($endpoints)) {
            $endpoints = [];
        }

        if (in_array('/v1/messages', $endpoints, true) || in_array('/messages', $endpoints, true)) {
            return 'anthropic';
        }
        if (in_array('/responses', $endpoints, true)) {
            return 'responses';
        }
        if (in_array('/chat/completions', $endpoints, true)) {
            return 'chat';
        }

        $endpoint = (string) ($model['endpoint'] ?? $model['api'] ?? '');

        return match (true) {
            str_contains($endpoint, 'generateContent') => 'gemini',
            str_contains($endpoint, 'messages') => 'anthropic',
            str_contains($endpoint, 'responses') => 'responses',
            str_contains($endpoint, 'chat/completions') => 'chat',
            default => null,
        };
    }

    private function storedRoute(string $model): ?string
    {
        $routes = json_decode((string) config('modules.ai.model_routes', '[]'), true);
        $format = (string) config('modules.ai.format');
        $route = is_array($routes) && is_array($routes[$format] ?? null)
            ? ($routes[$format][$model] ?? null)
            : null;

        return in_array($route, ['anthropic', 'chat', 'responses', 'gemini'], true) ? $route : null;
    }

    private function protocolUrl(string $base, string $protocol, string $model): string
    {
        return match ($protocol) {
            'anthropic' => $this->endpoint($base, '/messages'),
            'responses' => $this->endpoint($base, '/responses'),
            'gemini' => $this->endpoint($base, '/models/' . rawurlencode($model) . ':generateContent'),
            default => $this->endpoint($base, '/chat/completions'),
        };
    }

    private function zedPayload(string $model, string $prompt): array
    {
        return match ($this->zedProvider($model)) {
            'anthropic' => ['model' => $model, 'max_tokens' => 4096, 'messages' => [['role' => 'user', 'content' => $prompt]]],
            'google' => ['contents' => [['role' => 'user', 'parts' => [['text' => $prompt]]]]],
            'open_ai' => ['model' => $model, 'input' => $prompt, 'stream' => true],
            default => ['model' => $model, 'messages' => [['role' => 'user', 'content' => $prompt]], 'stream' => true],
        };
    }
}
