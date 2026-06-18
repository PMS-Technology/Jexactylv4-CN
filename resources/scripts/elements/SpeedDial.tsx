import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '@/elements/button';
import { useStoreState } from '@/state/hooks';
import Tooltip from '@/elements/tooltip/Tooltip';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faLayerGroup,
    faMagicWandSparkles,
    faPlus,
    faServer,
    faTicket,
    faUserPlus,
    IconDefinition,
} from '@fortawesome/free-solid-svg-icons';

interface QuickActionProps {
    link: string;
    tooltip: string;
    icon: IconDefinition;
}

const QuickAction = ({ tooltip, icon, link }: QuickActionProps) => (
    <Tooltip placement={'left'} content={tooltip} arrow>
        <Link to={link}>
            <Button.Text className={'w-12 h-12'}>
                <FontAwesomeIcon icon={icon} />
            </Button.Text>
        </Link>
    </Tooltip>
);

export default () => {
    const { t } = useTranslation('admin');
    const [open, setOpen] = useState<boolean>(false);
    const ai = useStoreState(s => s.everest.data!.ai.enabled);
    const enabled = useStoreState(s => s.settings.data!.speed_dial);
    const tickets = useStoreState(s => s.everest.data!.tickets.enabled);

    if (!enabled) return <></>;

    return (
        <div className="hidden md:block fixed bottom-6 right-6" style={{ zIndex: 9999 }}>
            {open && (
                <div className="flex flex-col items-center mb-4 space-y-2">
                    {ai && <QuickAction icon={faMagicWandSparkles} link={'/admin/ai'} tooltip={t('speedDial.askAI')} />}
                    <QuickAction icon={faLayerGroup} link={'/admin/nodes/new'} tooltip={t('speedDial.createNode')} />
                    <QuickAction icon={faServer} link={'/admin/servers/new'} tooltip={t('speedDial.createServer')} />
                    <QuickAction icon={faUserPlus} link={'/admin/users/new'} tooltip={t('speedDial.newUser')} />
                    {tickets && <QuickAction icon={faTicket} link={'/admin/tickets'} tooltip={t('speedDial.viewTickets')} />}
                </div>
            )}
            <Button className={'w-12 h-12'} onClick={() => setOpen(!open)}>
                <FontAwesomeIcon icon={faPlus} />
            </Button>
        </div>
    );
};
