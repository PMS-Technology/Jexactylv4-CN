import { faCogs } from '@fortawesome/free-solid-svg-icons';
import { useFormikContext } from 'formik';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import tw from 'twin.macro';

import { useServerFromRoute } from '@/api/routes/admin/servers';
import AdminBox from '@/elements/AdminBox';
import OwnerSelect from '@admin/management/servers/OwnerSelect';
import Field from '@/elements/Field';

export default ({ children }: { children?: ReactNode }) => {
    const { t } = useTranslation('admin');
    const { data: server } = useServerFromRoute();
    const { isSubmitting } = useFormikContext();

    return (
        <AdminBox icon={faCogs} title={t('servers.settings') as string} isLoading={isSubmitting}>
            <div css={tw`grid grid-cols-1 xl:grid-cols-2 gap-4 lg:gap-6`}>
                <Field
                    id={'name'}
                    name={'name'}
                    label={t('servers.serverName') as string}
                    type={'text'}
                    placeholder={t('servers.myAmazingServer') as string}
                />
                <Field id={'externalId'} name={'externalId'} label={t('servers.externalIdentifier') as string} type={'text'} />
                <OwnerSelect selected={server?.relationships.user} />
                {children}
            </div>
        </AdminBox>
    );
};
