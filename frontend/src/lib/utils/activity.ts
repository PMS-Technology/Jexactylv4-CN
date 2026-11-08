/**
 * Activity log descriptions, ported from `resources/lang/en/activity.php`.
 *
 * The legacy client rendered these through i18next and `/locales/locale.json`, which
 * commit 9ec051741 removed together with LocaleController, so the strings now live here.
 * Keys and placeholders are the Laravel ones verbatim: `:name` and dotted paths such as
 * `:files.0.from` read from the entry's properties, and `_one` / `_other` suffixes pick
 * the plural form from `count`, the way i18next did.
 */
const strings: Record<string, string> = {
    'server.reinstall': '重装了服务器',
    'server.console.command': '在服务器上执行了 ":command"',
    'server.power.start': '启动了服务器',
    'server.power.stop': '停止了服务器',
    'server.power.restart': '重启了服务器',
    'server.power.kill': '强制结束了服务器进程',
    'server.backup.download': '下载了备份 :name',
    'server.backup.delete': '删除了备份 :name',
    'server.backup.restore': '恢复了备份 :name（删除文件：:truncate）',
    'server.backup.restore-complete': '备份 :name 恢复完成',
    'server.backup.restore-failed': '备份 :name 恢复失败',
    'server.backup.start': '开始创建备份 :name',
    'server.backup.complete': '备份 :name 已完成',
    'server.backup.fail': '备份 :name 失败',
    'server.backup.lock': '锁定了备份 :name',
    'server.backup.unlock': '解锁了备份 :name',
    'server.database.create': '创建了数据库 :name',
    'server.database.rotate-password': '轮换了数据库 :name 的密码',
    'server.database.delete': '删除了数据库 :name',
    'server.file.compress_one': '压缩了 :directory:files.0',
    'server.file.compress_other': '压缩了 :directory 中的 :count 个文件',
    'server.file.read': '查看了 :file 的内容',
    'server.file.copy': '创建了 :file 的副本',
    'server.file.create-directory': '创建了目录 :directory:name',
    'server.file.decompress': '解压了 :directory 中的 :files',
    'server.file.delete_one': '删除了 :directory:files.0',
    'server.file.delete_other': '删除了 :directory 中的 :count 个文件',
    'server.file.download': '下载了 :file',
    'server.file.pull': '从 :url 下载远程文件到 :directory',
    'server.file.rename_one': '将 :directory:files.0.from 重命名为 :directory:files.0.to',
    'server.file.rename_other': '重命名了 :directory 中的 :count 个文件',
    'server.file.write': '写入了 :file 的新内容',
    'server.file.upload': '开始上传文件',
    'server.file.uploaded': '上传了 :directory:file',
    'server.sftp.denied': '因权限不足阻止了 SFTP 访问',
    'server.sftp.create_one': '创建了 :files.0',
    'server.sftp.create_other': '创建了 :count 个新文件',
    'server.sftp.write_one': '修改了 :files.0 的内容',
    'server.sftp.write_other': '修改了 :count 个文件的内容',
    'server.sftp.delete_one': '删除了 :files.0',
    'server.sftp.delete_other': '删除了 :count 个文件',
    'server.sftp.create-directory_one': '创建了目录 :files.0',
    'server.sftp.create-directory_other': '创建了 :count 个目录',
    'server.sftp.rename_one': '将 :files.0.from 重命名为 :files.0.to',
    'server.sftp.rename_other': '重命名或移动了 :count 个文件',
    'server.allocation.create': '为服务器添加了分配 :allocation',
    'server.allocation.notes': '将分配 :allocation 的备注从 ":old" 改为 ":new"',
    'server.allocation.primary': '将 :allocation 设为服务器主分配',
    'server.allocation.delete': '删除了分配 :allocation',
    'server.schedule.create': '创建了计划任务 :name',
    'server.schedule.update': '更新了计划任务 :name',
    'server.schedule.execute': '手动执行了计划任务 :name',
    'server.schedule.delete': '删除了计划任务 :name',
    'server.task.create': '为计划任务 :name 创建了 ":action" 任务',
    'server.task.update': '更新了计划任务 :name 的 ":action" 任务',
    'server.task.delete': '删除了计划任务 :name 的一个任务',
    'server.settings.rename': '将服务器名称从 :old 改为 :new',
    'server.settings.description': '将服务器描述从 :old 改为 :new',
    'server.startup.edit': '将变量 :variable 从 ":old" 改为 ":new"',
    'server.startup.image': '将服务器 Docker 镜像从 :old 改为 :new',
    'server.subuser.create': '添加了子用户 :email',
    'server.subuser.update': '更新了子用户 :email 的权限',
    'server.subuser.delete': '移除了子用户 :email',
};

/** A run of description text; `strong` marks an interpolated value. */
export interface DescriptionPart {
    text: string;
    strong: boolean;
}

// Same pattern LocaleController used to convert `:key` into `{{key}}`.
const PLACEHOLDER = /:([\w.-]+\w)/g;

function lookup(properties: Record<string, unknown>, path: string): unknown {
    return path.split('.').reduce<unknown>((value, key) => {
        if (value === null || typeof value !== 'object') return undefined;

        return (value as Record<string, unknown>)[key];
    }, properties);
}

function stringify(value: unknown): string {
    if (Array.isArray(value)) return value.map(stringify).join(', ');
    if (value !== null && typeof value === 'object') return JSON.stringify(value);

    return String(value);
}

/**
 * Builds the description for an event as text runs, so values render in `<strong>`
 * without going through `{@html}`. Returns null for events with no string, letting the
 * caller fall back to the backend description or the raw event name.
 */
export function describeActivity(event: string, properties: Record<string, unknown>): DescriptionPart[] | null {
    const key = event.replace(':', '.');
    const count = properties.count;
    const plural = typeof count === 'number' ? strings[`${key}_${count === 1 ? 'one' : 'other'}`] : undefined;
    const template = plural ?? strings[key];
    if (template === undefined) return null;

    const parts: DescriptionPart[] = [];
    let last = 0;

    for (const match of template.matchAll(PLACEHOLDER)) {
        const path = match[1]!;
        const value = lookup(properties, path);
        // i18next left unknown placeholders empty; keeping the token is easier to debug.
        if (value === undefined) continue;

        if (match.index > last) parts.push({ text: template.slice(last, match.index), strong: false });
        // The legacy wrapProperties left counts unwrapped.
        const isCount = path === 'count' || path.endsWith('_count');
        parts.push({ text: stringify(value), strong: !isCount && typeof value !== 'boolean' });
        last = match.index + match[0].length;
    }

    if (last < template.length) parts.push({ text: template.slice(last), strong: false });

    return parts;
}

/** Reads `#event=…&ip=…` style hashes, matching the legacy `useLocationHash`. */
export function parseHash(hash: string): Record<string, string> {
    return hash
        .replace(/^#/, '')
        .split('&')
        .reduce<Record<string, string>>((obj, pair) => {
            if (!pair.trim()) return obj;
            const [key = '', value = ''] = pair.split('=');

            return { ...obj, [decodeURIComponent(key)]: decodeURIComponent(value) };
        }, {});
}
