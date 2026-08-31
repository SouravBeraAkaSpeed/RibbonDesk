'use client';

import Link from 'next/link';
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  Building2,
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  CircleGauge,
  Fingerprint,
  Inbox,
  KeyRound,
  LayoutDashboard,
  LoaderCircle,
  LogOut,
  MapPin,
  ShieldCheck,
  Sparkles,
  Users,
} from 'lucide-react';
import {
  type SyntheticEvent,
  useMemo,
  useState,
  useSyncExternalStore,
} from 'react';
import {
  AuthLoading,
  Authenticated,
  Unauthenticated,
  useMutation,
  useQuery,
} from 'convex/react';

import { api } from '@/convex/_generated/api';
import type { Doc, Id } from '@/convex/_generated/dataModel';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { authClient } from '@/lib/auth-client';

import { ResearchPanel } from './research-panel';
import { EvidenceApplicationsPanel } from './evidence-applications-panel';
import { CaseInboxPanel } from './case-inbox-panel';
import { OperationsLifecyclePanel } from './operations-lifecycle-panel';
import { AssistantSourcesPanel } from './assistant-sources-panel';
import { TeamPanel } from './team-panel';
import { WorkspaceSearch } from './workspace-search';
import { DataControlsPanel } from './data-controls-panel';

type FormSubmitEvent = SyntheticEvent<HTMLFormElement, SubmitEvent>;

function errorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  if (
    error &&
    typeof error === 'object' &&
    'message' in error &&
    typeof error.message === 'string'
  )
    return error.message;
  return 'Something went wrong. Please try again.';
}

export function AuthWorkspace() {
  const mounted = useSyncExternalStore(
    () => () => undefined,
    () => true,
    () => false,
  );
  if (!mounted) return <FullPageStatus label="Securing your desk…" />;
  return (
    <>
      <AuthLoading>
        <FullPageStatus label="Securing your desk…" />
      </AuthLoading>
      <Unauthenticated>
        <PasskeyEntry />
      </Unauthenticated>
      <Authenticated>
        <AuthenticatedDesk />
      </Authenticated>
    </>
  );
}

function FullPageStatus({ label }: { label: string }) {
  return (
    <main className="ribbon-grid grid min-h-screen place-items-center bg-[var(--paper-strong)] px-5">
      <div className="flex items-center gap-3 rounded-2xl border bg-background px-5 py-4 text-sm font-medium shadow-sm">
        <LoaderCircle className="size-4 animate-spin text-[var(--ribbon)]" />{' '}
        {label}
      </div>
    </main>
  );
}

