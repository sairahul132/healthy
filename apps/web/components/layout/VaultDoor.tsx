import { cn } from "@/lib/utils/cn";

/** Bank-vault-door graphic: rivets and tick marks around the rim, an
 * engraved seal-ring legend, and a turn-wheel hub at the center. Sizing is
 * entirely up to the caller's `className` (e.g. `w-56` on a phone up to
 * `w-[420px]` on desktop) — the viewBox scales proportionally, so this
 * works at any size from a panel decoration to a hero centerpiece.
 *
 * Ships with a one-time "arrival" animation (rings fade in, the hub turns
 * into place, badges — rendered by the caller — slide in) plus a
 * near-imperceptible continuous drift on the rivet/tick ring afterward.
 * All motion is defined in globals.css behind `prefers-reduced-motion:
 * no-preference`, so a reduced-motion viewer sees the fully-settled
 * graphic immediately with no missing content. `animated={false}` skips
 * the CSS animation classes entirely (e.g. for a tiny footer mark where
 * motion would just be noise). */
export function VaultDoor({
  className,
  showSeal = true,
  animated = true,
}: {
  className?: string;
  /** The engraved circular legend ("YOUR VAULT · PRIVATE BY DESIGN ·
   * ZERO TRUST ·") — fine detail that only reads at larger sizes, so
   * panel-scale usages turn it off. */
  showSeal?: boolean;
  animated?: boolean;
}) {
  const cls = (name: string) => (animated ? name : undefined);

  return (
    <svg viewBox="0 0 560 560" className={cn("block overflow-visible", className)} aria-hidden="true">
      <defs>
        <linearGradient id="vaultDoorGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#0e2c1e" />
          <stop offset="100%" stopColor="#081b12" />
        </linearGradient>
        <radialGradient id="vaultHubGrad" cx="38%" cy="32%" r="75%">
          <stop offset="0%" stopColor="#16412b" />
          <stop offset="100%" stopColor="#081b12" />
        </radialGradient>
      </defs>

      <g className={cls("vault-door-base")}>
        <circle cx="280" cy="280" r="270" fill="url(#vaultDoorGrad)" />
        <circle cx="280" cy="280" r="270" fill="none" stroke="#c79a45" strokeWidth="1.5" opacity="0.5" />
        <circle cx="280" cy="280" r="222" fill="none" stroke="#c79a45" strokeWidth="1" opacity="0.26" />
        <circle cx="280" cy="280" r="176" fill="none" stroke="#c79a45" strokeWidth="1" opacity="0.18" />
        <circle cx="280" cy="280" r="130" fill="none" stroke="#c79a45" strokeWidth="1" opacity="0.12" />
        <g stroke="#c79a45" strokeWidth="1" opacity="0.14">
          <line x1="379" y1="181" x2="425" y2="135" />
          <line x1="379" y1="379" x2="425" y2="425" />
          <line x1="181" y1="379" x2="135" y2="425" />
          <line x1="181" y1="181" x2="135" y2="135" />
        </g>
      </g>

      <g className={cls("vault-door-dial")}>
        <g fill="#c79a45" opacity="0.4">
          <circle cx="280" cy="30" r="3.2" />
          <circle cx="375.7" cy="49" r="3.2" />
          <circle cx="456.8" cy="103.2" r="3.2" />
          <circle cx="511" cy="184.3" r="3.2" />
          <circle cx="530" cy="280" r="3.2" />
          <circle cx="511" cy="375.7" r="3.2" />
          <circle cx="456.8" cy="456.8" r="3.2" />
          <circle cx="375.7" cy="511" r="3.2" />
          <circle cx="280" cy="530" r="3.2" />
          <circle cx="184.3" cy="511" r="3.2" />
          <circle cx="103.2" cy="456.8" r="3.2" />
          <circle cx="49" cy="375.7" r="3.2" />
          <circle cx="30" cy="280" r="3.2" />
          <circle cx="49" cy="184.3" r="3.2" />
          <circle cx="103.2" cy="103.2" r="3.2" />
          <circle cx="184.3" cy="49" r="3.2" />
        </g>
        <g stroke="#c79a45">
          <line x1="280" y1="42" x2="280" y2="18" strokeWidth="1.6" opacity="0.6" />
          <line x1="403" y1="67" x2="411" y2="53.1" strokeWidth="1" opacity="0.3" />
          <line x1="493" y1="157" x2="506.9" y2="149" strokeWidth="1" opacity="0.3" />
          <line x1="518" y1="280" x2="542" y2="280" strokeWidth="1.6" opacity="0.6" />
          <line x1="493" y1="403" x2="506.9" y2="411" strokeWidth="1" opacity="0.3" />
          <line x1="403" y1="493" x2="411" y2="506.9" strokeWidth="1" opacity="0.3" />
          <line x1="280" y1="518" x2="280" y2="542" strokeWidth="1.6" opacity="0.6" />
          <line x1="157" y1="493" x2="149" y2="506.9" strokeWidth="1" opacity="0.3" />
          <line x1="67" y1="403" x2="53.1" y2="411" strokeWidth="1" opacity="0.3" />
          <line x1="42" y1="280" x2="18" y2="280" strokeWidth="1.6" opacity="0.6" />
          <line x1="67" y1="157" x2="53.1" y2="149" strokeWidth="1" opacity="0.3" />
          <line x1="157" y1="67" x2="149" y2="53.1" strokeWidth="1" opacity="0.3" />
        </g>
      </g>

      {showSeal ? (
        <g className={cls("vault-door-seal")}>
          <path id="vaultDoorRing" d="M162,280 a118,118 0 1,1 236,0 a118,118 0 1,1 -236,0" fill="none" />
          <circle cx="280" cy="280" r="118" fill="none" stroke="#c79a45" strokeWidth="1" opacity="0.22" />
          <text fontFamily="var(--font-sans), Arial, sans-serif" fontSize="10.5" letterSpacing="3" fill="#c79a45" opacity="0.75">
            <textPath href="#vaultDoorRing" startOffset="2%">
              YOUR VAULT &#160;&#183;&#160; PRIVATE BY DESIGN &#160;&#183;&#160; ZERO TRUST &#160;&#183;&#160;
            </textPath>
          </text>
        </g>
      ) : null}

      <g className={cls("vault-door-hub")}>
        <g stroke="#c79a45" strokeWidth="3" strokeLinecap="round" opacity="0.55">
          <line x1="280" y1="222" x2="280" y2="176" />
          <line x1="330.2" y1="251" x2="370.1" y2="228" />
          <line x1="330.2" y1="309" x2="370.1" y2="332" />
          <line x1="280" y1="338" x2="280" y2="384" />
          <line x1="229.8" y1="309" x2="189.9" y2="332" />
          <line x1="229.8" y1="251" x2="189.9" y2="228" />
        </g>
        <g fill="#c79a45" opacity="0.85">
          <circle cx="280" cy="176" r="4.5" />
          <circle cx="370.1" cy="228" r="4.5" />
          <circle cx="370.1" cy="332" r="4.5" />
          <circle cx="280" cy="384" r="4.5" />
          <circle cx="189.9" cy="332" r="4.5" />
          <circle cx="189.9" cy="228" r="4.5" />
        </g>
        <circle cx="280" cy="280" r="60" fill="url(#vaultHubGrad)" stroke="#c79a45" strokeWidth="1.5" opacity="0.98" />
        <circle cx="280" cy="280" r="60" fill="none" stroke="#c79a45" strokeWidth="1" opacity="0.3" />
        <text
          x="280"
          y="290"
          textAnchor="middle"
          fontFamily="var(--font-display), Georgia, serif"
          fontSize="30"
          fontWeight="500"
          fill="#f5efdd"
        >
          H
        </text>
      </g>
    </svg>
  );
}
