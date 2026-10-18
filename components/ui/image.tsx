"use client";

import * as React from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";

interface ImageProps extends React.ComponentPropsWithoutRef<typeof Image> {}

const ImageComponent = React.forwardRef<HTMLImageElement, ImageProps>(
  ({ className, ...props }, ref) => (
    <Image ref={ref} className={cn(className)} {...props} />
  )
);
ImageComponent.displayName = "Image";

export { ImageComponent as Image };