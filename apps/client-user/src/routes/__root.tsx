import { TanStackDevtools } from '@tanstack/react-devtools';
import { createRootRoute, HeadContent, Scripts } from '@tanstack/react-router';
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools';
import { useEffect, useState } from 'react';

import { Header } from '../components/layout/Header';
import { KeyboardHelpOverlay } from '../components/shared/KeyboardHelpOverlay';
import { useKeyboardNav } from '../hooks/useKeyboardNav';

import appCss from '../styles.css?url';

export const Route = createRootRoute({
  head: () => ({
    meta: [
      {
        charSet: 'utf-8',
      },
      {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1',
      },
      {
        name: 'color-scheme',
        content: 'light dark',
      },
      {
        title: 'Chirp - Social Feed',
      },
    ],
    links: [
      {
        rel: 'preconnect',
        href: 'https://fonts.googleapis.com',
      },
      {
        rel: 'preconnect',
        href: 'https://fonts.gstatic.com',
        crossOrigin: 'anonymous',
      },
      {
        rel: 'stylesheet',
        href: 'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap',
      },
      {
        rel: 'stylesheet',
        href: appCss,
      },
      {
        rel: 'stylesheet',
        href: '/virtual:stylex.css',
      },
    ],
  }),

  shellComponent: RootDocument,
});

const FOCUS_RING_CSS = `
article[data-keyboard-focused] {
  outline: 2px solid #6366f1;
  outline-offset: 2px;
  box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.12), 0 1px 3px 0 rgb(0 0 0 / 0.05);
}
`;

function KeyboardController() {
  const [helpOpen, setHelpOpen] = useState(false);

  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = FOCUS_RING_CSS;
    document.head.appendChild(style);
    return () => style.remove();
  }, []);

  useKeyboardNav(
    () => setHelpOpen((o) => !o),
    helpOpen ? () => setHelpOpen(false) : undefined,
  );

  return helpOpen ? (
    <KeyboardHelpOverlay onClose={() => setHelpOpen(false)} />
  ) : null;
}

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        <Header />
        {children}
        <KeyboardController />
        <TanStackDevtools
          config={{
            position: 'bottom-right',
          }}
          plugins={[
            {
              name: 'Tanstack Router',
              render: <TanStackRouterDevtoolsPanel />,
            },
          ]}
        />
        <Scripts />
      </body>
    </html>
  );
}
