import { notFound, redirect } from 'next/navigation';
import { getCategory } from '@/lib/practice/library';

export default async function CategoryRedirect({
  params,
}: {
  params: Promise<{ category: string }>;
}) {
  const { category } = await params;
  if (!getCategory(category)) notFound();
  redirect(`/practice/${category}/1`);
}
