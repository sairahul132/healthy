import type { SVGProps } from "react";

export type IconName =
  | "home"
  | "reports"
  | "health"
  | "timeline"
  | "medicines"
  | "share"
  | "permissions"
  | "assistant"
  | "profile";

const PATHS: Record<IconName, string> = {
  home: "M3 10.5 12 3l9 7.5M5 9.5V20a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V9.5",
  reports: "M7 3h7l4 4v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Zm7 0v4h4M9 12h6M9 15.5h6M9 8.5h2",
  health: "M12 20s-7-4.3-9.5-8.9C.8 7.8 2.3 4.5 5.6 4A4.6 4.6 0 0 1 12 6.5 4.6 4.6 0 0 1 18.4 4c3.3.5 4.8 3.8 3.1 7.1C19 15.7 12 20 12 20Z",
  timeline: "M12 7v5l3.5 2M21 12a9 9 0 1 1-9-9",
  medicines: "M6.5 14.5 14.5 6.5a4 4 0 0 1 5.7 5.7l-8 8a4 4 0 0 1-5.7-5.7Zm4-4 5.7 5.7",
  share: "M18 8a3 3 0 1 0-2.8-4H15a3 3 0 0 0 .2 1.1l-6.4 3.7a3 3 0 1 0 0 4.4l6.4 3.7a3 3 0 1 0 .8-1.7l-6.4-3.7a3 3 0 0 0 0-1.4l6.4-3.7c.4.4.9.6 1.4.6Z",
  permissions: "M12 3 4.5 6v6c0 4.6 3.2 8.4 7.5 9 4.3-.6 7.5-4.4 7.5-9V6L12 3Zm-2.5 9 2 2 4-4",
  assistant: "M4 5h16v11H8l-4 4V5Zm4 4h8M8 12.5h5",
  profile: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-7 8a7 7 0 0 1 14 0",
};

export function Icon({ name, ...props }: { name: IconName } & SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={20}
      height={20}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <path d={PATHS[name]} />
    </svg>
  );
}
