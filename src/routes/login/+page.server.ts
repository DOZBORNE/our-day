import type { Actions } from './$types';
import { redirect, fail } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';

const COOKIE_NAME = 'wp-access';
const COOKIE_DAYS = 90;

export const actions: Actions = {
	default: async ({ request, cookies }) => {
		const accessCode = env.ACCESS_CODE || '';
		const data = await request.formData();
		const code = data.get('code')?.toString() || '';

		if (code !== accessCode) {
			return fail(403, { incorrect: true });
		}

		cookies.set(COOKIE_NAME, btoa(accessCode), {
			path: '/',
			maxAge: COOKIE_DAYS * 24 * 60 * 60,
			httpOnly: true,
			sameSite: 'lax',
			secure: false
		});

		throw redirect(302, '/');
	}
};