function PasskeyEntry() {
  const [mode, setMode] = useState<'signin' | 'register'>('register');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handlePasskey(event: FormSubmitEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      if (mode === 'signin') {
        const result = await authClient.signIn.passkey();
        if (result.error)
          throw new Error(
            result.error.message || 'This passkey could not be verified.',
          );
      } else {
        const result = await authClient.passkey.addPasskey({
          authenticatorAttachment: 'platform',
          context: JSON.stringify({ email, name }),
        });
        if (result.error)
          throw new Error(
            result.error.message || 'This passkey could not be created.',
          );
        window.location.reload();
      }
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="ribbon-grid grid min-h-screen place-items-center bg-[var(--paper-strong)] px-5 py-10">
      <div className="w-full max-w-md">
        <Link
          href="/"
          className="mb-7 inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" /> Back to RibbonDesk
        </Link>
        <section className="overflow-hidden rounded-[1.75rem] border border-border bg-background shadow-[0_24px_80px_rgb(28_37_51/14%)]">
          <div className="border-b border-border bg-[var(--ink)] px-6 py-7 text-white">
            <Badge className="bg-white/10 text-white">
              <Sparkles data-icon="inline-start" />
              Private beta
            </Badge>
            <h1 className="mt-5 font-heading text-3xl font-semibold tracking-[-0.035em]">
              Your compliance desk, secured by a passkey.
            </h1>
            <p className="mt-3 text-sm leading-6 text-white/65">
              No password to remember. Your device confirms it is you.
            </p>
          </div>
          <form className="p-6" onSubmit={handlePasskey}>
            <div className="grid size-12 place-items-center rounded-2xl bg-[var(--ribbon-soft)] text-[var(--ribbon)]">
              <Fingerprint className="size-6" />
            </div>
            <h2 className="mt-5 text-lg font-semibold">
              {mode === 'register'
                ? 'Create your RibbonDesk account'
                : 'Unlock your workspace'}
            </h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              {mode === 'register'
                ? 'Use Windows Hello, Touch ID, Face ID, or your device PIN.'
                : 'Choose the passkey already saved on this device.'}
            </p>
            {mode === 'register' ? (
              <div className="mt-5 grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="account-name">Your name</Label>
                  <Input
                    id="account-name"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    autoComplete="name"
                    minLength={2}
                    maxLength={80}
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="account-email">Work email</Label>
                  <Input
                    id="account-email"
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    autoComplete="email"
                    maxLength={254}
                    required
                  />
                </div>
              </div>
            ) : null}
            {error ? (
              <p
                role="alert"
                className="mt-4 rounded-xl bg-[var(--danger-soft)] px-3 py-2 text-sm text-[var(--danger)]"
              >
                {error}
              </p>
            ) : null}
            <Button
              type="submit"
              className="mt-6 h-11 w-full bg-[var(--ribbon)] text-white hover:bg-[var(--ribbon-dark)]"
              disabled={pending}
            >
              {pending ? (
                <LoaderCircle
                  className="animate-spin"
                  data-icon="inline-start"
                />
              ) : (
                <KeyRound data-icon="inline-start" />
              )}
              {pending
                ? 'Waiting for your device…'
                : mode === 'register'
                  ? 'Create account with a passkey'
                  : 'Continue with a passkey'}
            </Button>
            <button
              type="button"
              onClick={() => {
                setMode(mode === 'register' ? 'signin' : 'register');
                setError(null);
              }}
              className="mt-4 w-full text-center text-sm font-medium text-[var(--ink)] underline-offset-4 hover:underline"
            >
              {mode === 'register'
                ? 'Already have an account? Sign in'
                : 'New to RibbonDesk? Create an account'}
            </button>
            <Button
              nativeButton={false}
              variant="outline"
              className="mt-4 h-11 w-full"
              render={<Link href="/demo" />}
            >
              Explore the demo instead
            </Button>
            <div className="mt-6 flex gap-3 rounded-xl bg-[var(--sage-soft)] p-3 text-xs leading-5 text-muted-foreground">
              <ShieldCheck className="mt-0.5 size-4 shrink-0 text-[var(--sage)]" />{' '}
              AI suggestions and outgoing messages always require an authorized
              human approval.
            </div>
          </form>
        </section>
      </div>
    </main>
  );
}

function AuthenticatedDesk() {
  const user = useQuery(api.auth.getCurrentUser);
  const organizations = useQuery(api.organizations.listMine, {
    paginationOpts: { numItems: 20, cursor: null },
  });
  const activeOrganization =
    organizations?.page.find((item) => item.organization)?.organization ?? null;
  const invitationToken =
    typeof window === 'undefined'
      ? null
      : new URLSearchParams(window.location.search).get('invite');

  if (user === undefined || organizations === undefined)
    return <FullPageStatus label="Opening your desk…" />;
  if (invitationToken)
    return (
      <InvitationAcceptance token={invitationToken} email={user?.email ?? ''} />
    );
  if (!activeOrganization)
    return <OrganizationSetup displayName={user?.name ?? ''} />;
  return (
    <BusinessSetup
      organizationId={activeOrganization._id}
      organizationName={activeOrganization.name}
      displayName={user?.name ?? 'Builder'}
    />
  );
}

