import type { Metadata } from "next";
import { SettingsView } from "@/components/workspace/settings-view";

export const metadata: Metadata = { title: "Settings · ToughBubble" };

export default function SettingsPage() {
  return <SettingsView />;
}
