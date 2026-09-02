'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  Bot,
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  CircleGauge,
  Eye,
  EyeOff,
  FileText,
  Fingerprint,
  Inbox,
  LayoutDashboard,
  LoaderCircle,
  LockKeyhole,
  LogOut,
  Mail,
  MapPin,
  RefreshCw,
  Settings2,
  ShieldCheck,
  Sparkles,
  Users,
  type LucideIcon,
} from 'lucide-react';
import {
  type SyntheticEvent,
  useEffect,
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
import { hasVerifiedNycFoodServicePack } from '@/convex/lib/domain';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { authClient } from '@/lib/auth-client';
import {
  deskSectionFromPath,
  deskSectionHref,
  type DeskSection,
} from '@/lib/desk-sections';

import { ResearchPanel } from './research-panel';
import { EvidenceApplicationsPanel } from './evidence-applications-panel';
import { CaseInboxPanel } from './case-inbox-panel';
import { OperationsLifecyclePanel } from './operations-lifecycle-panel';
import { AssistantSourcesPanel } from './assistant-sources-panel';
import { TeamPanel } from './team-panel';
import { WorkspaceSearch } from './workspace-search';
import { DataControlsPanel } from './data-controls-panel';
import { WorkPlanPanel } from './work-plan-panel';
import { GuidedJourneyShell } from './guided-journey';

type FormSubmitEvent = SyntheticEvent<HTMLFormElement, SubmitEvent>;
type OnboardingStep = 1 | 2 | 3 | 4;
type TriggerAnswer = 'yes' | 'no' | 'not_sure';

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
        <AccountEntry />
      </Unauthenticated>
      <Authenticated>
        <AuthenticatedDesk />
      </Authenticated>
    </>
  );
}

function FullPageStatus({ label }: { label: string }) {
  return (
    <main className="auth-page grid min-h-screen place-items-center px-5">
      <div className="flex items-center gap-3 rounded-2xl border bg-background px-5 py-4 text-sm font-medium shadow-sm">
        <LoaderCircle className="size-4 animate-spin text-[var(--ribbon)]" />{' '}
        {label}
      </div>
    </main>
  );
}

type AuthMode = 'signin' | 'register' | 'forgot' | 'reset' | 'verify';

