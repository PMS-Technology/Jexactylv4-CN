<?php

namespace Everest\Services\AI\Server;

use Everest\Models\User;
use Everest\Models\Server;
use Everest\Services\AI\AIService;
use Everest\Services\AI\Data\AITool;
use Everest\Services\AI\Data\AIMessage;
use Everest\Services\AI\Data\UnifiedRequest;
use Everest\Services\AI\Data\UnifiedResponse;
use Everest\Services\AI\Server\Data\ServerAITurn;
use Everest\Services\AI\Server\Contracts\ServerAITool;

/**
 * Drives the assistant for one server.
 *
 * The assistant is a loop: the model asks for tools, the panel runs the
 * read-only ones right away and hands the mutating ones to the user for
 * approval. This class owns the prompts, the tool list and that split; the
 * transport (one-shot or streaming) lives in the controller.
 */
class ServerAIAssistant
{
    public const MODE_CHAT = 'chat';
    public const MODE_DIAGNOSE = 'diagnose';

    /**
     * How many console lines are handed to the model with the crash report.
     */
    private const DIAGNOSE_CONSOLE_LINES = 200;

    public function __construct(
        protected readonly AIService $ai,
        protected readonly ServerAIToolRegistry $registry,
        protected readonly ServerAIToolExecutor $executor,
    ) {
    }

    public function registry(): ServerAIToolRegistry
    {
        return $this->registry;
    }

    public function executor(): ServerAIToolExecutor
    {
        return $this->executor;
    }

    /**
     * The tools the model may call in this mode.
     *
     * @return ServerAITool[]
     */
    public function tools(Server $server, User $user, string $mode): array
    {
        if ($mode === self::MODE_DIAGNOSE) {
            return $this->registry->readOnlyForUser($server, $user);
        }

        return $this->registry->forUser($server, $user);
    }

    /**
     * The instructions the model works under.
     */
    public function systemPrompt(Server $server, User $user, string $mode, array $context = []): string
    {
        $base = (string) config('modules.ai.system_prompt');

        if ($mode === self::MODE_DIAGNOSE) {
            return $this->diagnosePrompt($server, $base, $context);
        }

        return $this->chatPrompt($server, $user, $base);
    }

    /**
     * Build the request that is sent upstream.
     */
    public function request(
        Server $server,
        User $user,
        array $messages,
        string $mode,
        array $context = [],
        bool $stream = false,
    ): UnifiedRequest {
        $tools = array_map(fn (ServerAITool $tool) => new AITool(
            name: $tool->name(),
            description: $tool->description(),
            parameters: $tool->parameters(),
        ), $this->tools($server, $user, $mode));

        return new UnifiedRequest(
            messages: array_map(fn (array $message) => AIMessage::fromArray($message), $messages),
            system: $this->systemPrompt($server, $user, $mode, $context),
            maxTokens: (int) config('modules.ai.max_tokens', 1024),
            temperature: (float) config('modules.ai.temperature', 0.7),
            tools: $tools,
            stream: $stream,
        );
    }

    /**
     * Run one turn: ask the model, then run the tool calls it made.
     *
     * Read-only tools run immediately. Mutating tools run immediately only in
     * bypass mode; otherwise they are returned as pending so the user can
     * approve them.
     */
    public function turn(
        Server $server,
        User $user,
        array $messages,
        string $mode,
        bool $bypass = false,
        array $context = [],
    ): ServerAITurn {
        $response = $this->ai->chat($this->request($server, $user, $messages, $mode, $context));

        return $this->process($server, $user, $response, $mode, $bypass, $context);
    }

    /**
     * Split the tool calls of a response into the ones that run now and the
     * ones that wait for the user's approval.
     */
    public function process(
        Server $server,
        User $user,
        UnifiedResponse $response,
        string $mode,
        bool $bypass,
        array $context = [],
    ): ServerAITurn {
        $executed = [];
        $pending = [];

        foreach ($response->toolCalls as $call) {
            $name = (string) ($call['name'] ?? '');
            $arguments = (array) ($call['arguments'] ?? []);
            $id = (string) ($call['id'] ?? '');

            $tool = $this->registry->find($name);

            // A tool the model invented, or one the user may not use, is
            // reported back as a failed result so the model can correct itself.
            if (!$tool || !$this->registry->allowed($tool, $server, $user, $arguments)) {
                $executed[] = [
                    'id' => $id,
                    'name' => $name,
                    'arguments' => $arguments,
                    'ok' => false,
                    'output' => $tool
                        ? sprintf('You do not have permission to use "%s" on this server.', $name)
                        : sprintf('There is no tool called "%s".', $name),
                ];

                continue;
            }

            // A diagnosis changes nothing, whatever the user is allowed to do
            // elsewhere. A tool that writes is refused rather than run.
            if ($tool->mutates() && $mode === self::MODE_DIAGNOSE) {
                $executed[] = [
                    'id' => $id,
                    'name' => $name,
                    'arguments' => $arguments,
                    'ok' => false,
                    'output' => sprintf(
                        'This is a read-only diagnosis. "%s" would change the server, so it was not run. '
                        . 'Describe the change in your report instead.',
                        $name
                    ),
                ];

                continue;
            }

            // Mutating tools run immediately only in bypass mode; otherwise they
            // are returned as pending so the user can approve them.
            $requiresApproval = $tool->mutates() && !$bypass;

            if ($requiresApproval) {
                $pending[] = $this->executor->describe($name, $arguments) + ['id' => $id];

                continue;
            }

            $result = $this->executor->execute($server, $user, $name, $arguments, $context);

            $executed[] = [
                'id' => $id,
                'name' => $name,
                'arguments' => $arguments,
                'ok' => $result->ok,
                'output' => $result->output,
            ];
        }

        return new ServerAITurn($response, $executed, $pending);
    }

