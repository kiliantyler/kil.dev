import { Button, type ButtonProps } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import * as React from "react";

interface LinkButtonProps extends Omit<ButtonProps, "asChild"> {
  href: string;
  external?: boolean;
  children: React.ReactNode;
  className?: string;
}

function LinkButton({
  href,
  external = false,
  children,
  className,
  ...props
}: LinkButtonProps) {
  const linkProps = external
    ? { target: "_blank", rel: "noopener noreferrer" }
    : {};

  return (
    <Button asChild className={cn(className)} {...props}>
      <a href={href} {...linkProps}>
        {children}
      </a>
    </Button>
  );
}

export { LinkButton };
