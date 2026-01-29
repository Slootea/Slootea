"use client";

import React, { useState, useRef, useCallback } from "react";
import ReactCrop, {
  type Crop,
  centerCrop,
  makeAspectCrop,
} from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Upload, X, ZoomIn, RotateCw, ImageIcon, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface ImageCropUploadProps {
  value?: string;
  onChange: (base64: string | undefined) => void;
  aspectRatio?: number;
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  className?: string;
  placeholder?: string;
  disabled?: boolean;
}

function centerAspectCrop(
  mediaWidth: number,
  mediaHeight: number,
  aspect: number
): Crop {
  return centerCrop(
    makeAspectCrop(
      {
        unit: "%",
        width: 90,
      },
      aspect,
      mediaWidth,
      mediaHeight
    ),
    mediaWidth,
    mediaHeight
  );
}

export function ImageCropUpload({
  value,
  onChange,
  aspectRatio = 16 / 9,
  maxWidth = 800,
  maxHeight = 600,
  quality = 0.85,
  className,
  placeholder = "Click to upload image",
  disabled = false,
}: ImageCropUploadProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [imgSrc, setImgSrc] = useState("");
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<Crop>();
  const [scale, setScale] = useState(1);
  const [rotate, setRotate] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const onSelectFile = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
        setCrop(undefined);
        setScale(1);
        setRotate(0);
        const reader = new FileReader();
        reader.addEventListener("load", () => {
          setImgSrc(reader.result?.toString() || "");
          setDialogOpen(true);
        });
        reader.readAsDataURL(e.target.files[0]);
      }
    },
    []
  );

  const onImageLoad = useCallback(
    (e: React.SyntheticEvent<HTMLImageElement>) => {
      const { width, height } = e.currentTarget;
      setCrop(centerAspectCrop(width, height, aspectRatio));
    },
    [aspectRatio]
  );

  const getCroppedImg = useCallback(async (): Promise<string> => {
    const image = imgRef.current;
    if (!image || !completedCrop) {
      throw new Error("No image or crop data");
    }

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      throw new Error("No 2d context");
    }

    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;

    const pixelCrop = {
      x: (completedCrop.x ?? 0) * scaleX,
      y: (completedCrop.y ?? 0) * scaleY,
      width: (completedCrop.width ?? 0) * scaleX,
      height: (completedCrop.height ?? 0) * scaleY,
    };

    // Calculate output dimensions (respect max width/height while maintaining aspect ratio)
    let outputWidth = pixelCrop.width;
    let outputHeight = pixelCrop.height;

    if (outputWidth > maxWidth) {
      outputHeight = (maxWidth / outputWidth) * outputHeight;
      outputWidth = maxWidth;
    }
    if (outputHeight > maxHeight) {
      outputWidth = (maxHeight / outputHeight) * outputWidth;
      outputHeight = maxHeight;
    }

    canvas.width = outputWidth;
    canvas.height = outputHeight;

    ctx.imageSmoothingQuality = "high";

    const centerX = outputWidth / 2;
    const centerY = outputHeight / 2;

    ctx.save();

    // Move to center
    ctx.translate(centerX, centerY);
    ctx.rotate((rotate * Math.PI) / 180);
    ctx.scale(scale, scale);
    ctx.translate(-centerX, -centerY);

    // Draw the cropped portion
    ctx.drawImage(
      image,
      pixelCrop.x,
      pixelCrop.y,
      pixelCrop.width,
      pixelCrop.height,
      0,
      0,
      outputWidth,
      outputHeight
    );

    ctx.restore();

    return canvas.toDataURL("image/jpeg", quality);
  }, [completedCrop, maxWidth, maxHeight, quality, rotate, scale]);

  const handleSave = useCallback(async () => {
    try {
      setIsProcessing(true);
      const croppedImage = await getCroppedImg();
      onChange(croppedImage);
      setDialogOpen(false);
      setImgSrc("");
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (error) {
      console.error("Error cropping image:", error);
    } finally {
      setIsProcessing(false);
    }
  }, [getCroppedImg, onChange]);

  const handleRemove = useCallback(() => {
    onChange(undefined);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, [onChange]);

  const handleCancel = useCallback(() => {
    setDialogOpen(false);
    setImgSrc("");
    setCrop(undefined);
    setCompletedCrop(undefined);
    setScale(1);
    setRotate(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, []);

  const handleRotate = useCallback(() => {
    setRotate((prev) => (prev + 90) % 360);
  }, []);

  return (
    <div className={cn("space-y-2", className)}>
      <input
        type="file"
        ref={fileInputRef}
        accept="image/*"
        onChange={onSelectFile}
        className="hidden"
        disabled={disabled}
      />

      {value ? (
        <div className="relative group">
          <div className="aspect-video bg-muted rounded-lg overflow-hidden border">
            <img
              src={value}
              alt="Uploaded"
              className="w-full h-full object-cover"
            />
          </div>
          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={disabled}
            >
              <Upload className="h-4 w-4 mr-1" />
              Change
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={handleRemove}
              disabled={disabled}
            >
              <X className="h-4 w-4 mr-1" />
              Remove
            </Button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled}
          className={cn(
            "aspect-video w-full bg-muted rounded-lg border-2 border-dashed border-muted-foreground/25 hover:border-muted-foreground/50 transition-colors flex flex-col items-center justify-center gap-2 text-muted-foreground",
            disabled && "opacity-50 cursor-not-allowed hover:border-muted-foreground/25"
          )}
        >
          <ImageIcon className="h-8 w-8" />
          <span className="text-sm">{placeholder}</span>
        </button>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Crop Image</DialogTitle>
            <DialogDescription>
              Adjust the crop area and zoom level, then save your changes.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {imgSrc && (
              <div className="flex justify-center bg-muted rounded-lg p-4 max-h-[400px] overflow-hidden">
                <ReactCrop
                  crop={crop}
                  onChange={(_, percentCrop) => setCrop(percentCrop)}
                  onComplete={(c) => setCompletedCrop(c)}
                  aspect={aspectRatio}
                  className="max-h-[360px]"
                >
                  <img
                    ref={imgRef}
                    alt="Crop preview"
                    src={imgSrc}
                    onLoad={onImageLoad}
                    style={{
                      transform: `scale(${scale}) rotate(${rotate}deg)`,
                      maxHeight: "360px",
                      width: "auto",
                    }}
                    className="max-w-full"
                  />
                </ReactCrop>
              </div>
            )}

            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-2">
                    <ZoomIn className="h-4 w-4" />
                    Zoom
                  </Label>
                  <span className="text-sm text-muted-foreground">
                    {Math.round(scale * 100)}%
                  </span>
                </div>
                <Slider
                  value={[scale]}
                  onValueChange={([value]) => setScale(value)}
                  min={0.5}
                  max={3}
                  step={0.1}
                  className="w-full"
                />
              </div>

              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2">
                  <RotateCw className="h-4 w-4" />
                  Rotate
                </Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleRotate}
                >
                  Rotate 90°
                </Button>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={handleCancel}>
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSave}
              disabled={!completedCrop || isProcessing}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                "Save Image"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
