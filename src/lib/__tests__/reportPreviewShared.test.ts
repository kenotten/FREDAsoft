import { describe, expect, it } from 'vitest';
import type { Category, Facility, Finding, Glossary, Item, Location, Project, ProjectData } from '../../types';
import {
  filterReportProjectForPreview,
  paginatePhotoAddendumByRows,
  PHOTO_ADDENDUM_FIRST_PAGE_TITLE_COST_PX,
  PHOTO_ADDENDUM_GROUP_GAP_PX,
  PHOTO_ADDENDUM_LOCATION_HEADING_COST_PX,
  PHOTO_ADDENDUM_PAGE_BUDGET_PX,
  PHOTO_ADDENDUM_ROW_COST_PX,
  PHOTO_ADDENDUM_ROW_GAP_PX,
  type PhotoAddendumPageLocationGroup,
} from '../reportPreviewShared';

function makeProjectData(partial: Partial<ProjectData> = {}): ProjectData {
  return {
    fldPDataID: partial.fldPDataID ?? 'pd-1',
    fldPDataProject: partial.fldPDataProject ?? 'proj-1',
    fldFacility: partial.fldFacility ?? 'fac-1',
    fldData: '',
    fldLocation: 'loc-1',
    fldFindShort: '',
    fldFindLong: '',
    fldRecShort: '',
    fldRecLong: '',
    fldQTY: 1,
    fldImages: [],
    fldInspID: 'insp-1',
    fldTimestamp: '',
    ...partial,
  };
}

describe('filterReportProjectForPreview', () => {
  const project: Project = {
    fldProjID: 'proj-1',
    fldClient: 'client-1',
    fldDesigner: '',
    fldInspector: '',
    fldProjName: 'Project One',
    fldPDDate: '01/01/2026',
  };

  const facility: Facility = {
    fldFacID: 'fac-1',
    fldFacName: 'Facility One',
    fldClient: 'client-1',
  };

  const emptyGlossary: Glossary[] = [];
  const emptyCategories: Category[] = [];
  const emptyItems: Item[] = [];
  const emptyLocations: Location[] = [];
  const emptyFindings: Finding[] = [];

  it('keeps only records matching project and facility', () => {
    const projectData = [
      makeProjectData({ fldPDataID: 'match' }),
      makeProjectData({ fldPDataID: 'wrong-fac', fldFacility: 'fac-other' }),
      makeProjectData({ fldPDataID: 'wrong-proj', fldPDataProject: 'proj-other' }),
    ];

    const filtered = filterReportProjectForPreview(
      projectData,
      project,
      facility,
      emptyGlossary,
      emptyCategories,
      emptyItems,
      emptyLocations,
      emptyFindings
    );

    expect(filtered).toHaveLength(1);
    expect(filtered[0].fldPDataID).toBe('match');
  });

  it('dedupes by fldPDataID', () => {
    const duplicate = makeProjectData({ fldPDataID: 'dup' });
    const filtered = filterReportProjectForPreview(
      [duplicate, { ...duplicate }],
      project,
      facility,
      emptyGlossary,
      emptyCategories,
      emptyItems,
      emptyLocations,
      emptyFindings
    );
    expect(filtered).toHaveLength(1);
  });
});

type TestPhoto = { locationLabel: string; id: number };

function makePhotos(locationLabel: string, count: number, startId = 1): TestPhoto[] {
  return Array.from({ length: count }, (_, i) => ({
    locationLabel,
    id: startId + i,
  }));
}

function rowSizes(pages: PhotoAddendumPageLocationGroup<TestPhoto>[][]) {
  return pages.map((page) =>
    page.map((group) => ({
      locationLabel: group.locationLabel,
      rows: group.photoRows.map((row) => row.length),
    }))
  );
}

function assertNoOrphanHeadings(pages: PhotoAddendumPageLocationGroup<TestPhoto>[][]) {
  for (const page of pages) {
    for (const group of page) {
      expect(group.photoRows.length).toBeGreaterThan(0);
      expect(group.photoRows[0].length).toBeGreaterThan(0);
    }
  }
}

