"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@clerk/nextjs";
import { gamificationApi, setAuthToken } from "@/lib/api";
import { GamificationSettings, GamificationStats, SpinWheelPrize } from "@/lib/types";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Gift,
  Trophy,
  Users,
  TrendingUp,
  Star,
  Flame,
  Share2,
  Settings2,
  Sparkles,
  Loader2,
  RefreshCw,
  Plus,
  Trash2,
  Edit,
} from "lucide-react";

// Generate UUID function
const generateId = () => typeof crypto !== 'undefined' && crypto.randomUUID 
  ? crypto.randomUUID() 
  : Math.random().toString(36).substring(2) + Date.now().toString(36);

const defaultSpinWheelPrizes: SpinWheelPrize[] = [
  { id: '1', name: '50 Points', type: 'points', value: 50, probability: 30, color: '#3B82F6' },
  { id: '2', name: '100 Points', type: 'points', value: 100, probability: 20, color: '#10B981' },
  { id: '3', name: '5% Off', type: 'discount', value: 5, probability: 15, color: '#F59E0B' },
  { id: '4', name: '200 Points', type: 'points', value: 200, probability: 10, color: '#8B5CF6' },
  { id: '5', name: '10% Off', type: 'discount', value: 10, probability: 5, color: '#EC4899' },
  { id: '6', name: 'Try Again', type: 'nothing', value: 0, probability: 20, color: '#6B7280' },
];

const levelColors = {
  bronze: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
  silver: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300",
  gold: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
  platinum: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
};

