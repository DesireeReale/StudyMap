import { SUPPORT_EMAIL } from "@/core/feedback";

export function UpgradeContact({ className = "" }: { className?: string }) {
  return (
    <p className={className}>
      Per passare a Pro scrivi a{" "}
      <a href={`mailto:${SUPPORT_EMAIL}`} className="font-bold underline">
        {SUPPORT_EMAIL}
      </a>
      .
    </p>
  );
}
