import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function LoginPage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (data.user) redirect("/clubs");

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-4 rounded-2xl border p-6">
        <h1 className="text-xl font-semibold">Fundaro</h1>
        <p className="text-sm text-muted-foreground">
          Enter your email. You’ll get a magic link to sign in.
        </p>

        <form action="/auth/sign-in" method="post" className="space-y-3">
          <input
            name="email"
            type="email"
            required
            placeholder="you@school.edu"
            className="w-full rounded-md border px-3 py-2"
          />
          <button
            type="submit"
            className="w-full rounded-md bg-black text-white py-2"
          >
            Send magic link
          </button>
        </form>
      </div>
    </div>
  );
}
