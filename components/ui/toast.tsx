"use client";

import * as React from "react";
import * as ToastPrimitive from "@radix-ui/react-toast";
import { cn } from "@/lib/utils";

export const Toaster = ToastPrimitive.Provider;

const ToastViewport = React.forwardRef<
  React.ElementRef<typeof ToastPrimitive.Viewport>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitive.Viewport>
>(({ className, ...props }, ref) => (
  <ToastPrimitive.Viewport
    ref={ref}
    className={cn(
      "fixed top-0 z-[100] flex max-h-screen w-full flex-col-reverse p-4 sm:bottom-0 sm:right-0 sm:top-auto sm:flex-col",
      className
    )}
    {...props}
  />
));
ToastViewport.displayName = ToastPrimitive.Viewport.displayName;

const Toast = React.forwardRef<
  React.ElementRef<typeof ToastPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitive.Root>
>(({ className, ...props }, ref) => (
  <ToastPrimitive.Root
    ref={ref}
    className={cn(
      "group/pointer-events-flex flex flex-col items-center w-full p-4 text-default shadow-xl duration-200 data-[swipe-cancel]:translate-x-0 data-[swipe-end]:translate-x-[var(--radix-toast-swipe-end-x)] data-[state=open]:animate-in data-[state=closed]:animate-out data-[swipe-end]:animate-out data-[discrete=open]:slide-in-from-top-2 data-[discrete=closed]:slide-out-to-bottom-2 pointer-events-auto sm:data-[discrete=open]:slide-in-from-bottom-2 sm:data-[discrete=closed]:slide-out-to-top-2",
      className
    )}
    {...props}
  >
    <ToastPrimitive.Title className="mb-1 font-medium" />
    <ToastPrimitive.Description className="text-sm text-muted-foreground" />
    <ToastPrimitive.Close className="ml-auto h-4 w-4" />
    <ToastPrimitive.Action altText="Toast action" className="pt-2" />
  </ToastPrimitive.Root>
));
Toast.displayName = ToastPrimitive.Root.displayName;

export { ToastViewport, Toast, ToastPrimitive };