import * as React from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useFileStore } from "@/store/files";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Droppable, Draggable } from "@hello-pangea/dnd";
import { Info } from "lucide-react";

export function FileRecordList() {
  const { files, activeFileId, getFileHeaders } = useFileStore();
  
  // 활성 파일 가져오기
  const activeFile = files.find(f => f.id === activeFileId);
  
  // 활성 파일의 헤더(필드) 가져오기
  const headers = activeFileId ? getFileHeaders(activeFileId) : [];

  if (!activeFile) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="h-4 w-4" />
            파일을 선택하세요
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          왼쪽에서 분석할 파일을 선택하면 해당 파일의 필드가 여기에 표시됩니다.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="text-base">
          {activeFile.name} - 필드 목록
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          필드를 오른쪽 표준 필드로 드래그하여 매핑하세요
        </p>
      </CardHeader>
      <CardContent>
        <Droppable droppableId="file-fields">
          {(provided) => (
            <ScrollArea 
              className="h-[400px] rounded-md border"
              ref={provided.innerRef}
              {...provided.droppableProps}
            >
              <div className="p-2 space-y-2">
                {headers.length > 0 ? (
                  headers.map((header, index) => (
                    <Draggable key={header.id} draggableId={header.id} index={index}>
                      {(provided) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          {...provided.dragHandleProps}
                          className="rounded-md border bg-card p-3 flex items-center justify-between"
                        >
                          <div>
                            <h4 className="text-sm font-medium">{header.name}</h4>
                            {header.description && (
                              <p className="text-xs text-muted-foreground">{header.description}</p>
                            )}
                            {header.dataType && (
                              <p className="text-xs text-muted-foreground">유형: {header.dataType}</p>
                            )}
                          </div>
                        </div>
                      )}
                    </Draggable>
                  ))
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    이 파일에는 필드가 없습니다.
                  </div>
                )}
                {provided.placeholder}
              </div>
            </ScrollArea>
          )}
        </Droppable>
      </CardContent>
    </Card>
  );
} 