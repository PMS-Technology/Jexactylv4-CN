<?php

namespace Everest\Http\Controllers\Admin;

use Illuminate\View\View;
use Illuminate\Http\Request;
use Everest\Http\Controllers\Controller;
use Symfony\Component\HttpKernel\Exception\AccessDeniedHttpException;

class BaseController extends Controller
{
    public function index(Request $request): View
    {
        $user = $request->user();

        if (!$user || (!$user->root_admin && !$user->admin_role_id)) {
            throw new AccessDeniedHttpException('You do not have permission to access this resource.');
        }

        return view($this->template($request));
    }

    /**
     * Picks the frontend shell for an admin page. Every admin page is ported to the Svelte
     * frontend, so APP_FRONTEND alone decides; unknown paths get the Svelte 404 page.
     *
     * @see MIGRATION_PLAN.md
     */
    protected function template(Request $request): string
    {
        return config('app.frontend') === 'svelte' ? 'templates/svelte.core' : 'templates/base.core';
    }
}
