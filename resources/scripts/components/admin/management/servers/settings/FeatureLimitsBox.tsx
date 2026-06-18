import { faConciergeBell } from '@fortawesome/free-solid-svg-icons';
import { useFormikContext } from 'formik';
import { useTranslation } from 'react-i18next';
import tw from 'twin.macro';

import AdminBox from '@/elements/AdminBox';
import Field from '@/elements/Field';

export default () => {
    const { t } = useTranslation('admin');
    const { isSubmitting } = useFormikContext();

    return (
        <AdminBox icon={faConciergeBell} title={t('servers.featureLimits') as string} isLoading={isSubmitting}>
            <div css={tw`grid grid-cols-1 xl:grid-cols-2 gap-4 lg:gap-6`}>
                <Field
                    id={'featureLimits.allocations'}
                    name={'featureLimits.allocations'}
                    label={t('servers.allocationLimit') as string}
                    type={'number'}
                    description={t('servers.allocationLimitDescription') as string}
                />
                <Field
                    id={'featureLimits.backups'}
                    name={'featureLimits.backups'}
                    label={t('servers.backupLimit') as string}
                    type={'number'}
                    description={t('servers.backupLimitDescription') as string}
                />
                <Field
                    id={'featureLimits.databases'}
                    name={'featureLimits.databases'}
                    label={t('servers.databaseLimit') as string}
                    type={'number'}
                    description={t('servers.databaseLimitDescription') as string}
                />
                <Field
                    id={'featureLimits.subusers'}
                    name={'featureLimits.subusers'}
                    label={t('servers.subuserLimit') as string}
                    type={'number'}
                    description={t('servers.subuserLimitDescription') as string}
                />
            </div>
        </AdminBox>
    );
};
