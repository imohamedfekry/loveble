"use client";

import { ProjectsView } from "@/components/project/projects-view";

export default function DashboardPage() {

  // const githubAccount = user?.oauthAccounts?.find(
  //   (acc) => acc.provider === "github"
  // );

  // const handleConnectGithub = () => {
  //   window.location.href =
  //     "http://localhost:3001/api/v1/auth/github/connect";
  // };
  return (
    // <div className="p-6 space-y-6">

    //   {/* ✅ GitHub Section */}
    //   <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 flex items-center justify-between">
    //     <div className="flex items-center gap-4">
    //       {githubAccount?.avatar_url ? (
    //         <img
    //           src={githubAccount.avatar_url}
    //           className="w-12 h-12 rounded-full"
    //         />
    //       ) : (
    //         <div className="w-12 h-12 rounded-full bg-gray-700 flex items-center justify-center text-sm text-gray-300">
    //           GH
    //         </div>
    //       )}

    //       <div>
    //         <p className="text-white font-medium">
    //           {githubAccount ? "GitHub Connected" : "GitHub Not Connected"}
    //         </p>

    //         {githubAccount && (
    //           <p className="text-sm text-gray-400">
    //             ID: {githubAccount.providerId}
    //           </p>
    //         )}
    //       </div>
    //     </div>

    //     {!githubAccount && (
    //       <button
    //         onClick={handleConnectGithub}
    //         className="bg-white text-black px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-200 transition"
    //       >
    //         Connect GitHub
    //       </button>
    //     )}
    //   </div>

    //   {/* ✅ Projects */}
    //   <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
    //     {(projects ?? []).map((p) => (
    //       <div
    //         key={p.id}
    //         className="bg-gray-900 border border-gray-800 rounded-2xl p-5 shadow-md hover:shadow-xl transition duration-300"
    //       >
    //         <h1 className="text-xl font-semibold text-white mb-2">
    //           {p.name}
    //         </h1>

    //         <p className="text-sm mb-3">
    //           Import status:
    //           <span
    //             className={`ml-2 px-2 py-1 rounded text-xs font-medium ${
    //               p.importStatus === "completed"
    //                 ? "bg-green-500/20 text-green-400"
    //                 : p.importStatus === "failed"
    //                 ? "bg-red-500/20 text-red-400"
    //                 : "bg-yellow-500/20 text-yellow-400"
    //             }`}
    //           >
    //             {p.importStatus}
    //           </span>
    //         </p>

    //         <span className="text-xs text-gray-500">
    //           {new Date(p.createdAt).toLocaleString()}
    //         </span>
    //       </div>
    //     ))}
    //   </div>
    // </div>
    <>
      <ProjectsView />
    </>
  );
}