import TransferListener from '@server/TransferListener';
import { Fragment, useEffect, useState } from 'react';
import { NavLink, Route, Routes, useParams } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import PageTransition from '@/elements/transitions/PageTransition';
import WebsocketHandler from '@server/WebsocketHandler';
import { ServerContext, ServerStatus } from '@/state/server';
import Spinner from '@/elements/Spinner';
import { NotFound, ServerError, Suspended } from '@/elements/ScreenBlock';
import { httpErrorToHuman } from '@/api/http';
import { useStoreState } from 'easy-peasy';
import InstallListener from '@server/InstallListener';
import ErrorBoundary from '@/elements/ErrorBoundary';
import { useLocation } from 'react-router-dom';
import ConflictStateRenderer from '@server/ConflictStateRenderer';
import MobileSidebar from '@/elements/MobileSidebar';
import PermissionRoute from '@/elements/PermissionRoute';
import routes from '@/routers/routes';
import { getTransitionKey } from '@/routers/routes/utils';
import Sidebar from '@/elements/Sidebar';
import { usePersistedState } from '@/plugins/usePersistedState';
import { CogIcon, DesktopComputerIcon, PuzzleIcon, ReplyIcon } from '@heroicons/react/outline';
import SidebarControls from '@server/console/SidebarControls';
import classNames from 'classnames';
import NavigationBar from '@/elements/NavigationBar';
import { useTranslation } from 'react-i18next';

function statusToColor(status: ServerStatus): string {
    switch (status) {
        case 'running':
            return 'border-green-500';
        case 'offline':
            return 'border-red-500';
        case 'starting':
            return 'border-yellow-500';
        case 'stopping':
            return 'border-yellow-500';
        default:
            return 'border-gray-500';
    }
}

