import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useMappingStore } from '@/store/mapping';
import { Field } from '@/store/mapping';

interface StandardFieldDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  field: Field | null;
}

export function StandardFieldDialog({
  open,
  onOpenChange,
  field,
}: StandardFieldDialogProps) {
  const { activeConfigId, addField, updateField } = useMappingStore();
  const [name, setName] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [type, setType] = React.useState('text');
  const [required, setRequired] = React.useState(false);

  // 필드 정보 초기화
  React.useEffect(() => {
    if (field) {
      setName(field.name);
      setDescription(field.description || '');
      // 필드에 type 속성이 없으면 기본값 'text' 사용
      setType((field as any).type || 'text');
      setRequired(!!field.required);
    } else {
      setName('');
      setDescription('');
      setType('text');
      setRequired(false);
    }
  }, [field]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeConfigId || !name.trim()) return;

    const fieldData = {
      name: name.trim(),
      description: description.trim() || undefined,
      type,
      required,
    };

    if (field) {
      updateField(activeConfigId, field.id, fieldData);
    } else {
      addField(activeConfigId, fieldData);
    }

    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {field ? '표준 필드 수정' : '새 표준 필드 추가'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">필드 이름</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="예: 고객명"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">설명 (선택사항)</Label>
              <Input
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="예: 고객의 실명을 입력하는 필드입니다"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="type">필드 타입</Label>
              <Select value={type} onValueChange={(value) => setType(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="text">텍스트</SelectItem>
                  <SelectItem value="number">숫자</SelectItem>
                  <SelectItem value="date">날짜</SelectItem>
                  <SelectItem value="combined">복합</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="required"
                checked={required}
                onCheckedChange={setRequired}
              />
              <Label htmlFor="required">필수 필드</Label>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              취소
            </Button>
            <Button type="submit">
              {field ? '수정' : '추가'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
} 