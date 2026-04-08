"use client";

import { Button } from "@/components/ui/button";
import { User as UserIcon, UserPlus } from "lucide-react";

interface EmptyStateProps {
  message: string;
  onCreateClick?: () => void;
  buttonText?: string;
}

export function EmptyState({ message, onCreateClick, buttonText }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="rounded-full bg-muted p-4 mb-4">
        <UserIcon className="h-8 w-8 text-muted-foreground" />
      </div>
      <p className="text-muted-foreground text-sm mb-4 max-w-sm">{message}</p>
      {onCreateClick && buttonText && (
        <Button onClick={onCreateClick}>
          <UserPlus className="h-4 w-4 mr-2" />
          {buttonText}
        </Button>
      )}
    </div>
  );
}