function InvitationAcceptance({
  token,
  email,
}: {
  token: string;
  email: string;
}) {
  const acceptInvitation = useMutation(api.organizations.acceptInvitation);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function accept() {
    setPending(true);
    setError(null);
    try {
      await acceptInvitation({ token });
      const url = new URL(window.location.href);
      url.searchParams.delete('invite');
      window.history.replaceState({}, '', url);
      window.location.reload();
    } catch (caught) {
      setError(errorMessage(caught));
      setPending(false);
    }
  }
  return (
    <OnboardingFrame
      step="Invitation"
      title="Join this RibbonDesk workspace"
      description={`This private invitation is bound to ${email || 'the email on your passkey account'}.`}
    >
      <div className="flex gap-3 rounded-xl bg-[var(--sage-soft)] p-3 text-xs leading-5 text-muted-foreground">
        <ShieldCheck className="mt-0.5 size-4 shrink-0 text-[var(--sage)]" />
        The workspace role will be enforced on every server operation after you
        accept.
      </div>
      {error ? (
        <div className="mt-4">
          <FormError message={error} />
        </div>
      ) : null}
      <Button
        data-testid="accept-invite"
        onClick={accept}
        className="mt-5 h-11 w-full bg-[var(--ribbon)] text-white hover:bg-[var(--ribbon-dark)]"
        disabled={pending}
      >
        {pending ? <LoaderCircle className="animate-spin" /> : <CheckCircle2 />}
        Accept invitation
      </Button>
    </OnboardingFrame>
  );
}

function OrganizationSetup({ displayName }: { displayName: string }) {
  const createOrganization = useMutation(api.organizations.create);
  const [name, setName] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormSubmitEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      await createOrganization({ name, displayName });
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setPending(false);
    }
  }

  return (
    <OnboardingFrame
      step="1 of 4"
      title="Name your workspace"
      description="This is the shared desk for your businesses, locations, team, and compliance record."
    >
      <form onSubmit={submit} className="grid gap-5">
        <div className="grid gap-2">
          <Label htmlFor="org-name">Organization name</Label>
          <Input
            id="org-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Acme Hospitality"
            minLength={2}
            maxLength={80}
            required
          />
        </div>
        {error ? <FormError message={error} /> : null}
        <Button
          type="submit"
          className="h-11 bg-[var(--ribbon)] text-white hover:bg-[var(--ribbon-dark)]"
          disabled={pending}
        >
          {pending ? <LoaderCircle className="animate-spin" /> : null} Create
          workspace <ChevronRight />
        </Button>
      </form>
    </OnboardingFrame>
  );
}

function BusinessSetup({
  organizationId,
  organizationName,
  displayName,
}: {
  organizationId: Id<'organizations'>;
  organizationName: string;
  displayName: string;
}) {
  const businesses = useQuery(api.businesses.listByOrganization, {
    organizationId,
    paginationOpts: { numItems: 20, cursor: null },
  });
  const business = businesses?.page[0];
  if (businesses === undefined)
    return <FullPageStatus label="Loading your business portfolio…" />;
  if (!business)
    return (
      <CreateBusiness
        organizationId={organizationId}
        organizationName={organizationName}
      />
    );
  return (
    <LocationSetup
      organizationId={organizationId}
      organizationName={organizationName}
      business={business}
      displayName={displayName}
    />
  );
}

function CreateBusiness({
  organizationId,
  organizationName,
}: {
  organizationId: Id<'organizations'>;
  organizationName: string;
}) {
  const createBusiness = useMutation(api.businesses.create);
  const [name, setName] = useState('');
  const [businessType, setBusinessType] = useState('');
  const [description, setDescription] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormSubmitEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      await createBusiness({
        organizationId,
        name,
        businessType,
        description: description || undefined,
      });
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setPending(false);
    }
  }

  return (
    <OnboardingFrame
      step="2 of 4"
      eyebrow={organizationName}
      title="Tell me about the business"
      description="RibbonDesk is built for any local business. The type and activities determine which requirements need research."
    >
      <form onSubmit={submit} className="grid gap-4">
        <div className="grid gap-2">
          <Label htmlFor="business-name">Business name</Label>
          <Input
            id="business-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Good Ground Café"
            required
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="business-type">Business type</Label>
          <Input
            id="business-type"
            value={businessType}
            onChange={(event) => setBusinessType(event.target.value)}
            placeholder="Café, salon, daycare, repair shop…"
            required
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="business-description">
            What will it do?{' '}
            <span className="text-muted-foreground">(optional)</span>
          </Label>
          <Input
            id="business-description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="A concise description helps source research."
          />
        </div>
        {error ? <FormError message={error} /> : null}
        <Button
          type="submit"
          className="mt-1 h-11 bg-[var(--ribbon)] text-white hover:bg-[var(--ribbon-dark)]"
          disabled={pending}
        >
          {pending ? <LoaderCircle className="animate-spin" /> : null} Save
          business <ChevronRight />
        </Button>
      </form>
    </OnboardingFrame>
  );
}

