import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { useMappingStore } from '@/store/mapping';

interface FieldDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  field?: {
    id: string;
    name: string;
    description?: string;
    required?: boolean;
  };
}

export function FieldDialog({ open, onOpenChange, field }: FieldDialogProps) {
  const { activeConfigId, addField, updateField } = useMappingStore();
  const [name, setName] = React.useState(field?.name || '');
  const [description, setDescription] = React.useState(field?.description || '');
  const [required, setRequired] = React.useState(field?.required || false);

  // 다이얼로그가 열릴 때마다 필드 정보로 폼 초기화
  React.useEffect(() => {
    if (open) {
      setName(field?.name || '');
      setDescription(field?.description || '');
      setRequired(field?.required || false);
    }
  }, [open, field]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!activeConfigId) return;
    
    if (field?.id) {
      // 기존 필드 업데이트
      updateField(activeConfigId, field.id, {
        name,
        description,
        required,
      });
      console.log('필드 업데이트됨:', { id: field.id, name, description, required });
    } else {
      // 새 필드 생성
      const newFieldId = addField(activeConfigId, {
        name,
        description,
        required,
      });
      console.log('새 필드 생성됨:', { id: newFieldId, name, description, required });
    }
    
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {field ? '필드 수정' : '새 필드 추가'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">필드명 *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="예: 이름, 이메일, 전화번호"
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">설명</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="필드에 대한 설명을 입력하세요"
                rows={3}
              />
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="required"
                checked={required}
                onCheckedChange={(checked) => setRequired(checked === true)}
              />
              <Label htmlFor="required">필수 필드</Label>
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">
                취소
              </Button>
            </DialogClose>
            <Button type="submit" disabled={!name.trim()}>
              {field ? '저장' : '추가'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
} 