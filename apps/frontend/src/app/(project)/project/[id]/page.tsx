"use client";

import Link from "next/link";
import { useParams } from "next/navigation";

export default function ProjectPage() {
  const params = useParams();
  const projectId = params.id;

  return (
    <div className="p-6 space-y-6">
      <Link
        href="/dashboard"
        className="text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        ← Back to dashboard
      </Link>

      <h1 className="text-2xl font-bold text-white">Project Page</h1>
      <p className="text-gray-400">This is the project page.</p>
      <p className="text-lg text-gray-300">Project ID: {projectId}</p>
    </div>
  );
}
