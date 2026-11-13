{{--
    Document shell for the Svelte 5 frontend.

    This mirrors templates/wrapper.blade.php: the same four globals are injected, so the
    Svelte bundle reads exactly the same bootstrap contract as the legacy Preact bundle.
    The only differences are the asset entry point and build directory.
--}}
<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
    <head>
        <title>{{ config('app.name', 'Everest') }}</title>

        <meta charset="utf-8">
        <meta http-equiv="X-UA-Compatible" content="IE=edge">
        <meta content="width=device-width, initial-scale=1" name="viewport">
        <meta name="csrf-token" content="{{ csrf_token() }}">
        <meta name="robots" content="noindex">

        <link rel="apple-touch-icon" sizes="180x180" href="/favicons/apple-touch-icon.png">
        <link rel="icon" type="image/png" href="/favicons/favicon-32x32.png" sizes="32x32">
        <link rel="icon" type="image/png" href="/favicons/favicon-16x16.png" sizes="16x16">
        <link rel="manifest" href="/favicons/manifest.json">
        <link rel="shortcut icon" href="/favicons/favicon.ico">
        <meta name="msapplication-config" content="/favicons/browserconfig.xml">

        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link rel="stylesheet" href="//fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600&family=Inter:wght@400;500;600&display=swap">

        {{-- Bootstrap contract. Keep in step with templates/wrapper.blade.php. --}}
        @if(!is_null(Auth::user()))
            <script>
                window.PterodactylUser = {!! json_encode(Auth::user()->toReactObject(), JSON_HEX_TAG|JSON_HEX_AMP|JSON_HEX_APOS|JSON_HEX_QUOT) !!};
            </script>
        @endif
        @if(!empty($siteConfiguration))
            <script>
                window.SiteConfiguration = {!! json_encode($siteConfiguration, JSON_HEX_TAG|JSON_HEX_AMP|JSON_HEX_APOS|JSON_HEX_QUOT) !!};
            </script>
        @endif
        @if(!empty($everestConfiguration))
            <script>
                window.EverestConfiguration = {!! json_encode($everestConfiguration, JSON_HEX_TAG|JSON_HEX_AMP|JSON_HEX_APOS|JSON_HEX_QUOT) !!};
            </script>
        @endif
        @if(!empty($themeConfiguration))
            <script>
                window.ThemeConfiguration = {!! json_encode($themeConfiguration, JSON_HEX_TAG|JSON_HEX_AMP|JSON_HEX_APOS|JSON_HEX_QUOT) !!};
            </script>
        @endif

        {{-- Applies the stored colour scheme and the panel's brand colour before the
             first paint, so the page does not flash the wrong theme while the bundle
             loads. --}}
        <script>
            (function () {
                try {
                    var stored = localStorage.getItem('jexactyl:color-scheme');
                    var dark = stored === 'dark' ||
                        ((!stored || stored === 'system') &&
                            window.matchMedia('(prefers-color-scheme: dark)').matches);
                    if (dark) document.documentElement.classList.add('dark');
                    document.documentElement.style.colorScheme = dark ? 'dark' : 'light';
                } catch (e) {
                    // localStorage can throw in private modes; the default theme is fine.
                }

                // The brand colour belongs to the panel rather than to the user, so it
                // comes from the server theme instead of from local storage. The
                // accent tokens are derived from it in CSS.
                var theme = window.ThemeConfiguration;
                var brand = theme && theme.colors && theme.colors.primary;
                if (brand && /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(brand)) {
                    document.documentElement.style.setProperty('--brand', brand);
                }
            })();
        </script>

        @include('layouts.scripts')

        {{-- Asset tags for the Svelte bundle. Built by SvelteAssetComposer, which points a
             dedicated Vite instance at public/build-svelte and the hot-svelte dev file so
             this app's dev server does not collide with the legacy bundle's. --}}
        {!! $svelteAssets !!}
    </head>
    <body>
        <div id="app"></div>
    </body>
</html>
