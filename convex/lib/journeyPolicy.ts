export type SourceTier =
  | 'controlling_government'
  | 'official_explanatory'
  | 'professional_reference'
  | 'commercial_provider';

export function sourceTierForUrl(value: string): SourceTier | null {
  let host: string;
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:') return null;
    host = url.hostname.toLowerCase();
  } catch {
    return null;
  }
  if (
    host.endsWith('.gov') ||
    host.includes('.gov.') ||
    host.endsWith('.gob') ||
    host.includes('.gob.') ||
    host.endsWith('.go.jp') ||
    host === 'gov.uk' ||
    host.endsWith('.gov.uk') ||
    host === 'gc.ca' ||
    host.endsWith('.gc.ca') ||
    host === 'europa.eu' ||
    host.endsWith('.europa.eu')
  ) {
    return 'official_explanatory';
  }
  if (
    host.endsWith('.edu') ||
    host.includes('.edu.') ||
    host.endsWith('.ac.uk') ||
    host === 'americanbar.org' ||
    host.endsWith('.americanbar.org') ||
    host === 'aicpa-cima.com' ||
    host.endsWith('.aicpa-cima.com') ||
    host === 'law.cornell.edu'
  ) {
    return 'professional_reference';
  }
  return 'commercial_provider';
}

export function isOfficialSourceTier(tier: SourceTier | undefined) {
  return tier === 'controlling_government' || tier === 'official_explanatory';
}

export function enforceEvidencePhase(
  requested: 'must' | 'smart' | 'later',
  citationUrls: string[],
  tiersByUrl: ReadonlyMap<string, SourceTier>,
) {
  if (requested !== 'must') return requested;
  return citationUrls.some((url) => isOfficialSourceTier(tiersByUrl.get(url)))
    ? requested
    : 'smart';
}

export function permitsPortalCapture(actionType: string) {
  return actionType !== 'banking';
}

const DEFAULT_PROFESSIONAL_ESCALATION =
  /\b(lawyer|attorney|accountant|cpa|legal counsel|legal advice|financial advice|tax professional|professional advice)\b/i;

export function removeDefaultProfessionalEscalation(
  value: string,
  allowEscalation = false,
) {
  if (allowEscalation || !DEFAULT_PROFESSIONAL_ESCALATION.test(value)) {
    return value;
  }
  const kept =
    value
      .match(/[^.!?]+[.!?]+|[^.!?]+$/g)
      ?.map((sentence) => sentence.trim())
      .filter(
        (sentence) =>
          sentence.length > 0 &&
          !DEFAULT_PROFESSIONAL_ESCALATION.test(sentence),
      ) ?? [];
  return (
    kept.join(' ') ||
    'RibbonDesk checked this step against the cited public sources so you can act with the evidence beside you.'
  );
}
