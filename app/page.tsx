import Image from 'next/image';
import Link from 'next/link';
import {
  ArrowRight,
  BellRing,
  Building2,
  CalendarDays,
  Check,
  ChevronRight,
  CircleCheckBig,
  FileCheck2,
  FileText,
  Inbox,
  Mail,
  MessageSquareText,
  ShieldCheck,
  Sparkles,
  Users,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  LandingHeaderActions,
  LandingWorkspaceButton,
  LandingWorkspaceLink,
} from './landing-auth-actions';

const steps = [
  {
    number: '01',
    title: 'Tell us about the business',
    copy: 'Location, activities, build-out, employees, signage, food, alcohol, seating, and the details that change what applies.',
    icon: Building2,
    tone: 'blue',
  },
  {
    number: '02',
    title: 'Review cited requirements',
    copy: 'RibbonDesk researches official sources and proposes requirements, fees, dependencies, conflicts, and open questions.',
    icon: FileCheck2,
    tone: 'coral',
  },
  {
    number: '03',
    title: 'Run everything from one desk',
    copy: 'Own the tasks, evidence, agency email, applications, inspections, and renewals—with people approving every important change.',
    icon: Sparkles,
    tone: 'sage',
  },
] as const;

const businessTypes = [
  'Restaurants & cafés',
  'Retail stores',
  'Salons & barbers',
  'Fitness studios',
  'Childcare',
  'Contractors',
  'Professional offices',
  'Multi-location teams',
] as const;

const faqs = [
  {
    question: 'Is RibbonDesk only for NYC restaurants?',
    answer:
      'No. RibbonDesk is designed for any local business. NYC cafés and restaurants are simply the first verified coverage pack; other locations use dynamic, cited research that is clearly marked for review.',
  },
  {
    question: 'Does RibbonDesk submit applications for me?',
    answer:
      'RibbonDesk prepares and tracks application packets, attachments, receipts, and outcomes. It does not autonomously submit forms to government portals.',
  },
  {
    question: 'Can AI change requirements or send email by itself?',
    answer:
      'No. AI can summarize, explain, draft, and propose. Consequential record changes and outbound messages require an owner or administrator to approve them.',
  },
  {
    question: 'What happens after the business opens?',
    answer:
      'The complete opening record stays intact while RibbonDesk activates renewals, recurring inspections, document expirations, notices, source monitoring, and corrective work.',
  },
] as const;

function Brand() {
  return (
    <Link href="/" className="rd-brand" aria-label="RibbonDesk home">
      <span className="rd-brand-mark" aria-hidden="true">
        R
      </span>
      <span>RibbonDesk</span>
    </Link>
  );
}

