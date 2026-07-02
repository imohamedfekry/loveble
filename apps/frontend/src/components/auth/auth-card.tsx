import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { BrandPageShell } from "@/components/layout/brand-page-shell";

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
    <BrandPageShell>
      <Card className="surface-card w-full shadow-lg ring-border/40">
        <CardHeader className="gap-1 text-center">
          <CardTitle className="text-center">{title}</CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
        </CardHeader>
        <CardContent>{children}</CardContent>
      </Card>
    </BrandPageShell>
  );
}
