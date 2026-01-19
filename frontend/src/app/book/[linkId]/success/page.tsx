"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Calendar } from "lucide-react";

export default function BookingSuccessPage() {
  const params = useParams();
  const slug = params.linkId as string;

  return (
    <div className="min-h-screen bg-muted/30 flex items-center justify-center p-6">
      <Card className="max-w-md w-full">
        <CardContent className="p-8 text-center">
          <div className="mb-6">
            <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto" />
          </div>
          <h1 className="text-2xl font-bold mb-2">Booking Confirmed!</h1>
          <p className="text-muted-foreground mb-6">
            Your appointment has been successfully scheduled. You will receive a
            confirmation message with the details.
          </p>
          <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6 text-sm text-blue-800 dark:text-blue-200">
            <p>
              <strong>Important:</strong> You may receive a confirmation request
              before your appointment. Please confirm your attendance to keep
              your slot.
            </p>
          </div>
          <Button asChild className="w-full">
            <Link href={`/book/${slug}`}>
              <Calendar className="h-4 w-4 mr-2" />
              Book Another Appointment
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