export default function Home() {
  return (
    <main className="rd-landing">
      <div className="rd-site-shell">
        <header className="rd-header">
          <Brand />
          <nav className="rd-nav" aria-label="Primary navigation">
            <Link href="#product">Product</Link>
            <Link href="#how-it-works">How it works</Link>
            <Link href="#use-cases">Use cases</Link>
            <Link href="#faq">FAQ</Link>
          </nav>
          <LandingHeaderActions />
        </header>

        <section className="rd-hero" aria-labelledby="hero-heading">
          <div className="rd-hero-copy">
            <span className="rd-eyebrow">
              <span className="rd-live-dot" /> Your opening, clearly organized
            </span>
            <h1 id="hero-heading">
              Open right.
              <br />
              Stay <em>ready.</em>
            </h1>
            <p>
              One live desk for permits, applications, inspections, agency
              email, evidence, and renewals.
            </p>
            <div className="rd-hero-actions">
              <LandingWorkspaceButton signedOutLabel="Start your real workspace" />
              <Button
                nativeButton={false}
                size="lg"
                variant="outline"
                className="rd-button rd-button-secondary"
                render={<Link href="#how-it-works" />}
              >
                See how it works
              </Button>
            </div>
            <p className="rd-hero-note">
              <ShieldCheck aria-hidden="true" /> Official-source citations ·
              Human-approved AI
            </p>
          </div>

          <div
            className="rd-hero-art"
            aria-label="A business owner moving confidently through opening work"
          >
            <span className="rd-blob rd-blob-peach" />
            <span className="rd-blob rd-blob-blue" />
            <span className="rd-orbit rd-orbit-one" />
            <span className="rd-orbit rd-orbit-two" />
            <Image
              src="/art/ribbondesk-owner-hero.png"
              alt="A small-business owner rising on a coral ribbon with a permit folder, calendar, and agency email"
              width={1448}
              height={1086}
              priority
              className="rd-hero-image"
            />
            <div className="rd-float-card rd-float-ready">
              <span>Opening readiness</span>
              <strong>68%</strong>
            </div>
            <div className="rd-float-card rd-float-next">
              <CircleCheckBig />
              <span>
                Next best action
                <strong>Review permit</strong>
              </span>
            </div>
          </div>
        </section>

        <section className="rd-signal-bar" aria-label="RibbonDesk capabilities">
          {[
            ['Cited & current', ShieldCheck],
            ['One live record', FileText],
            ['Realtime teamwork', Users],
            ['Ready after opening', BellRing],
          ].map(([label, Icon]) => (
            <span key={label as string}>
              <Icon aria-hidden="true" /> {label as string}
            </span>
          ))}
        </section>

        <section id="product" className="rd-problem rd-section">
          <div className="rd-section-kicker">The problem</div>
          <div className="rd-problem-grid">
            <h2>
              Your business should not live in twenty tabs and a spreadsheet.
            </h2>
            <div>
              <p>
                Requirements are scattered across agency sites, forms, PDFs,
                email, deadlines, and portals. RibbonDesk turns that mess into
                one clear operating record.
              </p>
              <Link href="/app" className="rd-text-link">
                Build your operating desk <ArrowRight />
              </Link>
            </div>
          </div>
          <div className="rd-chaos-row" aria-hidden="true">
            <div className="rd-chaos-card rd-chaos-card-one">
              <FileText />
              <span>permit-final-v7.pdf</span>
            </div>
            <div className="rd-chaos-card rd-chaos-card-two">
              <Mail />
              <span>Re: missing attachment</span>
            </div>
            <div className="rd-chaos-card rd-chaos-card-three">
              <CalendarDays />
              <span>Renewal due?</span>
            </div>
            <div className="rd-chaos-resolved">
              <Check /> One live desk
            </div>
          </div>
        </section>

        <section id="how-it-works" className="rd-how rd-section">
          <div className="rd-centered-heading">
            <span className="rd-section-kicker">How it works</span>
            <h2>From business idea to opening day—and every day after.</h2>
          </div>
          <div className="rd-steps">
            {steps.map(({ number, title, copy, icon: Icon, tone }) => (
              <article key={number} className={`rd-step rd-step-${tone}`}>
                <div className="rd-step-top">
                  <span>{number}</span>
                  <div className="rd-step-icon">
                    <Icon />
                  </div>
                </div>
                <h3>{title}</h3>
                <p>{copy}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="research" className="rd-research rd-section">
          <div className="rd-research-art">
            <span className="rd-blob rd-blob-yellow" />
            <Image
              src="/art/ribbondesk-research-storefront.png"
              alt="A local storefront connected to official source records and its jurisdiction"
              width={1448}
              height={1086}
              className="rd-storefront-image"
            />
          </div>
          <div className="rd-feature-copy">
            <span className="rd-section-kicker">Research with receipts</span>
            <h2>
              Know exactly
              <br />
              what <em>applies.</em>
            </h2>
            <p>
              RibbonDesk researches official sources for the business, location,
              and activities—then shows the agency, citation, confidence,
              dependencies, and unanswered questions.
            </p>
            <ul className="rd-check-list">
              <li>
                <Check /> Source URL and captured evidence
              </li>
              <li>
                <Check /> Conflicts become review items
              </li>
              <li>
                <Check /> Nothing is confirmed without you
              </li>
            </ul>
          </div>
        </section>

        <section id="daily-desk" className="rd-desk rd-section">
          <div className="rd-centered-heading rd-centered-heading-narrow">
            <span className="rd-section-kicker">Your daily command center</span>
            <h2>See what needs you. Ignore what does not.</h2>
            <p>
              Blockers, deadlines, agency replies, evidence, and the next best
              action—ordered by what matters to opening.
            </p>
          </div>

          <div className="rd-product-window">
            <div className="rd-window-rail">
              <Brand />
              <div className="rd-mini-nav">
                <span className="active">
                  <Sparkles /> Today
                </span>
                <span>
                  <FileCheck2 /> Plan
                </span>
                <span>
                  <Inbox /> Inbox <b>2</b>
                </span>
                <span>
                  <FileText /> Documents
                </span>
              </div>
            </div>
            <div className="rd-window-main">
              <div className="rd-window-heading">
                <div>
                  <span>Tuesday, September 14</span>
                  <h3>Good morning, Alex.</h3>
                </div>
                <div className="rd-readiness-pill">
                  <span>Opening readiness</span>
                  <strong>68%</strong>
                </div>
              </div>
              <div className="rd-today-grid">
                <div className="rd-next-action">
                  <span className="rd-card-label">Next best action</span>
                  <div className="rd-action-icon">
                    <FileCheck2 />
                  </div>
                  <h4>Review food service permit</h4>
                  <p>Application packet is ready for owner approval.</p>
                  <button type="button">
                    Review packet <ChevronRight />
                  </button>
                </div>
                <div className="rd-mini-stack">
                  <div className="rd-mini-signal">
                    <span className="rd-mini-icon coral">
                      <MessageSquareText />
                    </span>
                    <span>
                      <small>Agency inbox</small>
                      <strong>2 replies need you</strong>
                    </span>
                  </div>
                  <div className="rd-mini-signal">
                    <span className="rd-mini-icon blue">
                      <CalendarDays />
                    </span>
                    <span>
                      <small>Next deadline</small>
                      <strong>Certificate · Sep 18</strong>
                    </span>
                  </div>
                  <div className="rd-mini-signal">
                    <span className="rd-mini-icon sage">
                      <ShieldCheck />
                    </span>
                    <span>
                      <small>Source monitor</small>
                      <strong>All official sources current</strong>
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="connected-inbox" className="rd-connected rd-section">
          <div className="rd-feature-copy">
            <span className="rd-section-kicker">One connected case</span>
            <h2>
              Agency email,
              <br />
              already <em>connected.</em>
            </h2>
            <p>
              Every message can stay linked to its requirement, task,
              attachment, deadline, and responsible teammate. Ribbon Assistant
              summarizes the reply and prepares a proposal for review.
            </p>
            <div className="rd-human-note">
              <ShieldCheck /> AI drafts. Owners and admins approve.
            </div>
          </div>
          <div className="rd-inbox-scene">
            <span className="rd-blob rd-blob-blue-large" />
            <div className="rd-envelope-back" />
            <article className="rd-message-card">
              <div className="rd-message-meta">
                <span className="rd-agency-avatar">HD</span>
                <span>
                  <strong>Health Department</strong>
                  <small>Plan review · 9:42 AM</small>
                </span>
              </div>
              <h3>One attachment needs correction.</h3>
              <p>
                The floor plan needs a clearly marked hand-washing sink before
                review can continue.
              </p>
              <div className="rd-proposal-row">
                <span>
                  <Sparkles /> Proposal ready
                </span>
                <button type="button">Review proposal</button>
              </div>
            </article>
          </div>
        </section>

        <section id="stay-ready" className="rd-lifecycle rd-section">
          <div className="rd-centered-heading">
            <span className="rd-section-kicker">
              Opening is only the beginning
            </span>
            <h2>Stay ready after the ribbon is cut.</h2>
          </div>
          <div className="rd-lifecycle-track">
            {[
              ['Application', 'Prepared', FileText],
              ['Inspection', 'Oct 21', ShieldCheck],
              ['Opening day', 'Target · Oct 24', Building2],
              ['Renewal', 'Watched', BellRing],
            ].map(([title, value, Icon], index) => (
              <article key={title as string} className="rd-milestone">
                <span className="rd-milestone-dot">{index + 1}</span>
                <Icon />
                <small>{title as string}</small>
                <strong>{value as string}</strong>
              </article>
            ))}
          </div>
          <p className="rd-lifecycle-copy">
            Renewals, annual inspections, insurance, certificates, notices,
            corrective actions, and source changes stay on the same living
            record.
          </p>
        </section>

        <section id="use-cases" className="rd-use-cases rd-section">
          <div>
            <span className="rd-section-kicker">Built for local business</span>
            <h2>One desk. Many kinds of opening.</h2>
            <p>
              NYC cafés and restaurants are our first verified coverage pack—not
              the limit of the product.
            </p>
          </div>
          <div className="rd-business-cloud">
            {businessTypes.map((item, index) => (
              <span
                key={item}
                className={`rd-business-pill pill-${(index % 4) + 1}`}
              >
                {item}
              </span>
            ))}
          </div>
        </section>

        <section id="demo-cta" className="rd-demo-cta">
          <div className="rd-demo-art" aria-hidden="true">
            <span className="rd-demo-orb orb-one" />
            <span className="rd-demo-orb orb-two" />
            <span className="rd-demo-ribbon" />
            <span className="rd-demo-check">
              <Check />
            </span>
          </div>
          <div className="rd-demo-copy">
            <span className="rd-section-kicker">Your data, your desk</span>
            <h2>Build the live operating record for your business.</h2>
            <p>
              Create your business and location, add cited requirements, assign
              real work, upload evidence, prepare applications, and track every
              deadline in one persistent workspace.
            </p>
            <LandingWorkspaceButton signedOutLabel="Start your workspace" />
          </div>
        </section>

        <section id="faq" className="rd-faq rd-section">
          <div>
            <span className="rd-section-kicker">FAQ</span>
            <h2>Good questions deserve clear answers.</h2>
          </div>
          <div className="rd-faq-list">
            {faqs.map(({ question, answer }, index) => (
              <details key={question} open={index === 0}>
                <summary>
                  {question}
                  <span>+</span>
                </summary>
                <p>{answer}</p>
              </details>
            ))}
          </div>
        </section>

        <section className="rd-final-cta">
          <span className="rd-final-ribbon" aria-hidden="true" />
          <div>
            <span className="rd-section-kicker">Your opening starts here</span>
            <h2>From red tape to ribbon cutting.</h2>
            <p>
              Build a clear opening plan and stay ready long after opening day.
            </p>
            <div className="rd-hero-actions">
              <LandingWorkspaceButton signedOutLabel="Create your account" />
              <LandingWorkspaceLink signedOutLabel="Open RibbonDesk" />
            </div>
          </div>
        </section>

        <footer className="rd-footer">
          <Brand />
          <p>
            RibbonDesk organizes information and workflows. It does not provide
            legal advice or submit applications on your behalf.
          </p>
          <div>
            <Link href="/privacy">Privacy</Link>
            <Link href="/terms">Terms</Link>
            <Link href="/disclaimer">Disclaimer</Link>
            <a
              href="https://github.com/SouravBeraAkaSpeed/RibbonDesk"
              target="_blank"
              rel="noreferrer"
            >
              GitHub
            </a>
          </div>
        </footer>
      </div>
    </main>
  );
}