type BusinessDoc = Doc<'businesses'>;

function LocationSetup({
  organizationId,
  organizationName,
  business,
  displayName,
}: {
  organizationId: Id<'organizations'>;
  organizationName: string;
  business: BusinessDoc;
  displayName: string;
}) {
  const locations = useQuery(api.locations.listByBusiness, {
    businessId: business._id,
    paginationOpts: { numItems: 20, cursor: null },
  });
  const location = locations?.page[0];
  if (locations === undefined)
    return <FullPageStatus label="Loading locations…" />;
  if (!location)
    return (
      <CreateLocation
        organizationId={organizationId}
        organizationName={organizationName}
        business={business}
      />
    );
  if (location.jurisdictionStatus !== 'confirmed')
    return (
      <ConfirmJurisdiction location={location} businessName={business.name} />
    );
  return (
    <CommandCenter
      organizationId={organizationId}
      organizationName={organizationName}
      businessName={business.name}
      displayName={displayName}
      locationId={location._id}
    />
  );
}

function CreateLocation({
  organizationId,
  organizationName,
  business,
}: {
  organizationId: Id<'organizations'>;
  organizationName: string;
  business: BusinessDoc;
}) {
  const createLocation = useMutation(api.locations.create);
  const [form, setForm] = useState({
    name: 'Primary location',
    addressLine1: '',
    city: '',
    region: '',
    postalCode: '',
    countryCode: 'US',
    openingTarget: '',
  });
  const [activities, setActivities] = useState('');
  const [triggers, setTriggers] = useState({
    employees: false,
    construction: false,
    food: false,
    alcohol: false,
    signage: false,
    seating: false,
    delivery: false,
    hazardousMaterials: false,
    regulatedServices: false,
  });
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function update(key: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
  }
  async function submit(event: FormSubmitEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      await createLocation({
        organizationId,
        businessId: business._id,
        name: form.name,
        addressLine1: form.addressLine1,
        city: form.city,
        region: form.region,
        postalCode: form.postalCode,
        countryCode: form.countryCode,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
        openingTarget: form.openingTarget
          ? new Date(`${form.openingTarget}T12:00:00`).getTime()
          : undefined,
        activities: activities
          .split(',')
          .map((value) => value.trim())
          .filter(Boolean),
        triggers: { ...triggers, other: [] },
      });
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setPending(false);
    }
  }

  const triggerLabels: Array<[keyof typeof triggers, string]> = [
    ['employees', 'Hiring employees'],
    ['construction', 'Construction or renovation'],
    ['food', 'Preparing or serving food'],
    ['alcohol', 'Selling alcohol'],
    ['signage', 'Installing exterior signs'],
    ['seating', 'Customer seating'],
    ['delivery', 'Delivery service'],
    ['hazardousMaterials', 'Hazardous materials'],
    ['regulatedServices', 'Licensed or regulated services'],
  ];

  return (
    <OnboardingFrame
      step="3 of 4"
      eyebrow={`${organizationName} · ${business.name}`}
      title="Configure the first location"
      description="The address and operational triggers shape jurisdiction and requirement research. RibbonDesk never silently assumes them."
    >
      <form onSubmit={submit} className="grid gap-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor="location-name">Location label</Label>
            <Input
              id="location-name"
              value={form.name}
              onChange={(event) => update('name', event.target.value)}
              required
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="opening-target">Target opening</Label>
            <Input
              id="opening-target"
              type="date"
              value={form.openingTarget}
              onChange={(event) => update('openingTarget', event.target.value)}
            />
          </div>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="address">Street address</Label>
          <Input
            id="address"
            value={form.addressLine1}
            onChange={(event) => update('addressLine1', event.target.value)}
            required
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-[1fr_100px_120px]">
          <div className="grid gap-2">
            <Label htmlFor="city">City</Label>
            <Input
              id="city"
              value={form.city}
              onChange={(event) => update('city', event.target.value)}
              required
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="region">State/region</Label>
            <Input
              id="region"
              value={form.region}
              onChange={(event) => update('region', event.target.value)}
              placeholder="NY"
              required
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="postal">Postal code</Label>
            <Input
              id="postal"
              value={form.postalCode}
              onChange={(event) => update('postalCode', event.target.value)}
              required
            />
          </div>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="activities">Business activities</Label>
          <Input
            id="activities"
            value={activities}
            onChange={(event) => setActivities(event.target.value)}
            placeholder="Coffee service, baked goods, sidewalk seating"
          />
          <p className="text-xs text-muted-foreground">
            Separate activities with commas.
          </p>
        </div>
        <fieldset className="grid gap-3 rounded-2xl border p-4">
          <legend className="px-1 text-sm font-semibold">
            Regulatory triggers
          </legend>
          <div className="grid gap-3 sm:grid-cols-2">
            {triggerLabels.map(([key, label]) => (
              <label key={key} className="flex items-center gap-3 text-sm">
                <Checkbox
                  checked={triggers[key]}
                  onCheckedChange={(checked) =>
                    setTriggers((current) => ({
                      ...current,
                      [key]: checked === true,
                    }))
                  }
                />{' '}
                {label}
              </label>
            ))}
          </div>
        </fieldset>
        {error ? <FormError message={error} /> : null}
        <Button
          type="submit"
          className="mt-1 h-11 bg-[var(--ribbon)] text-white hover:bg-[var(--ribbon-dark)]"
          disabled={pending}
        >
          {pending ? <LoaderCircle className="animate-spin" /> : null} Detect
          jurisdiction <ChevronRight />
        </Button>
      </form>
    </OnboardingFrame>
  );
}

