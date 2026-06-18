import { useStoreState } from '@/state/hooks';
import { useTranslation } from 'react-i18next';
import AdminContentBlock from '@/elements/AdminContentBlock';
import FlashMessageRender from '@/elements/FlashMessageRender';
import EnableWebhooks from './EnableWebhooks';
import WebhookEventsContainer from './events/WebhookEventsContainer';
import { SubNavigation, SubNavigationLink } from '@/components/admin/SubNavigation';
import { ChipIcon, AdjustmentsIcon, LinkIcon } from '@heroicons/react/outline';

export default () => {
    const { t } = useTranslation('admin');
    const enabled = useStoreState(state => state.everest.data!.webhooks.enabled);

    if (!enabled) return <EnableWebhooks />;

    return (
        <AdminContentBlock title={t('settings.webhooks') as string}>
            <FlashMessageRender byKey={'admin:webhooks'} className={'mb-4'} />
            <div className={'w-full flex flex-row items-center mb-8'}>
                <div className={'flex flex-col flex-shrink'} style={{ minWidth: '0' }}>
                    <h2 className={'text-2xl text-neutral-50 font-header font-medium'}>{t('settings.webhooks') as string}</h2>
                    <p
                        className={
                            'hidden lg:block text-base text-neutral-400 whitespace-nowrap overflow-ellipsis overflow-hidden'
                        }
                    >
                        {t('settings.webhooksDesc') as string}
                    </p>
                </div>
            </div>
            <SubNavigation>
                <SubNavigationLink to="/admin/settings" name={t('settings.core') as string} base>
                    <ChipIcon />
                </SubNavigationLink>
                <SubNavigationLink to="/admin/settings/mode" name={t('settings.modes') as string}>
                    <AdjustmentsIcon />
                </SubNavigationLink>
                <SubNavigationLink to="/admin/settings/webhooks" name={t('settings.webhooks') as string}>
                    <LinkIcon />
                </SubNavigationLink>
            </SubNavigation>
            <WebhookEventsContainer />
        </AdminContentBlock>
    );
};
