import { app } from '$lib/stores/app.svelte';
import { Recaptcha } from '$lib/utils/recaptcha';

let widget: Recaptcha | null = null;

/** A fresh reCAPTCHA token when the panel requires one, otherwise undefined. */
export async function captchaToken(): Promise<string | undefined> {
    const config = app.settings?.recaptcha;
    if (!config?.enabled) return undefined;

    widget ??= new Recaptcha(config.siteKey);

    return widget.execute();
}
