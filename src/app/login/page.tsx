import type { Metadata } from "next";
import Link from "next/link";
import { BrandMark } from "@/components/icons";
import { LoginForm } from "@/components/LoginForm";

export const metadata: Metadata = { title: "Accedi" };

export default function LoginPage() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-sheet px-4 py-16">
      <div className="flex w-full max-w-sm flex-col gap-6">
        <Link href="/" className="flex items-center gap-2 self-start text-[17px] font-bold">
          <BrandMark size={28} />
          StudyMap
        </Link>
        <h1 className="text-[28px] leading-tight font-bold">Accedi per studiare</h1>
        <LoginForm />
        <p className="text-sm text-muted">
          Come trattiamo i tuoi dati:{" "}
          <Link href="/privacy" className="font-bold text-accent hover:underline">
            informativa privacy
          </Link>
          .
        </p>
      </div>
    </main>
  );
}
