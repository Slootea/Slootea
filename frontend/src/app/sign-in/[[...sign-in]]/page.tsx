import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="relative">
        <div className="absolute -inset-8 bg-gradient-to-r from-primary/10 via-primary/5 to-primary/10 rounded-3xl blur-2xl opacity-60" />
        <div className="relative">
          <SignIn afterSignInUrl="/dashboard" signUpUrl="/sign-up" />
        </div>
      </div>
    </div>
  );
}
