"use client";

import { Button } from "@/components/ui/button";
import { FaGithub } from "react-icons/fa";

type Props = {
  onClick: () => void;
};

export function GithubConnectButton({ onClick }: Props) {
  return (
    <Button onClick={onClick} size="sm" className="rounded-lg shadow-sm">
      <FaGithub />
      Connect GitHub
    </Button>
  );
}
