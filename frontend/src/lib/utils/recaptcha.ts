/**
 * Client-side captcha providers.
 *
 * Every provider loads its own script lazily and exposes the same `execute()`
 * contract. The returned payload uses the field names the matching server-side
 * verifier reads, so the auth API can simply spread it into the request body.
 */
export type CaptchaProvider = 'recaptcha' | 'hcaptcha' | 'turnstile' | 'geetest' | 'corptcha';

export type CaptchaPayload = Record<string, string>;

export interface CaptchaConfig {
    enabled: boolean;
    provider: CaptchaProvider;
    siteKey: string;
    scriptUrl?: string;
    apiBase?: string;
}

export interface CaptchaWidget {
    execute(): Promise<CaptchaPayload>;
    destroy(): void;
}

interface Grecaptcha {
    ready(callback: () => void): void;
    render(el: HTMLElement, options: Record<string, unknown>): number;
    execute(id: number): void;
    reset(id: number): void;
}

interface Hcaptcha {
    render(el: HTMLElement, options: Record<string, unknown>): string;
    execute(id?: string): void | Promise<unknown>;
    reset(id?: string): void;
}

interface Turnstile {
    render(el: HTMLElement, options: Record<string, unknown>): string;
    execute(id: string): void;
    reset(id: string): void;
}

interface GeetestValidate {
    lot_number: string;
    captcha_output: string;
    pass_token: string;
    gen_time: string;
}

interface GeetestInstance {
    appendTo(el: HTMLElement): void;
    showCaptcha(): void;
    onReady(callback: () => void): void;
    onSuccess(callback: () => void): void;
    onError(callback: (error: unknown) => void): void;
    getValidate(): GeetestValidate | null;
    reset(): void;
    destroy(): void;
}

interface CorptchaInstance {
    execute(): void;
    reset(): void;
    destroy(): void;
}

interface CorptchaError {
    errorCode?: string;
    message?: string;
}

declare global {
    interface Window {
        grecaptcha?: Grecaptcha;
        hcaptcha?: Hcaptcha;
        turnstile?: Turnstile;
        initGeetest4?: (options: Record<string, unknown>, callback: (captcha: GeetestInstance) => void) => void;
        Corptcha?: {
            render(el: HTMLElement, options: Record<string, unknown>): CorptchaInstance;
        };
    }
}

const DEFAULT_SCRIPT_URLS: Record<CaptchaProvider, string> = {
    recaptcha: 'https://www.google.com/recaptcha/api.js?render=explicit',
    hcaptcha: 'https://js.hcaptcha.com/1/api.js?render=explicit',
    turnstile: 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit',
    geetest: 'https://static.geetest.com/v4/gt4.js',
    corptcha: 'https://res.25y.cn/corptcha/corptcha.iife.js',
};

const DEFAULT_CORPTCHA_API = 'https://cpt-api.25y.cn';
const SCRIPT_TIMEOUT = 15_000;

const scriptLoads = new Map<string, Promise<void>>();

function loadScript(provider: CaptchaProvider, src: string): Promise<void> {
    const url = src || DEFAULT_SCRIPT_URLS[provider];
    const existing = scriptLoads.get(url);
    if (existing) return existing;

    const pending = new Promise<void>((resolve, reject) => {
        const script = document.createElement('script');
        script.src = url;
        script.async = true;
        script.dataset.captchaProvider = provider;

        const timer = window.setTimeout(() => {
            script.remove();
            scriptLoads.delete(url);
            reject(new Error('验证码脚本加载超时，请检查网络后重试。'));
        }, SCRIPT_TIMEOUT);

        script.onload = () => {
            window.clearTimeout(timer);
            resolve();
        };
        script.onerror = () => {
            window.clearTimeout(timer);
            script.remove();
            scriptLoads.delete(url);
            reject(new Error('验证码脚本加载失败，请检查网络后重试。'));
        };

        document.head.appendChild(script);
    });

    scriptLoads.set(url, pending);

    return pending;
}

async function waitFor<T>(read: () => T | undefined, message: string): Promise<T> {
    const started = Date.now();
    while (Date.now() - started < SCRIPT_TIMEOUT) {
        const value = read();
        if (value) return value;
        await new Promise(resolve => window.setTimeout(resolve, 50));
    }

    throw new Error(message);
}

type Pending = {
    resolve: (payload: CaptchaPayload) => void;
    reject: (error: Error) => void;
};

abstract class BaseWidget implements CaptchaWidget {
    protected readonly container: HTMLDivElement;
    protected pending: Pending | null = null;

    constructor(protected readonly provider: CaptchaProvider, visible = false) {
        this.container = document.createElement('div');
        this.container.dataset.captchaContainer = provider;
        this.container.style.cssText = visible
            ? 'position:fixed;right:16px;bottom:16px;z-index:2147483000;'
            : 'display:none;';
        document.body.appendChild(this.container);
    }

