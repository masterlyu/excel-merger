"use client";

import React, { createContext, useState, useContext, ReactNode } from 'react';
import { DragDropContext, DropResult } from '@hello-pangea/dnd';
import { toast } from 'react-hot-toast';
import {
  MappingConfig,
  FieldMap,
  SourceField,
  loadMappingConfigs,
  getActiveMappingConfig,
  getActiveMappingConfigId
} from '@/lib/mapping';

// 매핑 업데이트를 위한 커스텀 이벤트 생성
const MAPPING_UPDATED_EVENT = 'mappingUpdated';

// 매핑 이벤트 트리거 함수
export function triggerMappingUpdated() {
  // 전역 이벤트로 매핑 업데이트 알림
  const event = new CustomEvent(MAPPING_UPDATED_EVENT);
  window.dispatchEvent(event);
}

// 드래그 앤 드롭 컨텍스트 타입 정의
interface DragAndDropContextType {
  isDragging: boolean;
  onDragStart: () => void;
  onDragEnd: (result: DropResult) => void;
}

// 컨텍스트 생성
const DragAndDropContext = createContext<DragAndDropContextType | null>(null);

// 컨텍스트 훅
export const useDragAndDrop = () => {
  const context = useContext(DragAndDropContext);
  if (!context) {
    throw new Error('useDragAndDrop must be used within a DragAndDropProvider');
  }
  return context;
};

// 프로바이더 속성
interface DragAndDropProviderProps {
  children: ReactNode;
  selectedFileId: string;
  selectedSheet: string;
  onMappingUpdated?: () => void;
}

/**
 * 드래그 앤 드롭 기능을 관리하는 컨텍스트 프로바이더 컴포넌트
 */
export function DragAndDropProvider({
  children,
  selectedFileId,
  selectedSheet,
  onMappingUpdated
}: DragAndDropProviderProps) {
  // 드래그 상태 관리
  const [isDragging, setIsDragging] = useState(false);
  
  // 드래그 시작 핸들러
  const handleDragStart = () => {
    setIsDragging(true);
  };
  
  // 드래그 종료 핸들러
  const handleDragEnd = (result: DropResult) => {
    setIsDragging(false);
    
    // 드롭이 완료되면 매핑 상태 업데이트
    if (!result.destination) {
      return;
    }
    
    // 드랍된 타겟 필드 ID 추출 (드롭 대상 ID에서 'droppable-' 접두사 제거)
    const targetFieldId = result.destination.droppableId.replace('droppable-', '');
    
    // 디버깅 정보 추가
    console.log('드롭 완료:', {
      destination: result.destination,
      droppableId: result.destination.droppableId,
      targetFieldId
    });
    
    // 소스 필드 정보 추출 (드래그된 아이템 ID에서 파일 ID, 시트명, 필드명 추출)
    const [fileId, sheetName, fieldName] = result.draggableId.split('_');
    
    if (!fileId || !sheetName || !fieldName) {
      console.error('유효하지 않은 소스 필드 ID 형식:', result.draggableId);
      return;
    }
    
    console.log('매핑 정보:', {
      targetFieldId,
      sourceField: {
        fileId,
        sheetName,
        fieldName
      }
    });
    
    // 활성 매핑 설정 ID 가져오기
    const activeMappingConfigId = localStorage.getItem('excel_merger_active_mapping_config');
    if (!activeMappingConfigId) {
      toast.error('활성화된 매핑 설정이 없습니다.');
      return;
    }
    
    try {
      // 모든 매핑 설정 로드
      const allConfigs = JSON.parse(localStorage.getItem('excel_merger_mapping_configs') || '[]');
      if (!Array.isArray(allConfigs) || allConfigs.length === 0) {
        toast.error('매핑 설정을 찾을 수 없습니다.');
        return;
      }
      
      // 활성 매핑 설정 찾기
      const configIndex = allConfigs.findIndex(config => config.id === activeMappingConfigId);
      if (configIndex === -1) {
        toast.error('활성 매핑 설정을 찾을 수 없습니다.');
        return;
      }
      
      // 활성 매핑 설정 복사
      const updatedConfig = {...allConfigs[configIndex]};
      
      // 타겟 필드 맵 찾기
      const fieldMapIndex = updatedConfig.fieldMaps.findIndex((map: any) => map.id === targetFieldId);
      if (fieldMapIndex === -1) {
        toast.error('타겟 필드를 찾을 수 없습니다.');
        return;
      }
      
      // 소스 필드 객체 생성 (일관된 형식 사용)
      const newSourceField = {
        fileId,
        sheetName, 
        fieldName
      };
      
      // 이미 매핑된 소스 필드인지 확인 (중복 방지)
      const isAlreadyMapped = updatedConfig.fieldMaps[fieldMapIndex].sourceFields.some(
        (sf: any) => sf.fileId === fileId && sf.sheetName === sheetName && sf.fieldName === fieldName
      );
      
      if (isAlreadyMapped) {
        toast.error(`'${fieldName}' 필드는 이미 매핑되어 있습니다.`);
        return;
      }
      
      // 기존 소스 필드 배열에 새 소스 필드 추가 (복사 후 추가)
      updatedConfig.fieldMaps[fieldMapIndex].sourceFields = [
        ...updatedConfig.fieldMaps[fieldMapIndex].sourceFields,
        newSourceField
      ];
      
      // 업데이트 시간 갱신
      updatedConfig.updated = Date.now();
      
      // 업데이트된 설정을 배열에 저장
      allConfigs[configIndex] = updatedConfig;
      
      // 로컬 스토리지에 저장
      localStorage.setItem('excel_merger_mapping_configs', JSON.stringify(allConfigs));
      
      // 매핑 업데이트 이벤트 트리거
      triggerMappingUpdated();
      
      // 성공 메시지
      toast.success(`'${fieldName}' 필드가 매핑되었습니다.`);
      
      // 매핑 업데이트 콜백 호출
      if (onMappingUpdated) {
        onMappingUpdated();
      }
    } catch (error) {
      console.error('매핑 업데이트 오류:', error);
      toast.error('매핑 처리 중 오류가 발생했습니다.');
    }
  };
  
  return (
    <DragAndDropContext.Provider 
      value={{
        isDragging,
        onDragStart: handleDragStart,
        onDragEnd: handleDragEnd
      }}
    >
      <DragDropContext
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        {children}
      </DragDropContext>
    </DragAndDropContext.Provider>
  );
} 