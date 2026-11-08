import { differenceInHours, format, formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import type { OrderStatus } from '$lib/api/definitions/billing';
import type { BillingExceptionType } from '$lib/api/admin/billing';

export const pill = 'inline-flex rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap';

export const orderStatus: Record<OrderStatus, { label: string; class: string }> = {
    processed: { label: '已完成', class: 'bg-success/15 text-success' },
    processing: { label: '处理中', class: 'bg-warning/15 text-warning' },
    pending: { label: '待支付', class: 'bg-warning/15 text-warning' },
    failed: { label: '失败', class: 'bg-destructive/15 text-destructive' },
    expired: { label: '已过期', class: 'bg-muted text-muted-foreground' },
};

export const statusOf = (status: string) => orderStatus[status as OrderStatus] ?? { label: status, class: 'bg-muted text-muted-foreground' };

export const orderType: Record<string, string> = { new: '新购', renewal: '续费', upgrade: '升级' };

export const exceptionType: Record<BillingExceptionType, { label: string; class: string }> = {
    deployment: { label: '部署', class: 'bg-primary/15 text-primary' },
    payment: { label: '支付', class: 'bg-warning/15 text-warning' },
    storefront: { label: '商店', class: 'bg-success/15 text-success' },
};

/** Exact date beyond 48 hours, relative time within, like the legacy tables. */
export const when = (date: Date) =>
    Math.abs(differenceInHours(date, new Date())) > 48
        ? format(date, 'yyyy-MM-dd HH:mm')
        : formatDistanceToNow(date, { addSuffix: true, locale: zhCN });
