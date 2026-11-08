<?php

namespace Everest\Http\Controllers\Base;

use Illuminate\View\View;
use Everest\Http\Controllers\Controller;
use Illuminate\View\Factory as ViewFactory;
use Everest\Contracts\Repository\ServerRepositoryInterface;

class IndexController extends Controller
{
    /**
     * IndexController constructor.
     */
    public function __construct(
        protected ServerRepositoryInterface $repository,
        protected ViewFactory $view,
    ) {
    }

    /**
     * Returns listing of user's servers.
     */
    public function index(): View
    {
        return view($this->template());
    }

    /**
     * Picks the frontend shell to render. Every dashboard, account and server page is
     * ported to the Svelte frontend, so APP_FRONTEND alone decides; unknown paths get the
     * Svelte 404 page. Set APP_FRONTEND=legacy to fall back to the Preact bundle.
     *
     * @see MIGRATION_PLAN.md
     */
    protected function template(): string
    {
        return config('app.frontend') === 'svelte' ? 'templates/svelte.core' : 'templates/base.core';
    }
}
