import { mount } from 'svelte';
import '$styles/app.css';
import App from './App.svelte';
import { app } from '$lib/stores/app.svelte';
import { theme } from '$lib/stores/theme.svelte';

// Read the Blade-injected globals before the first render so feature flags and the
// user are available synchronously, matching the legacy bootstrap order.
app.hydrate();
theme.init();

const target = document.getElementById('app');

if (!target) {
    throw new Error('Mount target #app is missing; check the Blade template.');
}

export default mount(App, { target });
