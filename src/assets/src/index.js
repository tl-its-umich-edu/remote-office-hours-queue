import React from 'react';
import ReactDOM from 'react-dom';
import { BrowserRouter as Router } from 'react-router-dom';
import { App } from './containers/app';

const globalsId = 'spa_globals';
const globalsElement = document.getElementById(globalsId);
if (!globalsElement) throw new Error(`#${globalsId} not found!`);
console.log(globalsElement.textContent);
const globals = Object.freeze(JSON.parse(globalsElement.textContent));
console.log(globals);

ReactDOM.render(
  <Router basename='/'>
    <App globals={globals} />
  </Router>
  , document.getElementById('root')
);

// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: http://bit.ly/CRA-PWA
// serviceWorker.unregister()
