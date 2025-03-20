import FileUpload from '@/components/excel/FileUpload';

export default function UploadPage() {
  return (
    <div className="container mx-auto py-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold mb-2">엑셀 파일 업로드</h1>
          <p className="text-gray-600">
            엑셀 파일을 업로드하여 데이터를 분석하고 통합할 수 있습니다.
            지원되는 파일 형식은 XLSX, XLS, CSV이며, 최대 10개의 파일을 동시에 처리할 수 있습니다.
          </p>
        </div>
        <FileUpload />
      </div>
    </div>
  );
} 