import { useCallback, useContext, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import classNames from 'classnames';
import { debounce } from 'debounce';
import { format, formatDistanceToNowStrict } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import AdminContentBlock from '@/elements/AdminContentBlock';
import AdminTable, {
    Loading,
    NoItems,
    Pagination,
    TableBody,
    TableHead,
    TableHeader,
    TableRow,
    useTableHooks,
} from '@/elements/AdminTable';
import { styles as btnStyles } from '@/elements/button/index';
import { XCircleIcon, ArrowNarrowRightIcon, TerminalIcon, FolderOpenIcon, CogIcon } from '@heroicons/react/solid';
import CopyOnClick from '@/elements/CopyOnClick';
import Avatar from '@/elements/Avatar';
import Translate from '@/elements/Translate';
import Tooltip from '@/elements/tooltip/Tooltip';
import Input from '@/elements/Input';
import ActivityLogMetaButton from '@/elements/activity/ActivityLogMetaButton';
import { wrapProperties } from '@/elements/activity/ActivityLogEntry';
import useLocationHash from '@/plugins/useLocationHash';
import { useStoreState } from '@/state/hooks';
import { ActivityLogSubject } from '@definitions/account';
import { ActivityLogListFilters, Context as ActivityContext, useGetActivityLogs } from '@/api/routes/admin/activity';
import { useTranslation } from 'react-i18next';

const subjectHref = (subject: ActivityLogSubject): string | null => {
    switch (subject.type) {
        case 'server':
            return `/admin/servers/${subject.id}`;
        case 'user':
            return `/admin/users/${subject.id}`;
        case 'node':
            return `/admin/nodes/${subject.id}`;
        case 'nest':
            return `/admin/nests/${subject.id}`;
        case 'database_host':
            return `/admin/databases/${subject.id}`;
        case 'server_preset':
            return `/admin/servers/presets/${subject.id}`;
        case 'admin_role':
            return `/admin/users/roles/${subject.id}`;
        case 'ticket':
            return `/admin/tickets/${subject.id}`;
        case 'billing_category':
            return `/admin/billing/categories/${subject.id}`;
        default:
            return null;
    }
};

const FilterField = ({
    label,
    placeholder,
    value,
    onChange,
}: {
    label: string;
    placeholder: string;
    value: string;
    onChange: (value: string) => void;
}) => {
    const [text, setText] = useState(value);

    useEffect(() => {
        setText(value);
    }, [value]);

    // eslint-disable-next-line react-hooks/exhaustive-deps
    const debounced = useCallback(
        debounce((query: string) => onChange(query), 250),
        [onChange],
    );

    return (
        <label className={'flex flex-col w-full sm:w-52'}>
            <span className={'mb-1 text-xs font-medium uppercase tracking-wide text-neutral-400'}>{label}</span>
            <Input
                className={'h-8'}
                placeholder={placeholder}
                value={text}
                onChange={e => {
                    setText(e.currentTarget.value);
                    debounced(e.currentTarget.value);
                }}
            />
        </label>
    );
};

function ActivityLogsContainer() {
    const { t, i18n } = useTranslation('admin');
    const { hash, pathTo } = useLocationHash();
    const { colors } = useStoreState(state => state.theme.data!);
    const { setPage, filters, setFilters, sort, setSort, sortDirection } = useContext(ActivityContext);
    const { data: logs } = useGetActivityLogs();

    useEffect(() => {
        setFilters(value => ({ ...value, event: hash.event || undefined, ip: hash.ip || undefined }));
    }, [hash]);

    const hasActiveFilters = Boolean(filters?.actor || filters?.subject || filters?.event || filters?.ip);
    const dateLocale = i18n.language === 'zh_CN' ? zhCN : undefined;

    return (
        <AdminContentBlock title={t('activity.title') as string}>
            <div className={'w-full flex flex-row items-center mb-8'}>
                <div className={'flex flex-col flex-shrink'} style={{ minWidth: '0' }}>
                    <h2 className={'text-2xl text-neutral-50 font-header font-medium'}>{t('activity.title')}</h2>
                    <p
                        className={
                            'hidden lg:block text-base text-neutral-400 whitespace-nowrap overflow-ellipsis overflow-hidden'
                        }
                    >
                        {t('activity.description')}
                    </p>
                </div>
                {hasActiveFilters && (
                    <div className={'flex ml-auto pl-4'}>
                        <Link
                            to={'#'}
                            className={classNames(btnStyles.button, btnStyles.text, 'w-full sm:w-auto')}
                            onClick={() => setFilters(null)}
                        >
                            {t('activity.clearFilters')} <XCircleIcon className={'ml-2 h-4 w-4'} />
                        </Link>
                    </div>
                )}
            </div>
            <AdminTable>
                <div className={'flex flex-wrap items-end gap-4 px-6 py-4'}>
                    <FilterField
                        label={t('activity.actor')}
                        placeholder={t('activity.filterByUsername')}
                        value={filters?.actor ?? ''}
                        onChange={value => setFilters(current => ({ ...current, actor: value || undefined }))}
                    />
                    <FilterField
                        label={t('activity.subject')}
                        placeholder={t('activity.filterBySubject')}
                        value={filters?.subject ?? ''}
                        onChange={value => setFilters(current => ({ ...current, subject: value || undefined }))}
                    />
                    <FilterField
                        label={t('activity.event')}
                        placeholder={t('activity.filterByEvent')}
                        value={filters?.event ?? ''}
                        onChange={value => setFilters(current => ({ ...current, event: value || undefined }))}
                    />
                    <FilterField
                        label={t('activity.ipAddress')}
                        placeholder={t('activity.filterByIp')}
                        value={filters?.ip ?? ''}
                        onChange={value => setFilters(current => ({ ...current, ip: value || undefined }))}
                    />
                </div>
                <Pagination data={logs} onPageSelect={setPage}>
                    <div className={'overflow-x-auto'}>
                        <table className={'w-full table-auto'}>
                            <TableHead>
                                <TableHeader name={t('activity.id') as string} />
                                <TableHeader
                                    name={t('activity.time') as string}
                                    direction={sort === 'timestamp' ? (sortDirection ? 1 : 2) : null}
                                    onClick={() => setSort('timestamp')}
                                />
                                <TableHeader name={t('activity.actor') as string} />
                                <TableHeader
                                    name={t('activity.event') as string}
                                    direction={sort === 'event' ? (sortDirection ? 1 : 2) : null}
                                    onClick={() => setSort('event')}
                                />
                                <TableHeader name={t('activity.ip') as string} />
                            </TableHead>
                            <TableBody>
                                {logs !== undefined &&
                                    logs.items.length > 0 &&
                                    logs.items.map(item => {
                                        const actor = item.relationships.actor;
                                        const actorHref = actor?.id ? `/admin/users/${actor.id}` : null;
                                        const properties = wrapProperties(item.properties);

                                        return (
                                            <TableRow key={item.id}>
                                                <td
                                                    className={
                                                        'px-6 text-sm text-neutral-200 text-left whitespace-nowrap'
                                                    }
                                                >
                                                    <CopyOnClick text={item.logId}>
                                                        <code className={'font-mono bg-neutral-900 rounded py-1 px-2'}>
                                                            {item.logId ?? '—'}
                                                        </code>
                                                    </CopyOnClick>
                                                </td>
                                                <td
                                                    className={
                                                        'px-6 text-sm text-neutral-200 text-left whitespace-nowrap'
                                                    }
                                                >
                                                    <Tooltip
                                                        placement={'top'}
                                                        content={formatDistanceToNowStrict(item.timestamp, {
                                                            addSuffix: true,
                                                            locale: dateLocale,
                                                        })}
                                                    >
                                                        <span>
                                                            {format(item.timestamp, 'PPpp', { locale: dateLocale })}
                                                        </span>
                                                    </Tooltip>
                                                </td>
                                                <td className={'px-6 py-4 text-sm text-neutral-200 text-left'}>
                                                    <div className={'flex flex-wrap items-center gap-1.5'}>
                                                        <div className={'flex items-center gap-1.5'}>
                                                            <div
                                                                className={
                                                                    'h-5 w-5 rounded-full overflow-hidden bg-slate-600'
                                                                }
                                                            >
                                                                <Avatar name={actor?.uuid || 'system'} />
                                                            </div>
                                                            {actorHref ? (
                                                                <Link
                                                                    to={actorHref}
                                                                    className={'font-bold hover:brightness-125'}
                                                                    style={{ color: colors.primary }}
                                                                >
                                                                    {actor?.username || t('activity.system')}
                                                                </Link>
                                                            ) : (
                                                                <span className={'font-bold'}>
                                                                    {actor?.username || t('activity.system')}
                                                                </span>
                                                            )}
                                                        </div>
                                                        {item.subjects.length > 0 ? (
                                                            item.subjects.map((subject, index) => {
                                                                const href = subjectHref(subject);
                                                                const label = subject.identifier ?? `#${subject.id}`;

                                                                return (
                                                                    <Tooltip
                                                                        key={`${subject.type}-${subject.id}-${index}`}
                                                                        placement={'top'}
                                                                        content={subject.type}
                                                                    >
                                                                        <div
                                                                            className={
                                                                                'flex items-center gap-1.5 text-slate-400'
                                                                            }
                                                                        >
                                                                            <ArrowNarrowRightIcon
                                                                                className={'h-4 w-4 flex-shrink-0'}
                                                                            />
                                                                            {href ? (
                                                                                <Link
                                                                                    to={href}
                                                                                    className={
                                                                                        'hover:text-cyan-400 transition-colors duration-75'
                                                                                    }
                                                                                >
                                                                                    {label}
                                                                                </Link>
                                                                            ) : (
                                                                                <span>{label}</span>
                                                                            )}
                                                                        </div>
                                                                    </Tooltip>
                                                                );
                                                            })
                                                        ) : (
                                                            <Tooltip
                                                                placement={'top'}
                                                                content={t('activity.systemAction')}
                                                            >
                                                                <div
                                                                    className={
                                                                        'flex items-center gap-1.5 text-slate-500'
                                                                    }
                                                                >
                                                                    <ArrowNarrowRightIcon
                                                                        className={'h-4 w-4 flex-shrink-0'}
                                                                    />
                                                                    <CogIcon className={'h-3.5 w-3.5'} />
                                                                    <span>{t('activity.system')}</span>
                                                                </div>
                                                            </Tooltip>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className={'px-6 py-4 text-sm text-neutral-200 text-left'}>
                                                    <div className={'flex items-center gap-2'}>
                                                        <Link
                                                            to={`#${pathTo({ event: item.event })}`}
                                                            className={
                                                                'font-mono text-xs text-slate-400 hover:text-cyan-400 transition-colors duration-75'
                                                            }
                                                        >
                                                            {item.event}
                                                            <p className={'text-white mb-1 text-sm'}>
                                                                {item.description}
                                                            </p>
                                                        </Link>
                                                        {item.isApi && (
                                                            <Tooltip
                                                                placement={'top'}
                                                                content={t('activity.usingApiKey')}
                                                            >
                                                                <TerminalIcon className={'h-4 w-4 text-slate-400'} />
                                                            </Tooltip>
                                                        )}
                                                        {item.event.startsWith('server:sftp.') && (
                                                            <Tooltip
                                                                placement={'top'}
                                                                content={t('activity.usingSftp')}
                                                            >
                                                                <FolderOpenIcon className={'h-4 w-4 text-slate-400'} />
                                                            </Tooltip>
                                                        )}
                                                        {item.hasAdditionalMetadata && (
                                                            <ActivityLogMetaButton meta={item.properties} />
                                                        )}
                                                    </div>
                                                    <p className={'mt-1 max-w-md break-words text-neutral-200'}>
                                                        <Translate
                                                            ns={'activity'}
                                                            values={properties}
                                                            i18nKey={item.event.replace(':', '.')}
                                                            defaults={item.description ?? item.event}
                                                        />
                                                    </p>
                                                </td>
                                                <td
                                                    className={
                                                        'px-6 text-sm text-neutral-200 text-left whitespace-nowrap'
                                                    }
                                                >
                                                    {item.ip ? (
                                                        <Link
                                                            to={`#${pathTo({ ip: item.ip })}`}
                                                            className={
                                                                'hover:text-cyan-400 transition-colors duration-75'
                                                            }
                                                        >
                                                            {item.ip}
                                                        </Link>
                                                    ) : (
                                                        '—'
                                                    )}
                                                </td>
                                            </TableRow>
                                        );
                                    })}
                            </TableBody>
                        </table>

                        {logs === undefined ? <Loading /> : logs.items.length < 1 ? <NoItems /> : null}
                    </div>
                </Pagination>
            </AdminTable>
        </AdminContentBlock>
    );
}

export default () => {
    const hooks = useTableHooks<ActivityLogListFilters>(undefined, { column: 'timestamp', direction: true });

    return (
        <ActivityContext.Provider value={hooks}>
            <ActivityLogsContainer />
        </ActivityContext.Provider>
    );
};
