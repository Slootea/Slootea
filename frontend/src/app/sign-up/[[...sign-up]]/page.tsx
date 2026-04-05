import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="relative">
        <div className="absolute -inset-8 bg-gradient-to-r from-primary/10 via-primary/5 to-primary/10 rounded-3xl blur-2xl opacity-60" />
        <div className="relative">
          <SignUp afterSignUpUrl="/dashboard" signInUrl="/sign-in" />
        </div>
      </div>
    </div>
  );
}
