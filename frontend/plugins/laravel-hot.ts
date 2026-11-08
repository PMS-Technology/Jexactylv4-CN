import { existsSync, rmSync, writeFileSync } from 'node:fs';
import type { Plugin, ViteDevServer } from 'vite';

/**
 * Writes the hot file Laravel's Vite helper looks for during development.
 *
 * The legacy Preact bundle's dev server owns `public/hot`, so this app uses a separate
 * filename and the Blade template points at it with `Vite::useHotFile()`. Without this,
 * the two dev servers would overwrite each other's hot file and Laravel would serve
 * assets from whichever started last.
 */
export function laravelHot(options: { hotFile: string }): Plugin {
    let exitHandlersBound = false;

    const clean = () => {
        if (existsSync(options.hotFile)) {
            rmSync(options.hotFile);
        }
    };

    return {
        name: 'laravel-hot',
        apply: 'serve',
        configureServer(server: ViteDevServer) {
            server.httpServer?.once('listening', () => {
                const address = server.httpServer?.address();
                const origin =
                    typeof address === 'object' && address
                        ? `http://localhost:${address.port}`
                        : (server.config.server.origin ?? '');

                writeFileSync(options.hotFile, origin);
            });

            if (exitHandlersBound) return;

            // Remove the hot file on shutdown so a later page load falls back to the
            // built manifest instead of pointing at a dev server that is gone.
            process.on('exit', clean);
            process.on('SIGINT', () => process.exit());
            process.on('SIGTERM', () => process.exit());
            process.on('SIGHUP', () => process.exit());

            exitHandlersBound = true;
        },
    };
}
