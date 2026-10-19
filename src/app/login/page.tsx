import type { Metadata } from "next";
import { LoginForm } from "@/components/LoginForm";

export const metadata: Metadata = { title: "Accedi" };

export default function LoginPage() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-6 py-16">
      <h1 className="mb-6 text-3xl font-bold">Accedi a StudyMap</h1>
      <LoginForm />
    </main>
  );
}
