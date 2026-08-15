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
} from "@/components/ui/breadcrumb";
import { getFilePath, useEditor } from "@/lib/hooks/use-editor";

export const FileBreadcrumbs = ({
  projectId,
}: {
  projectId: string;
}) => {
  const { activeTabId } = useEditor(projectId);

  const files = useFilesStore(
    (state) => state.files[projectId] ?? []
  );

  if (!activeTabId) {
    return (
      <div className="flex h-8.75 items-center border-b bg-sidebar pl-4">
        <Breadcrumb>
          <BreadcrumbList className="gap-0.5">
            <BreadcrumbItem className="text-sm">
              <BreadcrumbPage>&nbsp;</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </div>
    );
  }

  const filePath = getFilePath(files, activeTabId);

  return (
    <div className="flex h-8.75 items-center border-b bg-sidebar pl-4">
      <Breadcrumb>
        <BreadcrumbList className="gap-0.5">
          {filePath.map((item, index) => {
            const isLast = index === filePath.length - 1;

            return (
              <React.Fragment key={item.id}>
                <BreadcrumbItem className="text-sm">
                  {isLast ? (
                    <BreadcrumbPage className="flex items-center gap-1">
                      <FileIcon
                        fileName={item.name}
                        autoAssign
                        className="size-4"
                      />
                      {item.name}
                    </BreadcrumbPage>
                  ) : (
                    <BreadcrumbLink href="#">
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
    </div>
  );
};