import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const projectRoot = process.cwd();

function read(relativePath) {
  return fs.readFileSync(path.join(projectRoot, relativePath), 'utf8');
}

const appSource = read('src/App.jsx');
const mainSource = read('src/main.jsx');
const providersSource = read('src/app/providers.jsx');
const loginScreenSource = read('src/components/login-screen.jsx');
const dashboardSource = read('src/components/optimized-lms-dashboard.jsx');
const apiSource = read('src/services/api.js');

assert(appSource.includes('<LoginScreen />'), 'Login screen route is missing from App.jsx');
assert(appSource.includes('<OptimizedLMSDashboard />'), 'Dashboard route is missing from App.jsx');
assert(
  mainSource.includes('<BrowserRouter>') || providersSource.includes('<BrowserRouter>'),
  'App is not mounted inside BrowserRouter'
);
assert(loginScreenSource.toLowerCase().includes('login'), 'Login screen component content looks incomplete');
assert(dashboardSource.includes('export') || dashboardSource.includes('function'), 'Dashboard component file looks invalid');
assert(apiSource.includes("'/auth/login'"), 'Login API endpoint mapping is missing');
assert(apiSource.includes("'/auth/me'"), 'Auth profile API endpoint mapping is missing');

console.log('Frontend smoke checks passed.');