function ServerRouter() {
    const { t } = useTranslation(['server', 'common']);
    const params = useParams<'id'>();
    const location = useLocation();

    const rootAdmin = useStoreState(state => state.user.data!.rootAdmin);
    const [error, setError] = useState('');

    const user = useStoreState(state => state.user.data!);
    const theme = useStoreState(state => state.theme.data!);
    const name = useStoreState(state => state.settings.data!.name);
    const logo = useStoreState(state => state.settings.data!.logo);
    const inConflictState = ServerContext.useStoreState(state => state.server.inConflictState);
    const getServer = ServerContext.useStoreActions(actions => actions.server.getServer);
    const clearServerState = ServerContext.useStoreActions(actions => actions.clearServerState);
    const [collapsed, setCollapsed] = usePersistedState<boolean>(`sidebar_user_${user.uuid}`, false);
    const server = ServerContext.useStoreState(state => state.server.data);
    const activityEnabled = useStoreState(state => state.settings.data!.activity.enabled.server);
    const billable = server?.billingProductId;
    const status = ServerContext.useStoreState(state => state.status.value);

    const categories = ['data', 'configuration'] as const;
    const routeName = (route: (typeof routes.server)[number]): string =>
        route.nameKey
            ? (t(`server:${route.nameKey}` as any, { defaultValue: route.name }) as string)
            : route.name || '';

    useEffect(() => {
        clearServerState();
    }, []);

    useEffect(() => {
        setError('');

        if (params.id === undefined) {
            return;
        }

        getServer(params.id).catch(error => {
            console.error(error);
            setError(httpErrorToHuman(error));
        });

        return () => {
            clearServerState();
        };
    }, [params.id]);

    if (billable && server.renewalDate && server.renewalDate.getTime() < new Date().getTime())
        return (
            <Suspended
                id={server.billingProductId}
                date={server.renewalDate}
                serverId={Number(server.internalId)}
                serverUuid={server.uuid}
            />
        );

    return (
        <Fragment key={'server-router'}>
            <div className={'h-screen flex'}>
                <MobileSidebar>
                    <MobileSidebar.Home />
                    {routes.server
                        .filter(
                            route =>
                                (route.nameKey || route.name) &&
                                (!route.condition || route.condition({ billable, activityEnabled })),
                        )
                        .map(route => (
                            <MobileSidebar.Link
                                key={route.route}
                                icon={route.icon ?? PuzzleIcon}
                                text={routeName(route)}
                                linkTo={route.path}
                                end={route.end}
                            />
                        ))}
                    {(user.rootAdmin || user.admin_role_id) && (
                        <MobileSidebar.Link icon={CogIcon} text={t('common:adminControl')} linkTo={'/admin'} />
                    )}
                </MobileSidebar>
                <Sidebar className={'flex-none'} $collapsed={collapsed} theme={theme}>
                    <div
                        className={
                            'h-16 w-full flex flex-col items-center justify-center mt-1 mb-3 select-none cursor-pointer transition-transform duration-200 hover:scale-105 active:scale-95'
                        }
                        onClick={() => setCollapsed(!collapsed)}
                    >
                        {!collapsed ? (
                            <h1 className={'text-2xl text-neutral-50 whitespace-nowrap font-medium'}>{name}</h1>
                        ) : (
                            <img
                                src={logo?.toString() || 'https://avatars.githubusercontent.com/u/91636558'}
                                className={'mt-4 w-12'}
                                alt={t('common:logo')}
                            />
                        )}
                    </div>
                    <Sidebar.Wrapper theme={theme} className={'mb-auto'}>
                        <NavLink to={'/'} end className={'mb-[18px]'}>
                            <DesktopComputerIcon />
                            <span>{t('common:dashboard')}</span>
                        </NavLink>
                        <Sidebar.Section>
                            {t('server:server')} {server?.uuid?.slice(0, 8)}
                        </Sidebar.Section>
                        {routes.server
                            .filter(
                                route =>
                                    !route.category &&
                                    (route.nameKey || route.name) &&
                                    (!route.condition || route.condition({ billable, activityEnabled })),
                            )
                            .map(route => (
                                <NavLink to={route.path} key={route.path} end={route.end}>
                                    <Sidebar.Icon icon={route.icon ?? PuzzleIcon} />
                                    <span>{routeName(route)}</span>
                                </NavLink>
                            ))}
                        {categories.map(category => {
                            const categoryRoutes = routes.server.filter(
                                route => route.category === category && (route.nameKey || route.name),
                            );
                            if (categoryRoutes.length === 0) return null;

                            return (
                                <Fragment key={category}>
                                    <Sidebar.Section>
                                        {t(`server:categories.${category}` as any) as string}
                                    </Sidebar.Section>
                                    {categoryRoutes.map(route => (
                                        <NavLink to={route.path} key={route.path} end={route.end}>
                                            <Sidebar.Icon icon={route.icon ?? PuzzleIcon} />
                                            <span>{routeName(route)}</span>
                                        </NavLink>
                                    ))}
                                </Fragment>
                            );
                        })}
                        {user.rootAdmin && (
                            <NavLink to={`/admin/servers/${server?.internalId}`}>
                                <ReplyIcon />
                                <span>{t('server:viewAsAdmin')}</span>
                            </NavLink>
                        )}
                    </Sidebar.Wrapper>
                    <Sidebar.User className={classNames('border-t', statusToColor(status))}>
                        {server && <SidebarControls />}
                    </Sidebar.User>
                </Sidebar>
                {!server?.uuid || !server?.id ? (
                    error ? (
                        <ServerError message={error} />
                    ) : (
                        <Spinner size="large" centered />
                    )
                ) : (
                    <div className={'flex-1 overflow-x-hidden'}>
                        <InstallListener />
                        <TransferListener />
                        <WebsocketHandler />
                        <NavigationBar />
                        {inConflictState &&
                        (!rootAdmin || (rootAdmin && !location.pathname.endsWith(`/server/${server?.id}`))) ? (
                            <ConflictStateRenderer />
                        ) : (
                            <ErrorBoundary>
                                <AnimatePresence mode={'wait'} initial={false}>
                                    <Routes
                                        location={location}
                                        key={getTransitionKey(
                                            routes.server.map(({ route }) =>
                                                `/server/${params.id}/${route}`.replace(/\/$/, ''),
                                            ),
                                            location.pathname,
                                        )}
                                    >
                                        {routes.server.map(({ route, permission, component: Component }) => (
                                            <Route
                                                key={route}
                                                path={route}
                                                element={
                                                    <PermissionRoute permission={permission}>
                                                        <PageTransition>
                                                            <Spinner.Suspense>
                                                                <Component />
                                                            </Spinner.Suspense>
                                                        </PageTransition>
                                                    </PermissionRoute>
                                                }
                                            />
                                        ))}

                                        <Route
                                            path="*"
                                            element={
                                                <PageTransition>
                                                    <NotFound />
                                                </PageTransition>
                                            }
                                        />
                                    </Routes>
                                </AnimatePresence>
                            </ErrorBoundary>
                        )}
                    </div>
                )}
            </div>
        </Fragment>
    );
}

export default ServerRouter;
