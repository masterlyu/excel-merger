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
    e.stopPropagation();
    
    if (!name.trim()) {
      return;
    }

    if (targetFields.length === 0) {
      alert("최소 하나 이상의 타겟 필드를 추가해주세요.");
      return;
    }

    if (config) {
      // 기존 매핑 업데이트
      const updatedConfig = {
        ...config,
        name,
        description,
        updated: Date.now(),
      };
      
      // 타겟 필드 처리
      const currentFieldNames = config.fieldMaps?.map(map => map.targetField.name) || [];
      const newTargetFields = targetFields.filter(field => !currentFieldNames.includes(field));
      
      // 새 타겟 필드 추가
      newTargetFields.forEach(fieldName => {
        const newTargetField = {
          name: fieldName,
          description: '',
          type: 'string'
        };
        
        if (!updatedConfig.fieldMaps) {
          updatedConfig.fieldMaps = [];
        }
        
        updatedConfig.fieldMaps.push({
          id: `field_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
          targetField: newTargetField,
          sourceFields: []
        });
      });
      
      // 제거된 타겟 필드 처리
      if (updatedConfig.fieldMaps) {
        updatedConfig.fieldMaps = updatedConfig.fieldMaps.filter(
          map => targetFields.includes(map.targetField.name)
        );
      }
      
      saveMappingConfig(updatedConfig);
    } else {
      // 새 매핑 생성
      createMappingConfig(name, description, targetFields);
    }
    
    setOpen(false);
    if (onComplete) {
      onComplete();
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {children && <DialogTrigger asChild>{children}</DialogTrigger>}
      <DialogContent 
        className="sm:max-w-[500px]" 
        onClick={(e) => e.stopPropagation()}
      >
        <DialogHeader>
          <DialogTitle>
            {config ? "매핑 설정 수정" : "새 매핑 설정 생성"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">매핑 이름</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onClick={(e) => e.stopPropagation()}
                placeholder="매핑 설정 이름을 입력하세요"
                required
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="description">설명 (선택사항)</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                onClick={(e) => e.stopPropagation()}
                placeholder="이 매핑 설정에 대한 설명을 입력하세요"
                className="resize-none"
              />
            </div>
            
            <div className="grid gap-2">
              <Label>타겟 필드</Label>
              <div className="flex gap-2">
                <Input
                  value={newField}
                  onChange={(e) => setNewField(e.target.value)}
                  onKeyDown={handleKeyDown}
                  onClick={(e) => e.stopPropagation()}
                  placeholder="추가할 필드 이름"
                />
                <Button 
                  type="button" 
                  variant="secondary"
                  onClick={(e) => {
                    e.stopPropagation();
                    addField();
                  }}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  추가
                </Button>
              </div>
              
              {targetFields.length > 0 ? (
                <div className="border rounded-md p-2 mt-2 space-y-2">
                  {targetFields.map((field, index) => (
                    <div 
                      key={index} 
                      className="flex justify-between items-center px-3 py-1 bg-muted rounded-sm"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <span>{field}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeField(index);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-muted-foreground mt-2">
                  타겟 필드가 없습니다. 매핑에 포함할 필드를 추가하세요.
                </div>
              )}
            </div>
          </div>
          
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={(e) => {
                e.stopPropagation();
                setOpen(false);
              }}
            >
              취소
            </Button>
            <Button 
              type="submit"
              onClick={(e) => e.stopPropagation()}
            >
              {config ? "저장" : "생성"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
} 