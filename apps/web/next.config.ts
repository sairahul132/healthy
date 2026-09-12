import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // The hero carousel images (public/characters/) get a `?v=<mtime>`
    // cache-busting param so a file swap (same name, new bytes) always
    // gets a fresh URL instead of serving a browser's stale cached
    // optimized copy. next/image refuses local query strings by default
    // unless explicitly allowed here.
    // No `search` field: Next matches it by exact string equality (no
    // wildcards), and the whole point here is that the `?v=` value
    // changes on every file swap — omitting `search` skips that check
    // and allows any query string on a matching pathname.
    localPatterns: [{ pathname: "/characters/**" }],
  },
};

export default nextConfig;
