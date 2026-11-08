/**
 * Invisible reCAPTCHA v2, replacing the legacy `reaptcha` component. The script loads on
 * first use; each `execute()` resets the widget and resolves with a fresh single-use token.
 */
interface Grecaptcha {
    render(el: HTMLElement, options: Record<string, unknown>): number;
    execute(id: number): void;
    reset(id: number): void;
}

declare global {
    interface Window {
        grecaptcha?: Grecaptcha;
        __recaptchaReady?: () => void;
    }
}

let loader: Promise<Grecaptcha> | null = null;

function load(): Promise<Grecaptcha> {
    loader ??= new Promise((resolve, reject) => {
        const script = document.createElement('script');
        // Where Google is blocked the request can hang rather than fail, which left the
        // submit button spinning; give up after 15 seconds so the user can retry.
        const fail = () => {
            clearTimeout(timer);
            loader = null;
            script.remove();
            reject(new Error('无法加载 reCAPTCHA，请检查网络后重试。'));
        };
        const timer = setTimeout(fail, 15_000);
        window.__recaptchaReady = () => {
            clearTimeout(timer);
            resolve(window.grecaptcha!);
        };
        script.src = 'https://www.google.com/recaptcha/api.js?onload=__recaptchaReady&render=explicit';
        script.async = true;
        script.onerror = fail;
        document.head.appendChild(script);
    });

    return loader;
}

type Pending = { resolve: (token: string) => void; reject: (error: Error) => void };

export class Recaptcha {
    #siteKey: string;
    #widget: number | null = null;
    #pending: Pending | null = null;

    constructor(siteKey: string) {
        this.#siteKey = siteKey;
    }

    async execute(): Promise<string> {
        const g = await load();

        if (this.#widget === null) {
            const el = document.createElement('div');
            document.body.appendChild(el);
            this.#widget = g.render(el, {
                sitekey: this.#siteKey || '_invalid_key',
                size: 'invisible',
                callback: (token: string) => this.#settle(p => p.resolve(token)),
                'expired-callback': () => this.#settle(p => p.reject(new Error('人机验证已过期，请重试。'))),
                'error-callback': () => this.#settle(p => p.reject(new Error('人机验证失败，请重试。'))),
            });
        }

        return new Promise((resolve, reject) => {
            this.#pending = { resolve, reject };
            g.reset(this.#widget!);
            g.execute(this.#widget!);
        });
    }

    #settle(fn: (pending: Pending) => void) {
        const pending = this.#pending;
        this.#pending = null;
        if (pending) fn(pending);
    }
}
