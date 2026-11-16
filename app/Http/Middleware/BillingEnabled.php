<?php

namespace Everest\Http\Middleware;

use Illuminate\Http\Request;
use Everest\Services\Panel\PanelMode;
use Symfony\Component\HttpKernel\Exception\AccessDeniedHttpException;

class BillingEnabled
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
        // The billing system only exists in standard mode; personal mode drops it,
        // so nothing can be ordered, paid for or billed.
        if (!config('modules.billing.enabled') || !$this->panelMode->allows('billing')) {
            throw new AccessDeniedHttpException();
        }

        return $next($request);
    }
}
