"use client";

import React, { createContext, useState, useContext, ReactNode } from 'react';
import { DragDropContext, DropResult } from '@hello-pangea/dnd';
import { toast } from 'react-hot-toast';
import { SourceField, addFieldMap, getActiveMappingConfig, loadMappingConfigs } from '@/lib/mapping';

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
    
    // 드롭 위치가 없으면 처리하지 않음
    if (!result.destination) {
      return;
    }
    
    // 소스 및 대상 정보 추출
    const { source, destination, draggableId } = result;
    
    // 동일한 위치로 드롭된 경우 처리하지 않음
    if (source.droppableId === destination.droppableId && 
        source.index === destination.index) {
      return;
    }
    
    console.log('Drag ended', result);
    
    // 소스 필드에서 타겟 필드로 드롭된 경우
    if (source.droppableId === 'source-fields' && 
        destination.droppableId.startsWith('target-')) {
      const targetFieldId = destination.droppableId.replace('target-', '');
      
      // 드래그된 소스 필드 ID에서 정보 추출
      const [fileId, sheetName, ...fieldNameParts] = draggableId.split('_');
      const fieldName = fieldNameParts.join('_'); // 필드명에 언더스코어가 포함될 수 있음
      
      // 파일과 시트가 선택된 것과 일치하는지 확인
      if (fileId !== selectedFileId || sheetName !== selectedSheet) {
        toast.error('잘못된 소스 필드 정보입니다.');
        return;
      }
      
      // 활성 매핑 설정 조회
      const activeConfig = getActiveMappingConfig();
      if (!activeConfig) {
        toast.error('활성화된 매핑 설정이 없습니다.');
        return;
      }
      
      // 소스 필드 객체 생성
      const sourceField: SourceField = {
        fileId,
        sheetName,
        fieldName
      };
      
      try {
        // 1:1 매핑을 보장하기 위해 처리
        const updatedConfig = { ...activeConfig };
        
        // 1. 현재 타겟 필드에 이미 매핑된 소스 필드 제거 (새 매핑으로 대체)
        const targetFieldMapIndex = updatedConfig.fieldMaps.findIndex(fm => fm.id === targetFieldId);
        if (targetFieldMapIndex !== -1) {
          updatedConfig.fieldMaps[targetFieldMapIndex].sourceFields = [];
        }
        
        // 2. 다른 타겟 필드에 같은 소스 필드가 매핑되어 있으면 제거
        updatedConfig.fieldMaps.forEach(fieldMap => {
          if (fieldMap.id !== targetFieldId) {
            fieldMap.sourceFields = fieldMap.sourceFields.filter(sf => 
              !(sf.fileId === fileId && sf.sheetName === sheetName && sf.fieldName === fieldName)
            );
          }
        });
        
        // 업데이트된 매핑 설정 저장
        updatedConfig.updated = Date.now();
        
        // 로컬 스토리지에 저장
        const configs = loadMappingConfigs().map(config => 
          config.id === updatedConfig.id ? updatedConfig : config
        );
        localStorage.setItem('excel_merger_mappings', JSON.stringify(configs));
        
        // 매핑 추가
        const addResult = addFieldMap(
          activeConfig.id,
          targetFieldId,
          sourceField
        );
        
        if (addResult) {
          toast.success(`${fieldName} 필드가 ${targetFieldId}에 매핑되었습니다.`);
          
          // 상위 컴포넌트에 매핑 업데이트 알림
          if (onMappingUpdated) {
            onMappingUpdated();
          }
        }
      } catch (error) {
        console.error('필드 매핑 추가 오류:', error);
        toast.error('필드 매핑을 추가하는 중 오류가 발생했습니다.');
      }
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