function AccountEntry() {
  const capabilities = useQuery(api.auth.getAuthCapabilities);
  const urlParameters = new URLSearchParams(window.location.search);
  const resetToken = urlParameters.get('token');
  const justVerified = urlParameters.get('verified') === '1';
  const pendingVerificationEmail =
    window.sessionStorage.getItem('ribbondesk.pendingVerificationEmail') ?? '';
  const pendingResetEmail =
    window.sessionStorage.getItem('ribbondesk.passwordResetRequested') ?? '';
  const [mode, setMode] = useState<AuthMode>(
    resetToken
      ? 'reset'
      : justVerified
        ? 'signin'
        : pendingVerificationEmail
          ? 'verify'
          : pendingResetEmail
            ? 'forgot'
            : 'signin',
  );
  const [name, setName] = useState('');
  const [email, setEmail] = useState(
    pendingVerificationEmail || pendingResetEmail,
  );
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(
    justVerified
      ? 'Email confirmed. Sign in to open your desk.'
      : pendingVerificationEmail
        ? `A confirmation link is queued for ${pendingVerificationEmail}.`
        : pendingResetEmail
          ? 'If an account exists for that email, its reset link is queued for delivery.'
          : null,
  );

  useEffect(() => {
    if (justVerified)
      window.sessionStorage.removeItem('ribbondesk.pendingVerificationEmail');
  }, [justVerified]);

  function switchMode(next: AuthMode) {
    if (next !== 'verify')
      window.sessionStorage.removeItem('ribbondesk.pendingVerificationEmail');
    if (next !== 'forgot')
      window.sessionStorage.removeItem('ribbondesk.passwordResetRequested');
    setMode(next);
    setError(null);
    setNotice(null);
    setPassword('');
    setConfirmPassword('');
  }

  async function handleEmail(event: FormSubmitEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    setNotice(null);
    try {
      if (mode === 'register') {
        if (password !== confirmPassword)
          throw new Error('The passwords do not match.');
        window.sessionStorage.setItem(
          'ribbondesk.pendingVerificationEmail',
          email,
        );
        const result = await authClient.signUp.email({
          name,
          email,
          password,
          callbackURL: `${window.location.origin}/app?verified=1`,
        });
        if (result.error)
          throw new Error(result.error.message || 'Account creation failed.');
        setMode('verify');
        setNotice(`A confirmation link is queued for ${email}.`);
        return;
      }

      if (mode === 'forgot') {
        window.sessionStorage.setItem(
          'ribbondesk.passwordResetRequested',
          email,
        );
        const result = await authClient.requestPasswordReset({
          email,
          redirectTo: `${window.location.origin}/app`,
        });
        if (result.error)
          throw new Error(result.error.message || 'The reset request failed.');
        setNotice(
          'If an account exists for that email, its reset link is queued for delivery.',
        );
        return;
      }

      if (mode === 'reset') {
        if (!resetToken)
          throw new Error('This password-reset link is incomplete.');
        if (password !== confirmPassword)
          throw new Error('The passwords do not match.');
        const result = await authClient.resetPassword({
          newPassword: password,
          token: resetToken,
        });
        if (result.error)
          throw new Error(
            result.error.message || 'The password could not be reset.',
          );
        window.history.replaceState({}, '', '/app');
        window.sessionStorage.removeItem('ribbondesk.passwordResetRequested');
        switchMode('signin');
        setNotice('Password updated. Sign in with your new password.');
        return;
      }

      const result = await authClient.signIn.email({
        email,
        password,
        rememberMe: true,
      });
      if (result.error) {
        if (/verif/i.test(result.error.message ?? '')) {
          const verification = await authClient.sendVerificationEmail({
            email,
            callbackURL: `${window.location.origin}/app?verified=1`,
          });
          if (verification.error)
            throw new Error(
              verification.error.message ||
                'The confirmation email could not be sent.',
            );
          window.sessionStorage.setItem(
            'ribbondesk.pendingVerificationEmail',
            email,
          );
          setMode('verify');
          setNotice(`A new confirmation link is queued for ${email}.`);
          return;
        }
        throw new Error(
          result.error.message || 'The email or password was not accepted.',
        );
      }
      window.sessionStorage.removeItem('ribbondesk.pendingVerificationEmail');
      window.history.replaceState({}, '', '/app');
      window.location.reload();
    } catch (caught) {
      if (mode === 'register')
        window.sessionStorage.removeItem('ribbondesk.pendingVerificationEmail');
      if (mode === 'forgot')
        window.sessionStorage.removeItem('ribbondesk.passwordResetRequested');
      setError(errorMessage(caught));
    } finally {
      setPending(false);
    }
  }

  async function handlePasskey() {
    setPending(true);
    setError(null);
    try {
      const result = await authClient.signIn.passkey();
      if (result.error)
        throw new Error(
          result.error.message || 'This passkey could not be verified.',
        );
      window.history.replaceState({}, '', '/app');
      window.location.reload();
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setPending(false);
    }
  }

  async function resendVerification() {
    setPending(true);
    setError(null);
    try {
      const result = await authClient.sendVerificationEmail({
        email,
        callbackURL: `${window.location.origin}/app?verified=1`,
      });
      if (result.error)
        throw new Error(
          result.error.message || 'The confirmation email could not be sent.',
        );
      setNotice(`A fresh confirmation link is queued for ${email}.`);
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setPending(false);
    }
  }

  const isRegister = mode === 'register';
  const isPasswordMode =
    mode === 'signin' || mode === 'register' || mode === 'reset';
  const title =
    mode === 'register'
      ? 'Create your RibbonDesk account'
      : mode === 'forgot'
        ? 'Reset your password'
        : mode === 'reset'
          ? 'Choose a new password'
          : mode === 'verify'
            ? 'Confirm your email'
            : 'Welcome back';

  return (
    <main className="auth-page grid min-h-screen place-items-center px-5 py-10">
      <div className="w-full max-w-lg">
        <Link
          href="/"
          className="mb-7 inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" /> Back to RibbonDesk
        </Link>
        <section className="auth-card overflow-hidden rounded-[1.75rem] border bg-white shadow-[0_24px_80px_rgb(28_37_51/14%)]">
          <div className="border-b border-border bg-[var(--ink)] px-6 py-7 text-white">
            <Badge className="bg-white/10 text-white">
              <Sparkles data-icon="inline-start" />
              Live workspace
            </Badge>
            <h1 className="mt-5 font-heading text-3xl font-semibold tracking-[-0.035em]">
              Your business desk. Your secure sign-in.
            </h1>
            <p className="mt-3 text-sm leading-6 text-white/65">
              Use your verified email and password, or a passkey you have
              already added.
            </p>
          </div>
          <form className="p-6" onSubmit={handleEmail}>
            <div className="flex items-center gap-3">
              <div className="grid size-12 place-items-center rounded-2xl bg-[var(--ribbon-soft)] text-[var(--ribbon)]">
                {mode === 'verify' ? (
                  <Mail className="size-6" />
                ) : (
                  <LockKeyhole className="size-6" />
                )}
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground">
                  Secure account
                </p>
                <h2 className="mt-1 text-lg font-semibold">{title}</h2>
              </div>
            </div>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              {mode === 'verify'
                ? 'Open the link in your email to activate password sign-in. The link expires in one hour.'
                : mode === 'forgot'
                  ? 'We will send a private, one-hour reset link if this account exists.'
                  : isRegister
                    ? 'Your email must be confirmed before the first sign-in.'
                    : 'Sign in to continue the work already saved in your desk.'}
            </p>

            {mode !== 'verify' ? (
              <div className="grid gap-4">
                {isRegister ? (
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
                ) : null}
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
                {isPasswordMode ? (
                  <div className="grid gap-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="account-password">
                        {mode === 'reset' ? 'New password' : 'Password'}
                      </Label>
                      {mode === 'signin' ? (
                        <button
                          type="button"
                          onClick={() => switchMode('forgot')}
                          className="text-xs font-medium text-[var(--ribbon)] hover:underline"
                        >
                          Forgot password?
                        </button>
                      ) : null}
                    </div>
                    <div className="relative">
                      <Input
                        id="account-password"
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        autoComplete={
                          isRegister
                            ? 'new-password'
                            : mode === 'signin'
                              ? 'current-password'
                              : 'new-password'
                        }
                        minLength={10}
                        maxLength={128}
                        required
                        className="pr-11"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((current) => !current)}
                        aria-label={
                          showPassword ? 'Hide password' : 'Show password'
                        }
                        className="absolute inset-y-0 right-0 grid w-11 place-items-center text-muted-foreground hover:text-foreground"
                      >
                        {showPassword ? (
                          <EyeOff className="size-4" />
                        ) : (
                          <Eye className="size-4" />
                        )}
                      </button>
                    </div>
                    {isRegister || mode === 'reset' ? (
                      <p className="text-xs text-muted-foreground">
                        Use at least 10 characters.
                      </p>
                    ) : null}
                  </div>
                ) : null}
                {isRegister || mode === 'reset' ? (
                  <div className="grid gap-2">
                    <Label htmlFor="confirm-password">Confirm password</Label>
                    <Input
                      id="confirm-password"
                      type={showPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(event) =>
                        setConfirmPassword(event.target.value)
                      }
                      autoComplete="new-password"
                      minLength={10}
                      maxLength={128}
                      required
                    />
                  </div>
                ) : null}
              </div>
            ) : null}
            {notice ? (
              <output className="mt-4 block rounded-xl bg-[var(--sage-soft)] px-3 py-2 text-sm text-[var(--sage)]">
                {notice}
              </output>
            ) : null}
            {error ? (
              <p
                role="alert"
                className="mt-4 rounded-xl bg-[var(--danger-soft)] px-3 py-2 text-sm text-[var(--danger)]"
              >
                {error}
              </p>
            ) : null}
            {mode === 'verify' ? (
              <Button
                type="button"
                variant="outline"
                className="mt-6 h-11 w-full"
                onClick={resendVerification}
                disabled={pending || !email}
              >
                {pending ? (
                  <LoaderCircle className="animate-spin" />
                ) : (
                  <RefreshCw />
                )}{' '}
                Resend confirmation
              </Button>
            ) : (
              <Button
                type="submit"
                className="mt-6 h-11 w-full bg-[var(--ribbon)] text-white hover:bg-[var(--ribbon-dark)]"
                disabled={
                  pending ||
                  (isRegister && capabilities?.emailVerification === false)
                }
              >
                {pending ? (
                  <LoaderCircle
                    className="animate-spin"
                    data-icon="inline-start"
                  />
                ) : (
                  <Mail data-icon="inline-start" />
                )}
                {pending
                  ? 'Working…'
                  : mode === 'register'
                    ? 'Create account & verify email'
                    : mode === 'forgot'
                      ? 'Send reset link'
                      : mode === 'reset'
                        ? 'Update password'
                        : 'Sign in with email'}
              </Button>
            )}

            {mode === 'signin' ? (
              <Button
                type="button"
                variant="ghost"
                className="mt-2 h-11 w-full"
                onClick={handlePasskey}
                disabled={pending}
              >
                <Fingerprint /> Sign in with a passkey
              </Button>
            ) : null}

            <div className="mt-4 text-center text-sm">
              {mode === 'signin' ? (
                <button
                  type="button"
                  onClick={() => switchMode('register')}
                  className="font-medium text-[var(--ink)] hover:underline"
                >
                  New to RibbonDesk? Create an account
                </button>
              ) : mode === 'register' ? (
                <button
                  type="button"
                  onClick={() => switchMode('signin')}
                  className="font-medium text-[var(--ink)] hover:underline"
                >
                  Already have an account? Sign in
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => switchMode('signin')}
                  className="font-medium text-[var(--ink)] hover:underline"
                >
                  Back to sign in
                </button>
              )}
            </div>
            <div className="mt-6 flex gap-3 rounded-xl bg-[var(--sage-soft)] p-3 text-xs leading-5 text-muted-foreground">
              <ShieldCheck className="mt-0.5 size-4 shrink-0 text-[var(--sage)]" />{' '}
              Email links expire in one hour. Passwords are hashed by Better
              Auth, and AI never receives your credentials.
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
      description="This is the shared desk for your businesses, locations, team, and business-readiness record."
      currentStep={1}
      furthestStep={1}
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
  const locations = useQuery(
    api.locations.listByBusiness,
    business
      ? {
          businessId: business._id,
          paginationOpts: { numItems: 20, cursor: null },
        }
      : 'skip',
  );
  const location = locations?.page[0];
  const [selectedStep, setSelectedStep] = useState<OnboardingStep | null>(null);

  if (businesses === undefined || (business && locations === undefined))
    return <FullPageStatus label="Loading your business portfolio…" />;

  const furthestStep: OnboardingStep = !business ? 2 : !location ? 3 : 4;
  if (location?.jurisdictionStatus === 'confirmed' && selectedStep === null)
    return (
      <CommandCenter
        organizationId={organizationId}
        organizationName={organizationName}
        businessName={business!.name}
        displayName={displayName}
        locationId={location._id}
      />
    );

  const currentStep = selectedStep ?? furthestStep;
  const navigate = (step: OnboardingStep) => setSelectedStep(step);
  const frameProps = { currentStep, furthestStep, onStepChange: navigate };

  if (currentStep === 1)
    return (
      <EditOrganization
        organizationId={organizationId}
        organizationName={organizationName}
        onComplete={() => setSelectedStep(2)}
        {...frameProps}
      />
    );
  if (currentStep === 2)
    return (
      <CreateBusiness
        organizationId={organizationId}
        organizationName={organizationName}
        business={business}
        onComplete={() => setSelectedStep(business ? 3 : null)}
        {...frameProps}
      />
    );
  if (currentStep === 3 && business)
    return (
      <CreateLocation
        organizationId={organizationId}
        organizationName={organizationName}
        business={business}
        location={location}
        onComplete={() => setSelectedStep(location ? 4 : null)}
        {...frameProps}
      />
    );
  if (currentStep === 4 && business && location)
    return (
      <ConfirmJurisdiction
        location={location}
        businessName={business.name}
        businessType={business.businessType}
        onComplete={() => setSelectedStep(null)}
        {...frameProps}
      />
    );
  return <FullPageStatus label="Opening the next setup step…" />;
}

