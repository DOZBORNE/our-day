import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = ({ locals }) => {
	return {
		userId: locals.userId ?? '',
		userName: locals.userName ?? ''
	};
};
