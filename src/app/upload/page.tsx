import UploadForm from '@/components/UploadForm';

export const metadata = {
  title: 'Upload a PDF — DocuFlow',
};

export default function UploadPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <h1 className="mb-2 text-center text-3xl font-bold">Create a flipbook</h1>
      <p className="mb-10 text-center text-white/50">
        Upload a PDF — we&rsquo;ll render every page and publish your flipbook.
      </p>
      <UploadForm />
    </div>
  );
}
