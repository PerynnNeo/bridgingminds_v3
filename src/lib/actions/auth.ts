'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/supabase/env';

const NOT_CONFIGURED =
  'Supabase isn’t connected yet. Add your keys to .env.local to enable accounts.';

export type LoginResult = { error: string } | undefined;
export type SignupResult = { error: string } | { needsConfirmation: true } | undefined;

export async function login(formData: FormData): Promise<LoginResult> {
  if (!isSupabaseConfigured()) return { error: NOT_CONFIGURED };

  const email = String(formData.get('email') ?? '').trim();
  const password = String(formData.get('password') ?? '');
  if (!email || !password) return { error: 'Please enter your email and password.' };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: error.message };

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let destination = '/onboarding';
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('onboarding_completed')
      .eq('id', user.id)
      .maybeSingle();
    destination = profile?.onboarding_completed ? '/home' : '/onboarding';
  }

  revalidatePath('/', 'layout');
  redirect(destination);
}

export async function signup(formData: FormData): Promise<SignupResult> {
  if (!isSupabaseConfigured()) return { error: NOT_CONFIGURED };

  const email = String(formData.get('email') ?? '').trim();
  const password = String(formData.get('password') ?? '');
  const fullName = String(formData.get('full_name') ?? '').trim();
  const ageGroup = String(formData.get('age_group') ?? '').trim();
  const consentAudio = formData.get('consent_audio') === 'on';
  const consentVideo = formData.get('consent_video') === 'on';
  const consentPersonalization = formData.get('consent_personalization') === 'on';

  if (!email || !password) return { error: 'Please enter your email and password.' };
  if (password.length < 6) return { error: 'Password must be at least 6 characters.' };
  if (!consentAudio) {
    return { error: 'Audio analysis consent is required so we can personalise your practice.' };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
        age_group: ageGroup,
        consent_audio_analysis: consentAudio,
        consent_video_analysis: consentVideo,
        consent_personalization: consentPersonalization,
      },
    },
  });

  if (error) return { error: error.message };
  // When email confirmation is enabled, no session is returned yet.
  if (!data.session) return { needsConfirmation: true };

  revalidatePath('/', 'layout');
  redirect('/onboarding');
}

export async function logout(): Promise<void> {
  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    await supabase.auth.signOut();
  }
  revalidatePath('/', 'layout');
  redirect('/login');
}
