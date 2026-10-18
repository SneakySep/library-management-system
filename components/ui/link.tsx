import * as React from "react";
import LinkPrimitive from "next/link";
import { cn } from "@/lib/utils";

interface LinkProps extends React.ComponentPropsWithoutRef<typeof LinkPrimitive> {
  className?: string;
}

const Link = React.forwardRef<HTMLAnchorElement, LinkProps>(
  ({ className, children, ...props }, ref) => (
    <LinkPrimitive
      ref={ref}
      className={cn(className, "text-primary underline-offset-4 hover:underline")}
      {...props}
    >
      {children}
    </LinkPrimitive>
  )
);
Link.displayName = "Link";

export { Link };