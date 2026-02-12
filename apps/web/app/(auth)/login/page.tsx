import { AuthForm } from "@/components/auth-form";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4">
      <h1 className="text-3xl font-bold mb-8">Sign In</h1>
      <AuthForm mode="login" />
    </main>
  );
}
