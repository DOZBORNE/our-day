import type { Handle } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';

const COOKIE_NAME = 'wp-access';

export const handle: Handle = async ({ event, resolve }) => {
	const accessCode = env.ACCESS_CODE || '';

	// No code configured — skip protection
	if (!accessCode) {
		return resolve(event);
	}

	// Allow the login page through
	if (event.url.pathname === '/login') {
		return resolve(event);
	}

	// Check cookie
	const cookie = event.cookies.get(COOKIE_NAME);
	if (cookie === btoa(accessCode)) {
		return resolve(event);
	}

	// Not authenticated — redirect to login
	return new Response(null, {
		status: 302,
		headers: { location: '/login' }
	});
};
