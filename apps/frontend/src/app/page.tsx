import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <main className="min-h-screen bg-background text-foreground flex items-center justify-center px-6">
      <div className="max-w-2xl text-center space-y-6">

        {/* Logo / Brand */}
        <div className="flex justify-center">
          <div className="size-12 rounded-xl bg-accent flex items-center justify-center">
            <span className="text-lg font-bold text-foreground">V</span>
          </div>
        </div>

        {/* Title */}
        <h1 className="text-4xl md:text-5xl font-semibold tracking-tight">
          Build your vibe projects faster
        </h1>

        {/* Subtitle */}
        <p className="text-sm md:text-base text-muted-foreground leading-relaxed">
          A minimal AI-powered workspace to create, manage, and deploy your projects
          without complexity. Focus on ideas, not setup.
        </p>

        {/* Buttons */}
        <div className="flex items-center justify-center gap-3 pt-2">
          <Button className="bg-primary text-primary-foreground hover:opacity-90">
            Get Started
          </Button>

          <Button variant="outline">
            View Docs
          </Button>
        </div>

        {/* small hint */}
        <p className="text-xs text-muted-foreground pt-6">
          No setup required • Fast • Minimal • Developer friendly
        </p>

      </div>
    </main>
  );
}