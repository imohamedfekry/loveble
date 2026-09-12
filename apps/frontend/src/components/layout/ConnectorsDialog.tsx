"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { PlugIcon, MailIcon } from "lucide-react";
import { FaGithub, FaSlack } from "react-icons/fa";
import { useGithubAccount } from "@/components/user/hooks/useGithubAccount";
import { GithubConnectButton } from "@/components/user/github-connect-button";

export function ConnectorsDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { github, connectGithub } = useGithubAccount();

  const connectors = [
    {
      id: "github",
      name: "GitHub",
      desc: "Import repos and sync code",
      icon: <FaGithub className="h-4 w-4 text-muted-foreground" />,
      connected: !!github,
      action: connectGithub,
    },
    {
      id: "slack",
      name: "Slack",
      desc: "Get notifications in your channels",
      icon: <FaSlack className="h-4 w-4 text-muted-foreground" />,
      connected: false,
      action: () => {},
    },
    {
      id: "gmail",
      name: "Gmail",
      desc: "Connect your professional email",
      icon: <MailIcon className="h-4 w-4 text-muted-foreground" />,
      connected: false,
      action: () => {},
    },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-120">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PlugIcon className="h-5 w-5 text-primary" />
            Connectors
          </DialogTitle>
          <DialogDescription>
            Connect your tools to enhance your workflow and automate projects.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 py-4">
          {connectors.map((connector) => (
            <div
              key={connector.id}
              className="flex items-center justify-between rounded-xl border border-border bg-card p-3 transition-colors hover:bg-accent/50"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted">
                  {connector.icon}
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-foreground">
                    {connector.name}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {connector.desc}
                  </span>
                </div>
              </div>

              {connector.connected ? (
                /* Brand kit has no green — connected state uses Soft Sky tint + Deep Onyx (8.59:1, AAA). */
                <div className="flex items-center gap-1.5 rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-medium text-foreground">
                  <div className="h-1 w-1 rounded-full bg-primary" />
                  Connected
                </div>
              ) : (
                connector.id === "github" ? (
                  <GithubConnectButton onClick={connector.action} />
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs"
                    onClick={connector.action}
                  >
                    Connect
                  </Button>
                )
              )}
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