type LocationDoc = Doc<'locations'>;

function ConfirmJurisdiction({
  location,
  businessName,
}: {
  location: LocationDoc;
  businessName: string;
}) {
  const confirm = useMutation(api.locations.confirmJurisdiction);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isNyc =
    location.countryCode === 'US' &&
    ['NY', 'NEW YORK'].includes(location.region.toUpperCase()) &&
    ['NEW YORK', 'NYC'].includes(location.city.toUpperCase());
  const jurisdiction = `${location.city}, ${location.region}, ${location.countryCode}`;

  async function approve() {
    setPending(true);
    setError(null);
    try {
      await confirm({
        locationId: location._id,
        jurisdictionLabel: jurisdiction,
        jurisdictionCountryCode: location.countryCode,
        coverageMode: isNyc ? 'verified_pack' : 'dynamic_research',
        coveragePackKey: isNyc ? 'nyc-food-service-v1' : undefined,
      });
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setPending(false);
    }
  }

  return (
    <OnboardingFrame
      step="4 of 4"
      eyebrow={businessName}
      title="Confirm the jurisdiction"
      description="Research will not start until you confirm the detected location and coverage mode."
    >
      <div className="rounded-2xl border bg-[var(--paper-strong)] p-5">
        <div className="flex items-start gap-4">
          <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-[var(--ribbon-soft)] text-[var(--ribbon)]">
            <MapPin className="size-5" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">
              Detected jurisdiction
            </p>
            <p className="mt-1 text-lg font-semibold">{jurisdiction}</p>
          </div>
        </div>
      </div>
      <div className="mt-4 rounded-2xl border p-5">
        <Badge variant={isNyc ? 'default' : 'outline'}>
          {isNyc ? 'Verified coverage pack' : 'Dynamic cited research'}
        </Badge>
        <h3 className="mt-3 font-semibold">
          {isNyc
            ? 'NYC food-service opening pack'
            : 'Research this business and location'}
        </h3>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          {isNyc
            ? 'Starts from a maintained official-source pack. Every result still stays reviewable.'
            : 'RibbonDesk will research official sources and label all results “review required” until you confirm them.'}
        </p>
      </div>
      <div className="mt-4 flex gap-3 rounded-xl bg-[var(--amber-soft)] p-3 text-xs leading-5 text-muted-foreground">
        <AlertTriangle className="mt-0.5 size-4 shrink-0 text-[var(--amber)]" />{' '}
        RibbonDesk organizes information; it does not provide legal advice or
        file applications for you.
      </div>
      {error ? (
        <div className="mt-4">
          <FormError message={error} />
        </div>
      ) : null}
      <Button
        onClick={approve}
        className="mt-5 h-11 w-full bg-[var(--ribbon)] text-white hover:bg-[var(--ribbon-dark)]"
        disabled={pending}
      >
        {pending ? <LoaderCircle className="animate-spin" /> : <CheckCircle2 />}{' '}
        Confirm and open my desk
      </Button>
    </OnboardingFrame>
  );
}

