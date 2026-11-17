<?php

namespace Everest\Http\Controllers\Api\Client\Servers;

use Everest\Models\Server;
use Illuminate\Http\Response;
use Illuminate\Http\JsonResponse;
use Everest\Services\AI\Server\ServerAIAssistant;
use Symfony\Component\HttpFoundation\StreamedResponse;
use Everest\Services\AI\Exceptions\AIProviderException;
use Everest\Http\Controllers\Api\Client\ClientApiController;
use Everest\Services\AI\Exceptions\AIConfigurationException;
use Everest\Http\Requests\Api\Client\Servers\AI\AssistantStepRequest;
use Everest\Http\Requests\Api\Client\Servers\AI\AssistantExecuteRequest;

/**
 * The AI assistant for a single server.
 *
 * The assistant runs as a loop that the browser drives: every call to `step`
 * asks the model for one turn, runs the read-only tools it asked for and
 * hands back the mutating ones. The browser then sends the next turn, or asks
 * `execute` to run the calls the user approved.
 */
class AIAssistantController extends ClientApiController
{
    public function __construct(
        private readonly ServerAIAssistant $assistant,
    ) {
        parent::__construct();
    }

    /**
     * Run one turn of the assistant.
     */
    public function step(AssistantStepRequest $request, Server $server): JsonResponse|StreamedResponse|Response
    {
        $user = $request->user();
        $mode = $request->mode();
        $context = ['console_log' => $request->consoleLog()];
        $messages = $request->conversation();
        $bypass = $request->bypass();

        if ($request->streams()) {
            return $this->stream($request, $server, $user, $messages, $mode, $bypass, $context);
        }

        try {
            $turn = $this->assistant->turn($server, $user, $messages, $mode, $bypass, $context);
        } catch (AIProviderException $exception) {
            return response($exception->body, $exception->status, [
                'Content-Type' => $exception->contentType,
            ]);
        } catch (AIConfigurationException $exception) {
            return response()->json(['error' => $exception->getMessage()], 400);
        }

        return response()->json($turn->toArray());
    }

    /**
     * Run the tool calls the user approved.
     */
    public function execute(AssistantExecuteRequest $request, Server $server): JsonResponse
    {
        $user = $request->user();
        $context = ['console_log' => $request->consoleLog()];
        $executor = $this->assistant->executor();

        $executed = [];

        foreach ($request->calls() as $call) {
            $result = $executor->execute($server, $user, $call['name'], $call['arguments'], $context);

            $executed[] = [
                'id' => $call['id'],
                'name' => $call['name'],
                'arguments' => $call['arguments'],
                'ok' => $result->ok,
                'output' => $result->output,
            ];
        }

        return response()->json(['executed' => $executed]);
    }

    /**
     * Stream a turn of the assistant as server-sent events.
     */
    protected function stream(
        AssistantStepRequest $request,
        Server $server,
        $user,
        array $messages,
        string $mode,
        bool $bypass,
        array $context,
    ): StreamedResponse {
        return response()->stream(function () use ($server, $user, $messages, $mode, $bypass, $context) {
            try {
                foreach ($this->assistant->stream($server, $user, $messages, $mode, $bypass, $context) as $event) {
                    $this->emit($event);
                }
            } catch (AIProviderException $exception) {
                $this->emit([
                    'type' => 'error',
                    'message' => '上游返回错误：' . $exception->body,
                ]);
            } catch (AIConfigurationException $exception) {
                $this->emit([
                    'type' => 'error',
                    'message' => $exception->getMessage(),
                ]);
            } catch (\Throwable $exception) {
                $this->emit([
                    'type' => 'error',
                    'message' => $exception->getMessage(),
                ]);
            }
        }, 200, [
            'Content-Type' => 'text/event-stream',
            'Cache-Control' => 'no-cache',
            'X-Accel-Buffering' => 'no',
        ]);
    }

    protected function emit(array $event): void
    {
        echo 'data: ' . json_encode($event, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) . "\n\n";

        if (ob_get_level() > 0) {
            @ob_flush();
        }

        flush();
    }
}
