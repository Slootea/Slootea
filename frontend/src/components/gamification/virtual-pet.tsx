"use client";

import { useState, useEffect, useCallback } from "react";
import { publicVirtualPetApi } from "@/lib/api";
import {
  VirtualPet,
  PetInteractionResult,
  InventoryItem,
  PetType,
  PetMood,
  PetStage,
} from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
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
  Heart,
  Sparkles,
  Utensils,
  Gamepad2,
  Hand,
  ShoppingBag,
  Package,
  Zap,
  Moon,
  Star,
  ChevronUp,
  Settings,
  Loader2,
} from "lucide-react";

// Pet emoji mappings
const petEmojis: Record<PetType, Record<PetStage, string>> = {
  cat: { egg: "🥚", baby: "🐱", teen: "😺", adult: "😸", elder: "👑🐱" },
  dog: { egg: "🥚", baby: "🐶", teen: "🐕", adult: "🦮", elder: "👑🐕" },
  bunny: { egg: "🥚", baby: "🐰", teen: "🐇", adult: "🐇", elder: "👑🐰" },
  hamster: { egg: "🥚", baby: "🐹", teen: "🐹", adult: "🐹", elder: "👑🐹" },
  bird: { egg: "🥚", baby: "🐤", teen: "🐦", adult: "🦜", elder: "👑🦜" },
};

const moodEmojis: Record<PetMood, string> = {
  ecstatic: "🤩",
  happy: "😊",
  content: "😐",
  sad: "😢",
  hungry: "😋",
  sleepy: "😴",
};

const petTypeNames: Record<PetType, string> = {
  cat: "Cat",
  dog: "Dog",
  bunny: "Bunny",
  hamster: "Hamster",
  bird: "Bird",
};

interface VirtualPetWidgetProps {
  slug: string;
  clientId: string;
  clientPoints: number;
  onPointsChange?: (newPoints: number) => void;
  compact?: boolean;
}

