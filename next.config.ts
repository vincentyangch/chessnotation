import type { NextConfig } from "next";
import { execSync } from "child_process";

function getGitVersion(): string {
  try {
    return execSync("git describe --tags --always").toString().trim();
  } catch {
    return "unknown";
  }
}

const nextConfig: NextConfig = {
  reactStrictMode: false,
  env: {
    NEXT_PUBLIC_APP_VERSION: getGitVersion(),
  },
};

export default nextConfig;
