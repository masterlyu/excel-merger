"use client";

import { useState } from 'react';
import MappingConfigManager from '@/components/mapping/MappingConfig';
import { MappingConfig } from '@/lib/mapping';

export default function MappingPage() {
  const [selectedConfig, setSelectedConfig] = useState<MappingConfig | null>(null);

  const handleConfigSelect = (config: MappingConfig) => {
    setSelectedConfig(config);
  };

  return (
    <div className="container mx-auto py-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold mb-2">매핑 설정</h1>
          <p className="text-gray-600">
            엑셀 파일 간의 매핑 규칙을 설정하고 관리할 수 있습니다.
            매핑 설정은 자동으로 저장되며, 나중에 다시 불러와 사용할 수 있습니다.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <MappingConfigManager onSelect={handleConfigSelect} />
          </div>
          <div>
            {selectedConfig ? (
              <div className="bg-white rounded-lg shadow p-4">
                <h2 className="text-lg font-semibold mb-4">
                  {selectedConfig.name}
                </h2>
                {selectedConfig.description && (
                  <p className="text-gray-600 mb-4">{selectedConfig.description}</p>
                )}
                <div className="text-sm text-gray-500">
                  <p>생성일: {new Date(selectedConfig.createdAt).toLocaleString()}</p>
                  <p>수정일: {new Date(selectedConfig.updatedAt).toLocaleString()}</p>
                </div>
                <div className="mt-4">
                  <p className="text-sm text-gray-500">
                    {selectedConfig.mappings.length > 0
                      ? `${selectedConfig.mappings.length}개의 매핑 규칙이 설정되어 있습니다.`
                      : '아직 설정된 매핑 규칙이 없습니다.'}
                  </p>
                </div>
              </div>
            ) : (
              <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                <p className="text-gray-500">
                  매핑 설정을 선택하거나 새로 생성해주세요.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 