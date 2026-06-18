import { SubNavigation, SubNavigationLink } from '@/components/admin/SubNavigation';
import AdminContentBlock from '@/elements/AdminContentBlock';
import { useTranslation } from 'react-i18next';
import { AdjustmentsIcon, ArchiveIcon, TerminalIcon } from '@heroicons/react/outline';
import ServerPresetsTable from './ServerPresetsTable';
import ServerPresetDialog from './ServerPresetDialog';

export default () => {
    const { t } = useTranslation('admin');

    return (
        <AdminContentBlock title={t('servers.serverPresets') as string} showFlashKey={'admin:servers:presets'}>
            <div className={`w-full flex flex-row items-center mb-8`}>
                <div className={`flex flex-col flex-shrink`} style={{ minWidth: '0' }}>
                    <h2 className={`text-2xl text-neutral-50 font-header font-medium`}>{t('servers.serverPresets') as string}</h2>
                    <p
                        className={`hidden md:block text-base text-neutral-400 whitespace-nowrap overflow-ellipsis overflow-hidden`}
                    >
                        {t('servers.controlPresetConfigurations') as string}
                    </p>
                </div>
                <div className={`flex ml-auto pl-4`}>
                    <ServerPresetDialog />
                </div>
            </div>

            <SubNavigation>
                <SubNavigationLink to="/admin/servers" name={t('servers.allServers') as string} base>
                    <TerminalIcon />
                </SubNavigationLink>
                <SubNavigationLink to="/admin/servers/presets" name={t('servers.presets') as string}>
                    <AdjustmentsIcon />
                </SubNavigationLink>
                <SubNavigationLink to="/admin/nests" name={t('servers.nests') as string}>
                    <ArchiveIcon />
                </SubNavigationLink>
            </SubNavigation>

            <ServerPresetsTable />
        </AdminContentBlock>
    );
};
