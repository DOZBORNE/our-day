import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Create a no-op client if Supabase is not configured
function createSupabaseClient(): SupabaseClient {
	if (!supabaseUrl || !supabaseAnonKey) {
		// Return a mock client that silently fails - app works in local-only mode
		return new Proxy({} as SupabaseClient, {
			get(_target, prop) {
				if (prop === 'from') {
					return () =>
						new Proxy(
							{},
							{
								get() {
									return (..._args: unknown[]) =>
										Promise.resolve({ data: null, error: { message: 'Supabase not configured', code: 'NOT_CONFIGURED' } });
								}
							}
						);
				}
				return () => Promise.resolve({ data: null, error: null });
			}
		});
	}
	return createClient(supabaseUrl, supabaseAnonKey);
}

export const supabase = createSupabaseClient();
