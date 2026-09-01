"use client";

import * as AvatarPrimitive from "@radix-ui/react-avatar";
import { cn } from "@/utils/cn";

interface UserAvatarProps {
  /** Public URL of the avatar image, or null/undefined for fallback */
  src?: string | null;
  /** Display name — used to derive initials */
  name?: string | null;
  /** Email fallback for initials when name is absent */
  email?: string | null;
  /** Tailwind size class applied to root — defaults to 16×16 (h-16 w-16) */
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}

const sizeClasses: Record<NonNullable<UserAvatarProps["size"]>, string> = {
  sm: "h-7 w-7 text-[10px]",
  md: "h-10 w-10 text-xs",
  lg: "h-16 w-16 text-xl",
  xl: "h-24 w-24 text-3xl",
};

function getInitials(name?: string | null, email?: string | null): string {
  if (name && name.trim()) {
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0][0].toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  if (email) return email[0].toUpperCase();
  return "?";
}

export function UserAvatar({
  src,
  name,
  email,
  size = "lg",
  className,
}: Readonly<UserAvatarProps>) {
  const initials = getInitials(name, email);
  const sizeClass = sizeClasses[size];

  return (
    <AvatarPrimitive.Root
      className={cn(
        "relative inline-flex shrink-0 select-none items-center justify-center overflow-hidden rounded-full",
        sizeClass,
        className
      )}
    >
      <AvatarPrimitive.Image
        src={src ?? undefined}
        alt={name ?? "User avatar"}
        className="h-full w-full object-cover"
      />
      <AvatarPrimitive.Fallback
        className="flex h-full w-full items-center justify-center rounded-full bg-blue-600/20 border border-blue-500/30 font-extrabold text-blue-400"
        delayMs={0}
      >
        {initials}
      </AvatarPrimitive.Fallback>
    </AvatarPrimitive.Root>
  );
}
