import { faBalanceScale } from '@fortawesome/free-solid-svg-icons';
import { useFormikContext } from 'formik';
import { useTranslation } from 'react-i18next';
import tw from 'twin.macro';

import AdminBox from '@/elements/AdminBox';
import Field from '@/elements/Field';
import FormikSwitch from '@/elements/FormikSwitch';

export default () => {
    const { t } = useTranslation('admin');
    const { isSubmitting } = useFormikContext();

    return (
        <AdminBox icon={faBalanceScale} title={t('servers.resources') as string} isLoading={isSubmitting}>
            <div css={tw`grid grid-cols-1 xl:grid-cols-2 gap-4 lg:gap-6`}>
                <Field
                    id={'limits.cpu'}
                    name={'limits.cpu'}
                    label={t('servers.cpuLimit') as string}
                    type={'text'}
                    description={
                        t('servers.cpuLimitDescription') as string
                    }
                />
                <Field
                    id={'limits.threads'}
                    name={'limits.threads'}
                    label={t('servers.cpuPinning') as string}
                    type={'text'}
                    description={
                        t('servers.cpuPinningDescription') as string
                    }
                />
                <Field
                    id={'limits.memory'}
                    name={'limits.memory'}
                    label={t('servers.memoryLimit') as string}
                    type={'number'}
                    description={
                        t('servers.memoryLimitDescription') as string
                    }
                />
                <Field id={'limits.swap'} name={'limits.swap'} label={t('servers.swapLimit') as string} type={'number'} />
                <Field
                    id={'limits.disk'}
                    name={'limits.disk'}
                    label={t('servers.diskLimit') as string}
                    type={'number'}
                    description={
                        t('servers.diskLimitDescription') as string
                    }
                />
                <Field
                    id={'limits.io'}
                    name={'limits.io'}
                    label={t('servers.blockIoProportion') as string}
                    type={'number'}
                    description={
                        t('servers.blockIoProportionDescription') as string
                    }
                />
                <div css={tw`xl:col-span-2 bg-neutral-800 border border-neutral-900 shadow-inner p-4 rounded`}>
                    <FormikSwitch
                        name={'limits.oomKiller'}
                        label={t('servers.outOfMemoryKiller') as string}
                        description={
                            t('servers.outOfMemoryKillerDescription') as string
                        }
                    />
                </div>
            </div>
        </AdminBox>
    );
};
