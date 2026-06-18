import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import { ServerError } from '@/elements/ScreenBlock';
import { usePermissions } from '@/plugins/usePermissions';

interface Props {
    children?: ReactNode;

    permission?: string | string[];
}

function PermissionRoute({ children, permission }: Props): JSX.Element {
    const { t } = useTranslation('common');

    if (permission === undefined) {
        return <>{children}</>;
    }

    const can = usePermissions(permission);

    if (can.filter(p => p).length > 0) {
        return <>{children}</>;
    }

    return <ServerError title={t('error.accessDenied') as string} message={t('error.noPermission') as string} />;
}

export default PermissionRoute;
