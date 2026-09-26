import type { IconDefinition } from '@fortawesome/free-solid-svg-icons';
import classNames from 'classnames';
import type { ReactNode } from 'react';
import { useFitText } from '@flyyer/use-fit-text';
import CopyOnClick from '@/elements/CopyOnClick';
import Icon from '@/elements/Icon';
import styles from './style.module.css';
import { useStoreState } from '@/state/hooks';

interface StatBlockProps {
    title: string;
    copyOnClick?: string;
    color?: string | undefined;
    dark?: boolean | undefined;
    icon?: IconDefinition | undefined;
    children: ReactNode;
    className?: string;

    /**
     * Optional chart rendered as a texture behind the card's contents. Purely decorative —
     * it is not interactive and does not affect the text laid over it.
     */
    chart?: ReactNode;
    legend?: ReactNode;

    /**
     * The primitive that drives the rendered value. The fit-text helper only recalculates when
     * its dependency list changes, so without this the font size stays at whatever suited the
     * initial value and longer subsequent values get clipped.
     */
    fitKey?: string | number;
}

function StatBlock({
    title,
    copyOnClick,
    icon,
    color,
    dark,
    className,
    chart,
    legend,
    fitKey,
    children,
}: StatBlockProps) {
    const colors = useStoreState(state => state.theme.data!.colors);
    /*
     * The helper searches downwards from `maxFontSize`, and the value is clipped for as long as
     * that takes — starting at 500% meant every long value was visibly cut off for a moment on
     * first paint. Starting just above the natural size for a short value keeps the search short
     * while still leaving room to grow. `resolution: 1` is needed because the default (5) stops
     * shrinking while the text is still clipped.
     */
    const { fontSize, ref } = useFitText({ minFontSize: 8, maxFontSize: 130, resolution: 1 }, [fitKey]);

    return (
        <CopyOnClick text={copyOnClick}>
            <div
                className={classNames(styles.stat_block, className)}
                style={{ backgroundColor: dark ? colors.headers : colors.secondary }}
            >
                {chart && <div className={styles.stat_chart}>{chart}</div>}
                <div className={classNames(styles.status_bar || 'bg-slate-700')} />
                {icon && (
                    <div className={classNames(styles.icon, 'bg-black/50')}>
                        <Icon icon={icon} style={{ color: color ?? colors.primary }} />
                    </div>
                )}
                <div className={'relative z-10 flex w-full flex-col justify-center overflow-hidden'}>
                    <div className={'flex items-center justify-between gap-2'}>
                        <p className={'font-header text-xs leading-tight text-slate-200 md:text-sm'}>{title}</p>
                        {legend}
                    </div>
                    <div
                        ref={ref}
                        className={'h-[1.75rem] w-full truncate font-semibold text-slate-50'}
                        style={{ fontSize }}
                    >
                        {children}
                    </div>
                </div>
            </div>
        </CopyOnClick>
    );
}

export default StatBlock;
