import { faClock, faHdd, faMemory, faMicrochip, faNetworkWired, faWifi } from '@fortawesome/free-solid-svg-icons';
import classNames from 'classnames';
import type { ReactNode } from 'react';
import { Line } from 'react-chartjs-2';
import { useTranslation } from 'react-i18next';
import { CloudDownloadIcon, CloudUploadIcon } from '@heroicons/react/solid';
import UptimeDuration, { uptimeToString } from '@server/UptimeDuration';
import StatBlock from '@server/console/StatBlock';
import { useServerStats } from '@server/console/useServerStats';
import { ServerContext } from '@/state/server';
import { bytesToString, ip, mbToBytes } from '@/lib/formatters';
import Tooltip from '@/elements/tooltip/Tooltip';

function getBackgroundColor(value: number, max: number | null): string | undefined {
    const delta = !max ? 0 : value / max;

    if (delta > 0.8) {
        if (delta > 0.9) {
            return '#ef4444';
        }
        return '#f59e0b';
    }

    return undefined;
}

function Limit({ limit, children }: { limit: string | null; children: ReactNode }) {
    return (
        <>
            {children}
            <span className={'ml-1 select-none text-[70%] text-slate-300'}>/ {limit || <>&infin;</>}</span>
        </>
    );
}

/**
 * Card sizing for the details column. On large screens the column is exactly as tall as the
 * console, so the cards flex into that space instead of carrying fixed heights: text-only cards
 * stay compact and the chart cards split whatever is left. The `max-lg` heights apply once the
 * layout stacks and there is no column height to share.
 */
const TEXT_CARD = 'shrink-0 max-lg:min-h-[76px]';
const CHART_CARD = 'min-h-[64px] flex-1 basis-0 max-lg:min-h-[100px]';

/**
 * Vertical stack of stat cards shown alongside the console. Cards that have a matching
 * daemon metric render their chart behind the text as a background texture.
 */
function ServerDetailsBlock({ className }: { className?: string }) {
    const { t } = useTranslation('server');
    const { stats, cpu, memory, disk, network, limits } = useServerStats();

    const status = ServerContext.useStoreState(state => state.status.value);

    const networkText = `\u2193 ${bytesToString(stats.rx, 1)}  \u2191 ${bytesToString(stats.tx, 1)}`;
    const uptimeText = uptimeToString(stats.uptime / 1000);
    const memoryText = bytesToString(stats.memory);
    const diskText = bytesToString(stats.disk);

    const allocation = ServerContext.useStoreState(state => {
        const match = state.server.data!.allocations.find(allocation => allocation.isDefault);

        return !match ? 'n/a' : `${match.alias || ip(match.ip)}:${match.port}`;
    });

    const allocationDisplay = ServerContext.useStoreState(state => {
        const match = state.server.data!.allocations.find(allocation => allocation.isDefault);

        return match?.notes || allocation;
    });

    return (
        <div className={classNames('flex h-full min-h-0 flex-col gap-2 [@media(max-height:820px)]:gap-1.5', className)}>
            <StatBlock
                icon={faWifi}
                title={t('consolePage.address') as string}
                copyOnClick={allocation}
                className={TEXT_CARD}
                fitKey={allocationDisplay}
            >
                {allocationDisplay}
            </StatBlock>
            <StatBlock
                icon={faClock}
                title={t('consolePage.uptime') as string}
                className={TEXT_CARD}
                color={getBackgroundColor(status === 'running' ? 0 : status !== 'offline' ? 9 : 10, 10)}
                fitKey={status === null ? 'offline' : stats.uptime > 0 ? uptimeText : String(status)}
            >
                {status === null ? (
                    (t('consolePage.offline') as string)
                ) : stats.uptime > 0 ? (
                    <UptimeDuration uptime={stats.uptime / 1000} />
                ) : (
                    (t(`consolePage.status.${status}` as any) as string)
                )}
            </StatBlock>
            <StatBlock
                icon={faMicrochip}
                title={t('consolePage.cpuLoad') as string}
                className={CHART_CARD}
                color={getBackgroundColor(stats.cpu, limits.cpu)}
                chart={<Line {...cpu.props} />}
                fitKey={status === 'offline' ? 'offline' : stats.cpu.toFixed(2)}
            >
                {status === 'offline' ? (
                    <span className={'text-slate-400'}>{t('consolePage.offline') as string}</span>
                ) : (
                    <Limit limit={limits?.cpu ? `${limits.cpu}%` : null}>{stats.cpu.toFixed(2)}%</Limit>
                )}
            </StatBlock>
            <StatBlock
                icon={faMemory}
                title={t('consolePage.memory') as string}
                className={CHART_CARD}
                color={getBackgroundColor(stats.memory / 1024, limits.memory * 1024)}
                chart={<Line {...memory.props} />}
                fitKey={status === 'offline' ? 'offline' : memoryText}
            >
                {status === 'offline' ? (
                    <span className={'text-slate-400'}>{t('consolePage.offline') as string}</span>
                ) : (
                    <Limit limit={limits?.memory ? bytesToString(mbToBytes(limits.memory)) : null}>{memoryText}</Limit>
                )}
            </StatBlock>
            <StatBlock
                icon={faHdd}
                title={t('consolePage.disk') as string}
                className={CHART_CARD}
                color={getBackgroundColor(stats.disk / 1024, limits.disk * 1024)}
                chart={<Line {...disk.props} />}
                fitKey={diskText}
            >
                <Limit limit={limits?.disk ? bytesToString(mbToBytes(limits.disk)) : null}>{diskText}</Limit>
            </StatBlock>
            <StatBlock
                icon={faNetworkWired}
                title={t('consolePage.networkChart') as string}
                className={CHART_CARD}
                legend={
                    <>
                        <Tooltip arrow content={t('consolePage.inbound') as string}>
                            <CloudDownloadIcon className={'h-4 w-4 text-green-400'} />
                        </Tooltip>
                        <Tooltip arrow content={t('consolePage.outbound') as string}>
                            <CloudUploadIcon className={'h-4 w-4 text-cyan-400'} />
                        </Tooltip>
                    </>
                }
                chart={<Line {...network.props} />}
                fitKey={networkText}
            >
                {/* Kept to a single text node: the fit-text helper measures one node, so a
                    multi-element value would overflow rather than shrink. Each figure keeps its
                    own unit since inbound and outbound can be in different magnitudes, and the
                    arrows tie the figures to the coloured legend above. */}
                {networkText}
            </StatBlock>
        </div>
    );
}

export default ServerDetailsBlock;
