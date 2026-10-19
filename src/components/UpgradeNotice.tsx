import Link from "next/link";

export function UpgradeNotice({ message, upgrade }: { message: string; upgrade: boolean }) {
  return (
    <div role="alert" className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-amber-950">
      <p>{message}</p>
      {upgrade && (
        <p className="mt-2">
          <Link href="/settings#piano" className="font-bold underline">
            Scopri il piano Pro
          </Link>
        </p>
      )}
    </div>
  );
}
