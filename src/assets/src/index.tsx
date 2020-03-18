import React from 'react';
import ReactDOM from 'react-dom';
import { BrowserRouter as Router } from 'react-router-dom';
import { App } from './containers/app';

export interface User {
    username: string;
    first_name: string;
    last_name: string;
}

export interface Globals {
    user?: User;
    feedback_email: string;
}

const globalsId = 'spa_globals';
const globalsElement = document.getElementById(globalsId);
if (!globalsElement) throw new Error(`#${globalsId} not found!`);
if (!globalsElement.textContent) throw new Error(`No data found in #${globalsId}!`);
const globals = Object.freeze(JSON.parse(globalsElement.textContent));

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
