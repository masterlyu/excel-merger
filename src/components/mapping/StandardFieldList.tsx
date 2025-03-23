import React from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Settings, Plus, Database } from 'lucide-react';
import { useMappingStore } from '@/store/mapping';
import { Field } from '@/store/mapping';
import { StandardFieldDialog } from './StandardFieldDialog';
import { RecordManagementDialog } from './RecordManagementDialog';
import { toast } from 'react-hot-toast';

export function StandardFieldList() {
  const { activeConfigId, configs, setSelectedField: setActiveField } = useMappingStore();
  const [openFieldDialog, setOpenFieldDialog] = React.useState(false);
  const [selectedField, setSelectedField] = React.useState<Field | null>(null);
  const [openRecordDialog, setOpenRecordDialog] = React.useState(false);

  // 현재 활성화된 매핑 설정 가져오기
  const activeConfig = configs.find((c: { id: string }) => c.id === activeConfigId);
  const fields = activeConfig?.fields || [];

  const handleFieldClick = (field: Field) => {
    setActiveField(field.id);
  };

  const handleEditField = (field: Field) => {
    setSelectedField(field);
    setOpenFieldDialog(true);
  };

  const handleManageRecords = (field: Field) => {
    setSelectedField(field);
    setOpenRecordDialog(true);
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between p-4 border-b">
        <h2 className="text-lg font-semibold">표준 필드</h2>
        <Button
          onClick={() => {
            // 현재는 타입 호환성 문제로 인해 비활성화
            // setSelectedField(null);
            // setOpenFieldDialog(true);
            toast.error("필드 추가 기능은 현재 사용할 수 없습니다.");
          }}
          disabled={!activeConfigId}
        >
          <Plus className="h-4 w-4 mr-1" />
          필드 추가
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-2">
          {fields.map((field: Field) => (
            <div
              key={field.id}
              className="flex items-center justify-between p-3 bg-card rounded-lg border hover:border-primary/50 cursor-pointer"
              onClick={() => handleFieldClick(field)}
            >
              <div className="flex-1">
                <h3 className="font-medium">{field.name}</h3>
                {field.description && (
                  <p className="text-sm text-muted-foreground">{field.description}</p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={(e) => {
                    e.stopPropagation();
                    // 현재는 타입 호환성 문제로 인해 비활성화
                    // handleManageRecords(field);
                    toast.error("레코드 관리 기능은 현재 사용할 수 없습니다.");
                  }}
                >
                  <Database className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleEditField(field);
                  }}
                >
                  <Settings className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}

          {fields.length === 0 && activeConfigId && (
            <div className="text-center text-muted-foreground py-8">
              등록된 표준 필드가 없습니다
            </div>
          )}

          {!activeConfigId && (
            <div className="text-center text-muted-foreground py-8">
              매핑 설정을 선택하거나 생성해주세요
            </div>
          )}
        </div>
      </ScrollArea>

      {/* 표준 필드 다이얼로그 - 현재 타입 호환성 문제로 주석 처리 */}
      {/* <StandardFieldDialog
        open={openFieldDialog}
        onOpenChange={setOpenFieldDialog}
        field={selectedField}
      /> */}

      {/* 레코드 관리 다이얼로그 - 현재 타입 호환성 문제로 주석 처리 */}
      {/* {selectedField && (
        <RecordManagementDialog
          open={openRecordDialog}
          onOpenChange={setOpenRecordDialog}
          field={selectedField}
        />
      )} */}
    </div>
  );
} 