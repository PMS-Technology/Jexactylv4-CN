import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { theme } from 'twin.macro';
import { ServerContext } from '@/state/server';
import { SocketEvent } from '@server/events';
import useWebsocketEvent from '@/plugins/useWebsocketEvent';
import { useChart, useChartTickLabel } from '@server/console/chart';
import { hexToRgba } from '@/lib/helpers';

export type Stats = Record<'memory' | 'cpu' | 'disk' | 'uptime' | 'rx' | 'tx', number>;

/**
 * Subscribes to the daemon's stat stream and exposes both the latest values and the rolling
 * history charts for the console page. Everything comes from a single subscription so the
 * cards and their background graphs can never drift out of sync.
 */
function useServerStats() {
    const { t } = useTranslation('server');
    const status = ServerContext.useStoreState(state => state.status.value);
    const limits = ServerContext.useStoreState(state => state.server.data!.limits);
    const previous = useRef<Record<'tx' | 'rx', number>>({ tx: -1, rx: -1 });
    const [stats, setStats] = useState<Stats>({ memory: 0, cpu: 0, disk: 0, uptime: 0, tx: 0, rx: 0 });

    const cpu = useChartTickLabel('CPU', limits.cpu, '%', 0, true);
    const memory = useChartTickLabel('Memory', limits.memory, 'MiB', undefined, true);
    const disk = useChartTickLabel('Disk', limits.disk, 'MiB', undefined, true);
    const network = useChart('Network', {
        sets: 2,
        background: true,
        callback(opts, index) {
            return {
                ...opts,
                label: !index ? (t('consolePage.networkIn') as string) : (t('consolePage.networkOut') as string),
                borderColor: !index ? theme('colors.green.400') : theme('colors.cyan.400'),
                backgroundColor: hexToRgba(!index ? theme('colors.green.400') : theme('colors.cyan.400'), 0.4),
            };
        },
    });

    useEffect(() => {
        if (status === 'offline') {
            cpu.clear();
            memory.clear();
            disk.clear();
            network.clear();
        }
    }, [status]);

    useWebsocketEvent(SocketEvent.STATS, (data: string) => {
        let values: any = {};
        try {
            values = JSON.parse(data);
        } catch (e) {
            return;
        }

        setStats({
            memory: values.memory_bytes,
            cpu: values.cpu_absolute,
            disk: values.disk_bytes,
            tx: values.network.tx_bytes,
            rx: values.network.rx_bytes,
            uptime: values.uptime || 0,
        });

        cpu.push(values.cpu_absolute);
        memory.push(Math.floor(values.memory_bytes / 1024 / 1024));
        disk.push(Math.floor(values.disk_bytes / 1024 / 1024));
        network.push([
            previous.current.tx < 0 ? 0 : Math.max(0, values.network.tx_bytes - previous.current.tx),
            previous.current.rx < 0 ? 0 : Math.max(0, values.network.rx_bytes - previous.current.rx),
        ]);

        previous.current = { tx: values.network.tx_bytes, rx: values.network.rx_bytes };
    });

    return { stats, cpu, memory, disk, network, limits };
}

export { useServerStats };