    abstract execute(): Promise<CaptchaPayload>;

    destroy(): void {
        if (this.pending) {
            this.pending.reject(new Error('人机验证已取消，请重试。'));
            this.pending = null;
        }
        this.container.remove();
    }

    protected settle(payload: CaptchaPayload): void {
        const pending = this.pending;
        this.pending = null;
        pending?.resolve(payload);
    }

    protected fail(message: string): void {
        const pending = this.pending;
        this.pending = null;
        pending?.reject(new Error(message));
    }

    protected waitForToken(): Promise<CaptchaPayload> {
        return new Promise((resolve, reject) => {
            this.pending = { resolve, reject };
        });
    }
}

class RecaptchaWidget extends BaseWidget {
    private api: Grecaptcha | null = null;
    private widget: number | null = null;

    constructor(
        private readonly siteKey: string,
        private readonly scriptUrl: string,
    ) {
        super('recaptcha');
    }

    async execute(): Promise<CaptchaPayload> {
        const api = await this.load();
        if (this.widget === null) {
            this.widget = api.render(this.container, {
                sitekey: this.siteKey,
                size: 'invisible',
                callback: (token: string) => this.settle({ 'g-recaptcha-response': token }),
                'expired-callback': () => this.fail('人机验证已过期，请重试。'),
                'error-callback': () => this.fail('人机验证失败，请重试。'),
            });
        }

        const result = this.waitForToken();
        api.reset(this.widget);
        api.execute(this.widget);

        return result;
    }

    private async load(): Promise<Grecaptcha> {
        if (this.api) return this.api;
        await loadScript('recaptcha', this.scriptUrl);
        this.api = await waitFor(
            () => {
                const api = window.grecaptcha;
                return api && typeof api.render === 'function' && typeof api.execute === 'function' ? api : undefined;
            },
            '无法加载 reCAPTCHA，请检查网络后重试。',
        );

        await new Promise<void>(resolve => this.api!.ready(resolve));

        return this.api;
    }
}

class HcaptchaWidget extends BaseWidget {
    private api: Hcaptcha | null = null;
    private widget: string | null = null;

    constructor(
        private readonly siteKey: string,
        private readonly scriptUrl: string,
    ) {
        super('hcaptcha');
    }

    async execute(): Promise<CaptchaPayload> {
        const api = await this.load();
        if (this.widget === null) {
            this.widget = api.render(this.container, {
                sitekey: this.siteKey,
                size: 'invisible',
                callback: (token: string) => this.settle({ 'h-captcha-response': token }),
                'expired-callback': () => this.fail('人机验证已过期，请重试。'),
                'error-callback': () => this.fail('人机验证失败，请重试。'),
            });
        }

        const result = this.waitForToken();
        api.reset(this.widget);
        const execution = api.execute(this.widget);
        if (execution && typeof execution.catch === 'function') {
            execution.catch(() => this.fail('人机验证失败，请重试。'));
        }

        return result;
    }

    private async load(): Promise<Hcaptcha> {
        if (this.api) return this.api;
        await loadScript('hcaptcha', this.scriptUrl);
        this.api = await waitFor(
            () => {
                const api = window.hcaptcha;
                return api && typeof api.render === 'function' && typeof api.execute === 'function' ? api : undefined;
            },
            '无法加载 hCaptcha，请检查网络后重试。',
        );

        return this.api;
    }
}

class TurnstileWidget extends BaseWidget {
    private api: Turnstile | null = null;
    private widget: string | null = null;

    constructor(
        private readonly siteKey: string,
        private readonly scriptUrl: string,
    ) {
        super('turnstile');
    }

    async execute(): Promise<CaptchaPayload> {
        const api = await this.load();
        if (this.widget === null) {
            this.widget = api.render(this.container, {
                sitekey: this.siteKey,
                appearance: 'interaction-only',
                execution: 'execute',
                callback: (token: string) => this.settle({ 'cf-turnstile-response': token }),
                'expired-callback': () => this.fail('人机验证已过期，请重试。'),
                'error-callback': () => this.fail('人机验证失败，请重试。'),
            });
        }

        const result = this.waitForToken();
        api.reset(this.widget);
        api.execute(this.widget);

        return result;
    }

    private async load(): Promise<Turnstile> {
        if (this.api) return this.api;
        await loadScript('turnstile', this.scriptUrl);
        this.api = await waitFor(
            () => {
                const api = window.turnstile;
                return api && typeof api.render === 'function' && typeof api.execute === 'function' ? api : undefined;
            },
            '无法加载 Cloudflare Turnstile，请检查网络后重试。',
        );

        return this.api;
    }
}

class GeetestWidget extends BaseWidget {
    private instance: GeetestInstance | null = null;
    private initialization: Promise<GeetestInstance> | null = null;

    constructor(
        private readonly siteKey: string,
        private readonly scriptUrl: string,
    ) {
        super('geetest', true);
    }

