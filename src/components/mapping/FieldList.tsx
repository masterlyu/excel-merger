import React from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { useMappingStore } from '@/store/mapping';
import { Plus, Pencil } from 'lucide-react';
import { FieldDialog } from './FieldDialog';
import { Field, MappingConfig } from '@/store/mapping';

export function FieldList() {
  const { activeConfigId, configs, selectedFieldId, setSelectedField } = useMappingStore();
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [selectedEditField, setSelectedEditField] = React.useState<Field | null>(null);

  // 현재 활성화된 매핑 설정 가져오기
  const activeConfig = configs.find((c: MappingConfig) => c.id === activeConfigId);

  const handleAddField = () => {
    setSelectedEditField(null);
    setDialogOpen(true);
  };

  const handleEditField = (field: Field) => {
    setSelectedEditField(field);
    setDialogOpen(true);
  };

  if (!activeConfigId) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground">
        매핑 설정을 선택해주세요
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between p-4 border-b">
        <div>
          <h2 className="text-lg font-semibold">표준 필드</h2>
          <p className="text-sm text-muted-foreground">
            데이터를 매핑할 필드를 선택하세요
          </p>
        </div>
        <Button size="sm" onClick={handleAddField}>
          <Plus className="h-4 w-4 mr-1" /> 추가
        </Button>
      </div>

      {activeConfig?.fields.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center p-4">
            <p className="text-muted-foreground mb-4">
              아직 추가된 필드가 없습니다
            </p>
            <Button onClick={handleAddField}>
              <Plus className="h-4 w-4 mr-1" /> 필드 추가
            </Button>
          </div>
        </div>
      ) : (
        <ScrollArea className="flex-1">
          <div className="p-4 space-y-2">
            {activeConfig?.fields.map((field: Field) => (
              <div
                key={field.id}
                className={`
                  p-3 rounded-lg border cursor-pointer 
                  ${selectedFieldId === field.id ? 'bg-primary/10 border-primary' : 'bg-card hover:bg-muted/50'}
                `}
                onClick={() => setSelectedField(field.id)}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">
                      {field.name}
                      {field.required && <span className="text-red-500 ml-1">*</span>}
                    </div>
                    {field.description && (
                      <div className="text-sm text-muted-foreground">
                        {field.description}
                      </div>
                    )}
                    <div className="text-xs text-muted-foreground mt-1">
                      매핑: {field.mappings?.length || 0}개
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e: React.MouseEvent) => {
                      e.stopPropagation();
                      handleEditField(field);
                    }}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      )}

      <FieldDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        field={selectedEditField || undefined}
      />
    </div>
  );
} 