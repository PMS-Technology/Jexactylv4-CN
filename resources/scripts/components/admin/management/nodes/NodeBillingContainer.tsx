import { useTranslation } from 'react-i18next';
import { faCashRegister } from '@fortawesome/free-solid-svg-icons';
import { Field as FormikField, useFormikContext } from 'formik';
import tw from 'twin.macro';
import AdminBox from '@/elements/AdminBox';
import Field from '@/elements/Field';
import Label from '@/elements/Label';
import SpinnerOverlay from '@/elements/SpinnerOverlay';

export default () => {
    const { t } = useTranslation('admin');
    const { isSubmitting } = useFormikContext();

    return (
        <AdminBox icon={faCashRegister} title={t('nodes.billingConfig') as string} css={tw`w-full relative`}>
            <SpinnerOverlay visible={isSubmitting} />
            <div>
                <Label htmlFor={'deployable'}>{t('nodes.deployablePaid') as string}</Label>
                <div>
                    <label css={tw`inline-flex items-center mr-2`}>
                        <FormikField name={'deployable'} type={'radio'} value={'true'} />
                        <span css={tw`text-neutral-300 ml-2`}>{t('nodes.enabled') as string}</span>
                    </label>

                    <label css={tw`inline-flex items-center ml-2`}>
                        <FormikField name={'deployable'} type={'radio'} value={'false'} />
                        <span css={tw`text-neutral-300 ml-2`}>{t('nodes.disabled') as string}</span>
                    </label>
                </div>
                <p className={'text-sm text-gray-400 mt-1'}>{t('nodes.deployablePaidDesc') as string}</p>
            </div>
            <div className={'mt-6'}>
                <Label htmlFor={'deployableFree'}>{t('nodes.deployableFree') as string}</Label>
                <div>
                    <label css={tw`inline-flex items-center mr-2`}>
                        <FormikField name={'deployableFree'} type={'radio'} value={'true'} />
                        <span css={tw`text-neutral-300 ml-2`}>{t('nodes.enabled') as string}</span>
                    </label>

                    <label css={tw`inline-flex items-center ml-2`}>
                        <FormikField name={'deployableFree'} type={'radio'} value={'false'} />
                        <span css={tw`text-neutral-300 ml-2`}>{t('nodes.disabled') as string}</span>
                    </label>
                </div>
                <p className={'text-sm text-gray-400 mt-1'}>{t('nodes.deployableFreeDesc') as string}</p>
            </div>
            <div className={'mt-6'}>
                <Field
                    id={'deploymentFee'}
                    name={'deploymentFee'}
                    type={'text'}
                    label={t('nodes.deploymentFee') as string}
                    description={t('nodes.deploymentFeeDescription') as string}
                />
            </div>
        </AdminBox>
    );
};
