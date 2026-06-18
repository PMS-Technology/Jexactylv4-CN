import { useTranslation } from 'react-i18next';
import { faNetworkWired } from '@fortawesome/free-solid-svg-icons';
import { useFormikContext } from 'formik';
import tw from 'twin.macro';

import AdminBox from '@/elements/AdminBox';
import Field from '@/elements/Field';
import SpinnerOverlay from '@/elements/SpinnerOverlay';

export default () => {
    const { t } = useTranslation('admin');
    const { isSubmitting } = useFormikContext();

    return (
        <AdminBox icon={faNetworkWired} title={t('nodes.nodeListenIP') as string} css={tw`w-full relative`}>
            <SpinnerOverlay visible={isSubmitting} />

            <div css={tw`mb-6 md:w-full md:flex md:flex-row`}>
                <div css={tw`mb-6 md:w-full md:flex md:flex-col md:mr-4 md:mb-0`}>
                    <Field id={'listenPortHTTP'} name={'listenPortHTTP'} label={t('nodes.httpListenPort') as string} type={'number'} />
                </div>

                <div css={tw`mb-6 md:w-full md:flex md:flex-col md:ml-4 md:mb-0`}>
                    <Field id={'publicPortHTTP'} name={'publicPortHTTP'} label={t('nodes.httpPublicPort') as string} type={'number'} />
                </div>
            </div>

            <div css={tw`mb-6 md:w-full md:flex md:flex-row`}>
                <div css={tw`mb-6 md:w-full md:flex md:flex-col md:mr-4 md:mb-0`}>
                    <Field id={'listenPortSFTP'} name={'listenPortSFTP'} label={t('nodes.sftpListenPort') as string} type={'number'} />
                </div>

                <div css={tw`mb-6 md:w-full md:flex md:flex-col md:ml-4 md:mb-0`}>
                    <Field id={'publicPortSFTP'} name={'publicPortSFTP'} label={t('nodes.sftpPublicPort') as string} type={'number'} />
                </div>
            </div>
        </AdminBox>
    );
};
