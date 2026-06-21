"use client";

import { useGithubAccount } from "./hooks/useGithubAccount";
import { GithubConnectButton } from "./github-connect-button";
import { GithubUserMenu } from "./github-user-menu";

export function GithubAccountButton() {
  const { github, connectGithub } = useGithubAccount();

  if (github) return <GithubUserMenu account={github} />;

  return <GithubConnectButton onClick={connectGithub} />;
}
