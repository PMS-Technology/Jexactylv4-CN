import { ServerPreset } from '@/api/definitions/admin';
import { getServerPreset } from '@/api/routes/admin/servers';
import AdminContentBlock from '@/elements/AdminContentBlock';
import Spinner from '@/elements/Spinner';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router-dom';
import ServerPresetDialog from '@admin/management/servers/presets/ServerPresetDialog';
import AdminBox from '@/elements/AdminBox';
import { faChartBar, faCube, faPencilSquare } from '@fortawesome/free-solid-svg-icons';
import Input from '@/elements/Input';
import Label from '@/elements/Label';
import { Button } from '@/elements/button';
import { ChevronLeftIcon } from '@heroicons/react/outline';
import DeleteServerPresetDialog from './DeleteServerPresetDialog';

export default () => {
    const { t } = useTranslation('admin');
    const [preset, setPreset] = useState<ServerPreset>();
    const params = useParams();

    useEffect(() => {
        getServerPreset(Number(params.id ?? null))
            .then(setPreset)
            .catch(error => console.log(error));
    }, []);

    if (!preset) return <Spinner size={'large'} centered />;

    return (
        <AdminContentBlock title={t('servers.serverPresets') as string} showFlashKey={'admin:servers:presets'}>
            <div className={`w-full flex flex-row items-center mb-8`}>
                <div className={`flex flex-col flex-shrink`} style={{ minWidth: '0' }}>
                    <h2 className={`text-2xl text-neutral-50 font-header font-medium`}>{preset.name}</h2>
                    <p
                        className={`hidden md:block text-base text-neutral-400 whitespace-nowrap overflow-ellipsis overflow-hidden`}
                    >
                        {preset.description ?? (t('servers.thisIsServerPreset') as string)}
                    </p>
                </div>
                <div className={`flex ml-auto pl-4 space-x-3`}>
                    <Link to={'/admin/servers/presets'}>
                        <Button.Text>
                            <ChevronLeftIcon className={'w-5 h-5 mr-1'} /> {t('servers.back') as string}
                        </Button.Text>
                    </Link>
                    <ServerPresetDialog preset={preset} />
                    <DeleteServerPresetDialog id={preset.id} />
                </div>
            </div>
            <div className={'grid lg:grid-cols-2 gap-8'}>
                <AdminBox title={t('servers.basicInformation') as string} icon={faPencilSquare} className={'col-span-2'}>
                    <div className="grid lg:grid-cols-3 gap-4">
                        <div>
                            <Label>{t('servers.presetName') as string}</Label>
                            <Input disabled value={preset.name}></Input>
                        </div>
                        <div>
                            <Label>{t('servers.presetDescription') as string}</Label>
                            <Input disabled value={preset.description}></Input>
                        </div>
                        <div>
                            <Label>{t('servers.createdAt') as string}</Label>
                            <Input disabled value={new Date(preset.created_at).toLocaleString()}></Input>
                        </div>
                    </div>
                </AdminBox>
                <AdminBox title={t('servers.assignmentDetails') as string} icon={faCube}>
                    <div className="grid lg:grid-cols-2 gap-4">
                        <div>
                            <Label>{t('servers.nestId') as string}</Label>
                            <Input disabled value={preset.nest_id ?? (t('servers.notAssigned') as string)}></Input>
                        </div>
                        <div>
                            <Label>{t('servers.eggId') as string}</Label>
                            <Input disabled value={preset.egg_id ?? (t('servers.notAssigned') as string)}></Input>
                        </div>
                    </div>
                </AdminBox>
                <AdminBox title={t('servers.resourceLimits') as string} icon={faChartBar}>
                    <div className="grid lg:grid-cols-3 gap-4">
                        <div>
                            <Label>{t('servers.cpuLimitPercent') as string}</Label>
                            <Input disabled value={preset.cpu}></Input>
                        </div>
                        <div>
                            <Label>{t('servers.memoryLimitMib') as string}</Label>
                            <Input disabled value={preset.memory}></Input>
                        </div>
                        <div>
                            <Label>{t('servers.diskLimitMib') as string}</Label>
                            <Input disabled value={preset.disk}></Input>
                        </div>
                    </div>
                </AdminBox>
            </div>
        </AdminContentBlock>
    );
};
