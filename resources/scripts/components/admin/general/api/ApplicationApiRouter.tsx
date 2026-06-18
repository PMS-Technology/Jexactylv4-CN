import { Route, Routes } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import AdminContentBlock from '@/elements/AdminContentBlock';
import FlashMessageRender from '@/elements/FlashMessageRender';
import ApiContainer from './ApiContainer';
import NewApiKeyContainer from './NewApiKeyContainer';
import { NotFound } from '@/elements/ScreenBlock';

export default () => {
    const { t } = useTranslation('admin');
    return (
        <AdminContentBlock title={t('api.apiKeys') as string}>
            <div className={'w-full flex flex-row items-center mb-8'}>
                <div className={'flex flex-col flex-shrink'} style={{ minWidth: '0' }}>
                    <h2 className={'text-2xl text-neutral-50 font-header font-medium'}>{t('api.apiKeys') as string}</h2>
                    <p
                        className={
                            'hidden lg:block text-base text-neutral-400 whitespace-nowrap overflow-ellipsis overflow-hidden'
                        }
                    >
                        {t('api.description') as string}
                    </p>
                </div>
            </div>

            <FlashMessageRender byKey={'admin:settings'} className={'mb-4'} />

            <Routes>
                <Route path={'/'} element={<ApiContainer />} />
                <Route path={'/new'} element={<NewApiKeyContainer />} />
                <Route path={'*'} element={<NotFound />} />
            </Routes>
        </AdminContentBlock>
    );
};
