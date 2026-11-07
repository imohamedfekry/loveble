import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@loveble/ui/card";

export function AuthCard({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
      <Card className="w-full gap-5 rounded-2xl border border-border bg-card shadow-(--karlek-shadow-card) ring-0">
        <CardHeader className="gap-1.5 px-6 pt-6 text-center">
          <CardTitle className="text-center text-[22px] font-semibold tracking-[-0.025em]">{title}</CardTitle>
          {description && (
            <CardDescription className="text-[13px] text-muted-foreground">
              {description}
            </CardDescription>
          )}
        </CardHeader>
        <CardContent className="px-6">{children}</CardContent>
      </Card>
  );
}
