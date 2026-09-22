import tw from 'twin.macro';
import { Link, NavLink } from 'react-router-dom';
import { useContext } from 'react';
import { useTranslation } from 'react-i18next';
import AdminContentBlock from '@/elements/AdminContentBlock';
import AdminTable, {
    ContentWrapper,
    Loading,
    NoItems,
    Pagination,
    TableBody,
    TableHead,
    TableHeader,
    TableRow,
    useTableHooks,
} from '@/elements/AdminTable';
import { Button } from '@/elements/button';
import CopyOnClick from '@/elements/CopyOnClick';
import { differenceInHours, format, formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import classNames from 'classnames';
import { useStoreState } from '@/state/hooks';
import Avatar from '@/elements/Avatar';
import { getTickets, TicketsContext, TicketFilters, type TicketStatus } from '@/api/routes/admin/tickets';

export const statusToColor = (status: TicketStatus): string => {
    switch (status) {
        case 'in-progress':
            return 'bg-yellow-200 text-yellow-800';
        case 'unresolved':
            return 'bg-red-200 text-red-800';
        case 'resolved':
            return 'bg-green-200 text-green-800';
        default:
            return 'bg-gray-400 text-gray-800';
    }
};

function TicketContainer() {
    const { t, i18n } = useTranslation('admin');
    const isChinese = i18n.language === 'zh_CN';
    const { data: tickets } = getTickets();
    const { colors } = useStoreState(state => state.theme.data!);
    const { setPage, setFilters, sort, setSort, sortDirection } = useContext(TicketsContext);

    const onSearch = (query: string): Promise<void> => {
        return new Promise(resolve => {
            if (query.length < 2) {
                setFilters(null);
            } else {
                setFilters({ title: query });
            }
            return resolve();
        });
    };

    return (
        <AdminContentBlock title={t('ticketsModule.tickets') as string}>
            <div className={'w-full flex flex-row items-center mb-8'}>
                <div className={'flex flex-col flex-shrink'} style={{ minWidth: '0' }}>
                    <h2 className={'text-2xl text-neutral-50 font-header font-medium'}>
                        {t('ticketsModule.tickets') as string}
                    </h2>
                    <p
                        className={
                            'hidden lg:block text-base text-neutral-400 whitespace-nowrap overflow-ellipsis overflow-hidden'
                        }
                    >
                        {t('ticketsModule.description') as string}
                    </p>
                </div>
                <div css={tw`flex ml-auto pl-4`}>
                    <Link to={'/admin/tickets/new'}>
                        <Button>{t('ticketsModule.newTicket') as string}</Button>
                    </Link>
                </div>
            </div>
            <AdminTable>
                <ContentWrapper onSearch={onSearch}>
                    <Pagination data={tickets} onPageSelect={setPage}>
                        <div css={tw`overflow-x-auto`}>
                            <table css={tw`w-full table-auto`}>
                                <TableHead>
                                    <TableHeader
                                        name={t('ticketsModule.id') as string}
                                        direction={sort === 'id' ? (sortDirection ? 1 : 2) : null}
                                        onClick={() => setSort('id')}
                                    />
                                    <TableHeader
                                        name={t('ticketsModule.title') as string}
                                        direction={sort === 'title' ? (sortDirection ? 1 : 2) : null}
                                        onClick={() => setSort('title')}
                                    />
                                    <TableHeader
                                        name={t('ticketsModule.status') as string}
                                        direction={sort === 'status' ? (sortDirection ? 1 : 2) : null}
                                        onClick={() => setSort('status')}
                                    />
                                    <TableHeader name={t('ticketsModule.assignedTo') as string} />
                                    <TableHeader
                                        name={t('ticketsModule.createdAt') as string}
                                        direction={sort === 'created_at' ? (sortDirection ? 1 : 2) : null}
                                        onClick={() => setSort('created_at')}
                                    />
                                </TableHead>
                                <TableBody>
                                    {tickets !== undefined &&
                                        tickets.items.length > 0 &&
                                        tickets.items.map(ticket => (
                                            <TableRow key={ticket.id}>
                                                <td css={tw`px-6 text-sm text-neutral-200 text-left whitespace-nowrap`}>
                                                    <CopyOnClick text={ticket.id}>
                                                        <code css={tw`font-mono bg-neutral-900 rounded py-1 px-2`}>
                                                            {ticket.id}
                                                        </code>
                                                    </CopyOnClick>
                                                </td>
                                                <td css={tw`px-6 text-sm text-neutral-200 text-left whitespace-nowrap`}>
                                                    <NavLink
                                                        to={`/admin/tickets/${ticket.id}`}
                                                        style={{ color: colors.primary }}
                                                        className={'hover:brightness-125 duration-300'}
                                                    >
                                                        {ticket.title}
                                                    </NavLink>
                                                </td>
                                                <td css={tw`px-6 text-sm text-neutral-200 text-left whitespace-nowrap`}>
                                                    <span
                                                        className={classNames(
                                                            statusToColor(ticket.status),
                                                            'capitalize px-2 inline-flex text-xs leading-5 font-medium rounded-full',
                                                        )}
                                                    >
                                                        {ticket.status}
                                                    </span>
                                                </td>
                                                <td css={tw`px-6 text-sm text-neutral-200 text-left whitespace-nowrap`}>
                                                    <div className={'my-2 inline-flex'}>
                                                        <Avatar size={24} name={ticket.assigned_to?.email ?? 'null'} />
                                                        <div className={'ml-2'}>
                                                            {ticket.assigned_to?.email ?? 'Unassigned'}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td css={tw`px-6 text-sm text-neutral-200 text-left whitespace-nowrap`}>
                                                    {Math.abs(differenceInHours(ticket.created_at, new Date())) > 48
                                                        ? format(
                                                              ticket.created_at,
                                                              isChinese ? 'yyyy年M月d日 H:mm' : 'MMM do, yyyy h:mma',
                                                              { locale: isChinese ? zhCN : undefined },
                                                          )
                                                        : formatDistanceToNow(ticket.created_at, {
                                                              addSuffix: true,
                                                              locale: isChinese ? zhCN : undefined,
                                                          })}
                                                </td>
                                            </TableRow>
                                        ))}
                                </TableBody>
                            </table>

                            {tickets === undefined ? <Loading /> : tickets.items.length < 1 ? <NoItems /> : null}
                        </div>
                    </Pagination>
                </ContentWrapper>
            </AdminTable>
        </AdminContentBlock>
    );
}

export default () => {
    const hooks = useTableHooks<TicketFilters>();

    return (
        <TicketsContext.Provider value={hooks}>
            <TicketContainer />
        </TicketsContext.Provider>
    );
};
