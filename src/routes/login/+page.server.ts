import type { Actions } from './$types';
import { redirect, fail } from '@sveltejs/kit';
import { USERS } from '../../hooks.server';

const COOKIE_NAME = 'wp-access';
const COOKIE_DAYS = 90;

export const actions: Actions = {
	default: async ({ request, cookies }) => {
		const data = await request.formData();
		const code = data.get('code')?.toString() || '';

		const user = USERS.find((u) => u.pin === code);
		if (!user) {
			return fail(403, { incorrect: true });
		}

		cookies.set(COOKIE_NAME, btoa(user.id), {
			path: '/',
			maxAge: COOKIE_DAYS * 24 * 60 * 60,
			httpOnly: true,
			sameSite: 'lax',
			secure: false
		});

		throw redirect(302, '/');
	}
};
