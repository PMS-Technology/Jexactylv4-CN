<?php

namespace Everest\Http\Middleware;

use Illuminate\Http\Request;
use Everest\Services\Panel\PanelMode;
use Symfony\Component\HttpKernel\Exception\AccessDeniedHttpException;

class TicketsEnabled
{
    public function __construct(private PanelMode $panelMode)
    {
    }

    /**
     * Handle an incoming request.
     *
     * @throws AccessDeniedHttpException
     */
    public function handle(Request $request, \Closure $next): mixed
    {
        // Tickets are a hosting provider feature; personal mode drops them.
        if (!config('modules.tickets.enabled') || !$this->panelMode->allows('tickets')) {
            throw new AccessDeniedHttpException();
        }

        return $next($request);
    }
}
