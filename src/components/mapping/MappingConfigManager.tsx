'use client';

import React, { useState, useEffect } from 'react';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import {
  Info,
  Edit,
  Trash2,
  Plus
} from 'lucide-react';
import { 
  MappingConfig, 
  loadMappingConfigs, 
  saveMappingConfig, 
  deleteMappingConfig, 
  createMappingConfig,
  setActiveMappingConfigId,
  getActiveMappingConfigId
} from '@/lib/mapping';
import { MappingConfigDialog } from './MappingConfigDialog';

// 매핑 설정 관리자 컴포넌트 속성
interface MappingConfigManagerProps {
  onSelect?: (mappingId: string) => void;
}

export default function MappingConfigManager({ onSelect }: MappingConfigManagerProps) {
  // 상태 관리
  const [mappingConfigs, setMappingConfigs] = useState<MappingConfig[]>([]);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [activeMappingId, setActiveMappingId] = useState<string | null>(null);
  const [editingConfig, setEditingConfig] = useState<MappingConfig | null>(null);
  
  // 초기 데이터 로드
  useEffect(() => {
    loadMappingConfigsData();
    // 활성 매핑 ID 로드
    const activeId = getActiveMappingConfigId();
    if (activeId) {
      setActiveMappingId(activeId);
    }
  }, []);
  
  // 매핑 설정 로드
  const loadMappingConfigsData = () => {
    const configs = loadMappingConfigs();
    // fieldMaps 배열이 없는 설정에 빈 배열 추가
    const validConfigs = configs.map(config => {
      if (!config.fieldMaps) {
        return { ...config, fieldMaps: [] };
      }
      return config;
    });
    setMappingConfigs(validConfigs);
  };
  
  // 매핑 설정 선택
  const handleSelectMapping = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation(); // 이벤트 전파 중지
    console.log(`매핑 ID ${id} 선택됨`);
    
    // 이미 선택된 매핑을 다시 클릭한 경우 선택 해제
    if (activeMappingId === id) {
      setActiveMappingId(null);
      localStorage.removeItem('excel_merger_active_mapping_config');
      if (onSelect) onSelect('');
      return;
    }
    
    // 새로운 매핑 선택
    setActiveMappingId(id);
    setActiveMappingConfigId(id);
    if (onSelect) onSelect(id);
  };
  
  // 편집 다이얼로그 열기
  const openEditDialog = (config: MappingConfig) => {
    setEditingConfig({ ...config });
    setIsEditDialogOpen(true);
  };
  
  // 매핑 설정 삭제
  const handleDeleteMapping = (id: string) => {
    if (window.confirm('이 매핑 설정을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
      deleteMappingConfig(id);
      
      // 상태 업데이트
      loadMappingConfigsData();
      
      // 활성 매핑 ID 업데이트
      if (activeMappingId === id) {
        setActiveMappingId(null);
      }
    }
  };
  
  // 설정 생성 후 처리
  const handleCreateComplete = () => {
    loadMappingConfigsData();
    const activeId = getActiveMappingConfigId();
    if (activeId && onSelect) {
      setActiveMappingId(activeId);
      onSelect(activeId);
    }
  };
  
  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>매핑 설정 관리</CardTitle>
            <CardDescription>
              필드 매핑 설정을 생성하고 관리합니다
            </CardDescription>
          </div>
          <MappingConfigDialog onComplete={handleCreateComplete}>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              새 매핑 설정
            </Button>
          </MappingConfigDialog>
        </div>
      </CardHeader>
      <CardContent>
        {mappingConfigs.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            아직 매핑 설정이 없습니다. '새 매핑 설정' 버튼을 클릭하여 첫 번째 매핑 설정을 생성하세요.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[300px]">이름</TableHead>
                <TableHead>설명</TableHead>
                <TableHead className="w-[120px]">필드 수</TableHead>
                <TableHead className="w-[100px]">생성일</TableHead>
                <TableHead className="text-right w-[120px]">작업</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mappingConfigs.map(config => (
                <TableRow 
                  key={config.id} 
                  className={activeMappingId === config.id ? 'bg-muted/50' : ''}
                  onClick={(e) => handleSelectMapping(config.id, e)}
                  style={{ cursor: 'pointer' }}
                >
                  <TableCell className="font-medium">{config.name}</TableCell>
                  <TableCell>{config.description || '-'}</TableCell>
                  <TableCell>{config.fieldMaps?.length || 0}</TableCell>
                  <TableCell>{new Date(config.created).toLocaleDateString()}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end space-x-2" onClick={(e) => e.stopPropagation()}>
                      <MappingConfigDialog config={config} onComplete={handleCreateComplete}>
                        <Button
                          variant="ghost" 
                          size="icon"
                          title="수정"
                          onClick={(e) => {
                            e.stopPropagation();
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      </MappingConfigDialog>
                      
                      <Button 
                        variant="ghost" 
                        size="icon"
                        title="삭제"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteMapping(config.id);
                        }}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
} 