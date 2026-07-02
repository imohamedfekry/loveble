"use client";

import Image from "next/image";
import Link from "next/link";
import { Poppins } from "next/font/google";

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
} from "@/components/ui/breadcrumb";

import { cn } from "@/lib/utils";
import { UserAvatarButton } from "../user/user-avatar";

const font = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export function Navbar() {
  return (
    <nav className="flex items-center justify-between gap-x-2 border-b border-border/50 bg-sidebar/80 px-3 py-2 backdrop-blur-md">
      <div className="flex items-center gap-x-2">
        <Breadcrumb>
          <BreadcrumbList className="gap-0!">
            <BreadcrumbItem>
              <BreadcrumbLink
                render={
                  <Link
                    href="/"
                    className="flex items-center gap-1.5"
                  >
                    <Image
                      src="/logo.svg"
                      alt="Logo"
                      width={20}
                      height={20}
                    />

                    <span
                      className={cn(
                        "text-sm font-medium",
                        font.className
                      )}
                    >
                      Squadra
                    </span>
                  </Link>
                }
              />
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </div>

      <div className="flex items-center gap-2">
        <UserAvatarButton />
      </div>
    </nav>
  );
}