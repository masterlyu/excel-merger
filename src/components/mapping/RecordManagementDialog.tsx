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
import { ScrollArea } from '@/components/ui/scroll-area';
import { Trash2, Edit2 } from 'lucide-react';
import { useMappingStore } from '@/store/mapping';
import { Field, Record } from '@/types/mapping';

interface RecordManagementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  field: Field;
}

export function RecordManagementDialog({
  open,
  onOpenChange,
  field,
}: RecordManagementDialogProps) {
  const { activeConfigId, addRecord, updateRecord, deleteRecord } = useMappingStore();
  const [newRecord, setNewRecord] = React.useState('');
  const [editingRecord, setEditingRecord] = React.useState<Record | null>(null);

  const handleAddRecord = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeConfigId || !newRecord.trim()) return;

    // 이미 존재하는 레코드인지 확인
    const isDuplicate = field.records.some(
      record => record.name.toLowerCase() === newRecord.trim().toLowerCase()
    );

    if (!isDuplicate) {
      addRecord(activeConfigId, field.id, {
        name: newRecord.trim(),
      });
      setNewRecord('');
    }
  };

  const handleEditRecord = (record: Record) => {
    setEditingRecord(record);
  };

  const handleUpdateRecord = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeConfigId || !editingRecord || !editingRecord.name.trim()) return;

    // 다른 레코드와 이름이 중복되는지 확인
    const isDuplicate = field.records.some(
      r => r.id !== editingRecord.id && 
          r.name.toLowerCase() === editingRecord.name.trim().toLowerCase()
    );

    if (!isDuplicate) {
      updateRecord(activeConfigId, field.id, editingRecord.id, {
        name: editingRecord.name.trim(),
        description: editingRecord.description,
      });
      setEditingRecord(null);
    }
  };

  const handleDeleteRecord = (recordId: string) => {
    if (!activeConfigId) return;
    if (confirm('이 레코드를 삭제하시겠습니까?')) {
      deleteRecord(activeConfigId, field.id, recordId);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {field.name} 필드의 레코드 관리
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* 새 레코드 추가 폼 */}
          <form onSubmit={handleAddRecord} className="flex gap-2">
            <div className="flex-1">
              <Label htmlFor="newRecord" className="sr-only">
                새 레코드 추가
              </Label>
              <Input
                id="newRecord"
                value={newRecord}
                onChange={(e) => setNewRecord(e.target.value)}
                placeholder="새 레코드 이름을 입력하세요"
              />
            </div>
            <Button type="submit">추가</Button>
          </form>

          {/* 레코드 목록 */}
          <div className="border rounded-lg">
            <ScrollArea className="h-[300px] p-4">
              {field.records.length > 0 ? (
                <ul className="space-y-2">
                  {field.records.map((record) => (
                    <li
                      key={record.id}
                      className="flex items-center justify-between p-2 bg-secondary/20 rounded"
                    >
                      {editingRecord?.id === record.id ? (
                        <form
                          onSubmit={handleUpdateRecord}
                          className="flex-1 flex items-center gap-2"
                        >
                          <Input
                            value={editingRecord.name}
                            onChange={(e) =>
                              setEditingRecord({
                                ...editingRecord,
                                name: e.target.value,
                              })
                            }
                            placeholder="레코드 이름"
                          />
                          <Button type="submit" size="sm">
                            저장
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setEditingRecord(null)}
                          >
                            취소
                          </Button>
                        </form>
                      ) : (
                        <>
                          <span>{record.name}</span>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEditRecord(record)}
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteRecord(record.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </>
                      )}
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="text-center text-muted-foreground py-8">
                  등록된 레코드가 없습니다
                </div>
              )}
            </ScrollArea>
          </div>
        </div>

        <DialogFooter>
          <Button onClick={() => onOpenChange(false)}>
            닫기
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 