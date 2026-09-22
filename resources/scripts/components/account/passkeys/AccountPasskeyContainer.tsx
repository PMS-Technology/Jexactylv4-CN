import { useEffect } from 'react';
import tw from 'twin.macro';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFingerprint } from '@fortawesome/free-solid-svg-icons';

import ContentBox from '@/elements/ContentBox';
import SpinnerOverlay from '@/elements/SpinnerOverlay';
import GreyRowBox from '@/elements/GreyRowBox';
import { usePasskeys } from '@/api/routes/account/passkeys';
import { useFlashKey } from '@/plugins/useFlash';
import CreatePasskeyForm from '@account/passkeys/CreatePasskeyForm';
import DeletePasskeyButton from '@account/passkeys/DeletePasskeyButton';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { useTranslation } from 'react-i18next';

export default () => {
    const { t, i18n } = useTranslation('dashboard');
    const { clearAndAddHttpError } = useFlashKey('account');
    const { data, isValidating, error } = usePasskeys({
        revalidateOnMount: true,
        revalidateOnFocus: false,
    });

    useEffect(() => {
        clearAndAddHttpError(error);
    }, [error]);

    return (
        <div css={tw`md:flex flex-nowrap my-10`}>
            <ContentBox title={t('account.passkeys.add')} css={tw`flex-none w-full md:w-1/2`}>
                <CreatePasskeyForm />
            </ContentBox>
            <ContentBox title={t('account.passkeys.title')} css={tw`flex-1 overflow-hidden mt-8 md:mt-0 md:ml-8`}>
                <SpinnerOverlay visible={!data && isValidating} />
                {!data || !data.length ? (
                    <p css={tw`text-center text-sm`}>{!data ? t('account.loading') : t('account.passkeys.none')}</p>
                ) : (
                    data.map((passkey, index) => (
                        <GreyRowBox
                            key={passkey.uuid}
                            css={[tw`bg-black/50 flex space-x-4 items-center`, index > 0 && tw`mt-2`]}
                        >
                            <FontAwesomeIcon icon={faFingerprint} css={tw`text-neutral-300`} />
                            <div css={tw`flex-1`}>
                                <p css={tw`text-lg font-bold break-words`}>{passkey.name}</p>
                                <p css={tw`text-xs mt-1 text-gray-400 uppercase`}>
                                    {t('account.lastUsed')}:&nbsp;
                                    {passkey.lastUsedAt
                                        ? format(passkey.lastUsedAt, 'PPp', {
                                              locale: i18n.language === 'zh_CN' ? zhCN : undefined,
                                          })
                                        : t('account.never')}
                                </p>
                                <p css={tw`text-xs mt-1 text-gray-400 uppercase`}>
                                    {t('account.addedOn')}:&nbsp;
                                    {format(passkey.createdAt, 'PPp', {
                                        locale: i18n.language === 'zh_CN' ? zhCN : undefined,
                                    })}
                                </p>
                            </div>
                            <DeletePasskeyButton name={passkey.name} uuid={passkey.uuid} />
                        </GreyRowBox>
                    ))
                )}
            </ContentBox>
        </div>
    );
};
