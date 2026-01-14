import { memo } from 'react';

import { ErrorBoundary } from '@/shared/ErrorBoundary';

import type { ReactNode } from 'react';

interface AppProvidersProps {
  children: ReactNode;
}

export const AppProviders = memo(({ children }: AppProvidersProps) => (
  <ErrorBoundary>
    {children}
  </ErrorBoundary>
));

AppProviders.displayName = 'AppProviders';
