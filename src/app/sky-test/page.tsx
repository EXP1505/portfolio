import type { Metadata } from "next";
import { SkyTest } from "@/components/sky-test/SkyTest";

// EXPERIMENT: open-sky alternative to the hangar hero. Not linked from the site.
export const metadata: Metadata = { title: "Sky test", robots: { index: false, follow: false } };

export default function SkyTestPage() {
  return <SkyTest />;
}
