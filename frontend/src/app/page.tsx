import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Calendar, Clock, Link2, CheckCircle } from "lucide-react";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-muted/50 to-background">
      {/* Header */}
      <header className="container mx-auto px-4 py-6">
        <nav className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Calendar className="h-8 w-8 text-primary" />
            <span className="text-xl font-bold">AppointmentApp</span>
          </div>
          <div className="flex items-center space-x-4">
            <Link href="/sign-in">
              <Button variant="ghost">Sign In</Button>
            </Link>
            <Separator orientation="vertical" className="h-6" />
            <Link href="/sign-up">
              <Button>Get Started</Button>
            </Link>
          </div>
        </nav>
      </header>

      {/* Hero */}
      <main className="container mx-auto px-4 py-20">
        <div className="text-center max-w-3xl mx-auto">
          <h1 className="text-5xl font-bold tracking-tight text-foreground sm:text-6xl">
            Recover Empty Appointment Slots
          </h1>
          <p className="mt-6 text-xl text-muted-foreground">
            Stop losing revenue to no-shows and empty slots. Share booking links,
            manage availability, and get confirmations before appointments.
          </p>
          <div className="mt-10 flex items-center justify-center gap-x-6">
            <Link href="/sign-up">
              <Button size="lg" className="text-lg px-8 py-6">
                Start Free Trial
              </Button>
            </Link>
            <Link href="/sign-in">
              <Button variant="outline" size="lg" className="text-lg px-8 py-6">
                Sign In
              </Button>
            </Link>
          </div>
        </div>

        {/* Features */}
        <div className="mt-32 grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          <FeatureCard
            icon={<Link2 className="h-8 w-8 text-primary" />}
            title="Shareable Links"
            description="Generate unique booking links for all services or specific options"
          />
          <FeatureCard
            icon={<Calendar className="h-8 w-8 text-primary" />}
            title="Smart Scheduling"
            description="Define availability, block times, and let clients book open slots"
          />
          <FeatureCard
            icon={<Clock className="h-8 w-8 text-primary" />}
            title="Auto Reminders"
            description="Send confirmation requests before appointments to reduce no-shows"
          />
          <FeatureCard
            icon={<CheckCircle className="h-8 w-8 text-primary" />}
            title="Slot Recovery"
            description="Auto-cancel unconfirmed appointments and free up slots for others"
          />
        </div>
      </main>

      {/* Footer */}
      <footer className="container mx-auto px-4 mt-20">
        <Separator />
        <div className="py-12 text-center text-muted-foreground">
          <p>&copy; 2026 AppointmentApp. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <Card className="text-center">
      <CardHeader>
        <div className="flex justify-center mb-2">{icon}</div>
        <CardTitle className="text-lg">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <CardDescription>{description}</CardDescription>
      </CardContent>
    </Card>
  );
}
