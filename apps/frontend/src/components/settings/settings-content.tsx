"use client";

import * as React from "react";
import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { GithubConnectButton } from "@/components/user/github-connect-button";
import { useGithubAccount } from "@/components/user/hooks/useGithubAccount";
import { useUserStore } from "@/store/user.store";
import { FaGithub } from "react-icons/fa";
import { useSettingsStore } from "@/store/settings.store";
import { cn } from "@/lib/utils";
import { SettingsRow } from "./settings-row";
import { SettingsSectionHeader } from "./settings-section-header";

function AccountSection() {
  const user = useUserStore((s) => s.user);
  const { github } = useGithubAccount();
  const activeSubSection = useSettingsStore((s) => s.activeSubSection);

  const showSecurity = activeSubSection === "security";

  return (
    <div className="space-y-8">
      {!showSecurity && (
        <section className="space-y-4">
          <SettingsSectionHeader
            title="Profile"
            description="Manage your public profile information."
          />

          <div className="space-y-2">
            <SettingsRow label="Avatar">
              <Avatar className="size-10">
                {github?.avatar_url && (
                  <AvatarImage src={github.avatar_url} alt={user?.username} />
                )}
                <AvatarFallback>
                  {user?.username?.slice(0, 2).toUpperCase() ?? "U"}
                </AvatarFallback>
              </Avatar>
            </SettingsRow>

            <SettingsRow
              label="Username"
              description="Your display name across loveble."
            >
              <span className="text-sm text-muted-foreground">
                {user?.username ?? "—"}
              </span>
            </SettingsRow>

            <SettingsRow
              label="Email"
              description="Used for account notifications."
            >
              <span className="text-sm text-muted-foreground">
                {user?.email ?? "—"}
              </span>
            </SettingsRow>
          </div>
        </section>
      )}

      {showSecurity && (
        <section className="space-y-4">
          <SettingsSectionHeader
            title="Security"
            description="Manage your account security settings."
          />

          <div className="space-y-2">
            <SettingsRow
              label="Password"
              description="Change your account password."
            >
              <Button variant="outline" size="sm" disabled>
                Edit
              </Button>
            </SettingsRow>

            <SettingsRow
              label="Two-Factor Authentication"
              description="Add an extra layer of security."
            >
              <Button variant="outline" size="sm" disabled>
                Enable
              </Button>
            </SettingsRow>
          </div>
        </section>
      )}

      {!showSecurity && (
        <section className="space-y-4">
          <SettingsSectionHeader
            title="Account Info"
            description="Additional details about your account."
          />

          <div className="space-y-2">
            <SettingsRow label="Country">
              <span className="text-sm text-muted-foreground">
                {user?.country ?? "Not set"}
              </span>
            </SettingsRow>

            <SettingsRow label="Mobile">
              <span className="text-sm text-muted-foreground">
                {user?.mobile ?? "Not set"}
              </span>
            </SettingsRow>
          </div>
        </section>
      )}
    </div>
  );
}

function IntegrationsSection() {
  const { github, connectGithub } = useGithubAccount();

  return (
    <div className="space-y-8">
      <section className="space-y-4">
        <SettingsSectionHeader
          title="GitHub"
          description="Connect your GitHub account to import and export projects."
        />

        <div className="space-y-2">
          <SettingsRow
            label="GitHub Account"
            description={
              github
                ? `Connected as @${github.username}`
                : "No GitHub account connected."
            }
          >
            {github ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <FaGithub className="size-4" />
                @{github.username}
              </div>
            ) : (
              <GithubConnectButton onClick={connectGithub} />
            )}
          </SettingsRow>
        </div>
      </section>
    </div>
  );
}

function NotificationsSection() {
  return (
    <div className="space-y-8">
      <section className="space-y-4">
        <SettingsSectionHeader
          title="Overview"
          description="Choose what notifications you receive."
        />

        <div className="space-y-2">
          <SettingsRow
            label="Project updates"
            description="Get notified when your projects finish importing or exporting."
          >
            <Switch defaultChecked />
          </SettingsRow>

          <SettingsRow
            label="Email notifications"
            description="Receive important updates via email."
          >
            <Switch />
          </SettingsRow>

          <SettingsRow
            label="Sound effects"
            description="Play sounds for notifications."
          >
            <Switch defaultChecked />
          </SettingsRow>
        </div>
      </section>
    </div>
  );
}

const THEME_OPTIONS = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
] as const;

type ThemeOptionValue = (typeof THEME_OPTIONS)[number]["value"];

function AppearanceSection() {
  const { theme, setTheme } = useTheme();
  const current = (theme ?? "system") as ThemeOptionValue;

  return (
    <div className="space-y-8">
      <section className="space-y-4">
        <SettingsSectionHeader
          title="Theme"
          description="Customize how loveble looks on your device."
        />

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          {THEME_OPTIONS.map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              type="button"
              aria-pressed={current === value}
              onClick={() => setTheme(value)}
              className={cn(
                "flex flex-col items-center gap-2 rounded-lg border px-4 py-3 text-sm transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
                current === value
                  ? "border-primary bg-primary/10 text-foreground"
                  : "border-input bg-transparent text-muted-foreground hover:bg-accent hover:text-foreground",
              )}
            >
              <Icon className="size-5" />
              <span>{label}</span>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}

export function SettingsContent() {
  const activeSection = useSettingsStore((s) => s.activeSection);

  switch (activeSection) {
    case "account":
      return <AccountSection />;
    case "integrations":
      return <IntegrationsSection />;
    case "notifications":
      return <NotificationsSection />;
    case "appearance":
      return <AppearanceSection />;
    default:
      return <AccountSection />;
  }
}
