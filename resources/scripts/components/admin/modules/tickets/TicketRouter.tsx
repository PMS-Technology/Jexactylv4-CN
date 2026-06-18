import { useStoreState } from '@/state/hooks';
import { useTranslation } from 'react-i18next';
import { Route, Routes } from 'react-router-dom';
import { NotFound } from '@/elements/ScreenBlock';
import NewTicketForm from '@admin/modules/tickets/NewTicketForm';
import TicketsContainer from '@admin/modules/tickets/TicketsContainer';
import ViewTicketContainer from '@admin/modules/tickets/view/ViewTicketContainer';
import EnableTicketsContainer from './EnableTicketsContainer';
import { CogIcon, TicketIcon } from '@heroicons/react/outline';
import { SubNavigation, SubNavigationLink } from '@admin/SubNavigation';
import AdminContentBlock from '@/elements/AdminContentBlock';
import FlashMessageRender from '@/elements/FlashMessageRender';
import TicketOptionsContainer from './TicketOptionsContainer';

export default () => {
    const { t } = useTranslation('admin');
    const enabled = useStoreState(state => state.everest.data!.tickets.enabled);

    if (!enabled) return <EnableTicketsContainer />;

    return (
        <AdminContentBlock title={t('ticketsModule.ticketDashboard') as string}>
            <FlashMessageRender byKey={'admin:tickets'} className={'mb-4'} />
            <div className={'w-full flex flex-row items-center mb-8'}>
                <div className={'flex flex-col flex-shrink'} style={{ minWidth: '0' }}>
                    <h2 className={'text-2xl text-neutral-50 font-header font-medium'}>{t('ticketsModule.ticketDashboard') as string}</h2>
                    <p
                        className={
                            'hidden lg:block text-base text-neutral-400 whitespace-nowrap overflow-ellipsis overflow-hidden'
                        }
                    >
                        {t('ticketsModule.description') as string}
                    </p>
                </div>
            </div>
            <SubNavigation>
                <SubNavigationLink to={'/admin/tickets'} name={t('ticketsModule.openTickets') as string} base>
                    <TicketIcon />
                </SubNavigationLink>
                <SubNavigationLink to={'/admin/tickets/options'} name={t('ticketsModule.options') as string}>
                    <CogIcon />
                </SubNavigationLink>
            </SubNavigation>
            <Routes>
                <Route path={'/'} element={<TicketsContainer />} />

                <Route path={'/new'} element={<NewTicketForm />} />
                <Route path={'/:id'} element={<ViewTicketContainer />} />

                <Route path={'/options'} element={<TicketOptionsContainer />} />

                <Route path={'/*'} element={<NotFound />} />
            </Routes>
        </AdminContentBlock>
    );
};
