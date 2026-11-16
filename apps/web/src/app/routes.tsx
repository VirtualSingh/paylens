import type { RouteObject } from 'react-router';
import {
  ComingLater,
  NotFoundPage,
  RouteErrorPage,
} from '../components/page-states';
import { AppShell } from './app-shell';

/**
 * Every screen of ui-screens.md. Feature pages load lazily, so a route's code (and later
 * ECharts on the dashboard) is fetched only when someone opens it (frontend.md → budget).
 */
export const routes: RouteObject[] = [
  {
    path: '/',
    element: <AppShell />,
    errorElement: <RouteErrorPage />,
    children: [
      {
        errorElement: <RouteErrorPage />,
        children: [
          {
            index: true,
            element: <ComingLater section="The dashboard" />,
          },
          {
            path: 'people',
            lazy: async () => ({
              Component: (await import('../features/people/directory-page'))
                .DirectoryPage,
            }),
          },
          {
            path: 'people/:id',
            lazy: async () => ({
              Component: (await import('../features/people/employee-page'))
                .EmployeePage,
            }),
          },
          { path: 'pay-bands', element: <ComingLater section="Pay bands" /> },
          { path: 'imports', element: <ComingLater section="Imports" /> },
          { path: 'audit', element: <ComingLater section="The audit log" /> },
          { path: 'settings', element: <ComingLater section="Settings" /> },
          { path: '*', element: <NotFoundPage /> },
        ],
      },
    ],
  },
];
