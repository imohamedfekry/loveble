import React from "react";
import { FileIcon } from "@react-symbols/icons/utils";
import { useFilesStore } from "@/store/file.store";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbPage,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbSeparator,
} from "@loveble/ui/breadcrumb";
import { getFilePath, useEditor } from "@/lib/hooks/use-editor";

export const FileBreadcrumbs = ({
  projectId,
  action,
}: {
  projectId: string;
  action?: React.ReactNode;
}) => {
  const { activeTabId } = useEditor(projectId);

  const files = useFilesStore(
    (state) => state.files[projectId] ?? []
  );

  if (!activeTabId) {
    return (
      <div className="flex h-7 items-center justify-between border-b bg-sidebar pl-3 pr-2">
        <Breadcrumb>
          <BreadcrumbList className="gap-0.5">
            <BreadcrumbItem className="text-xs">
              <BreadcrumbPage>&nbsp;</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
        {action}
      </div>
    );
  }

  const filePath = getFilePath(files, activeTabId);

  return (
    <div className="flex h-7 items-center justify-between border-b bg-sidebar pl-3 pr-2">
      <Breadcrumb className="min-w-0 flex-1">
        <BreadcrumbList className="gap-0.5">
          {filePath.map((item, index) => {
            const isLast = index === filePath.length - 1;

            return (
              <React.Fragment key={item.id}>
                <BreadcrumbItem className="text-xs">
                  {isLast ? (
                    <BreadcrumbPage className="flex items-center gap-1 truncate">
                      <FileIcon
                        fileName={item.name}
                        autoAssign
                        className="size-3 shrink-0"
                      />
                      <span className="truncate">{item.name}</span>
                    </BreadcrumbPage>
                  ) : (
                    <BreadcrumbLink href="#" className="truncate">
                      {item.name}
                    </BreadcrumbLink>
                  )}
                </BreadcrumbItem>

                {!isLast && <BreadcrumbSeparator />}
              </React.Fragment>
            );
          })}
        </BreadcrumbList>
      </Breadcrumb>
      {action}
    </div>
  );
};