"use client";

import React, { useState, useEffect, ChangeEvent } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MappingConfig, createMappingConfig, loadMappingConfigs, saveMappingConfig, deleteMappingConfig } from '@/lib/mapping';

interface MappingConfigProps {
  onSelect: (config: MappingConfig) => void;
}

export default function MappingConfigManager({ onSelect }: MappingConfigProps) {
  const [configs, setConfigs] = useState<MappingConfig[]>([]);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newConfigName, setNewConfigName] = useState('');
  const [newConfigDescription, setNewConfigDescription] = useState('');
  const [newRecords, setNewRecords] = useState('');  // 쉼표로 구분된 레코드명

  // 매핑 설정 목록 로드
  useEffect(() => {
    const loadedConfigs = loadMappingConfigs();
    setConfigs(loadedConfigs);
  }, []);

  // 새 매핑 설정 생성
  const handleCreate = () => {
    if (!newConfigName.trim() || !newRecords.trim()) return;

    const records = newRecords.split(',').map(record => record.trim()).filter(Boolean);
    const newConfig = createMappingConfig(
      newConfigName.trim(), 
      newConfigDescription.trim(),
      records
    );
    
    saveMappingConfig(newConfig);
    setConfigs(prev => [...prev, newConfig]);
    setNewConfigName('');
    setNewConfigDescription('');
    setNewRecords('');
    setIsCreateDialogOpen(false);
    onSelect(newConfig);
  };

  // 매핑 설정 삭제
  const handleDelete = (id: string) => {
    if (!confirm('이 매핑 설정을 삭제하시겠습니까?')) return;
    deleteMappingConfig(id);
    setConfigs(prev => prev.filter(config => config.id !== id));
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">매핑 설정</h2>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline">새 매핑 설정</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>새 매핑 설정 생성</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">이름</Label>
                <Input
                  id="name"
                  value={newConfigName}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => setNewConfigName(e.target.value)}
                  placeholder="매핑 설정 이름"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">설명 (선택사항)</Label>
                <Input
                  id="description"
                  value={newConfigDescription}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => setNewConfigDescription(e.target.value)}
                  placeholder="매핑 설정에 대한 설명"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="records">표준 레코드명 (쉼표로 구분)</Label>
                <Input
                  id="records"
                  value={newRecords}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => setNewRecords(e.target.value)}
                  placeholder="예: 상품코드, 상품명, 수량, 단가, 금액"
                />
                <p className="text-sm text-gray-500">
                  쉼표(,)로 구분하여 표준 레코드명을 입력하세요.
                </p>
              </div>
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                취소
              </Button>
              <Button onClick={handleCreate}>생성</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-2">
        {configs.length === 0 ? (
          <p className="text-center text-gray-500 py-4">
            저장된 매핑 설정이 없습니다.
          </p>
        ) : (
          configs.map((config) => (
            <div
              key={config.id}
              className="flex items-center justify-between p-4 bg-white border rounded-lg hover:border-blue-500 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-medium text-gray-900 truncate">
                  {config.name}
                </h3>
                {config.description && (
                  <p className="text-sm text-gray-500 truncate">
                    {config.description}
                  </p>
                )}
                <div className="mt-1 flex flex-wrap gap-1">
                  {config.records.map((record) => (
                    <Badge key={record} variant="secondary">
                      {record}
                    </Badge>
                  ))}
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  생성: {new Date(config.createdAt).toLocaleDateString()}
                  {' • '}
                  수정: {new Date(config.updatedAt).toLocaleDateString()}
                </p>
              </div>
              <div className="flex items-center space-x-2 ml-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onSelect(config)}
                >
                  선택
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDelete(config.id)}
                  className="text-red-500 hover:text-red-700"
                >
                  삭제
                </Button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
} 