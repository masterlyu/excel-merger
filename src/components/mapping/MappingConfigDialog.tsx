import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createMappingConfig, saveMappingConfig, MappingConfig } from "@/lib/mapping";
import { Plus, Trash2 } from "lucide-react";

interface MappingConfigDialogProps {
  children?: React.ReactNode;
  config?: MappingConfig; // 업데이트 시 기존 config를 전달
  onComplete?: () => void;
}

export function MappingConfigDialog({
  children,
  config,
  onComplete
}: MappingConfigDialogProps) {
  const [open, setOpen] = React.useState(false);
  const [name, setName] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [targetFields, setTargetFields] = React.useState<string[]>([]);
  const [newField, setNewField] = React.useState("");

  // 다이얼로그 열릴 때 데이터 초기화
  React.useEffect(() => {
    if (open) {
      if (config) {
        setName(config.name);
        setDescription(config.description || "");
        // 기존 매핑에서 타겟 필드 추출
        const fields = config.fieldMaps?.map(map => map.targetField.name) || [];
        setTargetFields([...new Set(fields)]); // 중복 제거
      } else {
        setName("");
        setDescription("");
        setTargetFields([]);
      }
      setNewField("");
    }
  }, [open, config]);

  // 필드 추가 함수
  const addField = () => {
    if (!newField.trim()) return;
    if (targetFields.includes(newField.trim())) {
      alert("이미 존재하는 필드명입니다.");
      return;
    }
    setTargetFields([...targetFields, newField.trim()]);
    setNewField("");
  };

  // Enter 키 처리
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addField();
    }
  };

  // 필드 삭제 함수
  const removeField = (index: number) => {
    const updatedFields = [...targetFields];
    updatedFields.splice(index, 1);
    setTargetFields(updatedFields);
  };

  // 폼 제출 처리
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) {
      alert("매핑 구성 이름을 입력해주세요.");
      return;
    }

    if (targetFields.length === 0) {
      alert("최소 하나 이상의 타겟 필드를 추가해주세요.");
      return;
    }

    if (config) {
      // 기존 매핑 업데이트 (기존 매핑 유지하면서 메타데이터만 업데이트)
      console.log("매핑 설정 업데이트:", { ...config, name, description, targetFields });
      
      // 기존 필드맵 유지하면서 새로운 필드 추가
      const existingTargetNames = config.fieldMaps?.map(map => map.targetField.name) || [];
      const newTargetFields = targetFields.filter(field => !existingTargetNames.includes(field));
      
      // 새로운 필드맵 생성
      const newFieldMaps = [
        ...(config.fieldMaps || []),
        ...newTargetFields.map(fieldName => ({
          id: `field_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
          sourceFields: [], // 빈 배열로 초기화
          targetField: {
            name: fieldName,
            description: "",
            type: "string"
          }
        }))
      ];
      
      // 삭제된 필드 제거
      const filteredFieldMaps = newFieldMaps.filter(map => 
        targetFields.includes(map.targetField.name)
      );
      
      saveMappingConfig({
        ...config,
        name,
        description,
        updated: Date.now(),
        fieldMaps: filteredFieldMaps,
      });
      console.log("매핑 설정이 업데이트 되었습니다:", name);
    } else {
      // 새로운 매핑 생성
      const newConfig = createMappingConfig(name, description);
      
      // 타겟 필드 추가
      const fieldMaps = targetFields.map(fieldName => ({
        id: `field_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        sourceFields: [], // 빈 배열로 초기화
        targetField: {
          name: fieldName,
          description: "",
          type: "string"
        }
      }));
      
      newConfig.fieldMaps = fieldMaps;
      saveMappingConfig(newConfig);
      onComplete?.();
      console.log("새 매핑 설정이 생성되었습니다:", name);
    }
    
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button variant="outline" size="sm" className="gap-1">
            <Plus className="h-4 w-4" />
            새 매핑 구성
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {config ? "매핑 설정 편집" : "새 매핑 설정 만들기"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">매핑 이름</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="매핑 이름을 입력하세요"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">설명 (선택사항)</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="매핑에 대한 설명을 입력하세요"
              rows={3}
            />
          </div>
          
          {/* 타겟 필드 추가 섹션 */}
          <div className="space-y-2">
            <Label htmlFor="targetFields">타겟 필드 (레코드)</Label>
            <div className="flex space-x-2">
              <Input
                id="targetFields"
                value={newField}
                onChange={(e) => setNewField(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="필드 이름 입력"
                className="flex-1"
              />
              <Button 
                type="button" 
                variant="outline" 
                size="sm"
                onClick={addField}
              >
                <Plus className="h-4 w-4 mr-1" />
                추가
              </Button>
            </div>
            
            {/* 타겟 필드 목록 */}
            {targetFields.length > 0 ? (
              <div className="border rounded-md p-2 mt-2 space-y-2 max-h-[200px] overflow-y-auto">
                {targetFields.map((field, index) => (
                  <div key={index} className="flex items-center justify-between bg-muted p-2 rounded-sm">
                    <span>{field}</span>
                    <Button 
                      type="button" 
                      variant="ghost" 
                      size="sm"
                      onClick={() => removeField(index)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground p-2">아직 타겟 필드가 없습니다. 필드를 추가해주세요.</p>
            )}
          </div>
          
          <div className="flex justify-end space-x-2 pt-4">
            <DialogClose asChild>
              <Button type="button" variant="outline">
                취소
              </Button>
            </DialogClose>
            <Button type="submit">
              {config ? "저장" : "생성"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
} 