function EditOrganization({
  organizationId,
  organizationName,
  onComplete,
  currentStep,
  furthestStep,
  onStepChange,
}: {
  organizationId: Id<'organizations'>;
  organizationName: string;
  onComplete: () => void;
  currentStep: OnboardingStep;
  furthestStep: OnboardingStep;
  onStepChange: (step: OnboardingStep) => void;
}) {
  const updateName = useMutation(api.organizations.updateName);
  const [name, setName] = useState(organizationName);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormSubmitEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      await updateName({ organizationId, name });
      onComplete();
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setPending(false);
    }
  }

  return (
    <OnboardingFrame
      step="1 of 4"
      title="Review your workspace"
      description="This is the shared desk for your businesses, locations, team, and business-readiness record."
      currentStep={currentStep}
      furthestStep={furthestStep}
      onStepChange={onStepChange}
    >
      <form onSubmit={submit} className="grid gap-5">
        <div className="grid gap-2">
          <Label htmlFor="edit-org-name">Organization name</Label>
          <Input
            id="edit-org-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
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
          {pending ? <LoaderCircle className="animate-spin" /> : null} Save and
          continue <ChevronRight />
        </Button>
      </form>
    </OnboardingFrame>
  );
}

type BusinessDoc = Doc<'businesses'>;
type LocationDoc = Doc<'locations'>;

