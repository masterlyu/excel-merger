import React from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Settings, Plus, Database } from 'lucide-react';
import { useMappingStore } from '@/store/mapping';
import { StandardField } from '@/types/mapping';
import { StandardFieldDialog } from './StandardFieldDialog';
import { RecordManagementDialog } from './RecordManagementDialog';

export function StandardFieldList() {
  const { activeConfigId, configs, setSelectedStandardField } = useMappingStore();
  const [openFieldDialog, setOpenFieldDialog] = React.useState(false);
  const [selectedField, setSelectedField] = React.useState<StandardField | null>(null);
  const [openRecordDialog, setOpenRecordDialog] = React.useState(false);

  // 현재 활성화된 매핑 설정 가져오기
  const activeConfig = configs.find((c: { id: string }) => c.id === activeConfigId);
  const standardFields = activeConfig?.standardFields || [];

  const handleFieldClick = (field: StandardField) => {
    setSelectedStandardField(field.id);
  };

  const handleEditField = (field: StandardField) => {
    setSelectedField(field);
    setOpenFieldDialog(true);
  };

  const handleManageRecords = (field: StandardField) => {
    setSelectedField(field);
    setOpenRecordDialog(true);
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between p-4 border-b">
        <h2 className="text-lg font-semibold">표준 필드</h2>
        <Button
          onClick={() => {
            setSelectedField(null);
            setOpenFieldDialog(true);
          }}
          disabled={!activeConfigId}
        >
          <Plus className="h-4 w-4 mr-1" />
          필드 추가
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-2">
          {standardFields.map((field) => (
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
                    handleManageRecords(field);
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

          {standardFields.length === 0 && activeConfigId && (
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

      {/* 표준 필드 다이얼로그 */}
      <StandardFieldDialog
        open={openFieldDialog}
        onOpenChange={setOpenFieldDialog}
        field={selectedField}
      />

      {/* 레코드 관리 다이얼로그 */}
      {selectedField && (
        <RecordManagementDialog
          open={openRecordDialog}
          onOpenChange={setOpenRecordDialog}
          standardField={selectedField}
        />
      )}
    </div>
  );
} 