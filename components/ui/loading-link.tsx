"use client";

import Link, { LinkProps } from "next/link";
import { useGlobalLoader } from "@/components/global-loader-provider";
import { cn } from "@/lib/utils";
import React from "react";

interface LoadingLinkProps extends LinkProps {
  children: React.ReactNode;
  className?: string;
  onClick?: (e: React.MouseEvent<HTMLAnchorElement, MouseEvent>) => void;
}

export function LoadingLink({ children, onClick, ...props }: LoadingLinkProps) {
  const { showLoader } = useGlobalLoader();

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement, MouseEvent>) => {
    if (onClick) onClick(e);
    showLoader();
  };

  return (
    <Link {...props} onClick={handleClick}>
      {children}
    </Link>
  );
}