function CreateBusiness({
  organizationId,
  organizationName,
  business,
  onComplete,
  currentStep,
  furthestStep,
  onStepChange,
}: {
  organizationId: Id<'organizations'>;
  organizationName: string;
  business?: BusinessDoc;
  onComplete: () => void;
  currentStep: OnboardingStep;
  furthestStep: OnboardingStep;
  onStepChange: (step: OnboardingStep) => void;
}) {
  const createBusiness = useMutation(api.businesses.create);
  const updateBusiness = useMutation(api.businesses.updateDetails);
  const [name, setName] = useState(business?.name ?? '');
  const [businessType, setBusinessType] = useState(
    business?.businessType ?? '',
  );
  const [description, setDescription] = useState(business?.description ?? '');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormSubmitEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      if (business)
        await updateBusiness({
          businessId: business._id,
          name,
          businessType,
          description: description || undefined,
        });
      else
        await createBusiness({
          organizationId,
          name,
          businessType,
          description: description || undefined,
        });
      onComplete();
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
      title={business ? 'Review the business' : 'Tell me about the business'}
      description="RibbonDesk is built for any local business. The type and activities determine which requirements need research."
      currentStep={currentStep}
      furthestStep={furthestStep}
      onStepChange={onStepChange}
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
          {pending ? <LoaderCircle className="animate-spin" /> : null} Save and
          continue <ChevronRight />
        </Button>
      </form>
    </OnboardingFrame>
  );
}

