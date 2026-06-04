'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/supabase/env';

type ConsentField = 'consent_video_analysis' | 'consent_personalization';

export async function updateConsent(
  field: ConsentField,
  value: boolean,
): Promise<{ error: string } | undefined> {
  if (!isSupabaseConfigured()) return { error: 'Supabase isn’t connected.' };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'You are not signed in.' };

  const patch =
    field === 'consent_video_analysis'
      ? { consent_video_analysis: value }
      : { consent_personalization: value };

  const { error } = await supabase.from('profiles').update(patch).eq('id', user.id);
  if (error) return { error: error.message };
  revalidatePath('/profile');
  return undefined;
}

export async function retakeOnboarding(): Promise<{ error: string } | undefined> {
  if (!isSupabaseConfigured()) return { error: 'Supabase isn’t connected.' };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'You are not signed in.' };

  const { error } = await supabase
    .from('profiles')
    .update({ onboarding_completed: false })
    .eq('id', user.id);
  if (error) return { error: error.message };

  revalidatePath('/', 'layout');
  redirect('/onboarding');
}
