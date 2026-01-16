"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { availabilityApi, serviceOptionsApi, setAuthToken } from "@/lib/api";
import { Availability, ServiceOption, DayOfWeek, DayOfWeekLabels } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { Plus, Trash2, Clock } from "lucide-react";

export default function AvailabilityPage() {
  const { getToken } = useAuth();
  const { toast } = useToast();
  const [availabilities, setAvailabilities] = useState<Availability[]>([]);
  const [serviceOptions, setServiceOptions] = useState<ServiceOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    dayOfWeek: DayOfWeek.MONDAY,
    startTime: "09:00",
    endTime: "17:00",
    serviceOptionId: "",
  });

  const fetchData = async () => {
    const token = await getToken();
    setAuthToken(token);

    try {
      const [availRes, optionsRes] = await Promise.all([
        availabilityApi.getAll(),
        serviceOptionsApi.getAll(),
      ]);
      setAvailabilities(availRes.data);
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
      await availabilityApi.create({
        ...formData,
        serviceOptionId: formData.serviceOptionId || undefined,
      });
      toast({ title: "Availability slot created" });
      setDialogOpen(false);
      fetchData();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create availability",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await availabilityApi.delete(id);
      toast({ title: "Availability slot deleted" });
      fetchData();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete availability",
        variant: "destructive",
      });
    }
  };

  const handleToggleActive = async (availability: Availability) => {
    try {
      await availabilityApi.update(availability.id, {
        isActive: !availability.isActive,
      });
      fetchData();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update availability",
        variant: "destructive",
      });
    }
  };

  // Group availabilities by day
  const groupedByDay = availabilities.reduce((acc, av) => {
    if (!acc[av.dayOfWeek]) acc[av.dayOfWeek] = [];
    acc[av.dayOfWeek].push(av);
    return acc;
  }, {} as Record<DayOfWeek, Availability[]>);

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
          Define when you&apos;re available for appointments. Set different hours for
          specific services if needed.
        </p>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Time Slot
        </Button>
      </div>

      <div className="grid gap-4">
        {Object.values(DayOfWeek)
          .filter((d) => typeof d === "number")
          .map((day) => (
            <Card key={day}>
              <CardHeader className="py-4">
                <CardTitle className="text-lg">
                  {DayOfWeekLabels[day as DayOfWeek]}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {!groupedByDay[day as DayOfWeek] ||
                groupedByDay[day as DayOfWeek].length === 0 ? (
                  <p className="text-muted-foreground text-sm">
                    No availability set
                  </p>
                ) : (
                  <div className="space-y-2">
                    {groupedByDay[day as DayOfWeek].map((av) => (
                      <div
                        key={av.id}
                        className={`flex items-center justify-between p-3 rounded-lg border ${
                          av.isActive ? "bg-white" : "bg-gray-50 opacity-60"
                        }`}
                      >
                        <div className="flex items-center gap-4">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">
                            {av.startTime} - {av.endTime}
                          </span>
                          {av.serviceOption && (
                            <span className="text-sm text-muted-foreground bg-gray-100 px-2 py-1 rounded">
                              {av.serviceOption.title}
                            </span>
                          )}
                          {!av.serviceOptionId && (
                            <span className="text-sm text-muted-foreground">
                              All services
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={av.isActive}
                            onCheckedChange={() => handleToggleActive(av)}
                          />
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(av.id)}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
      </div>

      {/* Create Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Availability Slot</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Day of Week</Label>
              <Select
                value={formData.dayOfWeek.toString()}
                onValueChange={(v) =>
                  setFormData({ ...formData, dayOfWeek: parseInt(v) })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(DayOfWeekLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startTime">Start Time</Label>
                <Input
                  id="startTime"
                  type="time"
                  value={formData.startTime}
                  onChange={(e) =>
                    setFormData({ ...formData, startTime: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endTime">End Time</Label>
                <Input
                  id="endTime"
                  type="time"
                  value={formData.endTime}
                  onChange={(e) =>
                    setFormData({ ...formData, endTime: e.target.value })
                  }
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Service (Optional)</Label>
              <Select
                value={formData.serviceOptionId}
                onValueChange={(v) =>
                  setFormData({ ...formData, serviceOptionId: v })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="All services" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All services</SelectItem>
                  {serviceOptions.map((opt) => (
                    <SelectItem key={opt.id} value={opt.id}>
                      {opt.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Leave empty to apply this slot to all services
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
