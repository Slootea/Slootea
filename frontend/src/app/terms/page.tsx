import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export const metadata = {
  title: "Terms of Service - Slootea",
  description: "Terms of Service for Slootea appointment scheduling platform",
};

export default function TermsOfServicePage() {
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
          <div className="max-w-3xl mx-auto prose prose-gray dark:prose-invert">
            <h1 className="text-4xl font-bold tracking-tight mb-2">Terms of Service</h1>
            <p className="text-muted-foreground text-lg mb-8">
              Last updated: February 16, 2026
            </p>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">1. Acceptance of Terms</h2>
              <p className="text-muted-foreground leading-relaxed">
                By accessing or using Slootea (&quot;the Service&quot;), you agree to be bound by these Terms of Service (&quot;Terms&quot;). If you do not agree to these Terms, you may not access or use the Service. These Terms constitute a legally binding agreement between you and Slootea.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">2. Description of Service</h2>
              <p className="text-muted-foreground leading-relaxed">
                Slootea is an appointment scheduling platform that enables businesses to manage their availability, create shareable booking links, and allow clients to book appointments. The Service includes features for appointment confirmations, reminders, and no-show reduction.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">3. Account Registration</h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                To use certain features of the Service, you must register for an account. When creating an account, you agree to:
              </p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                <li>Provide accurate, current, and complete information</li>
                <li>Maintain and promptly update your account information</li>
                <li>Keep your password secure and confidential</li>
                <li>Accept responsibility for all activities under your account</li>
                <li>Notify us immediately of any unauthorized access or security breach</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">4. User Types and Responsibilities</h2>
              
              <h3 className="text-xl font-medium mb-3">4.1 Business Users</h3>
              <p className="text-muted-foreground leading-relaxed mb-4">
                Business users who create accounts to manage appointments agree to:
              </p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-2 mb-4">
                <li>Provide accurate service information, availability, and pricing</li>
                <li>Honor appointments booked through the platform</li>
                <li>Maintain appropriate communication with clients</li>
                <li>Comply with all applicable laws and regulations for their business</li>
                <li>Obtain necessary consents for client data collection and communications</li>
              </ul>

              <h3 className="text-xl font-medium mb-3">4.2 Clients</h3>
              <p className="text-muted-foreground leading-relaxed mb-4">
                Clients who book appointments agree to:
              </p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                <li>Provide accurate contact information</li>
                <li>Attend scheduled appointments or cancel in advance</li>
                <li>Respond to confirmation requests in a timely manner</li>
                <li>Respect the business&apos;s policies and procedures</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">5. Acceptable Use</h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                You agree not to use the Service to:
              </p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                <li>Violate any applicable laws, regulations, or third-party rights</li>
                <li>Send spam, unsolicited messages, or fraudulent communications</li>
                <li>Impersonate any person or entity</li>
                <li>Interfere with or disrupt the Service or its infrastructure</li>
                <li>Attempt to gain unauthorized access to any systems or data</li>
                <li>Upload malicious code, viruses, or harmful content</li>
                <li>Scrape, harvest, or collect data without authorization</li>
                <li>Use the Service for any illegal or unauthorized purpose</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">6. Appointment Policies</h2>
              
              <h3 className="text-xl font-medium mb-3">6.1 Booking and Confirmation</h3>
              <p className="text-muted-foreground leading-relaxed mb-4">
                Appointments booked through Slootea are subject to confirmation. Clients may receive reminder messages requesting confirmation of their attendance. Failure to confirm within the specified timeframe may result in automatic cancellation.
              </p>

              <h3 className="text-xl font-medium mb-3">6.2 Cancellations</h3>
              <p className="text-muted-foreground leading-relaxed">
                Cancellation policies are set by individual businesses. Please review the specific cancellation policy of the business you are booking with. Slootea is not responsible for any fees or penalties arising from cancellations.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">7. Intellectual Property</h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                The Service and its original content, features, and functionality are owned by Slootea and are protected by international copyright, trademark, and other intellectual property laws. You may not:
              </p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                <li>Copy, modify, or distribute any part of the Service without permission</li>
                <li>Use our trademarks, logos, or branding without authorization</li>
                <li>Reverse engineer, decompile, or disassemble the Service</li>
                <li>Remove any copyright or proprietary notices</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">8. User Content</h2>
              <p className="text-muted-foreground leading-relaxed">
                You retain ownership of content you submit to the Service (such as service descriptions, images, and business information). By submitting content, you grant Slootea a non-exclusive, worldwide, royalty-free license to use, display, and distribute such content in connection with providing the Service. You represent that you have the right to submit such content and that it does not violate any third-party rights.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">9. Third-Party Services</h2>
              <p className="text-muted-foreground leading-relaxed">
                The Service may integrate with or link to third-party services (such as authentication providers, payment processors, or communication platforms). Your use of such third-party services is subject to their respective terms and policies. Slootea is not responsible for the content, privacy practices, or availability of third-party services.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">10. Fees and Payment</h2>
              <p className="text-muted-foreground leading-relaxed">
                Certain features of the Service may require payment. All fees are stated in advance and are non-refundable unless otherwise specified. We reserve the right to modify pricing with reasonable notice. Failure to pay may result in suspension or termination of your account.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">11. Disclaimer of Warranties</h2>
              <p className="text-muted-foreground leading-relaxed">
                THE SERVICE IS PROVIDED &quot;AS IS&quot; AND &quot;AS AVAILABLE&quot; WITHOUT WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED. WE DO NOT WARRANT THAT THE SERVICE WILL BE UNINTERRUPTED, SECURE, OR ERROR-FREE. WE DISCLAIM ALL WARRANTIES, INCLUDING IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">12. Limitation of Liability</h2>
              <p className="text-muted-foreground leading-relaxed">
                TO THE MAXIMUM EXTENT PERMITTED BY LAW, SLOOTEA SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING LOSS OF PROFITS, DATA, OR BUSINESS OPPORTUNITIES, ARISING FROM YOUR USE OF THE SERVICE. OUR TOTAL LIABILITY SHALL NOT EXCEED THE AMOUNT YOU PAID US IN THE TWELVE MONTHS PRECEDING THE CLAIM.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">13. Indemnification</h2>
              <p className="text-muted-foreground leading-relaxed">
                You agree to indemnify and hold harmless Slootea, its officers, directors, employees, and agents from any claims, damages, losses, or expenses (including legal fees) arising from your use of the Service, violation of these Terms, or infringement of any third-party rights.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">14. Termination</h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                We may suspend or terminate your account at any time for violation of these Terms or for any other reason at our discretion. You may terminate your account at any time by contacting us. Upon termination:
              </p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                <li>Your right to use the Service will immediately cease</li>
                <li>We may delete your account and associated data</li>
                <li>Any pending appointments may be cancelled</li>
                <li>Provisions that by their nature should survive will remain in effect</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">15. Changes to Terms</h2>
              <p className="text-muted-foreground leading-relaxed">
                We reserve the right to modify these Terms at any time. We will notify you of material changes by posting the updated Terms and updating the &quot;Last updated&quot; date. Your continued use of the Service after changes become effective constitutes acceptance of the revised Terms.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">16. Governing Law</h2>
              <p className="text-muted-foreground leading-relaxed">
                These Terms shall be governed by and construed in accordance with applicable laws, without regard to conflict of law principles. Any disputes arising from these Terms or the Service shall be resolved through binding arbitration or in the courts of competent jurisdiction.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">17. Severability</h2>
              <p className="text-muted-foreground leading-relaxed">
                If any provision of these Terms is found to be unenforceable or invalid, that provision shall be limited or eliminated to the minimum extent necessary, and the remaining provisions shall remain in full force and effect.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">18. Contact Us</h2>
              <p className="text-muted-foreground leading-relaxed">
                If you have any questions about these Terms of Service, please contact us at:
              </p>
              <div className="mt-4 p-4 bg-muted/30 rounded-lg">
                <p className="text-muted-foreground">
                  <strong>Slootea</strong><br />
                  Email: info@slootea.com<br />
                  Website: www.slootea.com
                </p>
              </div>
            </section>
          </div>
        </div>
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
            <Link href="/privacy" className="hover:text-foreground">Privacy</Link>
            <Link href="/terms" className="hover:text-foreground font-medium">Terms</Link>
            <Link href="/data-deletion" className="hover:text-foreground">Data Deletion</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
