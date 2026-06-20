import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { CoachingCard } from '@/components/practice/coaching-card';
import { PracticeRecorder } from '@/components/practice/practice-recorder';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/supabase/env';
import {
  getCategory,
  getLibraryItems,
  PRONUNCIATION_FALLBACK,
  type PracticeTarget,
} from '@/lib/practice/library';

export const dynamic = 'force-dynamic';

async function getItems(def: ReturnType<typeof getCategory>): Promise<PracticeTarget[]> {
  if (!def) return [];
  if (!def.personalized) return getLibraryItems(def.slug);

  if (!isSupabaseConfigured()) return [];
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: rows } = await supabase
    .from('practice_items')
    .select('id, text, target_skill')
    .eq('user_id', user.id)
    .or('item_type.eq.word,target_skill.eq.pronunciation')
    .order('created_at', { ascending: true });

  const personalized: PracticeTarget[] = (rows ?? []).map((r) => ({
    dbId: r.id,
    text: r.text,
    targetSkill: r.target_skill ?? def.targetSkill,
  }));
  const seen = new Set(personalized.map((p) => p.text.toLowerCase()));
  const fallback = PRONUNCIATION_FALLBACK.filter((w) => !seen.has(w.toLowerCase())).map((w) => ({
    text: w,
    targetSkill: def.targetSkill,
  }));
  return [...personalized, ...fallback].slice(0, 12);
}

/** Whether the user consented to camera-based visual analysis. */
async function videoConsent(): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;
  const { data } = await supabase
    .from('profiles')
    .select('consent_video_analysis')
    .eq('id', user.id)
    .maybeSingle();
  return data?.consent_video_analysis ?? false;
}

export default async function PracticeItemPage({
  params,
}: {
  params: Promise<{ category: string; index: string }>;
}) {
  const { category, index } = await params;
  const def = getCategory(category);
  if (!def) notFound();

  const items = await getItems(def);
  if (items.length === 0) notFound();

  const pos = Number.parseInt(index, 10);
  if (!Number.isInteger(pos) || pos < 1) redirect(`/practice/${category}/1`);
  if (pos > items.length) redirect(`/practice/${category}/${items.length}`);

  const item = items[pos - 1];
  const cameraEnabled = def.camera ? await videoConsent() : false;

  return (
    <div className="space-y-5">
      <header>
        <Link
          href="/practice"
          className="inline-flex items-center gap-1 text-sm font-medium text-charcoal/55"
        >
          <ArrowLeft className="h-4 w-4" />
          {def.title}
        </Link>
        <div className="mt-3 flex items-center gap-2">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-primary-50">
            <div
              className="h-full rounded-full bg-primary-500"
              style={{ width: `${(pos / items.length) * 100}%` }}
            />
          </div>
          <span className="shrink-0 text-xs tabular-nums text-charcoal/45">
            {pos} / {items.length}
          </span>
        </div>
      </header>

      <Card>
        <p className="text-2xl font-semibold leading-snug text-charcoal">{item.text}</p>
      </Card>

      <CoachingCard text={item.text} category={def.slug} fallbackHint={item.hint} />

      <PracticeRecorder
        text={item.text}
        targetSkill={item.targetSkill}
        dbId={item.dbId}
        showListen={def.listen}
        camera={cameraEnabled}
        category={def.slug}
      />

      <nav className="flex items-center justify-between pt-1">
        {pos > 1 ? (
          <Link href={`/practice/${category}/${pos - 1}`}>
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4" />
              Previous
            </Button>
          </Link>
        ) : (
          <span />
        )}
        {pos < items.length ? (
          <Link href={`/practice/${category}/${pos + 1}`}>
            <Button size="sm">
              Next
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        ) : (
          <span className="text-sm text-charcoal/45">That’s the last one 🎉</span>
        )}
      </nav>
    </div>
  );
}
