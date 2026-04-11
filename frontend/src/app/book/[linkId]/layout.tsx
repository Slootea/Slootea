import { Metadata } from "next";

interface BookingLinkData {
  organization?: {
    name: string;
    logoUrl?: string | null;
  } | null;
  user?: {
    businessName?: string;
  };
}

async function getBookingLink(slug: string): Promise<BookingLinkData | null> {
  try {
    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    const response = await fetch(`${API_URL}/public/book/${slug}`, {
      cache: 'no-store',
    });
    
    if (!response.ok) {
      return null;
    }
    
    return response.json();
  } catch {
    return null;
  }
}

export async function generateMetadata({ 
  params 
}: { 
  params: Promise<{ linkId: string }> 
}): Promise<Metadata> {
  const { linkId } = await params;
  const bookingLink = await getBookingLink(linkId);
  
  const organizationName = bookingLink?.organization?.name 
    || bookingLink?.user?.businessName 
    || 'Book Appointment';
  
  const logoUrl = bookingLink?.organization?.logoUrl;
  
  const title = `${organizationName} | Book Appointment`;
  const description = `Book an appointment with ${organizationName}`;
  
  const metadata: Metadata = {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
  };
  
  // Add logo as Open Graph image if it exists
  if (logoUrl) {
    metadata.openGraph = {
      ...metadata.openGraph,
      images: [
        {
          url: logoUrl,
          alt: `${organizationName} logo`,
        },
      ],
    };
    metadata.twitter = {
      ...metadata.twitter,
      images: [logoUrl],
    };
  }
  
  return metadata;
}

export default function BookingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
