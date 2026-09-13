import type { ComponentType, SVGProps } from "react";
import {
  Allergies,
  AutoimmuneDisease,
  BloodDrop,
  Diabetes,
  Dna,
  HeartOrgan,
  Kidneys,
  LiverAlt,
  Pills2,
  Ribbon,
  Thyroid,
  UrineSample,
  VirusAlt,
  Xray,
} from "healthicons-react/outline";
import type { HealthCategoryId } from "@/lib/api/types";
import { cn } from "@/lib/utils/cn";

type IconComponent = ComponentType<SVGProps<SVGSVGElement>>;

/** Real Health Icons (healthicons.org, MIT) per category — literal organs
 * where one exists (heart, liver, kidneys, thyroid) rather than abstract
 * glyphs, so this reads as a clinical icon set, not placeholder art. */
const ICONS: Record<HealthCategoryId, IconComponent> = {
  blood: BloodDrop,
  heart: HeartOrgan,
  liver: LiverAlt,
  kidney: Kidneys,
  thyroid: Thyroid,
  diabetes: Diabetes,
  vitamins: Pills2,
  urine: UrineSample,
  hormones: Dna,
  infection: VirusAlt,
  allergy: Allergies,
  autoimmune: AutoimmuneDisease,
  imaging: Xray,
  tumor_markers: Ribbon,
  other: DocumentGlyph,
};

/** No literal "other/misc document" organ exists in Health Icons — a
 * filled glyph in the same visual weight as the rest of the set, rather
 * than falling back to a thin stroked icon that would look inconsistent
 * next to it. */
function DocumentGlyph(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path d="M6 2a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6H6Zm7 1.5L18.5 9H14a1 1 0 0 1-1-1V3.5ZM8 13h8v1.5H8V13Zm0 3.5h8V18H8v-1.5Z" />
    </svg>
  );
}

export function CategoryIcon({
  id,
  className,
}: {
  id: HealthCategoryId;
  className?: string;
}) {
  const Icon = ICONS[id];
  return <Icon aria-hidden="true" width={16} height={16} className={cn("shrink-0", className)} />;
}
