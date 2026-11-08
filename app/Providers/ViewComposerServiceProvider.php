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
        // All three composers only feed the Svelte shell (the only remaining view with
        // JS globals), so scoping them to it keeps invoice PDF renders free of them.
        $this->app->make('view')->composer('templates/svelte.core', AssetComposer::class);
        $this->app->make('view')->composer('templates/svelte.core', ThemeComposer::class);
        $this->app->make('view')->composer('templates/svelte.core', EverestComposer::class);
        $this->app->make('view')->composer('templates/svelte.core', SvelteAssetComposer::class);
    }
}
