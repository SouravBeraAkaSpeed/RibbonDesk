import assert from 'node:assert/strict';
import test from 'node:test';

import {
  canTransitionRequirement,
  dependencyWouldCycle,
  hasMinimumRole,
  hasVerifiedNycFoodServicePack,
  isHttpsCitation,
  nextRecurrence,
  readinessSummary,
  reminderCadences,
} from '../convex/lib/domain.ts';
import { deskSectionFromPath, deskSectionHref } from '../lib/desk-sections.ts';
import {
  enforceEvidencePhase,
  permitsPortalCapture,
  sourceTierForUrl,
} from '../convex/lib/journeyPolicy.ts';

void test('role rank preserves approval boundaries', () => {
  assert.equal(hasMinimumRole('owner', 'admin'), true);
  assert.equal(hasMinimumRole('contributor', 'admin'), false);
  assert.equal(
    canTransitionRequirement('proposed', 'in_progress', 'owner'),
    false,
  );
  assert.equal(
    canTransitionRequirement('proposed', 'confirmed', 'contributor'),
    false,
  );
  assert.equal(
    canTransitionRequirement('proposed', 'confirmed', 'admin'),
    true,
  );
});

void test('recurrence clamps end-of-month dates', () => {
  const january31 = Date.UTC(2026, 0, 31, 12);
  assert.equal(
    new Date(nextRecurrence(january31, 'FREQ=MONTHLY')).toISOString(),
    '2026-02-28T12:00:00.000Z',
  );
  assert.equal(
    new Date(
      nextRecurrence(january31, 'FREQ=MONTHLY;INTERVAL=3'),
    ).toISOString(),
    '2026-04-30T12:00:00.000Z',
  );
});

void test('reminder cadence schedules future checkpoints and immediate due work', () => {
  const now = Date.UTC(2026, 0, 1);
  assert.deepEqual(
    reminderCadences(now + 100 * 86_400_000, now),
    [90, 60, 30, 14, 7, 1],
  );
  assert.deepEqual(reminderCadences(now, now), [0]);
});

void test('citation and dependency validation reject unsafe inputs', () => {
  assert.equal(isHttpsCitation('https://www.nyc.gov/permits'), true);
  assert.equal(isHttpsCitation('javascript:alert(1)'), false);
  const edges = [
    { from: 'a', to: 'b' },
    { from: 'b', to: 'c' },
  ];
  assert.equal(dependencyWouldCycle(edges, 'c', 'a'), true);
  assert.equal(dependencyWouldCycle(edges, 'a', 'c'), false);
});

void test('readiness excludes proposals and conflicts from the denominator', () => {
  const result = readinessSummary([
    { status: 'proposed' },
    { status: 'conflicted' },
    { status: 'completed' },
    { status: 'not_started' },
  ]);
  assert.deepEqual(result, { confirmed: 2, complete: 1, score: 50 });
});

void test('NYC verified coverage requires a food-service business signal', () => {
  assert.equal(
    hasVerifiedNycFoodServicePack({
      countryCode: 'US',
      region: 'NY',
      city: 'New York',
      businessType: 'Technology consulting office',
      servesFood: false,
    }),
    false,
  );
  assert.equal(
    hasVerifiedNycFoodServicePack({
      countryCode: 'US',
      region: 'NY',
      city: 'New York',
      businessType: 'Neighborhood café',
      servesFood: true,
    }),
    true,
  );
});

void test('dashboard sections resolve to stable URL-backed workspaces', () => {
  assert.equal(deskSectionFromPath('/app'), 'today');
  assert.equal(deskSectionFromPath('/app/inbox'), 'inbox');
  assert.equal(deskSectionFromPath('/app/not-a-section'), 'today');
  assert.equal(deskSectionHref('today'), '/app');
  assert.equal(deskSectionHref('assistant'), '/app/assistant');
});

void test('journey policy reserves must-do steps for official evidence', () => {
  const tiers = new Map([
    ['https://dos.ny.gov/form-corporation', 'official_explanatory' as const],
    [
      'https://law.cornell.edu/helpful-summary',
      'professional_reference' as const,
    ],
  ]);
  assert.equal(
    enforceEvidencePhase(
      'must',
      ['https://dos.ny.gov/form-corporation'],
      tiers,
    ),
    'must',
  );
  assert.equal(
    enforceEvidencePhase(
      'must',
      ['https://law.cornell.edu/helpful-summary'],
      tiers,
    ),
    'smart',
  );
});

void test('journey source tiers and banking privacy rules are deterministic', () => {
  assert.equal(
    sourceTierForUrl('https://www.irs.gov/businesses'),
    'official_explanatory',
  );
  assert.equal(
    sourceTierForUrl('https://law.cornell.edu/wex'),
    'professional_reference',
  );
  assert.equal(sourceTierForUrl('http://example.com'), null);
  assert.equal(permitsPortalCapture('government_portal'), true);
  assert.equal(permitsPortalCapture('banking'), false);
});
