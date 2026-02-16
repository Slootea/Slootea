import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Mail, Clock, Shield, CheckCircle2 } from "lucide-react";

export const metadata = {
  title: "Data Deletion - Slootea",
  description: "Request deletion of your personal data from Slootea",
};

export default function DataDeletionPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center space-x-2">
            <Image
              src="/Slootea_logo.png"
              alt="Slootea Logo"
              width={32}
              height={32}
              className="h-8 w-8"
            />
            <span className="text-xl font-bold tracking-tight">Slootea</span>
          </Link>
          <Link href="/">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Home
            </Button>
          </Link>
        </div>
      </header>

      <main className="flex-1 py-16">
        <div className="container px-4 mx-auto">
          <div className="max-w-3xl mx-auto">
            <h1 className="text-4xl font-bold tracking-tight mb-2">Data Deletion Request</h1>
            <p className="text-muted-foreground text-lg mb-8">
              We respect your right to control your personal data
            </p>

            {/* Main CTA Card */}
            <div className="bg-primary/5 border border-primary/20 rounded-xl p-8 mb-12">
              <div className="flex items-start gap-4">
                <div className="h-12 w-12 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Mail className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h2 className="text-2xl font-semibold mb-2">Request Data Deletion</h2>
                  <p className="text-muted-foreground mb-4">
                    To request deletion of your personal data, please send an email to:
                  </p>
                  <a
                    href="mailto:info@slootea.com?subject=Data%20Deletion%20Request"
                    className="inline-flex items-center gap-2 text-xl font-semibold text-primary hover:underline"
                  >
                    info@slootea.com
                  </a>
                </div>
              </div>
            </div>

            {/* Instructions */}
            <section className="mb-12">
              <h2 className="text-2xl font-semibold mb-6">How to Submit a Request</h2>
              <div className="space-y-4">
                <div className="flex gap-4 p-4 bg-muted/30 rounded-lg">
                  <div className="h-8 w-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center flex-shrink-0 text-sm font-semibold">
                    1
                  </div>
                  <div>
                    <h3 className="font-medium mb-1">Send an email</h3>
                    <p className="text-muted-foreground text-sm">
                      Email <strong>info@slootea.com</strong> with the subject line &quot;Data Deletion Request&quot;
                    </p>
                  </div>
                </div>

                <div className="flex gap-4 p-4 bg-muted/30 rounded-lg">
                  <div className="h-8 w-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center flex-shrink-0 text-sm font-semibold">
                    2
                  </div>
                  <div>
                    <h3 className="font-medium mb-1">Include your details</h3>
                    <p className="text-muted-foreground text-sm">
                      Provide the email address associated with your Slootea account to help us locate your data
                    </p>
                  </div>
                </div>

                <div className="flex gap-4 p-4 bg-muted/30 rounded-lg">
                  <div className="h-8 w-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center flex-shrink-0 text-sm font-semibold">
                    3
                  </div>
                  <div>
                    <h3 className="font-medium mb-1">Verification</h3>
                    <p className="text-muted-foreground text-sm">
                      We may contact you to verify your identity before processing the request
                    </p>
                  </div>
                </div>

                <div className="flex gap-4 p-4 bg-muted/30 rounded-lg">
                  <div className="h-8 w-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center flex-shrink-0 text-sm font-semibold">
                    4
                  </div>
                  <div>
                    <h3 className="font-medium mb-1">Confirmation</h3>
                    <p className="text-muted-foreground text-sm">
                      You will receive confirmation once your data has been deleted
                    </p>
                  </div>
                </div>
              </div>
            </section>

            {/* What gets deleted */}
            <section className="mb-12">
              <h2 className="text-2xl font-semibold mb-6">What Data Will Be Deleted</h2>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="p-4 border rounded-lg">
                  <h3 className="font-medium mb-3 flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                    Account Information
                  </h3>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Name and contact details</li>
                    <li>• Email address</li>
                    <li>• Phone number</li>
                    <li>• Profile information</li>
                  </ul>
                </div>

                <div className="p-4 border rounded-lg">
                  <h3 className="font-medium mb-3 flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                    Booking Data
                  </h3>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Appointment history</li>
                    <li>• Service preferences</li>
                    <li>• Booking records</li>
                    <li>• Communication history</li>
                  </ul>
                </div>

                <div className="p-4 border rounded-lg">
                  <h3 className="font-medium mb-3 flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                    Business Data (if applicable)
                  </h3>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Service configurations</li>
                    <li>• Availability settings</li>
                    <li>• Booking links</li>
                    <li>• Client records</li>
                  </ul>
                </div>

                <div className="p-4 border rounded-lg">
                  <h3 className="font-medium mb-3 flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                    Technical Data
                  </h3>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Usage logs</li>
                    <li>• Device information</li>
                    <li>• Cookies and preferences</li>
                    <li>• Analytics data</li>
                  </ul>
                </div>
              </div>
            </section>

            {/* Important Information */}
            <section className="mb-12">
              <h2 className="text-2xl font-semibold mb-6">Important Information</h2>
              <div className="space-y-4">
                <div className="flex gap-4 items-start">
                  <Clock className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
                  <div>
                    <h3 className="font-medium mb-1">Processing Time</h3>
                    <p className="text-sm text-muted-foreground">
                      Data deletion requests are typically processed within 30 days. Complex requests may take longer.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4 items-start">
                  <Shield className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
                  <div>
                    <h3 className="font-medium mb-1">Data Retention Exceptions</h3>
                    <p className="text-sm text-muted-foreground">
                      Some data may be retained for legal compliance, fraud prevention, or to resolve disputes. This will be communicated to you if applicable.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4 items-start">
                  <CheckCircle2 className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
                  <div>
                    <h3 className="font-medium mb-1">Account Closure</h3>
                    <p className="text-sm text-muted-foreground">
                      Requesting data deletion will result in the permanent closure of your Slootea account. This action cannot be undone.
                    </p>
                  </div>
                </div>
              </div>
            </section>

            {/* Contact Card */}
            <section className="p-6 bg-muted/30 rounded-xl">
              <h2 className="text-xl font-semibold mb-4">Need Help?</h2>
              <p className="text-muted-foreground mb-4">
                If you have questions about data deletion or need assistance with your request, please contact us:
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <a
                  href="mailto:info@slootea.com"
                  className="inline-flex items-center justify-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-lg font-medium hover:bg-primary/90 transition-colors"
                >
                  <Mail className="h-4 w-4" />
                  Email Us
                </a>
                <Link
                  href="/privacy"
                  className="inline-flex items-center justify-center gap-2 border px-6 py-3 rounded-lg font-medium hover:bg-muted transition-colors"
                >
                  View Privacy Policy
                </Link>
              </div>
            </section>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t bg-background mt-16">
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
            <Link href="/privacy" className="hover:text-foreground">Privacy</Link>
            <Link href="/terms" className="hover:text-foreground">Terms</Link>
            <Link href="/data-deletion" className="hover:text-foreground font-medium">Data Deletion</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
