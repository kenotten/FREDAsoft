import React, { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { Card } from '../ui/core';
import type {
  WebReportPhotoAddendumView,
  WebReportPhotoItem,
  WebReportPhotoMidSection,
  WebReportPhotoTopSection
} from '../../lib/webReportPhotoAddendum';

function SectionCollapseToggle({
  expanded,
  onToggle,
  label,
  subtitle
}: {
  expanded: boolean;
  onToggle: () => void;
  label: string;
  subtitle?: string;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="flex w-full items-center gap-2 rounded-lg py-2 text-left transition-colors hover:bg-zinc-100"
    >
      {expanded ? (
        <ChevronDown size={16} className="shrink-0 text-zinc-500" />
      ) : (
        <ChevronRight size={16} className="shrink-0 text-zinc-500" />
      )}
      <span className="truncate text-sm font-bold uppercase tracking-wide text-zinc-900">{label}</span>
      {subtitle ? (
        <span className="ml-auto shrink-0 text-[10px] font-medium text-zinc-400">{subtitle}</span>
      ) : null}
    </button>
  );
}

function PhotoCard({ photo }: { photo: WebReportPhotoItem }) {
  const [broken, setBroken] = useState(false);
  const title = [
    photo.reportNumber !== null ? `Record ${photo.reportNumber}` : null,
    photo.locationName,
    photo.categoryName,
    photo.itemName,
    photo.findingShort,
    photo.recommendationShort ? `Rec: ${photo.recommendationShort}` : null,
    `Photo ${photo.imageIndex + 1}`
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <figure className="flex min-w-0 flex-col overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm">
      <div className="aspect-[4/3] max-h-56 w-full overflow-hidden bg-zinc-100">
        {broken ? (
          <div className="flex h-full min-h-[8rem] items-center justify-center px-2 text-center">
            <span className="text-[11px] leading-snug text-zinc-500">Image unavailable</span>
          </div>
        ) : (
          <img
            src={photo.url}
            alt=""
            className="h-full w-full object-cover"
            referrerPolicy="no-referrer"
            loading="lazy"
            onError={() => setBroken(true)}
          />
        )}
      </div>
      <figcaption className="space-y-0.5 border-t border-zinc-100 px-2 py-2 text-[10px] leading-snug text-zinc-700">
        <p className="font-semibold text-zinc-900" title={title}>
          {photo.reportNumber !== null ? (
            <span className="font-mono text-[10px] text-indigo-800">#{photo.reportNumber}</span>
          ) : (
            <span className="text-zinc-400">—</span>
          )}
          {photo.reportNumber !== null ? ' · ' : ''}
          <span className="text-zinc-600">Img {photo.imageIndex + 1}</span>
        </p>
        <p className="line-clamp-2" title={`${photo.categoryName} / ${photo.itemName}`}>
          <span className="font-medium">{photo.categoryName}</span>
          <span className="text-zinc-500"> · </span>
          <span>{photo.itemName}</span>
        </p>
        <p className="line-clamp-2 text-zinc-600" title={photo.locationName}>
          {photo.locationName}
        </p>
        {(photo.findingShort || photo.recommendationShort) && (
          <p className="line-clamp-2 text-zinc-500" title={[photo.findingShort, photo.recommendationShort].filter(Boolean).join(' — ')}>
            {photo.findingShort}
            {photo.findingShort && photo.recommendationShort ? ' — ' : ''}
            {photo.recommendationShort}
          </p>
        )}
      </figcaption>
    </figure>
  );
}

function PhotoGrid({ photos }: { photos: WebReportPhotoItem[] }) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {photos.map((photo) => (
        <PhotoCard key={photo.key} photo={photo} />
      ))}
    </div>
  );
}

function MidSectionBlock({ section }: { section: WebReportPhotoMidSection }) {
  if (section.photos.length === 0) return null;
  return (
    <div className="space-y-2">
      <h4 className="text-xs font-bold uppercase tracking-wide text-zinc-600">{section.label}</h4>
      <PhotoGrid photos={section.photos} />
    </div>
  );
}

function TopSectionBlock({ section }: { section: WebReportPhotoTopSection }) {
  const flatPhotos =
    section.midSections.length > 0
      ? section.midSections.flatMap((m) => m.photos)
      : [];

  return (
    <section className="space-y-4">
      <h3 className="border-b border-zinc-300 pb-1 text-sm font-bold uppercase tracking-wide text-zinc-800">
        {section.label}
        <span className="ml-2 font-normal normal-case tracking-normal text-zinc-500">
          ({section.photoCount} photo{section.photoCount === 1 ? '' : 's'})
        </span>
      </h3>
      {section.midSections.length > 1 ? (
        <div className="space-y-5">
          {section.midSections.map((mid) => (
            <MidSectionBlock key={mid.key} section={mid} />
          ))}
        </div>
      ) : (
        <PhotoGrid photos={flatPhotos.length > 0 ? flatPhotos : section.midSections[0]?.photos ?? []} />
      )}
    </section>
  );
}

export type WebReportPhotoAddendumSectionProps = {
  view: WebReportPhotoAddendumView;
  expanded: boolean;
  onToggleExpanded: () => void;
  includedRecordCount: number;
  filtersRestricted: boolean;
};

export function WebReportPhotoAddendumSection({
  view,
  expanded,
  onToggleExpanded,
  includedRecordCount,
  filtersRestricted
}: WebReportPhotoAddendumSectionProps) {
  const subtitle = view.hasPhotos
    ? `${view.photoCount} photograph${view.photoCount === 1 ? '' : 's'}`
    : 'No photographs';

  return (
    <div className="space-y-3">
      <Card className="p-4">
        <SectionCollapseToggle
          label="Photo Addendum"
          subtitle={subtitle}
          expanded={expanded}
          onToggle={onToggleExpanded}
        />
        <p className="mt-2 border-t border-zinc-100 pt-2 text-xs leading-relaxed text-zinc-500">
          Additional photographs from included documentation records (images beyond the first two on each
          record card). Category, location, and item filters apply; documentation accordion collapse does
          not change which photos appear.
        </p>
      </Card>

      {expanded ? (
        !view.hasPhotos ? (
          <Card className="p-6 text-center">
            <p className="text-sm text-zinc-700">
              No additional photographs for the currently included records.
            </p>
            {includedRecordCount === 0 ? (
              <p className="mt-1 text-xs text-zinc-500">
                No records are included. Adjust filters or select a project/facility with documentation
                records.
              </p>
            ) : filtersRestricted ? (
              <p className="mt-1 text-xs text-zinc-500">
                Try selecting more categories, locations, or items — filtered records may not include
                supplemental photos.
              </p>
            ) : (
              <p className="mt-1 text-xs text-zinc-500">
                Included records have no supplemental photos (only the first two images per record appear on
                documentation cards).
              </p>
            )}
          </Card>
        ) : (
          <div className="space-y-8">
            {view.topSections.map((top) => (
              <TopSectionBlock key={top.key} section={top} />
            ))}
          </div>
        )
      ) : null}
    </div>
  );
}
