import type { ReactNode } from 'react';
import { useStoreState } from 'easy-peasy';

import { ServerError } from '@/elements/ScreenBlock';
import { hasAdminPermission } from '@/plugins/adminPermissions';
import { useTranslation } from 'react-i18next';

interface Props {
    children?: ReactNode;

    permission?: string | string[];
}

function AdminPermissionRoute({ children, permission }: Props): JSX.Element {
    const { t } = useTranslation('common');
    const adminPermissions = useStoreState(state => state.user.data!.adminPermissions);

    if (hasAdminPermission(adminPermissions, permission)) {
        return <>{children}</>;
    }

    return <ServerError title={t('error.accessDenied')} message={t('error.noPermission')} />;
}

export default AdminPermissionRoute;
