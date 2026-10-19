"use client";

import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/browser";

export function SignOutButton() {
  const router = useRouter();
  return (
    <button
      type="button"
      className="text-sm underline"
      onClick={async () => {
        await supabaseBrowser().auth.signOut();
        router.push("/");
        router.refresh();
      }}
    >
      Esci
    </button>
  );
}