export function VirtualPetWidget({
  slug,
  clientId,
  clientPoints,
  onPointsChange,
  compact = false,
}: VirtualPetWidgetProps) {
  const { toast } = useToast();
  const [pet, setPet] = useState<VirtualPet | null>(null);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [interacting, setInteracting] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showShopDialog, setShowShopDialog] = useState(false);
  const [showInventoryDialog, setShowInventoryDialog] = useState(false);
  const [petName, setPetName] = useState("");
  const [selectedPetType, setSelectedPetType] = useState<PetType>("cat");
  const [animation, setAnimation] = useState<string | null>(null);

  const fetchPet = useCallback(async () => {
    try {
      const res = await publicVirtualPetApi.getPet(slug, clientId);
      setPet(res.data);
    } catch (error: any) {
      if (error.response?.status === 404) {
        setPet(null);
      }
    } finally {
      setLoading(false);
    }
  }, [slug, clientId]);

  const fetchInventory = useCallback(async () => {
    try {
      const res = await publicVirtualPetApi.getInventory(slug, clientId);
      setInventory(res.data.items);
    } catch (error) {
      console.error("Failed to fetch inventory", error);
    }
  }, [slug, clientId]);

  useEffect(() => {
    fetchPet();
    fetchInventory();
  }, [fetchPet, fetchInventory]);

  const triggerAnimation = (type: string) => {
    setAnimation(type);
    setTimeout(() => setAnimation(null), 1000);
  };

  const handleCreatePet = async () => {
    if (!petName.trim()) {
      toast({
        title: "Name required",
        description: "Please enter a name for your pet",
        variant: "destructive",
      });
      return;
    }

    setInteracting(true);
    try {
      const res = await publicVirtualPetApi.createPet(slug, clientId, {
        name: petName.trim(),
        type: selectedPetType,
      });
      setPet(res.data);
      setShowCreateDialog(false);
      toast({
        title: "🎉 Pet Created!",
        description: `Welcome ${petName}! Take good care of your new friend!`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to create pet",
        variant: "destructive",
      });
    } finally {
      setInteracting(false);
    }
  };

  const handlePlay = async (action: "pet" | "play" | "cuddle" = "pet") => {
    if (!pet) return;

    setInteracting(true);
    try {
      const res = await publicVirtualPetApi.playWithPet(slug, clientId, { action });
      const result: PetInteractionResult = res.data;
      setPet(result.pet);
      triggerAnimation(action);

      let toastTitle = result.message;
      if (result.leveledUp) {
        toastTitle += ` 🎉 Level ${result.newLevel}!`;
      }
      if (result.stageEvolved) {
        toastTitle += ` ✨ Evolved to ${result.newStage}!`;
      }

      toast({
        title: toastTitle,
        description: result.rewards
          ? Object.entries(result.rewards)
              .filter(([_, v]) => v !== undefined)
              .map(([k, v]) => `${k}: ${(v as number) > 0 ? "+" : ""}${v}`)
              .join(" • ")
          : undefined,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to interact with pet",
        variant: "destructive",
      });
    } finally {
      setInteracting(false);
    }
  };

  const handleFeed = async (itemId: string) => {
    if (!pet) return;

    setInteracting(true);
    try {
      const res = await publicVirtualPetApi.feedPet(slug, clientId, itemId);
      const result: PetInteractionResult = res.data;
      setPet(result.pet);
      triggerAnimation("feed");
      fetchInventory();

      let toastTitle = result.message;
      if (result.leveledUp) {
        toastTitle += ` 🎉 Level ${result.newLevel}!`;
      }
      if (result.stageEvolved) {
        toastTitle += ` ✨ Evolved to ${result.newStage}!`;
      }

      toast({
        title: toastTitle,
        description: result.rewards
          ? Object.entries(result.rewards)
              .filter(([_, v]) => v !== undefined)
              .map(([k, v]) => `${k}: ${(v as number) > 0 ? "+" : ""}${v}`)
              .join(" • ")
          : undefined,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to feed pet",
        variant: "destructive",
      });
    } finally {
      setInteracting(false);
    }
  };

  const handlePlayWithToy = async (toyId: string) => {
    if (!pet) return;

    setInteracting(true);
    try {
      const res = await publicVirtualPetApi.playWithPet(slug, clientId, { toyId });
      const result: PetInteractionResult = res.data;
      setPet(result.pet);
      triggerAnimation("play");

      toast({
        title: result.message,
        description: result.rewards
          ? Object.entries(result.rewards)
              .filter(([_, v]) => v !== undefined)
              .map(([k, v]) => `${k}: ${(v as number) > 0 ? "+" : ""}${v}`)
              .join(" • ")
          : undefined,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to play with toy",
        variant: "destructive",
      });
    } finally {
      setInteracting(false);
    }
  };

  if (loading) {
    return (
      <Card className={compact ? "w-full" : ""}>
        <CardContent className="p-6 flex items-center justify-center min-h-[200px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  // No pet yet - show create option
  if (!pet) {
    return (
      <>
        <Card className={compact ? "w-full" : ""}>
          <CardContent className="p-6 text-center">
            <div className="text-6xl mb-4">🥚</div>
            <h3 className="font-semibold text-lg mb-2">Adopt a Virtual Pet!</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Create your own pet companion and watch it grow with every appointment!
            </p>
            <Button onClick={() => setShowCreateDialog(true)}>
              <Sparkles className="mr-2 h-4 w-4" />
              Create Pet
            </Button>
          </CardContent>
        </Card>

        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Your Pet</DialogTitle>
              <DialogDescription>
                Choose a pet type and give it a name!
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Pet Name</label>
                <Input
                  value={petName}
                  onChange={(e) => setPetName(e.target.value)}
                  placeholder="Enter pet name"
                  maxLength={20}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Pet Type</label>
                <div className="grid grid-cols-5 gap-2">
                  {(Object.keys(petEmojis) as PetType[]).map((type) => (
                    <button
                      key={type}
                      onClick={() => setSelectedPetType(type)}
                      className={`p-3 rounded-lg border-2 transition-all ${
                        selectedPetType === type
                          ? "border-primary bg-primary/10"
                          : "border-muted hover:border-primary/50"
                      }`}
                    >
                      <div className="text-2xl text-center">{petEmojis[type].baby}</div>
                      <div className="text-xs text-center mt-1">{petTypeNames[type]}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreatePet} disabled={interacting}>
                {interacting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Pet
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  // Render pet widget
  const petEmoji = petEmojis[pet.type][pet.stage];
  const moodEmoji = moodEmojis[pet.mood];
  const foodItems = inventory.filter((i) => i.type === "food");
  const toyItems = inventory.filter((i) => i.type === "toy");

  if (compact) {
    return (
      <Card className="w-full overflow-hidden">
        <div className="bg-gradient-to-r from-purple-100 to-pink-100 dark:from-purple-900/30 dark:to-pink-900/30 p-4">
          <div className="flex items-center gap-4">
            {/* Pet Display */}
            <div
              className={`text-5xl transition-transform duration-300 ${
                animation === "pet"
                  ? "scale-110"
                  : animation === "play"
                  ? "animate-bounce"
                  : animation === "cuddle"
                  ? "animate-pulse"
                  : animation === "feed"
                  ? "scale-125"
                  : ""
              }`}
            >
              {petEmoji}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h4 className="font-semibold truncate">{pet.name}</h4>
                <Badge variant="secondary" className="text-xs">
                  Lv.{pet.level}
                </Badge>
                <span>{moodEmoji}</span>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div className="flex items-center gap-1">
                  <Utensils className="h-3 w-3 text-orange-500" />
                  <Progress value={pet.hunger} className="h-1.5 flex-1" />
                </div>
                <div className="flex items-center gap-1">
                  <Heart className="h-3 w-3 text-pink-500" />
                  <Progress value={pet.happiness} className="h-1.5 flex-1" />
                </div>
                <div className="flex items-center gap-1">
                  <Zap className="h-3 w-3 text-yellow-500" />
                  <Progress value={pet.energy} className="h-1.5 flex-1" />
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex gap-1">
              <Button
                size="icon"
                variant="ghost"
                onClick={() => handlePlay("pet")}
                disabled={interacting}
                title="Pet"
              >
                <Hand className="h-4 w-4" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => setShowInventoryDialog(true)}
                title="Inventory"
              >
                <Package className="h-4 w-4" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => setShowShopDialog(true)}
                title="Shop"
              >
                <ShoppingBag className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Inventory Dialog */}
        <InventoryDialog
          open={showInventoryDialog}
          onOpenChange={setShowInventoryDialog}
          inventory={inventory}
          pet={pet}
          onFeed={handleFeed}
          onPlayWithToy={handlePlayWithToy}
          interacting={interacting}
        />

        {/* Shop Dialog */}
        <ShopDialog
          open={showShopDialog}
          onOpenChange={setShowShopDialog}
          slug={slug}
          clientId={clientId}
          clientPoints={clientPoints}
          petLevel={pet.level}
          onPurchase={() => {
            fetchInventory();
            onPointsChange?.(clientPoints);
          }}
        />
      </Card>
    );
  }

  // Full size pet widget
  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <span className="text-2xl">{petEmoji}</span>
              {pet.name}
            </CardTitle>
            <div className="flex items-center gap-2">
              <Badge variant="outline">Level {pet.level}</Badge>
              <Badge className="capitalize">{pet.stage}</Badge>
              <span title={`Mood: ${pet.mood}`}>{moodEmoji}</span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Pet Display Area */}
          <div className="relative bg-gradient-to-b from-sky-100 to-green-100 dark:from-sky-900/20 dark:to-green-900/20 rounded-xl p-8 min-h-[200px] flex items-center justify-center">
            {/* Playground items */}
            {pet.playgroundItems.map((item, i) => {
              const invItem = inventory.find((inv) => inv.itemId === item.itemId);
              return invItem ? (
                <div
                  key={i}
                  className="absolute text-2xl"
                  style={{
                    left: `${item.x}%`,
                    top: `${item.y}%`,
                    transform: `translate(-50%, -50%) rotate(${item.rotation || 0}deg)`,
                  }}
                >
                  {invItem.emoji}
                </div>
              ) : null;
            })}

            {/* Pet */}
            <div
              className={`text-8xl transition-all duration-300 ${
                animation === "pet"
                  ? "scale-110 rotate-3"
                  : animation === "play"
                  ? "animate-bounce"
                  : animation === "cuddle"
                  ? "animate-pulse scale-110"
                  : animation === "feed"
                  ? "scale-125"
                  : "hover:scale-105"
              }`}
            >
              {petEmoji}
            </div>

            {/* Accessories */}
            {pet.accessories.length > 0 && (
              <div className="absolute top-2 right-2 flex gap-1">
                {pet.accessories.map((acc, i) => {
                  const item = inventory.find((inv) => inv.itemId === acc);
                  return item ? (
                    <span key={i} title={item.name}>
                      {item.emoji}
                    </span>
                  ) : null;
                })}
              </div>
            )}
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-1">
                  <Utensils className="h-4 w-4 text-orange-500" />
                  Hunger
                </span>
                <span>{pet.hunger}%</span>
              </div>
              <Progress
                value={pet.hunger}
                className="h-2"
              />
            </div>
            <div className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-1">
                  <Heart className="h-4 w-4 text-pink-500" />
                  Happiness
                </span>
                <span>{pet.happiness}%</span>
              </div>
              <Progress
                value={pet.happiness}
                className="h-2"
              />
            </div>
            <div className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-1">
                  <Zap className="h-4 w-4 text-yellow-500" />
                  Energy
                </span>
                <span>{pet.energy}%</span>
              </div>
              <Progress
                value={pet.energy}
                className="h-2"
              />
            </div>
          </div>

          {/* Experience */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-1">
                <Star className="h-4 w-4 text-purple-500" />
                Experience
              </span>
              <span className="text-muted-foreground">
                {pet.experienceToNextLevel} XP to next level
              </span>
            </div>
            <Progress
              value={
                (pet.experience /
                  (pet.experience + pet.experienceToNextLevel)) *
                100
              }
              className="h-2"
            />
          </div>

          {/* Interaction Buttons */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <Button
              variant="outline"
              onClick={() => handlePlay("pet")}
              disabled={interacting}
            >
              <Hand className="mr-2 h-4 w-4" />
              Pet
            </Button>
            <Button
              variant="outline"
              onClick={() => handlePlay("play")}
              disabled={interacting || pet.energy < 10}
            >
              <Gamepad2 className="mr-2 h-4 w-4" />
              Play
            </Button>
            <Button
              variant="outline"
              onClick={() => handlePlay("cuddle")}
              disabled={interacting}
            >
              <Heart className="mr-2 h-4 w-4" />
              Cuddle
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowInventoryDialog(true)}
            >
              <Package className="mr-2 h-4 w-4" />
              Inventory
            </Button>
          </div>

          {/* Shop Button */}
          <Button
            className="w-full"
            onClick={() => setShowShopDialog(true)}
          >
            <ShoppingBag className="mr-2 h-4 w-4" />
            Pet Shop ({clientPoints} points)
          </Button>
        </CardContent>
      </Card>

      {/* Inventory Dialog */}
      <InventoryDialog
        open={showInventoryDialog}
        onOpenChange={setShowInventoryDialog}
        inventory={inventory}
        pet={pet}
        onFeed={handleFeed}
        onPlayWithToy={handlePlayWithToy}
        interacting={interacting}
      />

      {/* Shop Dialog */}
      <ShopDialog
        open={showShopDialog}
        onOpenChange={setShowShopDialog}
        slug={slug}
        clientId={clientId}
        clientPoints={clientPoints}
        petLevel={pet.level}
        onPurchase={() => {
          fetchInventory();
          onPointsChange?.(clientPoints);
        }}
      />
    </>
  );
}

// Inventory Dialog Component
function InventoryDialog({
  open,
  onOpenChange,
  inventory,
  pet,
  onFeed,
  onPlayWithToy,
  interacting,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  inventory: InventoryItem[];
  pet: VirtualPet;
  onFeed: (itemId: string) => void;
  onPlayWithToy: (toyId: string) => void;
  interacting: boolean;
}) {
  const foodItems = inventory.filter((i) => i.type === "food");
  const toyItems = inventory.filter((i) => i.type === "toy");
  const accessoryItems = inventory.filter((i) => i.type === "accessory");
  const decorationItems = inventory.filter((i) => i.type === "decoration");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Inventory</DialogTitle>
          <DialogDescription>
            Use items to interact with {pet.name}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4 max-h-96 overflow-y-auto">
          {/* Food */}
          {foodItems.length > 0 && (
            <div>
              <h4 className="font-medium mb-2 flex items-center gap-2">
                <Utensils className="h-4 w-4" />
                Food
              </h4>
              <div className="grid grid-cols-2 gap-2">
                {foodItems.map((item) => (
                  <Button
                    key={item.id}
                    variant="outline"
                    className="h-auto p-3 justify-start"
                    onClick={() => onFeed(item.itemId)}
                    disabled={interacting}
                  >
                    <span className="text-xl mr-2">{item.emoji}</span>
                    <div className="text-left">
                      <div className="text-sm font-medium">{item.name}</div>
                      <div className="text-xs text-muted-foreground">
                        x{item.quantity}
                      </div>
                    </div>
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* Toys */}
          {toyItems.length > 0 && (
            <div>
              <h4 className="font-medium mb-2 flex items-center gap-2">
                <Gamepad2 className="h-4 w-4" />
                Toys
              </h4>
              <div className="grid grid-cols-2 gap-2">
                {toyItems.map((item) => (
                  <Button
                    key={item.id}
                    variant="outline"
                    className="h-auto p-3 justify-start"
                    onClick={() => onPlayWithToy(item.itemId)}
                    disabled={interacting || pet.energy < 10}
                  >
                    <span className="text-xl mr-2">{item.emoji}</span>
                    <div className="text-left">
                      <div className="text-sm font-medium">{item.name}</div>
                      <div className="text-xs text-muted-foreground">
                        x{item.quantity}
                      </div>
                    </div>
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* Accessories */}
          {accessoryItems.length > 0 && (
            <div>
              <h4 className="font-medium mb-2 flex items-center gap-2">
                <Sparkles className="h-4 w-4" />
                Accessories
              </h4>
              <div className="grid grid-cols-2 gap-2">
                {accessoryItems.map((item) => (
                  <div
                    key={item.id}
                    className={`p-3 rounded-lg border ${
                      pet.accessories.includes(item.itemId)
                        ? "border-primary bg-primary/10"
                        : ""
                    }`}
                  >
                    <span className="text-xl mr-2">{item.emoji}</span>
                    <span className="text-sm">{item.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Decorations */}
          {decorationItems.length > 0 && (
            <div>
              <h4 className="font-medium mb-2">Decorations</h4>
              <div className="grid grid-cols-2 gap-2">
                {decorationItems.map((item) => (
                  <div key={item.id} className="p-3 rounded-lg border">
                    <span className="text-xl mr-2">{item.emoji}</span>
                    <span className="text-sm">{item.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {inventory.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <Package className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>Your inventory is empty</p>
              <p className="text-sm">Visit the shop to buy items!</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Shop Dialog Component
function ShopDialog({
  open,
  onOpenChange,
  slug,
  clientId,
  clientPoints,
  petLevel,
  onPurchase,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  slug: string;
  clientId: string;
  clientPoints: number;
  petLevel: number;
  onPurchase: () => void;
}) {
  const { toast } = useToast();
  const [shopItems, setShopItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [buying, setBuying] = useState<string | null>(null);
  const [points, setPoints] = useState(clientPoints);

  useEffect(() => {
    if (open) {
      fetchShop();
    }
  }, [open]);

  const fetchShop = async () => {
    setLoading(true);
    try {
      const res = await publicVirtualPetApi.getShop(slug, clientId);
      setShopItems(res.data.items);
      setPoints(res.data.clientPoints);
    } catch (error) {
      console.error("Failed to fetch shop", error);
    } finally {
      setLoading(false);
    }
  };

  const handleBuy = async (itemId: string) => {
    setBuying(itemId);
    try {
      const res = await publicVirtualPetApi.buyItem(slug, clientId, itemId);
      if (res.data.success) {
        toast({
          title: "🛒 Purchase successful!",
          description: res.data.message,
        });
        setPoints(res.data.remainingPoints);
        fetchShop();
        onPurchase();
      } else {
        toast({
          title: "Purchase failed",
          description: res.data.message,
          variant: "destructive",
        });
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to buy item",
        variant: "destructive",
      });
    } finally {
      setBuying(null);
    }
  };

  const rarityColors = {
    common: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200",
    uncommon: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
    rare: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
    legendary: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
  };

  const categories = ["food", "toy", "accessory", "decoration"];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[80vh]">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>Pet Shop</DialogTitle>
            <Badge variant="outline" className="text-lg">
              💰 {points} pts
            </Badge>
          </div>
          <DialogDescription>
            Spend your points on food, toys, and accessories!
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 overflow-y-auto max-h-[60vh] pr-2">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : (
            categories.map((category) => {
              const items = shopItems.filter((i) => i.type === category);
              if (items.length === 0) return null;

              return (
                <div key={category}>
                  <h4 className="font-medium mb-2 capitalize flex items-center gap-2">
                    {category === "food" && <Utensils className="h-4 w-4" />}
                    {category === "toy" && <Gamepad2 className="h-4 w-4" />}
                    {category === "accessory" && <Sparkles className="h-4 w-4" />}
                    {category === "decoration" && "🏠"}
                    {category}
                  </h4>
                  <div className="grid gap-2">
                    {items.map((item) => (
                      <div
                        key={item.id}
                        className={`p-3 rounded-lg border flex items-center gap-3 ${
                          !item.canPurchase ? "opacity-60" : ""
                        }`}
                      >
                        <span className="text-3xl">{item.emoji}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{item.name}</span>
                            <Badge
                              className={`text-xs ${
                                rarityColors[item.rarity as keyof typeof rarityColors]
                              }`}
                            >
                              {item.rarity}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground line-clamp-1">
                            {item.description}
                          </p>
                          {item.effect && (
                            <p className="text-xs text-primary">
                              {Object.entries(item.effect)
                                .map(([k, v]) => `${k}: ${(v as number) > 0 ? "+" : ""}${v}`)
                                .join(" • ")}
                            </p>
                          )}
                          {!item.canPurchase && item.reason && (
                            <p className="text-xs text-destructive">{item.reason}</p>
                          )}
                        </div>
                        <Button
                          size="sm"
                          onClick={() => handleBuy(item.id)}
                          disabled={!item.canPurchase || buying === item.id}
                        >
                          {buying === item.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            `${item.price} pts`
                          )}
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default VirtualPetWidget;
