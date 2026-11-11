import { svelte } from '@sveltejs/vite-plugin-svelte';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { defineConfig } from 'vite';
import { compression } from 'vite-plugin-compression2';
import { laravelHot } from './plugins/laravel-hot';

const root = dirname(fileURLToPath(import.meta.url));
const r = (...p: string[]) => resolve(root, ...p);

/**
 * The Svelte application is built as a standalone SPA bundle into `public/build-svelte`,
 * deliberately isolated from the legacy Preact bundle in `public/build`. The two cannot
 * share a PostCSS pipeline: the legacy app drives twin.macro off the Tailwind 3 config
 * object, while this app uses Tailwind 4's CSS-first configuration.
 *
 * Laravel serves the manifest from this directory; see resources/views/templates/svelte.blade.php.
 */
export default defineConfig(({ command }) => ({
    // Laravel only rewrites the entry tags it reads from the manifest; URLs the bundle
    // itself resolves at runtime (lazy route chunks, chunk CSS) are built from `base`,
    // so in production it must carry the build directory or they 404 into the SPA
    // fallback. Dev entry tags from the hot file already omit the build directory,
    // so dev keeps the default root.
    base: command === 'build' ? '/build-svelte/' : '/',
    plugins: [
        tailwindcss(),
        svelte(),
        laravelHot({ hotFile: r('../public/hot-svelte') }),
        compression({
            algorithms: ['brotliCompress', 'gzip'],
            include: /\.(js|mjs|css|svg|json)$/,
            threshold: 1024,
        }),
    ],

    resolve: {
        alias: {
            $lib: r('src/lib'),
            $features: r('src/features'),
            $types: r('src/types'),
            $styles: r('src/styles'),
        },
    },

    build: {
        outDir: r('../public/build-svelte'),
        emptyOutDir: true,
        // Laravel's Vite helper reads `<buildDirectory>/manifest.json`, whereas Vite
        // defaults to `.vite/manifest.json`. Emit it where Laravel looks for it.
        manifest: 'manifest.json',
        chunkSizeWarningLimit: 600,
        sourcemap: false,
        rollupOptions: {
            input: r('src/main.ts'),
            output: {
                manualChunks(id) {
                    // Vite's dynamic-import preload helper used to land in whichever vendor
                    // chunk the entry happened to pull first (vendor-codemirror, 1.66 MB),
                    // making every page download CodeMirror. Pinning it next to the runtime
                    // keeps the helper (and thus each entry) free of vendor code.
                    if (id === '\u0000vite/preload-helper.js' || id.includes('rolldown-runtime')) return '_runtime';

                    if (!id.includes('node_modules')) return;

                    // ECharts and xterm are large and only needed on specific pages; keeping
                    // them in dedicated chunks means the dashboard never downloads them.
                    if (id.includes('echarts') || id.includes('zrender')) return 'vendor-charts';
                    if (id.includes('@xterm')) return 'vendor-xterm';
                    if (id.includes('@codemirror') || id.includes('@lezer')) return 'vendor-codemirror';
                    if (id.includes('@tanstack')) return 'vendor-tanstack';
                    if (id.includes('bits-ui')) return 'vendor-bits';
                    if (id.includes('zod')) return 'vendor-zod';
                    if (id.includes('axios')) return 'vendor-http';
                    if (id.includes('gsap')) return 'vendor-gsap';

                    return undefined;
                },
            },
        },
    },

    server: {
        port: 5174,
        strictPort: true,
        cors: { origin: '*' },
        // Assets are requested by the Laravel-rendered page on another origin during dev.
        origin: 'http://localhost:5174',
    },

    // The legacy bundle's dev server owns `public/hot`; this one writes its own file so
    // both can run at the same time. The Blade template points at it via Vite::useHotFile.
    publicDir: false,
}));
