import { supabase } from '$lib/supabase';
import type { BudgetSettings } from '$lib/types';
import { getCurrentUserId } from './user.svelte';

const DEFAULTS = { total_budget: 50000, guest_count: 150 };

let budget = $state<BudgetSettings>({ user_id: '', ...DEFAULTS });
let loaded = $state(false);

export function getBudget() {
	return budget;
}

export function getBudgetLoaded() {
	return loaded;
}

export async function loadBudget() {
	const userId = getCurrentUserId();
	if (!userId) {
		loaded = true;
		return;
	}

	try {
		const { data, error } = await supabase
			.from('budget_settings')
			.select('*')
			.eq('user_id', userId)
			.maybeSingle();

		if (error) {
			console.error('Error loading budget:', error);
		}

		if (data) {
			budget = data as BudgetSettings;
		} else {
			const seed = { user_id: userId, ...DEFAULTS };
			const { data: created, error: createError } = await supabase
				.from('budget_settings')
				.insert(seed)
				.select()
				.single();

			if (createError) {
				console.error('Error creating budget:', createError);
				budget = seed;
			} else if (created) {
				budget = created as BudgetSettings;
			}
		}
	} catch {
		console.warn('Supabase not configured, using local budget');
	}
	loaded = true;
}

export async function updateBudget(updates: Partial<BudgetSettings>) {
	budget = { ...budget, ...updates, user_id: getCurrentUserId() };

	try {
		await supabase.from('budget_settings').upsert({ ...budget }, { onConflict: 'user_id' });
	} catch {
		// Local-only mode
	}
}

export function resetBudgetStore() {
	budget = { user_id: '', ...DEFAULTS };
	loaded = false;
}
