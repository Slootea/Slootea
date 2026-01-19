"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { bookingLinksApi, serviceOptionsApi, setAuthToken } from "@/lib/api";
import { BookingLink, BookingLinkType, ServiceOption } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { Plus, Copy, Trash2, Link2, ExternalLink } from "lucide-react";
import { format, parseISO } from "date-fns";

export default function BookingLinksPage() {
  const { getToken } = useAuth();
  const { toast } = useToast();
  const [links, setLinks] = useState<BookingLink[]>([]);
  const [serviceOptions, setServiceOptions] = useState<ServiceOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    type: BookingLinkType.ALL_OPTIONS,
    serviceOptionId: "",
    expiresAt: "",
  });

  const fetchData = async () => {
    const token = await getToken();
    setAuthToken(token);

    try {
      const [linksRes, optionsRes] = await Promise.all([
        bookingLinksApi.getAll(),
        serviceOptionsApi.getAll(),
      ]);
      setLinks(linksRes.data);
      setServiceOptions(optionsRes.data);
    } catch (error) {
      console.error("Failed to fetch data", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [getToken]);

  const handleCreate = async () => {
    try {
      await bookingLinksApi.create({
        name: formData.name || undefined,
        type: formData.type,
        serviceOptionId:
          formData.type === BookingLinkType.SPECIFIC_OPTION
            ? formData.serviceOptionId
            : undefined,
        expiresAt: formData.expiresAt || undefined,
      });
      toast({ title: "Booking link created" });
      setDialogOpen(false);
      setFormData({
        name: "",
        type: BookingLinkType.ALL_OPTIONS,
        serviceOptionId: "",
        expiresAt: "",
      });
      fetchData();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create booking link",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this booking link?")) return;

    try {
      await bookingLinksApi.delete(id);
      toast({ title: "Booking link deleted" });
      fetchData();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete booking link",
        variant: "destructive",
      });
    }
  };

  const handleToggleActive = async (link: BookingLink) => {
    try {
      await bookingLinksApi.update(link.id, { isActive: !link.isActive });
      fetchData();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update booking link",
        variant: "destructive",
      });
    }
  };

  const copyToClipboard = (slug: string) => {
    const url = `${window.location.origin}/book/${slug}`;
    navigator.clipboard.writeText(url);
    toast({
      title: "Link copied!",
      description: "Booking link has been copied to clipboard.",
    });
  };

  const getBookingUrl = (slug: string) => {
    return `${typeof window !== "undefined" ? window.location.origin : ""}/book/${slug}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <p className="text-muted-foreground">
          Create shareable links for clients to book appointments.
        </p>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Create Link
        </Button>
      </div>

      {links.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Link2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-4">
              No booking links yet. Create your first one!
            </p>
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Booking Link
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {links.map((link) => (
            <Card
              key={link.id}
              className={!link.isActive ? "opacity-60" : ""}
            >
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <h3 className="text-lg font-semibold">
                        {link.name || `Booking Link`}
                      </h3>
                      <Badge variant={link.isActive ? "default" : "secondary"}>
                        {link.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </div>

                    <p className="text-sm text-muted-foreground">
                      {link.type === BookingLinkType.ALL_OPTIONS
                        ? "All services"
                        : link.type === BookingLinkType.SPECIFIC_OPTION
                        ? `Service: ${link.serviceOption?.title || "Specific service"}`
                        : "Campaign link"}
                    </p>

                    <div className="flex items-center gap-2 text-sm">
                      <code className="bg-muted px-2 py-1 rounded text-xs">
                        {getBookingUrl(link.slug)}
                      </code>
                    </div>

                    {link.expiresAt && (
                      <p className="text-xs text-muted-foreground">
                        Expires: {format(parseISO(link.expiresAt), "PPP")}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(link.slug)}
                    >
                      <Copy className="h-4 w-4 mr-1" />
                      Copy
                    </Button>
                    <a
                      href={getBookingUrl(link.slug)}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Button variant="outline" size="sm">
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    </a>
                    <Switch
                      checked={link.isActive}
                      onCheckedChange={() => handleToggleActive(link)}
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(link.id)}
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Booking Link</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name (Optional)</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="e.g., Summer Campaign, Main Booking"
              />
            </div>
            <div className="space-y-2">
              <Label>Link Type</Label>
              <Select
                value={formData.type}
                onValueChange={(v) =>
                  setFormData({ ...formData, type: v as BookingLinkType })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={BookingLinkType.ALL_OPTIONS}>
                    All Services
                  </SelectItem>
                  <SelectItem value={BookingLinkType.SPECIFIC_OPTION}>
                    Specific Service
                  </SelectItem>
                  <SelectItem value={BookingLinkType.CAMPAIGN}>
                    Campaign
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            {formData.type === BookingLinkType.SPECIFIC_OPTION && (
              <div className="space-y-2">
                <Label>Service</Label>
                <Select
                  value={formData.serviceOptionId}
                  onValueChange={(v) =>
                    setFormData({ ...formData, serviceOptionId: v })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a service" />
                  </SelectTrigger>
                  <SelectContent>
                    {serviceOptions.map((opt) => (
                      <SelectItem key={opt.id} value={opt.id}>
                        {opt.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="expiresAt">Expiration Date (Optional)</Label>
              <Input
                id="expiresAt"
                type="date"
                value={formData.expiresAt}
                onChange={(e) =>
                  setFormData({ ...formData, expiresAt: e.target.value })
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              disabled={
                formData.type === BookingLinkType.SPECIFIC_OPTION &&
                !formData.serviceOptionId
              }
            >
              Create Link
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
