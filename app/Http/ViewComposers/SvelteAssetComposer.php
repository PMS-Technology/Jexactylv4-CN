<?php

namespace Everest\Http\ViewComposers;

use Illuminate\View\View;
use Illuminate\Foundation\Vite;

class SvelteAssetComposer
{
    /**
     * Builds the asset tags for the Svelte 5 frontend.
     *
     * The Svelte app is a separate Vite project that outputs to public/build-svelte and,
     * in development, writes public/hot-svelte. A dedicated Vite instance is used rather
     * than the shared singleton so toggling the build directory and hot file here cannot
     * affect the legacy bundle's tags elsewhere in the same request.
     */
    public function compose(View $view): void
    {
        $vite = (new Vite())
            ->useHotFile(public_path('hot-svelte'))
            ->useBuildDirectory('build-svelte');

        // Manifest keys are relative to the Svelte app's own Vite root (frontend/),
        // so the entry point is 'src/main.ts' rather than 'frontend/src/main.ts'.
        $view->with('svelteAssets', $vite(['src/main.ts']));
    }
}
