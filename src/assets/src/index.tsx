import './models';  // Work around definition files not triggering reload https://github.com/TypeStrong/ts-loader/issues/808
import './components/page';  // Work around definition files not triggering reload https://github.com/TypeStrong/ts-loader/issues/808
import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter as Router } from 'react-router-dom';
import { AppRouter as App } from './containers/app';
import { MeetingBackend, User } from './models';

export interface Globals {
    user?: User;
    feedback_email: string;
    debug: boolean;
    ga_tracking_id?: string;
    login_url: string;
    backends: MeetingBackend[];
    default_backend: string;
}

const globalsId = 'spa_globals';
const globalsElement = document.getElementById(globalsId);
if (!globalsElement) throw new Error(`#${globalsId} not found!`);
if (!globalsElement.textContent) throw new Error(`No data found in #${globalsId}!`);
const globals = JSON.parse(globalsElement.textContent);

const container = document.getElementById('root')
const root = createRoot(container!)

root.render(
    (
        <Router basename='/'>
            <App globals={globals} />
        </Router>
    )
);

// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: http://bit.ly/CRA-PWA
// serviceWorker.unregister()
