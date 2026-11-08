import type { AdminServer, EggOption } from '$lib/api/admin/servers';

/**
 * Resource and feature limit inputs shared by the create page and the settings tab, kept
 * as strings while editing. Ranges follow Server::$validationRules.
 */
export interface LimitInputs {
    memory: string;
    swap: string;
    disk: string;
    io: string;
    cpu: string;
    threads: string;
    oomKiller: boolean;
    allocations: string;
    backups: string;
    databases: string;
    subusers: string;
}

export const defaultLimits = (): LimitInputs => ({
    memory: '1024',
    swap: '0',
    disk: '4096',
    io: '500',
    cpu: '100',
    threads: '',
    oomKiller: true,
    allocations: '1',
    backups: '0',
    databases: '0',
    subusers: '0',
});

export const limitsFromServer = (s: AdminServer): LimitInputs => ({
    memory: String(s.limits.memory),
    swap: String(s.limits.swap),
    disk: String(s.limits.disk),
    io: String(s.limits.io),
    cpu: String(s.limits.cpu),
    threads: s.limits.threads ?? '',
    oomKiller: s.limits.oomKiller,
    allocations: String(s.featureLimits.allocations),
    backups: String(s.featureLimits.backups),
    databases: String(s.featureLimits.databases),
    subusers: String(s.featureLimits.subusers),
});

const int = (v: string, min: number, max = Number.MAX_SAFE_INTEGER) =>
    /^-?\d+$/.test(v.trim()) && Number(v) >= min && Number(v) <= max;

export function limitErrors(v: LimitInputs): Partial<Record<keyof LimitInputs, string>> {
    const e: Partial<Record<keyof LimitInputs, string>> = {};
    if (!int(v.memory, 0)) e.memory = '请输入不小于 0 的整数。';
    if (!int(v.swap, -1)) e.swap = '请输入不小于 -1 的整数。';
    if (!int(v.disk, 0)) e.disk = '请输入不小于 0 的整数。';
    if (!int(v.io, 10, 1000)) e.io = '需要在 10–1000 之间。';
    if (!int(v.cpu, 0)) e.cpu = '请输入不小于 0 的整数。';
    if (v.threads.trim() && !/^[0-9,-]+$/.test(v.threads.trim())) e.threads = '只能包含数字、逗号和连字符，例如 0-1,3。';
    for (const k of ['allocations', 'backups', 'databases', 'subusers'] as const) {
        if (!int(v[k], 0)) e[k] = '请输入不小于 0 的整数。';
    }

    return e;
}

export const toLimitPayload = (v: LimitInputs) => ({
    limits: {
        memory: Number(v.memory),
        swap: Number(v.swap),
        disk: Number(v.disk),
        io: Number(v.io),
        cpu: Number(v.cpu),
        threads: v.threads.trim() || null,
        oom_killer: v.oomKiller,
    },
    feature_limits: {
        allocations: Number(v.allocations),
        backups: Number(v.backups),
        databases: Number(v.databases),
        subusers: Number(v.subusers),
    },
});

export const serverStatus = (s: string | null) =>
    ({
        installing: { label: '安装中', class: 'bg-warning/15 text-warning' },
        install_failed: { label: '安装失败', class: 'bg-destructive/15 text-destructive' },
        reinstall_failed: { label: '重装失败', class: 'bg-destructive/15 text-destructive' },
        suspended: { label: '已暂停', class: 'bg-destructive/15 text-destructive' },
        restoring_backup: { label: '恢复备份中', class: 'bg-warning/15 text-warning' },
        transferring: { label: '迁移中', class: 'bg-warning/15 text-warning' },
    })[s ?? ''] ?? (s ? { label: s, class: 'bg-muted text-muted-foreground' } : { label: '正常', class: 'bg-success/15 text-success' });

/** Client-side check of the common VariableValidatorService rules; the backend has the final word. */
export function variableErrors(egg: EggOption | null, env: Record<string, string>): Record<string, string> {
    const out: Record<string, string> = {};
    for (const v of egg?.variables ?? []) {
        const value = env[v.envVariable] ?? '';
        const rules = v.rules.split('|');
        if (rules.includes('required') && !value.trim()) out[v.envVariable] = '这个变量必填。';
        const max = rules.find(r => r.startsWith('max:'));
        if (max && rules.includes('string') && value.length > Number(max.slice(4))) out[v.envVariable] = `不能超过 ${max.slice(4)} 个字符。`;
        if (value && rules.includes('numeric') && !/^-?\d+(\.\d+)?$/.test(value)) out[v.envVariable] = '需要是数字。';
    }

    return out;
}
