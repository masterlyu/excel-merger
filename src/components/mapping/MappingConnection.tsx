"use client";

import React, { useEffect, useState } from 'react';
import { FieldMap } from '@/lib/mapping';

interface MappingConnectionProps {
  activeField: FieldMap | null;
  isDragging: boolean;
}

/**
 * 매핑 연결 시각화 컴포넌트
 * 소스 필드와 타겟 필드 간의 연결선을 SVG로 렌더링합니다.
 */
export function MappingConnection({ 
  activeField, 
  isDragging 
}: MappingConnectionProps) {
  const [connections, setConnections] = useState<Array<{
    sourceId: string;
    targetId: string;
    sourceElement: HTMLElement | null;
    targetElement: HTMLElement | null;
  }>>([]);
  
  // 소스와 타겟 엘리먼트 사이의 연결선 생성
  useEffect(() => {
    const updateConnections = () => {
      if (!activeField || isDragging) {
        setConnections([]);
        return;
      }

      // 타겟 필드 요소 - ID 체계 통일
      const targetElement = document.querySelector(`#target-${activeField.id}`);
      let finalTargetElement = targetElement;
      
      if (!targetElement) {
        console.warn(`타겟 필드 요소를 찾을 수 없음: #target-${activeField.id}`);
        console.log('활성 필드 정보:', activeField);
        // 다른 선택자로 시도
        const alternateTargetElement = document.querySelector(`[data-field-id="${activeField.id}"]`);
        if (!alternateTargetElement) {
          setConnections([]);
          return;
        }
        finalTargetElement = alternateTargetElement;
      }

      // sourceFields가 없거나 비어있는 경우 처리
      if (!activeField.sourceFields || activeField.sourceFields.length === 0) {
        setConnections([]);
        return;
      }

      // 각 소스 필드에 대한 새로운 연결 생성
      const newConnections = activeField.sourceFields.map(source => {
        // 소스 필드 ID 정규화 (파일ID_시트명_필드명 형식)
        const normalizedSourceId = `${source.fileId}_${source.sheetName}_${source.fieldName}`;
        
        // 소스 요소 찾기 - 통일된 data-source-field 속성 사용
        const sourceElement = document.querySelector(`[data-source-field="${normalizedSourceId}"]`);
        
        if (!sourceElement) {
          console.warn(`소스 필드 요소를 찾을 수 없음: [data-source-field="${normalizedSourceId}"]`);
        }

        return {
          sourceId: normalizedSourceId,
          targetId: activeField.id,
          sourceElement: sourceElement as HTMLElement | null,
          targetElement: finalTargetElement as HTMLElement | null
        };
      });

      // 소스 엘리먼트가 있는 연결만 필터링
      const validConnections = newConnections.filter(conn => conn.sourceElement !== null);
      setConnections(validConnections);
    };

    updateConnections();

    // 화면 크기 변경 시 연결선 업데이트
    window.addEventListener('resize', updateConnections);
    return () => {
      window.removeEventListener('resize', updateConnections);
    };
  }, [activeField, isDragging]);
  
  // 연결선 SVG 생성
  const renderConnections = () => {
    if (connections.length === 0) return null;
    
    // SVG는 전체 화면 크기로 설정
    return (
      <svg
        className="absolute top-0 left-0 w-full h-full pointer-events-none"
        style={{
          zIndex: 10
        }}
      >
        {connections.map(({ sourceId, targetId, sourceElement, targetElement }) => {
          // 요소가 없으면 연결선을 그리지 않음
          if (!sourceElement || !targetElement) return null;
          
          // 요소의 위치 및 크기 계산
          const sourceRect = sourceElement.getBoundingClientRect();
          const targetRect = targetElement.getBoundingClientRect();
          
          // 스크롤 위치 고려
          const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
          const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
          
          // 연결선 시작점과 끝점
          const startX = sourceRect.left + sourceRect.width + scrollLeft;
          const startY = sourceRect.top + sourceRect.height / 2 + scrollTop;
          const endX = targetRect.left + scrollLeft;
          const endY = targetRect.top + targetRect.height / 2 + scrollTop;
          
          // 곡선의 제어점 (베지어 곡선)
          const controlX1 = startX + Math.abs(endX - startX) * 0.4;
          const controlY1 = startY;
          const controlX2 = endX - Math.abs(endX - startX) * 0.4;
          const controlY2 = endY;
          
          return (
            <path
              key={`${sourceId}-${targetId}`}
              d={`M ${startX} ${startY} C ${controlX1} ${controlY1}, ${controlX2} ${controlY2}, ${endX} ${endY}`}
              stroke="var(--primary)"
              strokeWidth="2"
              fill="none"
              strokeDasharray={isDragging ? "5,5" : "none"}
              opacity={isDragging ? 0.5 : 0.8}
              markerEnd="url(#arrowhead)"
            />
          );
        })}
        
        {/* 화살표 마커 정의 */}
        <defs>
          <marker
            id="arrowhead"
            markerWidth="10"
            markerHeight="7"
            refX="9"
            refY="3.5"
            orient="auto"
          >
            <polygon
              points="0 0, 10 3.5, 0 7"
              fill="var(--primary)"
            />
          </marker>
        </defs>
      </svg>
    );
  };
  
  return <>{renderConnections()}</>;
} 