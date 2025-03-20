import FileUpload from '@/components/excel/FileUpload';

export default function UploadPage() {
  return (
    <div className="container mx-auto py-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">엑셀 파일 업로드</h1>
        <FileUpload />
      </div>
    </div>
  );
} 