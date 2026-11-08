<?php

namespace Everest\Providers;

use Illuminate\Support\ServiceProvider;
use Everest\Http\ViewComposers\AssetComposer;
use Everest\Http\ViewComposers\ThemeComposer;
use Everest\Http\ViewComposers\EverestComposer;
use Everest\Http\ViewComposers\SvelteAssetComposer;

class ViewComposerServiceProvider extends ServiceProvider
{
    /**
     * Register bindings in the container.
     */
    public function boot(): void
    {
        $this->app->make('view')->composer('*', AssetComposer::class);
        $this->app->make('view')->composer('*', ThemeComposer::class);
        $this->app->make('view')->composer('*', EverestComposer::class);

        // Scoped to the Svelte shell so the extra Vite instance is only built when that
        // template is actually rendered.
        $this->app->make('view')->composer('templates/svelte.core', SvelteAssetComposer::class);
    }
}
