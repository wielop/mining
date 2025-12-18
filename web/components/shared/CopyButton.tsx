"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

export function CopyButton({
  text,
  label = "Copy",
  size = "sm",
}: {
  text: string;
  label?: string;
  size?: "sm" | "md";
}) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      size={size}
      variant="secondary"
      onClick={() => {
        void navigator.clipboard.writeText(text);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1000);
      }}
    >
      {copied ? "Copied" : label}
    </Button>
  );
}

