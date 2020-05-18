import './models';  // Work around definition files not triggering reload https://github.com/TypeStrong/ts-loader/issues/808
import './components/page';  // Work around definition files not triggering reload https://github.com/TypeStrong/ts-loader/issues/808
import React from 'react';
import ReactDOM from 'react-dom';
import { BrowserRouter as Router } from 'react-router-dom';
import { AppRouter as App } from './containers/app';
import { User } from './models';

export interface Globals {
    user?: User;
    feedback_email: string;
    debug: boolean;
    ga_tracking_id?: string;
    login_url: string;
}

const globalsId = 'spa_globals';
const globalsElement = document.getElementById(globalsId);
if (!globalsElement) throw new Error(`#${globalsId} not found!`);
if (!globalsElement.textContent) throw new Error(`No data found in #${globalsId}!`);
const globals = JSON.parse(globalsElement.textContent);

ReactDOM.render(
    (
        <Router basename='/'>
            <App globals={globals} />
        </Router>
    ), document.getElementById('root')
);

// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: http://bit.ly/CRA-PWA
// serviceWorker.unregister()
