import AdminBox from '@/elements/AdminBox';
import { useTranslation } from 'react-i18next';
import { useStoreState } from '@/state/hooks';
import { faDesktop } from '@fortawesome/free-solid-svg-icons';

export default ({ reload }: { reload: boolean }) => {
    const { t } = useTranslation('admin');
    const { primary } = useStoreState(s => s.theme.data!.colors);

    return (
        <AdminBox title={t('themeModule.preview') as string} icon={faDesktop} className={'lg:col-span-2'}>
            <iframe
                src={reload ? '/null' : '/'}
                style={{ borderColor: primary }}
                className={'w-full rounded-lg h-[60vh] border-2 transition duration-500'}
            />
        </AdminBox>
    );
};
