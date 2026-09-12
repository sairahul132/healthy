"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils/cn";

const SCENE_META = [
  {
    src: "/characters/ui.png",
    alt: "A patient wrapped in a blanket using a laptop, a doctor pointing at the screen, and a golden retriever asleep beside them, in a warm living room",
  },
  {
    src: "/characters/ui1.png",
    alt: "A patient wrapped in a blanket holding a mug, a doctor with a hand on his shoulder, and their two dogs, together in the same warm living room",
  },
];

/** Slow crossfade between the two composed hero scenes: both images
 * animate at once (the outgoing one fading out while the incoming one
 * fades in), so there's no gap where neither is visible — a sequential
 * fade-out-then-fade-in was tried first and looked wrong, leaving a
 * blank pause on the panel's solid color in between. No dots or other
 * chrome, since this is ambient background art behind the headline, not
 * a thing to interact with. Holds on the first scene under
 * prefers-reduced-motion.
 *
 * Both images load with `priority` (eagerly, not lazily): the second one
 * isn't visible at first, but the crossfade is timer-driven, not
 * scroll/visibility-driven — if it lazy-loads, the opacity transition can
 * start playing before the image has finished loading, which looks like a
 * blink to nothing rather than a fade to the next scene.
 *
 * `versions` is each file's mtime, read server-side by PremiumAuthShell and
 * appended as a `?v=` query param — these files have been swapped for new
 * content (same path, new bytes) several times, and Next's image optimizer
 * sends long, content-addressed-style cache headers assuming a URL's bytes
 * never change. Without a version param tied to the actual file, browsers
 * that already cached the old `/_next/image?url=...` response keep serving
 * it after a swap, even past a hard refresh in some cases. */
export function HeroSceneCarousel({ versions }: { versions: [number, number] }) {
  const SCENES = SCENE_META.map((scene, i) => ({
    ...scene,
    src: `${scene.src}?v=${versions[i]}`,
  }));

  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }
    const timer = window.setInterval(() => setIndex((i) => (i + 1) % SCENE_META.length), 5000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <>
      {SCENES.map((scene, i) => (
        <Image
          key={scene.src}
          src={scene.src}
          alt={scene.alt}
          fill
          sizes="(min-width: 1024px) 64vw, 100vw"
          className={cn(
            "object-cover object-center transition-opacity duration-[1800ms] ease-in-out",
            i === index ? "opacity-100" : "opacity-0",
          )}
          priority
        />
      ))}
    </>
  );
}
