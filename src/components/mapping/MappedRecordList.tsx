import * as React from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { loadMappingConfigs, MappingConfig, FieldMap, removeSourceField } from "@/lib/mapping";
import { Droppable, Draggable } from "@hello-pangea/dnd";

interface MappingTarget {
  configId: string;
  fieldId: string; // 이 ID는 FieldMap의 id
}

interface MappedRecordListProps {
  configId?: string;
  fieldId?: string | null;
  onFieldSelect?: (fieldId: string) => void;
}

export function MappedRecordList({ configId, fieldId, onFieldSelect }: MappedRecordListProps) {
  // 매핑 설정 목록 가져오기
  const [configs, setConfigs] = React.useState<MappingConfig[]>([]);
  const [activeTarget, setActiveTarget] = React.useState<MappingTarget | null>(null);
  const [activeField, setActiveField] = React.useState<FieldMap | undefined>(undefined);

  // 매핑 설정 로드
  React.useEffect(() => {
    const loadedConfigs = loadMappingConfigs();
    setConfigs(loadedConfigs);
    
    // props로 전달된 설정과 필드를 우선 사용
    if (configId && fieldId) {
      setActiveTarget({
        configId,
        fieldId
      });
    } 
    // 없으면 첫 번째 설정과 필드를 기본 선택
    else if (loadedConfigs.length > 0) {
      const firstConfig = loadedConfigs[0];
      // fieldMaps 배열에서 첫 번째 항목 선택
      const firstField = firstConfig.fieldMaps?.[0];
      
      if (firstField) {
        setActiveTarget({
          configId: firstConfig.id,
          fieldId: firstField.id
        });
        
        // 부모 컴포넌트에 선택된 필드 알림
        if (onFieldSelect) {
          onFieldSelect(firstField.id);
        }
      }
    }
  }, [configId, fieldId, onFieldSelect]);

  // 활성 타겟이 변경될 때 해당 필드 로드
  React.useEffect(() => {
    if (!activeTarget) return;
    
    const config = configs.find(c => c.id === activeTarget.configId);
    if (!config) return;
    
    const field = config.fieldMaps?.find(f => f.id === activeTarget.fieldId);
    if (field) {
      setActiveField(field);
    }
  }, [activeTarget, configs]);

  // 매핑 삭제 함수
  const handleDeleteMapping = (sourceFieldId: string, sourceFieldName: string, fileId: string, sheetName: string) => {
    if (!activeTarget || !activeField) return;
    
    // removeSourceField 함수 호출로 매핑 삭제
    removeSourceField(
      activeTarget.configId,
      activeField.targetField.name,
      fileId,
      sourceFieldName
    );
    
    // 설정 다시 로드
    const updatedConfigs = loadMappingConfigs();
    setConfigs(updatedConfigs);
    
    // 활성 필드 업데이트
    const updatedConfig = updatedConfigs.find(c => c.id === activeTarget.configId);
    if (updatedConfig) {
      const updatedField = updatedConfig.fieldMaps?.find(f => f.id === activeTarget.fieldId);
      setActiveField(updatedField);
    }
  };

  if (!configs.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>매핑 필드</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center text-muted-foreground py-4">
            매핑 설정이 없습니다. 먼저 매핑 설정을 생성해주세요.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (!activeField) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>매핑 필드</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center text-muted-foreground py-4">
            선택된 필드가 없습니다. 먼저 필드를 선택해주세요.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex flex-col">
          <span>{activeField.targetField.name}</span>
          <span className="text-xs text-muted-foreground">
            {activeField?.sourceFields?.length || 0}개 매핑됨
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px] pr-3">
          <Droppable
            droppableId="mapped-fields"
            isDropDisabled={true}
          >
            {(provided) => (
              <div
                {...provided.droppableProps}
                ref={provided.innerRef}
              >
                <div className="p-2 space-y-2">
                  {activeField?.sourceFields?.length > 0 ? (
                    activeField.sourceFields?.map((sourceField, index) => (
                      <Draggable
                        key={sourceField.fileId + sourceField.fieldName}
                        draggableId={`mapped-${sourceField.fileId}-${sourceField.fieldName}`}
                        index={index}
                        isDragDisabled={true}
                      >
                        {(provided) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            className="rounded-md border bg-card p-3 flex items-center justify-between"
                          >
                            <div className="font-medium text-sm">{sourceField.fieldName}</div>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-destructive h-8 w-8 p-0"
                              onClick={() => handleDeleteMapping(
                                sourceField.fileId,
                                sourceField.fieldName,
                                sourceField.fileId,
                                sourceField.sheetName
                              )}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                      </Draggable>
                    ))
                  ) : (
                    <p className="text-center text-muted-foreground py-4">
                      아직 매핑된 필드가 없습니다.
                    </p>
                  )}
                  {provided.placeholder}
                </div>
              </div>
            )}
          </Droppable>
        </ScrollArea>
      </CardContent>
    </Card>
  );
} 