function CreateLocation({
  organizationId,
  organizationName,
  business,
  location,
  onComplete,
  currentStep,
  furthestStep,
  onStepChange,
}: {
  organizationId: Id<'organizations'>;
  organizationName: string;
  business: BusinessDoc;
  location?: LocationDoc;
  onComplete: () => void;
  currentStep: OnboardingStep;
  furthestStep: OnboardingStep;
  onStepChange: (step: OnboardingStep) => void;
}) {
  const createLocation = useMutation(api.locations.create);
  const updateLocation = useMutation(api.locations.updateProfile);
  const [form, setForm] = useState({
    name: location?.name ?? 'Primary location',
    addressLine1: location?.addressLine1 ?? '',
    addressLine2: location?.addressLine2 ?? '',
    city: location?.city ?? '',
    region: location?.region ?? '',
    postalCode: location?.postalCode ?? '',
    countryCode: location?.countryCode ?? 'US',
    openingTarget: location?.openingTarget
      ? new Date(location.openingTarget).toISOString().slice(0, 10)
      : '',
  });
  const [activities, setActivities] = useState(
    location?.activities.join(', ') ?? '',
  );
  const existingAnswer = (
    key: keyof NonNullable<LocationDoc['triggerAnswers']>,
  ): TriggerAnswer =>
    location?.triggerAnswers?.[key] ??
    (location ? (location.triggers[key] ? 'yes' : 'no') : 'not_sure');
  const [triggerAnswers, setTriggerAnswers] = useState({
    employees: existingAnswer('employees'),
    construction: existingAnswer('construction'),
    food: existingAnswer('food'),
    alcohol: existingAnswer('alcohol'),
    signage: existingAnswer('signage'),
    seating: existingAnswer('seating'),
    delivery: existingAnswer('delivery'),
    hazardousMaterials: existingAnswer('hazardousMaterials'),
    regulatedServices: existingAnswer('regulatedServices'),
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
      const values = {
        name: form.name,
        addressLine1: form.addressLine1,
        addressLine2: form.addressLine2 || undefined,
        city: form.city,
        region: form.region,
        postalCode: form.postalCode,
        countryCode: form.countryCode,
        timezone:
          location?.timezone ||
          Intl.DateTimeFormat().resolvedOptions().timeZone ||
          'UTC',
        openingTarget: form.openingTarget
          ? new Date(`${form.openingTarget}T12:00:00`).getTime()
          : undefined,
        activities: activities
          .split(',')
          .map((value) => value.trim())
          .filter(Boolean),
        triggerAnswers,
        triggers: {
          employees: triggerAnswers.employees === 'yes',
          construction: triggerAnswers.construction === 'yes',
          food: triggerAnswers.food === 'yes',
          alcohol: triggerAnswers.alcohol === 'yes',
          signage: triggerAnswers.signage === 'yes',
          seating: triggerAnswers.seating === 'yes',
          delivery: triggerAnswers.delivery === 'yes',
          hazardousMaterials: triggerAnswers.hazardousMaterials === 'yes',
          regulatedServices: triggerAnswers.regulatedServices === 'yes',
          other: [],
        },
      };
      if (location)
        await updateLocation({ locationId: location._id, ...values });
      else
        await createLocation({
          organizationId,
          businessId: business._id,
          ...values,
        });
      onComplete();
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setPending(false);
    }
  }

  const triggerChoices: Array<{
    key: keyof typeof triggerAnswers;
    label: string;
    example: string;
  }> = [
    {
      key: 'employees',
      label: 'Hire people?',
      example: 'Employees, interns, or paid helpers.',
    },
    {
      key: 'construction',
      label: 'Build or renovate a space?',
      example: 'Construction, plumbing, electrical work, or major repairs.',
    },
    {
      key: 'food',
      label: 'Prepare or serve food?',
      example: 'Meals, drinks, packaged food, catering, or samples.',
    },
    {
      key: 'alcohol',
      label: 'Sell or serve alcohol?',
      example: 'Beer, wine, liquor, or alcoholic tastings.',
    },
    {
      key: 'signage',
      label: 'Put up an outside sign?',
      example: 'A storefront sign, awning, banner, or sidewalk sign.',
    },
    {
      key: 'seating',
      label: 'Have customers sit at your location?',
      example: 'Indoor seating, sidewalk tables, or a waiting area.',
    },
    {
      key: 'delivery',
      label: 'Deliver products or services?',
      example: 'Your own drivers, couriers, or delivery platforms.',
    },
    {
      key: 'hazardousMaterials',
      label: 'Use materials that need special care?',
      example: 'Chemicals, fuel, medical waste, or compressed gas.',
    },
    {
      key: 'regulatedServices',
      label: 'Offer a service that may need a license?',
      example:
        'Legal, medical, childcare, beauty, finance, or construction work.',
    },
  ];

  return (
    <OnboardingFrame
      step="3 of 4"
      eyebrow={`${organizationName} · ${business.name}`}
      title={
        location ? 'Check your business details' : 'Tell us where you will work'
      }
      description="Your answers help RibbonDesk check the right city, state, and federal sources. Choose “I’m not sure” whenever you need help."
      currentStep={currentStep}
      furthestStep={furthestStep}
      onStepChange={onStepChange}
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
        <div className="grid gap-2">
          <Label htmlFor="address-line-2">
            Suite or unit{' '}
            <span className="text-muted-foreground">(optional)</span>
          </Label>
          <Input
            id="address-line-2"
            value={form.addressLine2}
            onChange={(event) => update('addressLine2', event.target.value)}
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
          <Label htmlFor="activities">
            What will your business actually do?
          </Label>
          <Input
            id="activities"
            value={activities}
            onChange={(event) => setActivities(event.target.value)}
            placeholder="For example: software consulting, website design, and training"
          />
          <p className="text-xs text-muted-foreground">
            Separate activities with commas.
          </p>
        </div>
        <fieldset className="grid gap-3 rounded-2xl border p-4">
          <legend className="px-1 text-sm font-semibold">
            Will your business do any of these things?
          </legend>
          <p className="text-sm leading-6 text-muted-foreground">
            These answers change which steps belong in your route.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            {triggerChoices.map(({ key, label, example }) => (
              <div key={key} className="rounded-xl border bg-background p-3">
                <p className="text-sm font-semibold">{label}</p>
                <p className="mt-1 min-h-10 text-xs leading-5 text-muted-foreground">
                  {example}
                </p>
                <fieldset className="mt-3 grid grid-cols-3 gap-1">
                  <legend className="sr-only">{label}</legend>
                  {(
                    [
                      ['yes', 'Yes'],
                      ['no', 'No'],
                      ['not_sure', 'Not sure'],
                    ] as const
                  ).map(([value, copy]) => (
                    <Button
                      key={value}
                      type="button"
                      size="sm"
                      variant={
                        triggerAnswers[key] === value ? 'default' : 'outline'
                      }
                      aria-pressed={triggerAnswers[key] === value}
                      onClick={() =>
                        setTriggerAnswers((current) => ({
                          ...current,
                          [key]: value,
                        }))
                      }
                      className="h-8 px-2 text-[11px]"
                    >
                      {copy}
                    </Button>
                  ))}
                </fieldset>
              </div>
            ))}
          </div>
        </fieldset>
        {error ? <FormError message={error} /> : null}
        <Button
          type="submit"
          className="mt-1 h-11 bg-[var(--ribbon)] text-white hover:bg-[var(--ribbon-dark)]"
          disabled={pending}
        >
          {pending ? <LoaderCircle className="animate-spin" /> : null} Save and
          check my location <ChevronRight />
        </Button>
      </form>
    </OnboardingFrame>
  );
}