    /**
     * Run one turn and stream it.
     *
     * The generator yields plain arrays so the controller can forward them as
     * server-sent events without knowing anything about the AI layer. The last
     * event is always the finished turn.
     *
     * @return \Generator<int, array>
     */
    public function stream(
        Server $server,
        User $user,
        array $messages,
        string $mode,
        bool $bypass = false,
        array $context = [],
    ): \Generator {
        $request = $this->request($server, $user, $messages, $mode, $context, true);
        $response = null;

        foreach ($this->ai->stream($request) as $event) {
            if ($event->type === 'text') {
                yield ['type' => 'text', 'text' => $event->text];

                continue;
            }

            if ($event->type === 'tool_call' && ($event->toolCall['name'] ?? '') !== '') {
                yield ['type' => 'tool_call', 'tool_call' => $event->toolCall];

                continue;
            }

            if ($event->type === 'error') {
                yield ['type' => 'error', 'message' => $event->error ?? 'The model returned an error.'];

                return;
            }

            if ($event->type === 'complete' && $event->response instanceof UnifiedResponse) {
                $response = $event->response;
            }
        }

        if (!$response instanceof UnifiedResponse) {
            yield ['type' => 'error', 'message' => 'The model did not return a response.'];

            return;
        }

        $turn = $this->process($server, $user, $response, $mode, $bypass, $context);

        yield ['type' => 'done'] + $turn->toArray();
    }

    /**
     * The prompt for the everyday assistant.
     */
    protected function chatPrompt(Server $server, User $user, string $base): string
    {
        return implode("\n\n", array_filter([
            $base,
            sprintf(
                'You are helping with one game server: "%s" (uuid %s). Its game is %s.',
                $server->name,
                $server->uuid,
                $server->egg->name
            ),
            'How to work:',
            '- Answer in Markdown. Use headings for longer answers, bullet lists for steps, and fenced code blocks for commands, file contents and configuration snippets.',
            '- Read before you write. Use the tools to look at the real state of the server instead of guessing. Never state a file content, a log line or a command output you did not read.',
            '- Say in one short sentence what you are about to change before you call a tool that changes the server.',
            '- Tools that change the server are shown to the user for approval. If the user rejects one, do not try again with the same call; explain what you would have done and let them decide.',
            '- Prefer the smallest change that solves the problem. Before overwriting a file, read it and tell the user what you are replacing.',
            '- Put every console command you suggest in a fenced code block so it can be copied.',
            '- Keep answers short. The user is usually looking at a broken server.',
        ]));
    }

    /**
     * The prompt for the crash diagnosis.
     */
    protected function diagnosePrompt(Server $server, string $base, array $context): string
    {
        $lines = (array) ($context['console_log'] ?? []);
        $tail = array_slice($lines, -self::DIAGNOSE_CONSOLE_LINES);
        $console = $tail === [] ? '(the console buffer is empty)' : implode("\n", $tail);

        return implode("\n\n", array_filter([
            $base,
            sprintf(
                'You are diagnosing a crash on one game server: "%s" (uuid %s). Its game is %s.',
                $server->name,
                $server->uuid,
                $server->egg->name
            ),
            'This is a READ-ONLY session. You may read the server, but you must not change anything: '
            . 'do not call any tool that writes, deletes, downloads, restarts or changes a setting.',
            'Work through the console output below, then read the configuration files that are relevant '
            . 'to the crash. Quote the exact log lines and file lines that support your conclusion.',
            'Answer with a Markdown report using exactly these sections:',
            '1. `## 结论` — one or two sentences: what crashed and the most likely cause.',
            '2. `## 证据` — the exact log lines and file contents that support the conclusion, quoted.',
            '3. `## 原因分析` — the causal chain in plain language.',
            '4. `## 修复步骤` — an ordered list of concrete steps. Mark each one as `手动执行` (the user does it) or `AI 可执行` (the assistant could do it once the user asks).',
            '5. `## 风险与回滚` — what could break and how to undo it.',
            '6. `## 仍需确认` — anything you could not determine from the server.',
            'Do not invent facts. If the console output does not contain the error, say so under `仍需确认` and list what the user should provide.',
            '## 控制台输出',
            '```',
            $console,
            '```',
        ]));
    }
}
