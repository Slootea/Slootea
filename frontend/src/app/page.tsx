import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Calendar, 
  Clock, 
  Link2, 
  CheckCircle2, 
  ShieldCheck, 
  ArrowRight,
  TrendingUp,
  Users
} from "lucide-react";

export default async function HomePage() {
  const session = await auth();
  const userId = session.userId;

  if (userId) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Image 
              src="/Slootea_logo.png" 
              alt="Slootea Logo" 
              width={32}
              height={32}
              className="h-8 w-8"
            />
            <span className="text-xl font-bold tracking-tight">Slootea</span>
          </div>
          <div className="flex items-center space-x-4">
            <Link href="/sign-in">
              <Button variant="ghost" className="text-sm font-medium">Log In</Button>
            </Link>
            <Link href="/sign-up">
              <Button size="sm" className="font-medium">Get Started</Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative py-20 lg:py-32 overflow-hidden">
          <div className="container px-4 mx-auto relative z-10">
            <div className="max-w-4xl mx-auto text-center">
              <Badge variant="secondary" className="mb-6 px-4 py-1.5 text-sm font-normal rounded-full">
                <span className="flex h-2 w-2 rounded-full bg-primary mr-2"></span>
                Now available for free public beta
              </Badge>
              <h1 className="text-5xl font-extrabold tracking-tight sm:text-7xl mb-6 bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                Recover Lost Revenue From <br className="hidden sm:inline" /> 
                <span className="text-primary">Empty Appointments</span>
              </h1>
              <p className="mt-6 text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
                Automate your booking workflow. Eliminate no-shows with smart confirmations 
                and instantly refill cancelled slots without lifting a finger.
              </p>
              <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link href="/sign-up" className="w-full sm:w-auto">
                  <Button size="lg" className="w-full sm:w-auto text-lg h-12 px-8">
                    Start Recovering Revenue
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>

              </div>
              
              {/* Trust indicators */}
              <div className="mt-12 flex items-center justify-center space-x-8 text-muted-foreground/60">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4" /> No credit card required
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4" /> 14-day free trial
                </div>
              </div>
            </div>
          </div>
          
          {/* Background decoration */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] opacity-10 bg-primary rounded-full blur-[100px] pointer-events-none" />
        </section>

        {/* Stats Section */}
        <section className="border-y bg-muted/30">
          <div className="container px-4 py-12 mx-auto">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              <StatItem value="30%" label="Reduction in No-Shows" />
              <StatItem value="24/7" label="Automated Booking" />
              <StatItem value="10min" label="Setup Time" />
              <StatItem value="100%" label="Slot Recovery Rate" />
            </div>
          </div>
        </section>

        {/* Features Grid */}
        <section className="py-24 bg-background">
          <div className="container px-4 mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl mb-4">Everything you need to run smoothly</h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Powerful features designed to help service-based businesses maximize their efficiency and revenue.
              </p>
            </div>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              <FeatureCard 
                icon={<Link2 className="h-6 w-6" />}
                title="Smart Booking Links"
                description="Create custom booking links for specific services or general availability. Share them anywhere."
              />
              <FeatureCard 
                icon={<Calendar className="h-6 w-6" />}
                title="Dynamic Availability"
                description="Set your working hours and blocking rules. The system automatically manages your calendar."
              />
              <FeatureCard 
                icon={<Clock className="h-6 w-6" />}
                title="Pre-Appointment Confirmations"
                description="Automatically send confirmation requests. If they don't confirm, the slot opens up for others."
              />
              <FeatureCard 
                icon={<TrendingUp className="h-6 w-6" />}
                title="Revenue Recovery"
                description="Waitlists and instant notifications help you fill last-minute cancellations immediately."
              />
              <FeatureCard 
                icon={<Users className="h-6 w-6" />}
                title="Client Management"
                description="Keep track of client history, preferences, and reliability scores all in one place."
              />
              <FeatureCard 
                icon={<ShieldCheck className="h-6 w-6" />}
                title="Secure & Reliable"
                description="Enterprise-grade security keeps your data safe while assuming 99.9% uptime."
              />
            </div>
          </div>
        </section>

        {/* CTR Section */}
        <section className="py-24 bg-muted/50">
          <div className="container px-4 mx-auto text-center">
            <div className="max-w-3xl mx-auto">
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl mb-6">Ready to optimize your schedule?</h2>
              <p className="text-xl text-muted-foreground mb-8">
                Join thousands of professionals who have automated their booking workflow.
              </p>
              <Link href="/sign-up">
                <Button size="lg" className="text-lg h-12 px-8">
                  Get Started for Free
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t bg-background">
        <div className="container px-4 py-8 mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center space-x-2">
            <Image 
              src="/Slootea_logo.png" 
              alt="Slootea Logo" 
              width={24}
              height={24}
              className="h-6 w-6 grayscale opacity-80"
            />
            <span className="text-sm font-semibold text-muted-foreground">Slootea</span>
          </div>
          <div className="text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} Slootea. All rights reserved.
          </div>
          <div className="flex gap-6 text-sm text-muted-foreground">
            <Link href="#" className="hover:text-foreground">Privacy</Link>
            <Link href="#" className="hover:text-foreground">Terms</Link>
            <Link href="#" className="hover:text-foreground">Contact</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

function StatItem({ value, label }: { value: string; label: string }) {
  return (
    <div className="text-center">
      <div className="text-3xl font-bold bg-primary/10 text-primary py-1 px-3 rounded-lg inline-block mb-2">
        {value}
      </div>
      <div className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
        {label}
      </div>
    </div>
  );
}

function FeatureCard({ 
  icon, 
  title, 
  description 
}: { 
  icon: React.ReactNode; 
  title: string; 
  description: string; 
}) {
  return (
    <Card className="border-none shadow-none bg-muted/30 hover:bg-muted/50 transition-colors">
      <CardHeader>
        <div className="h-12 w-12 bg-background rounded-xl flex items-center justify-center mb-4 shadow-sm text-primary">
          {icon}
        </div>
        <CardTitle className="text-xl">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground leading-relaxed">
          {description}
        </p>
      </CardContent>
    </Card>
  );
}
