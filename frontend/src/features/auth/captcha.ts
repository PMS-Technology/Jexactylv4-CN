import { app } from '$lib/stores/app.svelte';
import { createCaptchaWidget, type CaptchaPayload, type CaptchaWidget } from '$lib/utils/recaptcha';

let widget: CaptchaWidget | null = null;
let widgetKey = '';

/**
 * Runs the currently configured captcha and returns the provider-specific
 * request fields. Returns undefined when captcha is disabled, preserving the
 * original auth request shape.
 */
export async function captchaPayload(purpose: string = 'login'): Promise<CaptchaPayload | undefined> {
    const config = app.settings?.captcha;
    if (!config?.enabled) {
        widget?.destroy();
        widget = null;
        widgetKey = '';

        return undefined;
    }

    const key = [config.provider, config.siteKey, config.apiBase, purpose].join('|');
    if (!widget || key !== widgetKey) {
        widget?.destroy();
        widget = createCaptchaWidget(config, purpose);
        widgetKey = key;
    }

    return widget.execute();
}

/** Backwards-compatible name for callers that only need the payload. */
export const captchaToken = captchaPayload;
