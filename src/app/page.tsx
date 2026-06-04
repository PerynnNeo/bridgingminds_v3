import Link from 'next/link';
import { Mic, Sparkles, Trophy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardDescription, CardTitle } from '@/components/ui/card';
import { siteConfig } from '@/config/site';

const features = [
  {
    icon: Mic,
    title: 'Learn your style',
    body: 'A quick voice check-in learns how you speak, your pace, clarity, and habits.',
  },
  {
    icon: Sparkles,
    title: 'Practise what fits you',
    body: 'Get a personalised plan of words, phrases, and pitches based on your profile.',
  },
  {
    icon: Trophy,
    title: 'Play & improve',
    body: 'Debates and daily questions make practice fun while tracking your progress.',
  },
];

export default function LandingPage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col px-6 py-10">
      <header className="flex items-center gap-2">
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary-500 text-white">
          <Mic className="h-5 w-5" />
        </span>
        <span className="text-lg font-semibold text-charcoal">{siteConfig.name}</span>
      </header>

      <section className="mt-14 animate-fade-in-up">
        <h1 className="text-4xl font-bold leading-tight text-charcoal">
          Speak with
          <span className="text-primary-600"> confidence.</span>
        </h1>
        <p className="mt-4 text-base text-charcoal/65">{siteConfig.description}</p>

        <div className="mt-8 flex flex-col gap-3">
          <Link href="/signup" className="w-full">
            <Button size="full" className="w-full">
              Get started →
            </Button>
          </Link>
          <Link href="/login" className="w-full">
            <Button variant="outline" size="full" className="w-full">
              I already have an account
            </Button>
          </Link>
        </div>
      </section>

      <section className="mt-12 space-y-3">
        {features.map((f) => (
          <Card key={f.title} className="flex gap-4">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary-50 text-primary-600">
              <f.icon className="h-5 w-5" />
            </span>
            <div>
              <CardTitle>{f.title}</CardTitle>
              <CardDescription>{f.body}</CardDescription>
            </div>
          </Card>
        ))}
      </section>

      <footer className="mt-auto pt-12 text-center text-xs text-charcoal/40">
        Speech analytics are guidance to help you practise, not a clinical assessment.
      </footer>
    </main>
  );
}
