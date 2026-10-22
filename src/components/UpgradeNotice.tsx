import { UpgradeContact } from "./UpgradeContact";

export function UpgradeNotice({ message, upgrade }: { message: string; upgrade: boolean }) {
  return (
    <div role="alert" className="rounded-row border border-notice-border bg-notice px-4 py-3 text-sm text-notice-ink">
      <p>{message}</p>
      {upgrade && <UpgradeContact className="mt-1" />}
    </div>
  );
}