function CommandCenter({
  organizationId,
  organizationName,
  businessName,
  displayName,
  locationId,
}: {
  organizationId: Id<'organizations'>;
  organizationName: string;
  businessName: string;
  displayName: string;
  locationId: Id<'locations'>;
}) {
  const dashboard = useQuery(api.dashboard.getCommandCenter, { locationId });
  const today = useMemo(() => dashboard?.today ?? [], [dashboard]);
  if (dashboard === undefined)
    return <FullPageStatus label="Assembling today’s command center…" />;

  return (
    <main className="min-h-screen bg-[var(--paper-strong)] text-[var(--ink)]">
      <header className="sticky top-0 z-30 border-b bg-[color:var(--paper-strong)/92%] backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-[1440px] items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="grid size-9 place-items-center rounded-xl bg-[var(--ribbon)] text-sm font-black text-white">
              R
            </div>
            <div>
              <p className="text-sm font-semibold leading-none">RibbonDesk</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {organizationName}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <WorkspaceSearch organizationId={organizationId} />
            <Badge variant="outline" className="hidden sm:inline-flex">
              {dashboard.role}
            </Badge>
            <span className="hidden text-sm sm:inline">{displayName}</span>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Sign out"
              onClick={() => authClient.signOut()}
            >
              <LogOut />
            </Button>
          </div>
        </div>
      </header>
      <div className="mx-auto grid max-w-[1440px] md:grid-cols-[220px_1fr]">
        <aside className="hidden min-h-[calc(100vh-4rem)] border-r p-4 md:block">
          <nav className="grid gap-1 text-sm">
            <DeskNav icon={LayoutDashboard} label="Today" active />
            <DeskNav icon={CircleGauge} label="Plan" />
            <DeskNav
              icon={Inbox}
              label="Inbox"
              badge={dashboard.counts.pendingProposals}
            />
            <DeskNav icon={CalendarClock} label="Calendar" />
            <DeskNav icon={Building2} label="Businesses" />
            <DeskNav
              icon={Users}
              label="Team"
              onClick={() =>
                document
                  .querySelector('#team')
                  ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
              }
            />
          </nav>
          <div className="mt-8 rounded-2xl border bg-background p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              Location
            </p>
            <p className="mt-2 text-sm font-semibold">{businessName}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {dashboard.location.name}
            </p>
          </div>
        </aside>
        <section className="min-w-0 px-4 py-6 sm:px-6 lg:px-10 lg:py-9">
          <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
            <div>
              <Badge className="bg-[var(--sage-soft)] text-[var(--sage)]">
                <Activity />
                Live workspace
              </Badge>
              <h1 className="mt-4 font-heading text-4xl font-semibold tracking-[-0.04em] sm:text-5xl">
                Good {new Date().getHours() < 12 ? 'morning' : 'afternoon'},{' '}
                {displayName.split(' ')[0]}.
              </h1>
              <p className="mt-2 text-muted-foreground">
                Here is what needs attention at {dashboard.location.name}.
              </p>
            </div>
            <Button
              className="bg-[var(--ribbon)] text-white hover:bg-[var(--ribbon-dark)]"
              onClick={() =>
                document
                  .querySelector('#ribbon-assistant')
                  ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
              }
            >
              <Sparkles /> Ask Ribbon Assistant
            </Button>
          </div>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Metric
              icon={CircleGauge}
              label="Readiness"
              value={`${dashboard.readiness}%`}
              tone="sage"
            />
            <Metric
              icon={AlertTriangle}
              label="Blockers"
              value={String(dashboard.blockers)}
              tone="amber"
            />
            <Metric
              icon={CheckCircle2}
              label="Open tasks"
              value={String(dashboard.counts.openTasks)}
            />
            <Metric
              icon={Inbox}
              label="Review proposals"
              value={String(dashboard.counts.pendingProposals)}
              tone="ribbon"
            />
          </div>
          <ResearchPanel locationId={locationId} role={dashboard.role} />
          <CaseInboxPanel locationId={locationId} />
          <EvidenceApplicationsPanel locationId={locationId} />
          <OperationsLifecyclePanel locationId={locationId} />
          <AssistantSourcesPanel
            locationId={locationId}
            role={dashboard.role}
          />
          <TeamPanel organizationId={organizationId} role={dashboard.role} />
          <DataControlsPanel
            organizationId={organizationId}
            organizationName={organizationName}
            role={dashboard.role}
          />
          <div className="mt-7 grid gap-6 xl:grid-cols-[1.45fr_0.8fr]">
            <section
              id="today"
              className="rounded-[1.5rem] border bg-background p-5 sm:p-6"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.17em] text-muted-foreground">
                    Next best actions
                  </p>
                  <h2 className="mt-2 text-xl font-semibold">Today</h2>
                </div>
                <Badge variant="outline">Realtime</Badge>
              </div>
              {today.length ? (
                <div className="mt-5 divide-y">
                  {today
                    .slice(0, 8)
                    .map(
                      (task: {
                        _id: string;
                        title: string;
                        priority: string;
                        dueAt?: number;
                      }) => (
                        <div
                          key={task._id}
                          className="flex items-center gap-3 py-4"
                        >
                          <span className="size-2 rounded-full bg-[var(--ribbon)]" />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium">
                              {task.title}
                            </p>
                            <p className="mt-1 text-xs text-muted-foreground">
                              {task.priority} priority
                              {task.dueAt
                                ? ` · due ${new Date(task.dueAt).toLocaleDateString()}`
                                : ''}
                            </p>
                          </div>
                          <ChevronRight className="size-4 text-muted-foreground" />
                        </div>
                      ),
                    )}
                </div>
              ) : (
                <EmptyPanel
                  title="Your action queue is clear"
                  copy="Confirmed requirements and approved proposals will produce prioritized work here."
                />
              )}
            </section>
            <div className="grid gap-6">
              <section className="rounded-[1.5rem] border bg-[var(--ink)] p-6 text-white">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold">Opening readiness</p>
                  <span className="font-heading text-3xl">
                    {dashboard.readiness}%
                  </span>
                </div>
                <Progress
                  value={dashboard.readiness}
                  className="mt-5 [&_[data-slot=progress-indicator]]:bg-[var(--sage)]"
                />
                <p className="mt-4 text-xs leading-5 text-white/60">
                  Only confirmed requirements count. Uncertain AI proposals
                  cannot improve this score.
                </p>
              </section>
              <section className="rounded-[1.5rem] border bg-background p-6">
                <p className="text-xs font-semibold uppercase tracking-[0.17em] text-muted-foreground">
                  Desk status
                </p>
                <StatusRow
                  label="Confirmed requirements"
                  value={dashboard.counts.confirmedRequirements}
                />
                <StatusRow
                  label="Unread notifications"
                  value={dashboard.counts.unreadNotifications}
                />
                <StatusRow
                  label="Pending proposals"
                  value={dashboard.counts.pendingProposals}
                />
              </section>
            </div>
          </div>
        </section>
      </div>
      <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-4 border-t bg-background px-2 py-2 md:hidden">
        <MobileNav icon={LayoutDashboard} label="Today" active />
        <MobileNav icon={CircleGauge} label="Plan" />
        <MobileNav icon={Inbox} label="Inbox" />
        <MobileNav icon={Building2} label="More" />
      </nav>
    </main>
  );
}

