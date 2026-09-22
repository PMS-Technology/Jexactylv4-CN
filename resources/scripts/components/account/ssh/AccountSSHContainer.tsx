import { useEffect } from 'react';
import ContentBox from '@/elements/ContentBox';
import SpinnerOverlay from '@/elements/SpinnerOverlay';
import tw from 'twin.macro';
import GreyRowBox from '@/elements/GreyRowBox';
import { useSSHKeys } from '@/api/routes/account/ssh-keys';
import { useFlashKey } from '@/plugins/useFlash';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faKey } from '@fortawesome/free-solid-svg-icons';
import CreateSSHKeyForm from '@account/ssh/CreateSSHKeyForm';
import DeleteSSHKeyButton from '@account/ssh/DeleteSSHKeyButton';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { useTranslation } from 'react-i18next';

export default () => {
    const { t, i18n } = useTranslation('dashboard');
    const { clearAndAddHttpError } = useFlashKey('account');
    const { data, isValidating, error } = useSSHKeys({
        revalidateOnMount: true,
        revalidateOnFocus: false,
    });

    useEffect(() => {
        clearAndAddHttpError(error);
    }, [error]);

    return (
        <div css={tw`md:flex flex-nowrap my-10`}>
            <ContentBox title={t('account.addSshKey')} css={tw`flex-none w-full md:w-1/2`}>
                <CreateSSHKeyForm />
            </ContentBox>
            <ContentBox title={t('account.sshKeys')} css={tw`flex-1 overflow-hidden mt-8 md:mt-0 md:ml-8`}>
                <SpinnerOverlay visible={!data && isValidating} />
                {!data || !data.length ? (
                    <p css={tw`text-center text-sm`}>{!data ? t('account.loading') : t('account.noSshKeys')}</p>
                ) : (
                    data.map((key, index) => (
                        <GreyRowBox
                            key={key.fingerprint}
                            css={[tw`bg-black/50 flex space-x-4 items-center`, index > 0 && tw`mt-2`]}
                        >
                            <FontAwesomeIcon icon={faKey} css={tw`text-neutral-300`} />
                            <div css={tw`flex-1`}>
                                <p css={tw`text-lg font-bold break-words`}>{key.name}</p>
                                <p css={tw`text-xs mt-1 font-mono truncate text-gray-300`}>SHA256:{key.fingerprint}</p>
                                <p css={tw`text-xs mt-1 text-gray-400 uppercase`}>
                                    {t('account.addedOn')}:&nbsp;
                                    {format(key.created_at, 'PPp', {
                                        locale: i18n.language === 'zh_CN' ? zhCN : undefined,
                                    })}
                                </p>
                            </div>
                            <DeleteSSHKeyButton name={key.name} fingerprint={key.fingerprint} />
                        </GreyRowBox>
                    ))
                )}
            </ContentBox>
        </div>
    );
};
