import * as React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { getMappingConfigs, addMappingField, deleteMappingField, MappingField } from "@/lib/mapping";
import { PlusCircle, Trash2, Edit } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface MappingFieldListProps {
  configId: string;
  activeFieldId: string | null;
  onFieldSelect: (fieldId: string) => void;
}

export function MappingFieldList({ configId, activeFieldId, onFieldSelect }: MappingFieldListProps) {
  const [fields, setFields] = React.useState<MappingField[]>([]);
  const [showAddField, setShowAddField] = React.useState(false);
  const [newFieldName, setNewFieldName] = React.useState("");
  const [newFieldDescription, setNewFieldDescription] = React.useState("");
  const [editingField, setEditingField] = React.useState<string | null>(null);
  const [editName, setEditName] = React.useState("");
  const [editDescription, setEditDescription] = React.useState("");

  // 필드 목록 로드
  React.useEffect(() => {
    const configs = getMappingConfigs();
    const config = configs.find(c => c.id === configId);
    if (config) {
      setFields(config.fields || []);
    }
  }, [configId]);

  // 새 필드 추가
  const handleAddField = () => {
    if (!newFieldName.trim()) return;

    const fieldId = `field-${Date.now()}`;
    const newField: MappingField = {
      id: fieldId,
      name: newFieldName.trim(),
      description: newFieldDescription.trim(),
      sourceFields: [],
    };

    addMappingField(configId, newField);
    
    // 필드 목록 새로고침
    const configs = getMappingConfigs();
    const config = configs.find(c => c.id === configId);
    if (config) {
      setFields(config.fields || []);
      // 새 필드 선택
      onFieldSelect(fieldId);
    }
    
    // 입력 폼 초기화
    setNewFieldName("");
    setNewFieldDescription("");
    setShowAddField(false);
  };

  // 필드 삭제
  const handleDeleteField = (fieldId: string) => {
    if (!confirm("이 필드를 삭제하시겠습니까?")) return;
    
    deleteMappingField(configId, fieldId);
    
    // 필드 목록 새로고침
    const configs = getMappingConfigs();
    const config = configs.find(c => c.id === configId);
    if (config) {
      setFields(config.fields || []);
      // 첫 번째 필드 선택 또는 선택 초기화
      if (config.fields && config.fields.length > 0) {
        onFieldSelect(config.fields[0].id);
      }
    }
  };

  // 편집 시작
  const handleStartEdit = (field: MappingField) => {
    setEditingField(field.id);
    setEditName(field.name);
    setEditDescription(field.description || "");
  };

  // 편집 완료
  const handleFinishEdit = () => {
    if (!editingField || !editName.trim()) {
      setEditingField(null);
      return;
    }

    // 필드 업데이트
    const configs = getMappingConfigs();
    const config = configs.find(c => c.id === configId);
    if (config && config.fields) {
      const fieldIndex = config.fields.findIndex(f => f.id === editingField);
      if (fieldIndex >= 0) {
        const updatedField = {
          ...config.fields[fieldIndex],
          name: editName.trim(),
          description: editDescription.trim()
        };
        
        config.fields[fieldIndex] = updatedField;
        sessionStorage.setItem("mappingConfigs", JSON.stringify(configs));
        
        // 필드 목록 새로고침
        setFields(config.fields);
      }
    }
    
    setEditingField(null);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">매핑 필드</CardTitle>
        <Button 
          size="sm" 
          variant="outline" 
          className="gap-1"
          onClick={() => setShowAddField(true)}
        >
          <PlusCircle className="h-4 w-4" />
          새 필드
        </Button>
      </CardHeader>
      <CardContent>
        {showAddField ? (
          <div className="space-y-4 mb-4 p-3 border rounded-md">
            <div className="space-y-2">
              <Label htmlFor="new-field-name">필드명</Label>
              <Input
                id="new-field-name"
                value={newFieldName}
                onChange={(e) => setNewFieldName(e.target.value)}
                placeholder="예: 고객명, 제품코드"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-field-description">설명 (선택사항)</Label>
              <Textarea
                id="new-field-description"
                value={newFieldDescription}
                onChange={(e) => setNewFieldDescription(e.target.value)}
                placeholder="이 필드에 대한 설명을 입력하세요"
                rows={2}
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowAddField(false)}>
                취소
              </Button>
              <Button onClick={handleAddField}>
                추가
              </Button>
            </div>
          </div>
        ) : null}
        
        <ScrollArea className="h-[500px]">
          <div className="space-y-2">
            {fields.length > 0 ? (
              fields.map((field) => (
                <div
                  key={field.id}
                  className={`p-3 border rounded-md ${
                    activeFieldId === field.id ? 'bg-muted' : ''
                  }`}
                >
                  {editingField === field.id ? (
                    <div className="space-y-2">
                      <Input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                      />
                      <Textarea
                        value={editDescription}
                        onChange={(e) => setEditDescription(e.target.value)}
                        rows={2}
                      />
                      <div className="flex justify-end gap-2">
                        <Button 
                          variant="outline"
                          size="sm"
                          onClick={() => setEditingField(null)}
                        >
                          취소
                        </Button>
                        <Button 
                          size="sm"
                          onClick={handleFinishEdit}
                        >
                          저장
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div className="flex justify-between items-start">
                        <div
                          className="flex-1 cursor-pointer"
                          onClick={() => onFieldSelect(field.id)}
                        >
                          <div className="font-medium">{field.name}</div>
                          {field.description && (
                            <div className="text-sm text-muted-foreground">
                              {field.description}
                            </div>
                          )}
                          <div className="text-xs text-muted-foreground mt-1">
                            매핑된 필드: {field.sourceFields.length}개
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={() => handleStartEdit(field)}
                          >
                            <Edit className="h-4 w-4" />
                            <span className="sr-only">편집</span>
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive h-8 w-8 p-0"
                            onClick={() => handleDeleteField(field.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                            <span className="sr-only">삭제</span>
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                매핑 필드가 없습니다. "새 필드" 버튼을 클릭하여 필드를 추가하세요.
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
} 