function ConfirmJurisdiction({
  location,
  businessName,
  businessType,
  onComplete,
  currentStep,
  furthestStep,
  onStepChange,
}: {
  location: LocationDoc;
  businessName: string;
  businessType: string;
  onComplete: () => void;
  currentStep: OnboardingStep;
  furthestStep: OnboardingStep;
  onStepChange: (step: OnboardingStep) => void;
}) {
  const confirm = useMutation(api.locations.confirmJurisdiction);
  const startResearch = useMutation(api.journey.startResearch);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasVerifiedPack = hasVerifiedNycFoodServicePack({
    countryCode: location.countryCode,
    region: location.region,
    city: location.city,
    businessType,
    servesFood: location.triggers.food,
  });
  const jurisdiction = `${location.city}, ${location.region}, ${location.countryCode}`;

  async function approve() {
    setPending(true);
    setError(null);
    try {
      await confirm({
        locationId: location._id,
        jurisdictionLabel: jurisdiction,
        jurisdictionCountryCode: location.countryCode,
        coverageMode: hasVerifiedPack ? 'verified_pack' : 'dynamic_research',
        coveragePackKey: hasVerifiedPack ? 'nyc-food-service-v1' : undefined,
      });
      await startResearch({ locationId: location._id, refresh: true });
      onComplete();
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
      title="Confirm where your business will operate"
      description="We will use this location to check the right official sources and build a route made for your business."
      currentStep={currentStep}
      furthestStep={furthestStep}
      onStepChange={onStepChange}
    >
      <div className="rounded-2xl border bg-[var(--paper-strong)] p-5">
        <div className="flex items-start gap-4">
          <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-[var(--ribbon-soft)] text-[var(--ribbon)]">
            <MapPin className="size-5" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">
              Rules we’ll check for
            </p>
            <p className="mt-1 text-lg font-semibold">{jurisdiction}</p>
          </div>
        </div>
      </div>
      <div className="mt-4 rounded-2xl border p-5">
        <Badge variant={hasVerifiedPack ? 'default' : 'outline'}>
          {hasVerifiedPack
            ? 'NYC food-service starting library'
            : 'Live source research'}
        </Badge>
        <h3 className="mt-3 font-semibold">
          {hasVerifiedPack
            ? 'A faster start for NYC food businesses'
            : 'Build my personal business route'}
        </h3>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          {hasVerifiedPack
            ? 'RibbonDesk starts with its maintained NYC source library, then checks the live pages again for your business.'
            : 'RibbonDesk checks current government sources, then its AI Legal Guide and AI Money & Tax Guide build your steps in the right order.'}
        </p>
      </div>
      <div className="mt-4 flex gap-3 rounded-xl bg-[var(--sage-soft)] p-3 text-xs leading-5 text-muted-foreground">
        <Sparkles className="mt-0.5 size-4 shrink-0 text-[var(--sage)]" />{' '}
        RibbonDesk provides AI guidance based on cited public information. It is
        not a law firm, accounting firm, or government agency.
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
        Confirm and build my route
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
  const pathname = usePathname();
  const activeSection = deskSectionFromPath(pathname);
  const dashboard = useQuery(api.dashboard.getCommandCenter, { locationId });
  const [passkeyPending, setPasskeyPending] = useState(false);
  const [passkeyStatus, setPasskeyStatus] = useState<string | null>(null);

  async function addPasskey() {
    setPasskeyPending(true);
    setPasskeyStatus(null);
    try {
      const result = await authClient.passkey.addPasskey({
        authenticatorAttachment: 'platform',
      });
      if (result.error)
        throw new Error(
          result.error.message || 'The passkey could not be added.',
        );
      setPasskeyStatus('Passkey added');
    } catch (caught) {
      setPasskeyStatus(errorMessage(caught));
    } finally {
      setPasskeyPending(false);
    }
  }

  if (process.env.NEXT_PUBLIC_GUIDED_JOURNEY !== '0') {
    return (
      <GuidedJourneyShell
        organizationId={organizationId}
        organizationName={organizationName}
        businessName={businessName}
        displayName={displayName}
        locationId={locationId}
      />
    );
  }

  if (dashboard === undefined)
    return <FullPageStatus label="Assembling today’s command center…" />;
  const role = dashboard.role;

  const navigation: Array<{
    section: DeskSection;
    label: string;
    icon: LucideIcon;
    badge?: number;
  }> = [
    { section: 'today', label: 'Today', icon: LayoutDashboard },
    {
      section: 'plan',
      label: 'Plan & research',
      icon: CircleGauge,
      badge: dashboard.counts.pendingProposals,
    },
    { section: 'inbox', label: 'Inbox', icon: Inbox },
    { section: 'documents', label: 'Documents', icon: FileText },
    { section: 'operations', label: 'Operations', icon: CalendarClock },
    { section: 'assistant', label: 'Assistant', icon: Bot },
    { section: 'team', label: 'Team', icon: Users },
    { section: 'settings', label: 'Settings', icon: Settings2 },
  ];
  const pageCopy: Record<
    DeskSection,
    { eyebrow: string; title: string; description: string }
  > = {
    today: {
      eyebrow: 'Live workspace',
      title: `Good ${new Date().getHours() < 12 ? 'morning' : 'afternoon'}, ${displayName.split(' ')[0]}.`,
      description: `Here is what needs attention at ${dashboard.location.name}.`,
    },
    plan: {
      eyebrow: 'Plan & research',
      title: 'Turn official guidance into a clear opening plan.',
      description:
        'Run cited research, inspect captured evidence, and decide every proposal before it enters the operating record.',
    },
    inbox: {
      eyebrow: 'Agency inbox',
      title: 'Keep every agency conversation attached to the case.',
      description:
        'Receive real messages, review AI-proposed updates, and approve outbound communication deliberately.',
    },
    documents: {
      eyebrow: 'Evidence & applications',
      title: 'Build the file once. Keep the proof attached.',
      description:
        'Store evidence, connect it to requirements, and prepare versioned application packets without losing context.',
    },
    operations: {
      eyebrow: 'Opening operations',
      title: 'Run inspections, deadlines, and renewals from one timeline.',
      description:
        'Move from opening into operation while preserving every decision, outcome, reminder, and recurring obligation.',
    },
    assistant: {
      eyebrow: 'Grounded assistant',
      title: 'Ask the desk, not the open web.',
      description:
        'Get answers grounded in this location’s reviewed sources and live operating record, with uncertainty kept visible.',
    },
    team: {
      eyebrow: 'Team access',
      title: 'Give the right people deliberate authority.',
      description:
        'Invite collaborators, choose roles, and keep consequential approvals with owners and admins.',
    },
    settings: {
      eyebrow: 'Workspace settings',
      title: 'Control account security and workspace data.',
      description:
        'Manage passkeys, export the operating record, and access owner-only data controls.',
    },
  };
  const activeCopy = pageCopy[activeSection];

  function renderActiveWorkspace() {
    switch (activeSection) {
      case 'plan':
        return <ResearchPanel locationId={locationId} role={role} />;
      case 'inbox':
        return <CaseInboxPanel locationId={locationId} />;
      case 'documents':
        return <EvidenceApplicationsPanel locationId={locationId} />;
      case 'operations':
        return <OperationsLifecyclePanel locationId={locationId} />;
      case 'assistant':
        return <AssistantSourcesPanel locationId={locationId} role={role} />;
      case 'team':
        return <TeamPanel organizationId={organizationId} role={role} />;
      case 'settings':
        return (
          <DataControlsPanel
            organizationId={organizationId}
            organizationName={organizationName}
            role={role}
          />
        );
      default:
        return <WorkPlanPanel locationId={locationId} role={role} />;
    }
  }

  return (
    <main className="depth-app-shell min-h-screen text-[var(--ink)]">
      <header className="depth-header sticky top-0 z-30 border-b bg-[var(--paper-strong)]">
        <div className="mx-auto flex h-16 max-w-[1440px] items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="depth-brand-mark grid size-9 place-items-center rounded-xl bg-[var(--ribbon)] text-sm font-black text-white">
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
              variant="outline"
              size="sm"
              onClick={addPasskey}
              disabled={passkeyPending}
              title={passkeyStatus ?? 'Add a passkey to this signed-in account'}
            >
              {passkeyPending ? (
                <LoaderCircle className="animate-spin" />
              ) : (
                <Fingerprint />
              )}
              <span className="hidden lg:inline">
                {passkeyStatus === 'Passkey added'
                  ? 'Passkey added'
                  : 'Add passkey'}
              </span>
            </Button>
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
      <div className="mx-auto grid max-w-[1440px] md:grid-cols-[232px_1fr]">
        <aside className="depth-rail sticky top-16 hidden h-[calc(100vh-4rem)] border-r bg-background p-4 md:block">
          <nav className="grid gap-1 text-sm">
            {navigation.map((item) => (
              <DeskNav
                key={item.section}
                icon={item.icon}
                label={item.label}
                href={deskSectionHref(item.section)}
                active={activeSection === item.section}
                badge={item.badge}
              />
            ))}
          </nav>
          <div
            id="business-summary"
            className="mt-8 rounded-2xl border bg-background p-4"
          >
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
          <nav
            aria-label="Workspace pages"
            className="-mx-1 mb-6 flex gap-2 overflow-x-auto px-1 pb-2 md:hidden"
          >
            {navigation.map((item) => (
              <Link
                key={item.section}
                href={deskSectionHref(item.section)}
                aria-current={
                  activeSection === item.section ? 'page' : undefined
                }
                className={`shrink-0 rounded-full border px-3 py-2 text-xs font-semibold ${
                  activeSection === item.section
                    ? 'border-[var(--ribbon)] bg-[var(--ribbon-soft)] text-[var(--ribbon)]'
                    : 'bg-background text-muted-foreground'
                }`}
              >
                {item.label}
                {item.badge ? ` · ${item.badge}` : ''}
              </Link>
            ))}
          </nav>
          <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
            <div>
              <Badge className="bg-[var(--sage-soft)] text-[var(--sage)]">
                <Activity />
                {activeCopy.eyebrow}
              </Badge>
              <h1 className="mt-4 font-heading text-4xl font-semibold tracking-[-0.04em] sm:text-5xl">
                {activeCopy.title}
              </h1>
              <p className="mt-2 text-muted-foreground">
                {activeCopy.description}
              </p>
            </div>
            {activeSection === 'today' ? (
              <Button
                nativeButton={false}
                className="bg-[var(--ribbon)] text-white hover:bg-[var(--ribbon-dark)]"
                render={<Link href="/app/assistant" />}
              >
                <Sparkles /> Ask Ribbon Assistant
              </Button>
            ) : null}
          </div>
          {activeSection === 'today' ? (
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
          ) : null}
          <div key={activeSection} className="min-h-[calc(100vh-15rem)]">
            {renderActiveWorkspace()}
          </div>
        </section>
      </div>
      <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-4 border-t bg-background px-2 py-2 md:hidden">
        <MobileNav
          icon={LayoutDashboard}
          label="Today"
          href="/app"
          active={activeSection === 'today'}
        />
        <MobileNav
          icon={CircleGauge}
          label="Plan"
          href="/app/plan"
          active={activeSection === 'plan'}
        />
        <MobileNav
          icon={Inbox}
          label="Inbox"
          href="/app/inbox"
          active={activeSection === 'inbox'}
        />
        <MobileNav
          icon={CalendarClock}
          label="More"
          href="/app/operations"
          active={!['today', 'plan', 'inbox'].includes(activeSection)}
        />
      </nav>
    </main>
  );
}

function OnboardingFrame({
  step,
  eyebrow,
  title,
  description,
  currentStep,
  furthestStep,
  onStepChange,
  children,
}: {
  step: string;
  eyebrow?: string;
  title: string;
  description: string;
  currentStep?: OnboardingStep;
  furthestStep?: OnboardingStep;
  onStepChange?: (step: OnboardingStep) => void;
  children: React.ReactNode;
}) {
  const setupSteps: Array<{ number: OnboardingStep; label: string }> = [
    { number: 1, label: 'Workspace' },
    { number: 2, label: 'Business' },
    { number: 3, label: 'Location' },
    { number: 4, label: 'Place check' },
  ];
  return (
    <main className="auth-page min-h-screen px-5 py-10">
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
        <section className="auth-card mt-10 rounded-[1.75rem] border bg-white p-6 shadow-[0_24px_80px_rgb(28_37_51/10%)] sm:p-8">
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
          {currentStep && furthestStep ? (
            <nav
              aria-label="Business setup progress"
              className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-4"
            >
              {setupSteps.map(({ number, label }) => {
                const available = number <= furthestStep;
                const active = number === currentStep;
                return (
                  <button
                    key={number}
                    type="button"
                    disabled={!available || !onStepChange}
                    aria-current={active ? 'step' : undefined}
                    onClick={() => onStepChange?.(number)}
                    className={`rounded-xl border px-3 py-3 text-left transition ${
                      active
                        ? 'border-[var(--ribbon)] bg-[var(--ribbon-soft)] text-[var(--ribbon)]'
                        : available && onStepChange
                          ? 'bg-white hover:border-[var(--ribbon)] hover:bg-[var(--ribbon-soft)]'
                          : 'cursor-not-allowed bg-muted/40 text-muted-foreground opacity-60'
                    }`}
                  >
                    <span className="block text-[10px] font-bold uppercase tracking-[0.16em]">
                      Step {number}
                    </span>
                    <span className="mt-1 block text-xs font-semibold">
                      {label}
                    </span>
                  </button>
                );
              })}
            </nav>
          ) : null}
          {currentStep && currentStep > 1 && onStepChange ? (
            <button
              type="button"
              onClick={() => onStepChange((currentStep - 1) as OnboardingStep)}
              className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="size-4" /> Back to step {currentStep - 1}
            </button>
          ) : null}
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
  href,
}: {
  icon: LucideIcon;
  label: string;
  active?: boolean;
  badge?: number;
  href: string;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? 'page' : undefined}
      className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-left ${active ? 'bg-[var(--ribbon-soft)] font-semibold text-[var(--ribbon)]' : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'}`}
    >
      <Icon className="size-4" />
      <span className="flex-1">{label}</span>
      {badge ? (
        <span className="rounded-full bg-[var(--ribbon)] px-1.5 text-[10px] text-white">
          {badge}
        </span>
      ) : null}
    </Link>
  );
}
function MobileNav({
  icon: Icon,
  label,
  active,
  href,
}: {
  icon: LucideIcon;
  label: string;
  active?: boolean;
  href: string;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? 'page' : undefined}
      className={`grid place-items-center gap-1 text-[10px] ${active ? 'font-semibold text-[var(--ribbon)]' : 'text-muted-foreground'}`}
    >
      <Icon className="size-5" />
      {label}
    </Link>
  );
}
function Metric({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: LucideIcon;
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
