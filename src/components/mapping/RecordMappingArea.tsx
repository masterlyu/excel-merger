import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useMappingStore } from '@/store/mapping';
import { StandardField } from '@/types/mapping';

export function RecordMappingArea() {
  const { configs, activeConfigId, selectedStandardFieldId } = useMappingStore();
  
  const activeConfig = configs.find((c: { id: string }) => c.id === activeConfigId);
  const selectedField = activeConfig?.standardFields.find(
    (f: { id: string }) => f.id === selectedStandardFieldId
  );

  if (!activeConfig) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>레코드 매핑</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500">
            매핑 설정을 선택하거나 생성해주세요.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (!selectedField) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>레코드 매핑</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500">
            왼쪽에서 표준 필드를 선택하면 레코드를 매핑할 수 있습니다.
          </p>
        </CardContent>
      </Card>
    );
  }

  const mappedRecords = activeConfig.records[selectedField.id] || [];

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div>
          <CardTitle>{selectedField.name} 레코드 매핑</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            {selectedField.description}
          </p>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* 매핑된 레코드 목록 */}
          <div>
            <h3 className="text-sm font-medium mb-2">매핑된 레코드</h3>
            <ScrollArea className="h-[200px] rounded-md border p-2">
              {mappedRecords.length > 0 ? (
                <div className="space-y-2">
                  {mappedRecords.map((record: { sourceField: string; rules?: any[] }) => (
                    <div
                      key={record.sourceField}
                      className="flex items-center justify-between p-2 rounded-lg bg-muted"
                    >
                      <div>
                        <div className="font-medium">{record.sourceField}</div>
                        {record.rules && record.rules.length > 0 && (
                          <div className="text-xs text-muted-foreground mt-1">
                            변환 규칙: {record.rules.length}개 적용됨
                          </div>
                        )}
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button variant="ghost" size="sm">
                          규칙 편집
                        </Button>
                        <Button variant="ghost" size="sm" className="text-destructive">
                          삭제
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  아직 매핑된 레코드가 없습니다.
                </p>
              )}
            </ScrollArea>
          </div>

          {/* 매핑 규칙 설명 */}
          <div className="rounded-lg bg-muted p-4">
            <h3 className="text-sm font-medium mb-2">매핑 규칙</h3>
            <ul className="text-sm space-y-1 text-muted-foreground">
              <li>• 엑셀 파일을 업로드하면 자동으로 유사한 레코드를 찾아 매핑합니다.</li>
              <li>• 여러 레코드를 조합하여 하나의 표준 필드로 매핑할 수 있습니다.</li>
              <li>• 매핑된 레코드는 저장되어 다음 파일 업로드 시 자동으로 적용됩니다.</li>
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  );
} 