describe('paginatePhotoAddendumByRows', () => {
  const title = PHOTO_ADDENDUM_FIRST_PAGE_TITLE_COST_PX;
  const heading = PHOTO_ADDENDUM_LOCATION_HEADING_COST_PX;
  const row = PHOTO_ADDENDUM_ROW_COST_PX;
  const rowGap = PHOTO_ADDENDUM_ROW_GAP_PX;
  const groupGap = PHOTO_ADDENDUM_GROUP_GAP_PX;
  const budget = PHOTO_ADDENDUM_PAGE_BUDGET_PX;
  const startUnit = heading + row;
  const extraRow = rowGap + row;

  it('uses a conservative 660px budget below the 696px inner content box', () => {
    expect(budget).toBe(660);
    expect(title + startUnit + extraRow * 2).toBeLessThanOrEqual(budget);
  });

  it('packs 1 image as 1 short row on 1 page', () => {
    const pages = paginatePhotoAddendumByRows(makePhotos('A', 1));
    expect(rowSizes(pages)).toEqual([[{ locationLabel: 'A', rows: [1] }]]);
    expect(pages).toHaveLength(1);
    assertNoOrphanHeadings(pages);
  });

  it('packs 3 images as 1 short row on 1 page', () => {
    const pages = paginatePhotoAddendumByRows(makePhotos('A', 3));
    expect(rowSizes(pages)).toEqual([[{ locationLabel: 'A', rows: [3] }]]);
    assertNoOrphanHeadings(pages);
  });

  it('packs 4 images as 1 full row on 1 page', () => {
    const pages = paginatePhotoAddendumByRows(makePhotos('A', 4));
    expect(rowSizes(pages)).toEqual([[{ locationLabel: 'A', rows: [4] }]]);
    assertNoOrphanHeadings(pages);
  });

  it('packs 5 images as 4 + 1 on the same page when the page starts empty', () => {
    const pages = paginatePhotoAddendumByRows(makePhotos('A', 5));
    expect(rowSizes(pages)).toEqual([[{ locationLabel: 'A', rows: [4, 1] }]]);
    assertNoOrphanHeadings(pages);
  });

  it('packs 7 images as 4 + 3 on the same page when the page starts empty', () => {
    const pages = paginatePhotoAddendumByRows(makePhotos('A', 7));
    expect(rowSizes(pages)).toEqual([[{ locationLabel: 'A', rows: [4, 3] }]]);
    assertNoOrphanHeadings(pages);
  });

  it('packs 8 images as 4 + 4 on the same page when the page starts empty', () => {
    const pages = paginatePhotoAddendumByRows(makePhotos('A', 8));
    expect(rowSizes(pages)).toEqual([[{ locationLabel: 'A', rows: [4, 4] }]]);
    assertNoOrphanHeadings(pages);
  });

  it('fits mixed 3 + 7 locations entirely on D1 under the height budget', () => {
    const photos = [...makePhotos('A', 3, 1), ...makePhotos('B', 7, 4)];
    const d1Cost = title + startUnit + groupGap + startUnit + extraRow;
    expect(d1Cost).toBeLessThanOrEqual(budget);
    const pages = paginatePhotoAddendumByRows(photos);
    expect(rowSizes(pages)).toEqual([
      [
        { locationLabel: 'A', rows: [3] },
        { locationLabel: 'B', rows: [4, 3] },
      ],
    ]);
    assertNoOrphanHeadings(pages);
  });

  it('never splits a 7-photo location into 4+1 then 2', () => {
    const photos = [...makePhotos('A', 3, 1), ...makePhotos('B', 7, 4)];
    const pages = paginatePhotoAddendumByRows(photos);
    const locationBRows = pages.flatMap((page) =>
      page.filter((g) => g.locationLabel === 'B').flatMap((g) => g.photoRows.map((r) => r.length))
    );
    expect(locationBRows).toEqual([4, 3]);
    expect(locationBRows).not.toEqual([4, 1, 2]);
  });

  it('packs the 3 + 9 manual case as two B rows on D1 and the leftover [1] on D2', () => {
    const photos = [...makePhotos("MEN'S TOILET ROOM", 3, 1), ...makePhotos("WOMEN'S TOILET ROOM", 9, 4)];
    const twoBRows =
      title + startUnit + groupGap + startUnit + extraRow;
    const threeBRows = twoBRows + extraRow;
    expect(twoBRows).toBeLessThanOrEqual(budget);
    expect(threeBRows).toBeGreaterThan(budget);

    const pages = paginatePhotoAddendumByRows(photos);
    expect(rowSizes(pages)).toEqual([
      [
        { locationLabel: "MEN'S TOILET ROOM", rows: [3] },
        { locationLabel: "WOMEN'S TOILET ROOM", rows: [4, 4] },
      ],
      [{ locationLabel: "WOMEN'S TOILET ROOM", rows: [1] }],
    ]);
    expect(pages[1][0].photoRows[0].map((p) => p.id)).toEqual([12]);
    assertNoOrphanHeadings(pages);
  });

  it('fits 12 photos of one location as three full rows on D1', () => {
    const threeRows = title + startUnit + extraRow * 2;
    expect(threeRows).toBeLessThanOrEqual(budget);
    const pages = paginatePhotoAddendumByRows(makePhotos('A', 12));
    expect(rowSizes(pages)).toEqual([[{ locationLabel: 'A', rows: [4, 4, 4] }]]);
    expect(pages).toHaveLength(1);
    assertNoOrphanHeadings(pages);
  });

  it('keeps 16 photos of one location to three D1 rows and repeats the heading for the fourth', () => {
    const fourRows = title + startUnit + extraRow * 3;
    expect(fourRows).toBeGreaterThan(budget);
    const pages = paginatePhotoAddendumByRows(makePhotos('A', 16));
    expect(rowSizes(pages)).toEqual([
      [{ locationLabel: 'A', rows: [4, 4, 4] }],
      [{ locationLabel: 'A', rows: [4] }],
    ]);
    assertNoOrphanHeadings(pages);
  });

  it('fits three one-row locations with headings on D1', () => {
    const threeGroups = title + startUnit + groupGap + startUnit + groupGap + startUnit;
    expect(threeGroups).toBeLessThanOrEqual(budget);
    const photos = [...makePhotos('A', 3, 1), ...makePhotos('B', 2, 4), ...makePhotos('C', 4, 6)];
    const pages = paginatePhotoAddendumByRows(photos);
    expect(rowSizes(pages)).toEqual([
      [
        { locationLabel: 'A', rows: [3] },
        { locationLabel: 'B', rows: [2] },
        { locationLabel: 'C', rows: [4] },
      ],
    ]);
    assertNoOrphanHeadings(pages);
  });

  it('lets a continuation page hold more rows than D1 because it does not pay the title cost', () => {
    const d1FourRows = title + startUnit + extraRow * 3;
    const continuationFourRows = startUnit + extraRow * 3;
    expect(d1FourRows).toBeGreaterThan(budget);
    expect(continuationFourRows).toBeLessThanOrEqual(budget);

    const pages = paginatePhotoAddendumByRows(makePhotos('A', 28));
    expect(rowSizes(pages)).toEqual([
      [{ locationLabel: 'A', rows: [4, 4, 4] }],
      [{ locationLabel: 'A', rows: [4, 4, 4, 4] }],
    ]);
    assertNoOrphanHeadings(pages);
  });

  it('moves a whole row that does not fit to the next page and repeats the heading', () => {
    const photos = [...makePhotos('A', 4, 1), ...makePhotos('B', 9, 5)];
    const pages = paginatePhotoAddendumByRows(photos);
    const lastBOnD1 = pages[0].find((g) => g.locationLabel === 'B');
    expect(lastBOnD1?.photoRows.map((r) => r.length)).toEqual([4, 4]);
    expect(pages[1][0].locationLabel).toBe('B');
    expect(pages[1][0].photoRows.map((r) => r.length)).toEqual([1]);
    expect(pages[1][0].photoRows[0].map((p) => p.id)).toEqual([13]);
    assertNoOrphanHeadings(pages);
  });

  it('never emits a location heading without its first photo row', () => {
    const photos = [
      ...makePhotos('A', 3, 1),
      ...makePhotos('B', 9, 4),
      ...makePhotos('C', 5, 13),
    ];
    const pages = paginatePhotoAddendumByRows(photos);
    assertNoOrphanHeadings(pages);
    for (const page of pages) {
      expect(page.every((group) => group.photoRows[0].length >= 1)).toBe(true);
    }
  });
});
