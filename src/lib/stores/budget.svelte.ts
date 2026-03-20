import { supabase } from '$lib/supabase';
import type { BudgetSettings } from '$lib/types';

const DEFAULT_BUDGET: BudgetSettings = {
	id: 'default',
	total_budget: 50000,
	guest_count: 150
};

let budget = $state<BudgetSettings>({ ...DEFAULT_BUDGET });
let loaded = $state(false);

export function getBudget() {
	return budget;
}

export function getBudgetLoaded() {
	return loaded;
}

export async function loadBudget() {
	try {
		const { data, error } = await supabase
			.from('budget_settings')
			.select('*')
			.limit(1)
			.single();

		if (error && error.code !== 'PGRST116') {
			console.error('Error loading budget:', error);
		}

		if (data) {
			budget = data as BudgetSettings;
		} else {
			// Create default budget in DB
			const { data: created, error: createError } = await supabase
				.from('budget_settings')
				.insert(DEFAULT_BUDGET)
				.select()
				.single();

			if (createError) {
				console.error('Error creating budget:', createError);
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
	budget = { ...budget, ...updates };

	try {
		await supabase.from('budget_settings').upsert({ ...budget });
	} catch {
		// Local-only mode
	}
}
