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
  Eye,
  EyeOff,
  Fingerprint,
  Inbox,
  LayoutDashboard,
  LoaderCircle,
  LockKeyhole,
  LogOut,
  Mail,
  MapPin,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Users,
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
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { authClient } from '@/lib/auth-client';

import { ResearchPanel } from './research-panel';
import { EvidenceApplicationsPanel } from './evidence-applications-panel';
import { CaseInboxPanel } from './case-inbox-panel';
import { OperationsLifecyclePanel } from './operations-lifecycle-panel';
import { AssistantSourcesPanel } from './assistant-sources-panel';
import { TeamPanel } from './team-panel';
import { WorkspaceSearch } from './workspace-search';
import { DataControlsPanel } from './data-controls-panel';
import { WorkPlanPanel } from './work-plan-panel';

type FormSubmitEvent = SyntheticEvent<HTMLFormElement, SubmitEvent>;
type OnboardingStep = 1 | 2 | 3 | 4;

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

function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="size-4">
      <path
        fill="#4285F4"
        d="M21.6 12.2c0-.7-.1-1.5-.2-2.2H12v4.3h5.4a4.6 4.6 0 0 1-2 3v2.8h3.3c1.9-1.8 2.9-4.4 2.9-7.9Z"
      />
      <path
        fill="#34A853"
        d="M12 22c2.7 0 5-.9 6.7-2.4l-3.3-2.7c-.9.6-2.1 1-3.4 1a5.9 5.9 0 0 1-5.5-4.1H3.1v2.8A10 10 0 0 0 12 22Z"
      />
      <path
        fill="#FBBC05"
        d="M6.5 13.8A6 6 0 0 1 6.2 12c0-.6.1-1.2.3-1.8V7.4H3.1A10 10 0 0 0 2 12c0 1.7.4 3.2 1.1 4.6l3.4-2.8Z"
      />
      <path
        fill="#EA4335"
        d="M12 6.1c1.5 0 2.8.5 3.8 1.5l2.9-2.8A9.7 9.7 0 0 0 12 2a10 10 0 0 0-8.9 5.4l3.4 2.8A5.9 5.9 0 0 1 12 6.1Z"
      />
    </svg>
  );
}

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

  async function handleGoogle() {
    setPending(true);
    setError(null);
    try {
      const result = await authClient.signIn.social({
        provider: 'google',
        callbackURL: `${window.location.origin}/app`,
        newUserCallbackURL: `${window.location.origin}/app`,
        errorCallbackURL: `${window.location.origin}/app?authError=google`,
      });
      if (result.error)
        throw new Error(result.error.message || 'Google sign-in failed.');
    } catch (caught) {
      setError(errorMessage(caught));
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
              Use email, Google, or a passkey you have already added.
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

            {mode === 'signin' || mode === 'register' ? (
              <>
                <div className="mt-5 grid gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    className="h-11"
                    onClick={handleGoogle}
                    disabled={pending || !capabilities?.google}
                    title={
                      capabilities?.google
                        ? 'Continue with Google'
                        : 'Google OAuth setup is pending'
                    }
                  >
                    <GoogleMark /> Google
                  </Button>
                </div>
                <div className="my-5 flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  <span className="h-px flex-1 bg-border" /> or use email{' '}
                  <span className="h-px flex-1 bg-border" />
                </div>
              </>
            ) : null}

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
  const [triggers, setTriggers] = useState({
    employees: location?.triggers.employees ?? false,
    construction: location?.triggers.construction ?? false,
    food: location?.triggers.food ?? false,
    alcohol: location?.triggers.alcohol ?? false,
    signage: location?.triggers.signage ?? false,
    seating: location?.triggers.seating ?? false,
    delivery: location?.triggers.delivery ?? false,
    hazardousMaterials: location?.triggers.hazardousMaterials ?? false,
    regulatedServices: location?.triggers.regulatedServices ?? false,
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
        triggers: { ...triggers, other: [] },
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
      title={location ? 'Review the location' : 'Configure the first location'}
      description="The address and operational triggers shape jurisdiction and requirement research. RibbonDesk never silently assumes them."
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
          {pending ? <LoaderCircle className="animate-spin" /> : null} Save and
          review jurisdiction <ChevronRight />
        </Button>
      </form>
    </OnboardingFrame>
  );
}

function ConfirmJurisdiction({
  location,
  businessName,
  onComplete,
  currentStep,
  furthestStep,
  onStepChange,
}: {
  location: LocationDoc;
  businessName: string;
  onComplete: () => void;
  currentStep: OnboardingStep;
  furthestStep: OnboardingStep;
  onStepChange: (step: OnboardingStep) => void;
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
      title="Confirm the jurisdiction"
      description="Research will not start until you confirm the detected location and coverage mode."
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

  if (dashboard === undefined)
    return <FullPageStatus label="Assembling today’s command center…" />;

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
      <div className="mx-auto grid max-w-[1440px] md:grid-cols-[220px_1fr]">
        <aside className="depth-rail hidden min-h-[calc(100vh-4rem)] border-r bg-background p-4 md:block">
          <nav className="grid gap-1 text-sm">
            <DeskNav
              icon={LayoutDashboard}
              label="Today"
              active
              onClick={() =>
                document
                  .querySelector('#today')
                  ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
              }
            />
            <DeskNav
              icon={CircleGauge}
              label="Plan"
              onClick={() =>
                document
                  .querySelector('#research')
                  ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
              }
            />
            <DeskNav
              icon={Inbox}
              label="Inbox"
              badge={dashboard.counts.pendingProposals}
              onClick={() =>
                document
                  .querySelector('#case-inbox')
                  ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
              }
            />
            <DeskNav
              icon={CalendarClock}
              label="Calendar"
              onClick={() =>
                document
                  .querySelector('#operations')
                  ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
              }
            />
            <DeskNav
              icon={Building2}
              label="Business"
              onClick={() =>
                document
                  .querySelector('#business-summary')
                  ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
              }
            />
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
          <WorkPlanPanel locationId={locationId} role={dashboard.role} />
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
        </section>
      </div>
      <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-4 border-t bg-background px-2 py-2 md:hidden">
        <MobileNav icon={LayoutDashboard} label="Today" active target="today" />
        <MobileNav icon={CircleGauge} label="Plan" target="research" />
        <MobileNav icon={Inbox} label="Inbox" target="case-inbox" />
        <MobileNav icon={Building2} label="More" target="operations" />
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
    { number: 4, label: 'Jurisdiction' },
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
  target,
}: {
  icon: typeof LayoutDashboard;
  label: string;
  active?: boolean;
  target: string;
}) {
  return (
    <button
      onClick={() =>
        document
          .querySelector(`#${target}`)
          ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
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