    async execute(): Promise<CaptchaPayload> {
        const result = this.waitForToken();
        try {
            const instance = await this.ready();
            instance.showCaptcha();
        } catch (error) {
            this.fail(error instanceof Error ? error.message : '无法加载极验验证码。');
        }

        return result;
    }

    override destroy(): void {
        try {
            this.instance?.destroy();
        } catch {
            // The SDK may already have torn itself down.
        }
        super.destroy();
    }

    private ready(): Promise<GeetestInstance> {
        this.initialization ??= this.initialize().catch(error => {
            this.initialization = null;
            throw error;
        });

        return this.initialization;
    }

    private async initialize(): Promise<GeetestInstance> {
        await loadScript('geetest', this.scriptUrl);
        const init = await waitFor(() => window.initGeetest4, '无法加载极验验证码，请检查网络后重试。');

        return new Promise((resolve, reject) => {
            const timer = window.setTimeout(() => reject(new Error('极验验证码初始化超时，请重试。')), SCRIPT_TIMEOUT);

            init({ captchaId: this.siteKey, product: 'bind', language: 'zho' }, captcha => {
                window.clearTimeout(timer);
                this.instance = captcha;
                captcha.appendTo(this.container);

                captcha.onSuccess(() => {
                    const validate = captcha.getValidate();
                    if (!validate) {
                        this.fail('极验验证未返回有效结果，请重试。');
                        return;
                    }

                    this.settle({
                        lot_number: validate.lot_number,
                        captcha_output: validate.captcha_output,
                        pass_token: validate.pass_token,
                        gen_time: validate.gen_time,
                    });

                    // The next login form submission needs a fresh challenge.
                    window.setTimeout(() => {
                        try {
                            captcha.reset();
                        } catch {
                            // Ignore SDK state errors after a completed challenge.
                        }
                    }, 0);
                });

                captcha.onError(() => this.fail('极验验证失败，请重试。'));
                captcha.onReady(() => resolve(captcha));
            });
        });
    }
}

class CorptchaWidget extends BaseWidget {
    private instance: CorptchaInstance | null = null;
    private initialization: Promise<CorptchaInstance> | null = null;

    constructor(
        private readonly siteKey: string,
        private readonly apiBase: string,
        private readonly purpose: string,
        private readonly scriptUrl: string,
    ) {
        super('corptcha', true);
    }

    async execute(): Promise<CaptchaPayload> {
        const result = this.waitForToken();
        try {
            const instance = await this.ready();
            instance.reset();
            instance.execute();
        } catch (error) {
            this.fail(error instanceof Error ? error.message : '无法加载 Corptcha 验证码。');
        }

        return result;
    }

    override destroy(): void {
        try {
            this.instance?.destroy();
        } catch {
            // The SDK may already have torn itself down.
        }
        super.destroy();
    }

    private ready(): Promise<CorptchaInstance> {
        this.initialization ??= this.initialize().catch(error => {
            this.initialization = null;
            throw error;
        });

        return this.initialization;
    }

    private async initialize(): Promise<CorptchaInstance> {
        await loadScript('corptcha', this.scriptUrl);
        const api = await waitFor(() => window.Corptcha, '无法加载 Corptcha，请检查网络后重试。');

        this.instance = api.render(this.container, {
            apiBaseUrl: this.apiBase || DEFAULT_CORPTCHA_API,
            siteKey: this.siteKey,
            purpose: this.purpose,
            language: 'zh-CN',
            autoExecute: false,
            theme: { mode: 'auto' },
            onSuccess: (token: string) => this.settle({ captchaToken: token, 'captcha-purpose': this.purpose }),
            onError: (error: CorptchaError) => this.fail(error?.message || 'Corptcha 验证失败，请重试。'),
            onExpired: () => this.fail('人机验证已过期，请重试。'),
        });

        return this.instance;
    }
}

export function createCaptchaWidget(config: CaptchaConfig, purpose: string): CaptchaWidget {
    if (!config.siteKey) {
        throw new Error('当前验证码提供商尚未配置站点密钥，请联系管理员。');
    }

    // Official endpoints are keyed by provider. Do not trust a cached script URL after
    // the administrator switches providers in the same browser session.
    const scriptUrl = DEFAULT_SCRIPT_URLS[config.provider];

    switch (config.provider) {
        case 'recaptcha':
            return new RecaptchaWidget(config.siteKey, scriptUrl);
        case 'hcaptcha':
            return new HcaptchaWidget(config.siteKey, scriptUrl);
        case 'turnstile':
            return new TurnstileWidget(config.siteKey, scriptUrl);
        case 'geetest':
            return new GeetestWidget(config.siteKey, scriptUrl);
        case 'corptcha':
            return new CorptchaWidget(config.siteKey, config.apiBase || DEFAULT_CORPTCHA_API, purpose, scriptUrl);
    }
}
