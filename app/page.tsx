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
    title: 'Answer simple questions',
    copy: 'Tell RibbonDesk what you want to open, where it will operate, and what it will actually do. “I’m not sure” is always an option.',
    icon: Building2,
    tone: 'blue',
  },
  {
    number: '02',
    title: 'AI builds your route',
    copy: 'For 5–10 minutes, RibbonDesk checks current government sources and runs dedicated legal and money-and-tax reviews.',
    icon: FileCheck2,
    tone: 'coral',
  },
  {
    number: '03',
    title: 'Follow one step at a time',
    copy: 'See what to do now, why it matters, what it may cost, what you need, and where the answer came from.',
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
      'No. RibbonDesk researches the business and location you enter. Its NYC food-service source library gives those businesses a faster start, but the guided research flow works for other businesses and places too.',
  },
  {
    question: 'Do I need to understand legal or tax language?',
    answer:
      'No. The AI Legal Guide and AI Money & Tax Guide turn cited public information into a plain-language conclusion and explain exactly what it means for your business.',
  },
  {
    question: 'Can RibbonDesk file, pay, or sign for me?',
    answer:
      'No. RibbonDesk guides you beside the official website, keeps your work organized, and can draft messages. You make every filing, payment, signature, attestation, and external send yourself.',
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
              email, evidence, and renewals—turned into one clear step at a
              time.
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
              <ShieldCheck aria-hidden="true" /> Live official sources · AI
              legal and tax guides
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
                Your current step
                <strong>Choose a business name</strong>
              </span>
            </div>
          </div>
        </section>

        <section className="rd-signal-bar" aria-label="RibbonDesk capabilities">
          {[
            ['Real source research', ShieldCheck],
            ['One step at a time', FileText],
            ['AI legal & tax guides', Users],
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
                Government guidance, registrations, tax questions, forms, email,
                deadlines, and portals are scattered everywhere. RibbonDesk
                researches them and builds the route for you.
              </p>
              <Link href="/app" className="rd-text-link">
                Build your guided route <ArrowRight />
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
              Let the guides learn
              <br />
              what <em>matters.</em>
            </h2>
            <p>
              Exa finds focused evidence, Firecrawl saves the authoritative
              pages, and dedicated AI legal and tax guides double-check the
              answer before your journey appears.
            </p>
            <ul className="rd-check-list">
              <li>
                <Check /> Current source URL and saved evidence
              </li>
              <li>
                <Check /> Only official sources create must-do steps
              </li>
              <li>
                <Check /> One simple question when a fact is missing
              </li>
            </ul>
          </div>
        </section>

        <section id="daily-desk" className="rd-desk rd-section">
          <div className="rd-centered-heading rd-centered-heading-narrow">
            <span className="rd-section-kicker">Your guided journey</span>
            <h2>Do the next useful thing. Nothing more.</h2>
            <p>
              Your current step, its reason, source, files, messages, and AI
              guide stay together. The full roadmap remains one click away.
            </p>
          </div>

          <div className="rd-product-window">
            <div className="rd-window-rail">
              <Brand />
              <div className="rd-mini-nav">
                <span className="active">
                  <Sparkles /> Journey
                </span>
                <span>
                  <FileCheck2 /> Roadmap
                </span>
                <span>
                  <Inbox /> More <b>2</b>
                </span>
              </div>
            </div>
            <div className="rd-window-main">
              <div className="rd-window-heading">
                <div>
                  <span>Northstar Consulting · New York</span>
                  <h3>Your next step is ready.</h3>
                </div>
                <div className="rd-readiness-pill">
                  <span>Route progress</span>
                  <strong>2 of 11</strong>
                </div>
              </div>
              <div className="rd-today-grid">
                <div className="rd-next-action">
                  <span className="rd-card-label">Must do before opening</span>
                  <div className="rd-action-icon">
                    <FileCheck2 />
                  </div>
                  <h4>Form the New York business</h4>
                  <p>Create the legal business before tax and hiring steps.</p>
                  <button type="button">
                    Open this step <ChevronRight />
                  </button>
                </div>
                <div className="rd-mini-stack">
                  <div className="rd-mini-signal">
                    <span className="rd-mini-icon coral">
                      <MessageSquareText />
                    </span>
                    <span>
                      <small>Why it matters</small>
                      <strong>Creates the legal company</strong>
                    </span>
                  </div>
                  <div className="rd-mini-signal">
                    <span className="rd-mini-icon blue">
                      <CalendarDays />
                    </span>
                    <span>
                      <small>Expected time</small>
                      <strong>About 15–30 minutes</strong>
                    </span>
                  </div>
                  <div className="rd-mini-signal">
                    <span className="rd-mini-icon sage">
                      <ShieldCheck />
                    </span>
                    <span>
                      <small>Evidence</small>
                      <strong>New York official source</strong>
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
              Give a government office your optional RibbonDesk inbox. New
              replies can stay linked to the right journey step, while the AI
              explains the message and drafts your response.
            </p>
            <div className="rd-human-note">
              <ShieldCheck /> You approve every external send.
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
                  <Sparkles /> Step update ready
                </span>
                <button type="button">See what changed</button>
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
              From a consulting studio to a café, RibbonDesk researches a route
              around the business and place you enter.
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
            <h2>Let RibbonDesk build your opening route.</h2>
            <p>
              Answer ordinary questions, wait while live research runs, then
              follow one evidence-backed step at a time through opening day and
              the responsibilities that come after it.
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
            RibbonDesk provides AI guidance based on cited public information.
            It is not a law firm, accounting firm, or government agency.
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
