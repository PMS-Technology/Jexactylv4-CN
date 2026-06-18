import Spinner from '@/elements/Spinner';
import { useTranslation } from 'react-i18next';
import AdminBox from '@/elements/AdminBox';
import { useEffect, useState } from 'react';
import { faLayerGroup, faPuzzlePiece, faServer, faUser } from '@fortawesome/free-solid-svg-icons';
import { ExistingData, getExistingData } from '@/api/setup';
import { Alert } from '@/elements/alert';

export default () => {
    const { t } = useTranslation('admin');
    const [loading, setLoading] = useState<boolean>(false);
    const [data, setData] = useState<ExistingData>({ nodes: 0, servers: 0, eggs: 0, users: 0 });

    useEffect(() => {
        setLoading(true);

        getExistingData()
            .then(setData)
            .catch(e => console.error(e))
            .finally(() => setLoading(false));
    }, []);

    return (
        <div>
            <div className={'w-full flex flex-row items-center mb-8'}>
                <div className={'flex flex-col flex-shrink'} style={{ minWidth: '0' }}>
                    <h2 className={'text-2xl text-neutral-50 font-header font-medium'}>{t('setup.checkingForData') as string}</h2>
                    <p
                        className={
                            'hidden lg:block text-base text-neutral-400 whitespace-nowrap overflow-ellipsis overflow-hidden'
                        }
                    >
                        {t('setup.checkingForDataDescription') as string}
                    </p>
                </div>
            </div>
            <div className={'grid lg:grid-cols-2 gap-4'}>
                <AdminBox title={t('setup.users') as string} icon={faUser}>
                    {loading ? <Spinner centered /> : data.users}
                    &nbsp;{t('setup.readyForMigration') as string}
                </AdminBox>
                <AdminBox title={t('setup.nodes') as string} icon={faLayerGroup}>
                    {loading ? <Spinner centered /> : data.nodes}
                    &nbsp;{t('setup.readyForMigration') as string}
                </AdminBox>
                <AdminBox title={t('setup.servers') as string} icon={faServer}>
                    {loading ? <Spinner centered /> : data.servers}
                    &nbsp;{t('setup.readyForMigration') as string}
                </AdminBox>
                <AdminBox title={t('setup.eggs') as string} icon={faPuzzlePiece}>
                    {loading ? <Spinner centered /> : data.eggs}
                    &nbsp;{t('setup.readyForMigration') as string}
                </AdminBox>
            </div>
            {!loading && data.users === 1 && (
                <Alert type={'warning'}>
                    {t('setup.migrationWarning') as string}
                </Alert>
            )}
        </div>
    );
};