export default function GamificationPage() {
  const { getToken } = useAuth();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<GamificationSettings | null>(null);
  const [stats, setStats] = useState<GamificationStats | null>(null);
  const [prizeDialogOpen, setPrizeDialogOpen] = useState(false);
  const [editingPrize, setEditingPrize] = useState<SpinWheelPrize | null>(null);
  const [prizeForm, setPrizeForm] = useState<SpinWheelPrize>({
    id: '',
    name: '',
    type: 'points',
    value: 0,
    probability: 10,
    color: '#3B82F6',
  });

  const fetchData = useCallback(async () => {
    const token = await getToken();
    setAuthToken(token);

    try {
      const [settingsRes, statsRes] = await Promise.all([
        gamificationApi.getSettings(),
        gamificationApi.getStats(),
      ]);
      setSettings(settingsRes.data);
      setStats(statsRes.data);
    } catch (error) {
      console.error("Failed to fetch gamification data", error);
      toast({
        title: "Error",
        description: "Failed to load gamification settings",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [getToken, toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSave = async () => {
    if (!settings) return;
    
    setSaving(true);
    try {
      const token = await getToken();
      setAuthToken(token);

      // Strip non-whitelisted properties before sending
      const { id, createdAt, updatedAt, userId, ...updateData } = settings;
      await gamificationApi.updateSettings(updateData);
      toast({
        title: "Settings saved",
        description: "Gamification settings have been updated",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save settings",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const updateSetting = <K extends keyof GamificationSettings>(
    key: K,
    value: GamificationSettings[K]
  ) => {
    if (!settings) return;
    setSettings({ ...settings, [key]: value });
  };

  const handleAddPrize = () => {
    setEditingPrize(null);
    setPrizeForm({
      id: generateId(),
      name: '',
      type: 'points',
      value: 0,
      probability: 10,
      color: '#3B82F6',
    });
    setPrizeDialogOpen(true);
  };

  const handleEditPrize = (prize: SpinWheelPrize) => {
    setEditingPrize(prize);
    setPrizeForm({ ...prize });
    setPrizeDialogOpen(true);
  };

  const handleSavePrize = () => {
    if (!settings) return;

    let newPrizes: SpinWheelPrize[];
    if (editingPrize) {
      newPrizes = settings.spinWheelPrizes.map(p =>
        p.id === editingPrize.id ? prizeForm : p
      );
    } else {
      newPrizes = [...(settings.spinWheelPrizes || []), prizeForm];
    }

    updateSetting('spinWheelPrizes', newPrizes);
    setPrizeDialogOpen(false);
  };

  const handleDeletePrize = (prizeId: string) => {
    if (!settings) return;
    const newPrizes = settings.spinWheelPrizes.filter(p => p.id !== prizeId);
    updateSetting('spinWheelPrizes', newPrizes);
  };

  const getTotalProbability = () => {
    if (!settings?.spinWheelPrizes) return 0;
    return settings.spinWheelPrizes.reduce((sum, p) => sum + p.probability, 0);
  };

  if (loading) {
    return <LoadingSkeleton />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Gift className="h-6 w-6 text-primary" />
            Gamification
          </h1>
          <p className="text-muted-foreground">
            Configure rewards, points, and referrals to boost client engagement
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Switch
              checked={settings?.enabled || false}
              onCheckedChange={(checked) => updateSetting('enabled', checked)}
            />
            <Label>{settings?.enabled ? 'Enabled' : 'Disabled'}</Label>
          </div>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Changes
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Points Issued</p>
                  <p className="text-2xl font-bold">{stats.totalPointsIssued.toLocaleString()}</p>
                </div>
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Star className="h-5 w-5 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Successful Referrals</p>
                  <p className="text-2xl font-bold">{stats.totalReferrals}</p>
                </div>
                <div className="h-10 w-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                  <Share2 className="h-5 w-5 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="sm:col-span-2">
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground mb-3">Level Distribution</p>
              <div className="flex gap-2 flex-wrap">
                {stats.levelDistribution.map((level) => (
                  <Badge
                    key={level.level}
                    className={levelColors[level.level as keyof typeof levelColors]}
                  >
                    {level.level}: {level.count}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Top Referrers */}
      {stats?.topReferrers && stats.topReferrers.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Trophy className="h-5 w-5 text-yellow-500" />
              Top Referrers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4 overflow-x-auto pb-2">
              {stats.topReferrers.map((referrer, i) => (
                <div
                  key={referrer.id}
                  className="flex items-center gap-3 bg-muted/50 rounded-lg p-3 min-w-[200px]"
                >
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground font-bold">
                    {i + 1}
                  </div>
                  <div>
                    <p className="font-medium">{referrer.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {referrer.referrals} referrals
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Settings Tabs */}
      <Tabs defaultValue="points" className="space-y-4">
        <TabsList>
          <TabsTrigger value="points">Points</TabsTrigger>
          <TabsTrigger value="levels">Levels</TabsTrigger>
          <TabsTrigger value="referrals">Referrals</TabsTrigger>
          <TabsTrigger value="spinwheel">Spin Wheel</TabsTrigger>
          <TabsTrigger value="virtualpet">Virtual Pet</TabsTrigger>
        </TabsList>

        {/* Points Settings */}
        <TabsContent value="points">
          <Card>
            <CardHeader>
              <CardTitle>Points Configuration</CardTitle>
              <CardDescription>
                Set how many points clients earn for different actions
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid sm:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>Points per Booking</Label>
                  <Input
                    type="number"
                    min="0"
                    value={settings?.pointsPerBooking || 0}
                    onChange={(e) => updateSetting('pointsPerBooking', parseInt(e.target.value) || 0)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Points earned when a client books an appointment
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Points per Completed Appointment</Label>
                  <Input
                    type="number"
                    min="0"
                    value={settings?.pointsPerCompletedAppointment || 0}
                    onChange={(e) => updateSetting('pointsPerCompletedAppointment', parseInt(e.target.value) || 0)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Additional points when appointment is completed
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Streak Bonus Points</Label>
                  <Input
                    type="number"
                    min="0"
                    value={settings?.streakBonusPoints || 0}
                    onChange={(e) => updateSetting('streakBonusPoints', parseInt(e.target.value) || 0)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Bonus points multiplied by streak count for consecutive appointments
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Levels Settings */}
        <TabsContent value="levels">
          <Card>
            <CardHeader>
              <CardTitle>Level Configuration</CardTitle>
              <CardDescription>
                Set point thresholds and discounts for each loyalty level
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6">
                {/* Bronze */}
                <div className="flex items-center gap-4 p-4 rounded-lg bg-amber-50 dark:bg-amber-900/10">
                  <div className="text-3xl">🥉</div>
                  <div className="flex-1 grid sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Bronze Threshold (points)</Label>
                      <Input
                        type="number"
                        min="0"
                        value={settings?.bronzeThreshold || 0}
                        onChange={(e) => updateSetting('bronzeThreshold', parseInt(e.target.value) || 0)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Bronze Discount (%)</Label>
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        value={settings?.bronzeDiscount || 0}
                        onChange={(e) => updateSetting('bronzeDiscount', parseInt(e.target.value) || 0)}
                      />
                    </div>
                  </div>
                </div>

                {/* Silver */}
                <div className="flex items-center gap-4 p-4 rounded-lg bg-gray-50 dark:bg-gray-900/10">
                  <div className="text-3xl">🥈</div>
                  <div className="flex-1 grid sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Silver Threshold (points)</Label>
                      <Input
                        type="number"
                        min="0"
                        value={settings?.silverThreshold || 0}
                        onChange={(e) => updateSetting('silverThreshold', parseInt(e.target.value) || 0)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Silver Discount (%)</Label>
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        value={settings?.silverDiscount || 0}
                        onChange={(e) => updateSetting('silverDiscount', parseInt(e.target.value) || 0)}
                      />
                    </div>
                  </div>
                </div>

                {/* Gold */}
                <div className="flex items-center gap-4 p-4 rounded-lg bg-yellow-50 dark:bg-yellow-900/10">
                  <div className="text-3xl">🥇</div>
                  <div className="flex-1 grid sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Gold Threshold (points)</Label>
                      <Input
                        type="number"
                        min="0"
                        value={settings?.goldThreshold || 0}
                        onChange={(e) => updateSetting('goldThreshold', parseInt(e.target.value) || 0)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Gold Discount (%)</Label>
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        value={settings?.goldDiscount || 0}
                        onChange={(e) => updateSetting('goldDiscount', parseInt(e.target.value) || 0)}
                      />
                    </div>
                  </div>
                </div>

                {/* Platinum */}
                <div className="flex items-center gap-4 p-4 rounded-lg bg-purple-50 dark:bg-purple-900/10">
                  <div className="text-3xl">💎</div>
                  <div className="flex-1 grid sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Platinum Threshold (points)</Label>
                      <Input
                        type="number"
                        min="0"
                        value={settings?.platinumThreshold || 0}
                        onChange={(e) => updateSetting('platinumThreshold', parseInt(e.target.value) || 0)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Platinum Discount (%)</Label>
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        value={settings?.platinumDiscount || 0}
                        onChange={(e) => updateSetting('platinumDiscount', parseInt(e.target.value) || 0)}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Referrals Settings */}
        <TabsContent value="referrals">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Referral Program</span>
                <Switch
                  checked={settings?.referralsEnabled || false}
                  onCheckedChange={(checked) => updateSetting('referralsEnabled', checked)}
                />
              </CardTitle>
              <CardDescription>
                Configure referral bonuses for both referrers and new clients
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid sm:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>Points for Referrer</Label>
                  <Input
                    type="number"
                    min="0"
                    value={settings?.pointsPerReferral || 0}
                    onChange={(e) => updateSetting('pointsPerReferral', parseInt(e.target.value) || 0)}
                    disabled={!settings?.referralsEnabled}
                  />
                  <p className="text-xs text-muted-foreground">
                    Points the referrer earns when someone uses their code
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Points for New Client</Label>
                  <Input
                    type="number"
                    min="0"
                    value={settings?.pointsForReferred || 0}
                    onChange={(e) => updateSetting('pointsForReferred', parseInt(e.target.value) || 0)}
                    disabled={!settings?.referralsEnabled}
                  />
                  <p className="text-xs text-muted-foreground">
                    Welcome bonus points for clients who use a referral code
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Max Referrals per Client</Label>
                  <Input
                    type="number"
                    min="0"
                    value={settings?.maxReferralsPerClient || 0}
                    onChange={(e) => updateSetting('maxReferralsPerClient', parseInt(e.target.value) || 0)}
                    disabled={!settings?.referralsEnabled}
                  />
                  <p className="text-xs text-muted-foreground">
                    Set to 0 for unlimited referrals
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Spin Wheel Settings */}
        <TabsContent value="spinwheel">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5" />
                  Spin Wheel
                </span>
                <Switch
                  checked={settings?.spinWheelEnabled || false}
                  onCheckedChange={(checked) => updateSetting('spinWheelEnabled', checked)}
                />
              </CardTitle>
              <CardDescription>
                Configure prizes and probabilities for the spin wheel game after booking
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">
                    Total Probability:
                  </span>
                  <Badge variant={getTotalProbability() === 100 ? "default" : "destructive"}>
                    {getTotalProbability()}%
                  </Badge>
                  {getTotalProbability() !== 100 && (
                    <span className="text-xs text-destructive">Should equal 100%</span>
                  )}
                </div>
                <Button onClick={handleAddPrize} size="sm">
                  <Plus className="h-4 w-4 mr-1" />
                  Add Prize
                </Button>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Color</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Value</TableHead>
                    <TableHead>Probability</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(settings?.spinWheelPrizes || []).map((prize) => (
                    <TableRow key={prize.id}>
                      <TableCell>
                        <div
                          className="w-6 h-6 rounded-full border"
                          style={{ backgroundColor: prize.color }}
                        />
                      </TableCell>
                      <TableCell className="font-medium">{prize.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{prize.type}</Badge>
                      </TableCell>
                      <TableCell>
                        {prize.type === 'points' && `${prize.value} pts`}
                        {prize.type === 'discount' && `${prize.value}%`}
                        {prize.type === 'freebie' && 'Free'}
                        {prize.type === 'nothing' && '-'}
                      </TableCell>
                      <TableCell>{prize.probability}%</TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEditPrize(prize)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeletePrize(prize.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {(!settings?.spinWheelPrizes || settings.spinWheelPrizes.length === 0) && (
                <div className="text-center py-8 text-muted-foreground">
                  <Sparkles className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No prizes configured</p>
                  <Button
                    variant="link"
                    onClick={() => {
                      if (settings) {
                        updateSetting('spinWheelPrizes', defaultSpinWheelPrizes);
                      }
                    }}
                  >
                    Load default prizes
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Virtual Pet Settings */}
        <TabsContent value="virtualpet">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  🐾 Virtual Pet
                </span>
                <Switch
                  checked={settings?.virtualPetEnabled || false}
                  onCheckedChange={(checked) => updateSetting('virtualPetEnabled', checked)}
                />
              </CardTitle>
              <CardDescription>
                Let clients adopt and care for a virtual pet that grows with their loyalty
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-lg p-6">
                <div className="flex items-start gap-4">
                  <div className="text-5xl">🐱</div>
                  <div className="flex-1">
                    <h4 className="font-semibold mb-2">How Virtual Pet Works</h4>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li>• Clients can adopt a virtual pet after booking</li>
                      <li>• They use their points to buy food, toys, and decorations</li>
                      <li>• Playing and feeding the pet increases its happiness and makes it grow</li>
                      <li>• Pets evolve through stages: Egg → Baby → Teen → Adult → Elder</li>
                      <li>• The pet playground can be customized with purchased items</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-4 rounded-lg border text-center">
                  <div className="text-3xl mb-2">🥚</div>
                  <p className="font-medium">Egg</p>
                  <p className="text-xs text-muted-foreground">Starting stage</p>
                </div>
                <div className="p-4 rounded-lg border text-center">
                  <div className="text-3xl mb-2">🐱</div>
                  <p className="font-medium">Baby</p>
                  <p className="text-xs text-muted-foreground">100 XP</p>
                </div>
                <div className="p-4 rounded-lg border text-center">
                  <div className="text-3xl mb-2">😺</div>
                  <p className="font-medium">Teen</p>
                  <p className="text-xs text-muted-foreground">500 XP</p>
                </div>
                <div className="p-4 rounded-lg border text-center">
                  <div className="text-3xl mb-2">😸</div>
                  <p className="font-medium">Adult</p>
                  <p className="text-xs text-muted-foreground">1500 XP</p>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="font-medium">Pet Shop Items</h4>
                <p className="text-sm text-muted-foreground">
                  Clients can use their reward points to purchase items from the pet shop. 
                  Items include food to keep their pet happy, toys for playtime, 
                  accessories to dress up their pet, and decorations for their playground.
                </p>
                <div className="flex flex-wrap gap-2 mt-3">
                  <Badge variant="secondary">🍖 Basic Kibble - 10 pts</Badge>
                  <Badge variant="secondary">⚽ Bouncy Ball - 30 pts</Badge>
                  <Badge variant="secondary">🎀 Cute Bow - 40 pts</Badge>
                  <Badge variant="secondary">🛏️ Cozy Bed - 50 pts</Badge>
                  <Badge variant="secondary">✨ Golden Feast - 100 pts</Badge>
                  <Badge variant="secondary">👑 Royal Crown - 300 pts</Badge>
                </div>
              </div>

              {!settings?.virtualPetEnabled && (
                <div className="bg-muted/50 rounded-lg p-4 text-center">
                  <p className="text-muted-foreground">
                    Enable the virtual pet feature to let your clients enjoy this engaging experience!
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Prize Dialog */}
      <Dialog open={prizeDialogOpen} onOpenChange={setPrizeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingPrize ? 'Edit Prize' : 'Add Prize'}</DialogTitle>
            <DialogDescription>
              Configure the prize details and probability
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Prize Name</Label>
                <Input
                  value={prizeForm.name}
                  onChange={(e) => setPrizeForm({ ...prizeForm, name: e.target.value })}
                  placeholder="e.g., 100 Points"
                />
              </div>

              <div className="space-y-2">
                <Label>Color</Label>
                <div className="flex gap-2">
                  <Input
                    type="color"
                    value={prizeForm.color}
                    onChange={(e) => setPrizeForm({ ...prizeForm, color: e.target.value })}
                    className="w-12 h-10 p-1"
                  />
                  <Input
                    value={prizeForm.color}
                    onChange={(e) => setPrizeForm({ ...prizeForm, color: e.target.value })}
                    placeholder="#3B82F6"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Type</Label>
                <select
                  value={prizeForm.type}
                  onChange={(e) => setPrizeForm({ ...prizeForm, type: e.target.value as SpinWheelPrize['type'] })}
                  className="w-full h-10 px-3 border rounded-md bg-background"
                >
                  <option value="points">Points</option>
                  <option value="discount">Discount (%)</option>
                  <option value="freebie">Freebie</option>
                  <option value="nothing">Nothing (Try Again)</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label>Value</Label>
                <Input
                  type="number"
                  min="0"
                  value={prizeForm.value}
                  onChange={(e) => setPrizeForm({ ...prizeForm, value: parseInt(e.target.value) || 0 })}
                  disabled={prizeForm.type === 'nothing'}
                  placeholder={prizeForm.type === 'points' ? 'Points amount' : prizeForm.type === 'discount' ? 'Discount %' : '0'}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Probability (%)</Label>
              <Input
                type="number"
                min="0"
                max="100"
                value={prizeForm.probability}
                onChange={(e) => setPrizeForm({ ...prizeForm, probability: parseInt(e.target.value) || 0 })}
              />
              <p className="text-xs text-muted-foreground">
                The chance of winning this prize (all probabilities should sum to 100%)
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setPrizeDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSavePrize}>
              {editingPrize ? 'Save Changes' : 'Add Prize'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Skeleton className="h-10 w-32" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardContent className="pt-6">
              <div className="flex justify-between">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-8 w-16" />
                </div>
                <Skeleton className="h-10 w-10 rounded-full" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardContent className="py-8">
          <div className="space-y-4">
            <Skeleton className="h-10 w-full max-w-md" />
            <div className="grid sm:grid-cols-2 gap-4">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
