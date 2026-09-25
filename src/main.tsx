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