function OnboardingFrame({
  step,
  eyebrow,
  title,
  description,
  children,
}: {
  step: string;
  eyebrow?: string;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <main className="ribbon-grid min-h-screen bg-[var(--paper-strong)] px-5 py-10">
      <div className="mx-auto w-full max-w-2xl">
        <div className="flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-4" /> RibbonDesk
          </Link>
          <button
            className="text-sm text-muted-foreground hover:text-foreground"
            onClick={() => authClient.signOut()}
          >
            Sign out
          </button>
        </div>
        <section className="mt-10 rounded-[1.75rem] border bg-background p-6 shadow-[0_24px_80px_rgb(28_37_51/10%)] sm:p-8">
          <div className="flex items-center justify-between">
            <Badge className="bg-[var(--ribbon-soft)] text-[var(--ribbon)]">
              Setup · {step}
            </Badge>
            {eyebrow ? (
              <span className="text-xs font-medium text-muted-foreground">
                {eyebrow}
              </span>
            ) : null}
          </div>
          <h1 className="mt-6 font-heading text-4xl font-semibold tracking-[-0.04em]">
            {title}
          </h1>
          <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground">
            {description}
          </p>
          <div className="mt-7">{children}</div>
        </section>
      </div>
    </main>
  );
}

function FormError({ message }: { message: string }) {
  return (
    <p
      role="alert"
      className="rounded-xl bg-[var(--danger-soft)] px-3 py-2 text-sm text-[var(--danger)]"
    >
      {message}
    </p>
  );
}
function DeskNav({
  icon: Icon,
  label,
  active,
  badge,
  onClick,
}: {
  icon: typeof LayoutDashboard;
  label: string;
  active?: boolean;
  badge?: number;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-left ${active ? 'bg-[var(--ribbon-soft)] font-semibold text-[var(--ribbon)]' : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'}`}
    >
      <Icon className="size-4" />
      <span className="flex-1">{label}</span>
      {badge ? (
        <span className="rounded-full bg-[var(--ribbon)] px-1.5 text-[10px] text-white">
          {badge}
        </span>
      ) : null}
    </button>
  );
}
function MobileNav({
  icon: Icon,
  label,
  active,
}: {
  icon: typeof LayoutDashboard;
  label: string;
  active?: boolean;
}) {
  return (
    <button
      className={`grid place-items-center gap-1 text-[10px] ${active ? 'font-semibold text-[var(--ribbon)]' : 'text-muted-foreground'}`}
    >
      <Icon className="size-5" />
      {label}
    </button>
  );
}
function Metric({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: typeof LayoutDashboard;
  label: string;
  value: string;
  tone?: 'sage' | 'amber' | 'ribbon';
}) {
  const color =
    tone === 'sage'
      ? 'text-[var(--sage)] bg-[var(--sage-soft)]'
      : tone === 'amber'
        ? 'text-[var(--amber)] bg-[var(--amber-soft)]'
        : tone === 'ribbon'
          ? 'text-[var(--ribbon)] bg-[var(--ribbon-soft)]'
          : 'text-[var(--ink)] bg-muted';
  return (
    <div className="rounded-2xl border bg-background p-5">
      <div className={`grid size-9 place-items-center rounded-xl ${color}`}>
        <Icon className="size-4" />
      </div>
      <p className="mt-5 font-heading text-3xl font-semibold">{value}</p>
      <p className="mt-1 text-xs font-medium text-muted-foreground">{label}</p>
    </div>
  );
}
function EmptyPanel({ title, copy }: { title: string; copy: string }) {
  return (
    <div className="mt-5 grid place-items-center rounded-2xl border border-dashed bg-[var(--paper-strong)] px-5 py-10 text-center">
      <CheckCircle2 className="size-7 text-[var(--sage)]" />
      <p className="mt-3 text-sm font-semibold">{title}</p>
      <p className="mt-1 max-w-sm text-xs leading-5 text-muted-foreground">
        {copy}
      </p>
    </div>
  );
}
function StatusRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="mt-4 flex items-center justify-between border-t pt-4 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-semibold">{value}</span>
    </div>
  );
}
