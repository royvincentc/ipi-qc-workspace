import React from 'react';
import {createRoot} from 'react-dom/client';
import {createBrowserRouter,RouterProvider} from 'react-router-dom';
import App from './App';
import './styles.css';
const router=createBrowserRouter([{path:'*',element:<App/>,errorElement:<div className="login"><h1>We couldn’t open this page</h1><p>Your saved records are safe. Reload the workspace to continue.</p><button className="button primary" onClick={()=>location.reload()}>Reload workspace</button></div>}]);
createRoot(document.getElementById('root')!).render(<React.StrictMode><RouterProvider router={router}/></React.StrictMode>);

import './overhaul.css';
import './settings-layout.css';
import './experience.css';
import './report-design.css';
import './route-redesign.css';
import './laboratory.css';

// Production builds can reopen previously visited shared boards without a network.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  void navigator.serviceWorker.register('/shared-offline.js').then(async registration => {
    await navigator.serviceWorker.ready;
    const warm = () => {
      const urls = performance.getEntriesByType('resource').map(entry => entry.name);
      (registration.active || navigator.serviceWorker.controller)?.postMessage({ type: 'cache-shared-shell', urls });
    };
    warm();
    window.addEventListener('load', warm, { once: true });
    const resources = new PerformanceObserver(warm);
    resources.observe({ type: 'resource', buffered: true });
  }).catch(() => { /* IndexedDB editing remains available in the current tab. */ });
}

