export const deskSections = [
  'today',
  'plan',
  'inbox',
  'documents',
  'operations',
  'assistant',
  'team',
  'settings',
] as const;

export type DeskSection = (typeof deskSections)[number];

export function deskSectionFromPath(pathname: string): DeskSection {
  const segment = pathname.split('/').filter(Boolean)[1];
  return deskSections.includes(segment as DeskSection)
    ? (segment as DeskSection)
    : 'today';
}

export function deskSectionHref(section: DeskSection) {
  return section === 'today' ? '/app' : `/app/${section}`;
}
