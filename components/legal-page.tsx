import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

type Section = { title: string; paragraphs: string[] };

export function LegalPage({ eyebrow, title, updated, sections }: { eyebrow: string; title: string; updated: string; sections: Section[] }) {
  return (
    <main className="min-h-screen bg-[var(--paper-strong)] px-5 py-10 sm:px-8 sm:py-16">
      <article className="mx-auto max-w-3xl">
        <Link href="/" className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground"><ArrowLeft className="size-4" />Back to RibbonDesk</Link>
        <p className="mt-12 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--ribbon)]">{eyebrow}</p>
        <h1 className="mt-3 font-heading text-4xl font-semibold tracking-[-0.04em] sm:text-5xl">{title}</h1>
        <p className="mt-3 text-sm text-muted-foreground">Beta policy · Updated {updated}</p>
        <div className="mt-10 space-y-8 rounded-2xl border border-border bg-background p-6 shadow-sm sm:p-8">
          {sections.map((section) => (
            <section key={section.title}>
              <h2 className="font-heading text-2xl font-semibold">{section.title}</h2>
              {section.paragraphs.map((paragraph) => <p key={paragraph} className="mt-3 text-sm leading-7 text-muted-foreground">{paragraph}</p>)}
            </section>
          ))}
        </div>
      </article>
    </main>
  );
}
