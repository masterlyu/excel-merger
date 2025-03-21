"use client";

import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import FieldMapper from '@/components/mapping/FieldMapper';
import MappingConfigManager from '@/components/mapping/MappingConfigManager';
import PageHeader from '@/components/common/PageHeader';

export default function MappingPage() {
  // 활성 탭 상태
  const [activeTab, setActiveTab] = useState<string>('field-mapping');
  
  // 매핑 설정 선택 핸들러
  const handleMappingSelect = (mappingId: string) => {
    if (mappingId) {
      // 매핑 ID가 선택되면 필드 매핑 탭으로 전환
      setActiveTab('field-mapping');
    }
  };
  
  return (
    <div className="container mx-auto py-6 space-y-8">
      <PageHeader
        title="필드 매핑"
        description="Excel 파일의 필드를 대상 필드에 매핑합니다."
      />
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="field-mapping">필드 매핑</TabsTrigger>
          <TabsTrigger value="mapping-config">매핑 설정 관리</TabsTrigger>
        </TabsList>
        
        <TabsContent value="field-mapping" className="space-y-6">
          <FieldMapper />
        </TabsContent>
        
        <TabsContent value="mapping-config" className="space-y-6">
          <MappingConfigManager onSelect={handleMappingSelect} />
        </TabsContent>
      </Tabs>
    </div>
  );
} 