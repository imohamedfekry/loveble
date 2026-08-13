import Link from "next/link";
import { Button } from "@/components/ui/button";
import { BrandPageShell } from "@/components/layout/brand-page-shell";

export default function Home() {
  return (
    <BrandPageShell contentClassName="max-w-md">
      <div className="surface-card w-full space-y-5 p-6 text-center">
        <div className="space-y-3">
          <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">
            Build your{" "}
            <span className="text-primary-pulse">vibe</span> projects
            faster
          </h2>
          <p className="text-sm leading-relaxed text-muted-foreground md:text-base">
            A minimal AI-powered workspace to create, manage, and deploy your
            projects without complexity. Focus on ideas, not setup.
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
          <Button render={<Link href="/login" />}>Get Started</Button>
          <Button variant="outline" render={<Link href="/register" />}>
            Create Account
          </Button>
        </div>

        <p className="text-xs text-muted-foreground">
          No setup required · Fast · Minimal · Developer friendly
        </p>
      </div>
    </BrandPageShell>
  );
}