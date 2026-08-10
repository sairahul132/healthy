import Link from "next/link";
import { UploadDropzone } from "@/components/reports/UploadDropzone";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";

export default function UploadReportPage() {
  return (
    <div className="mx-auto max-w-lg">
      <Link href="/reports" className="text-sm text-[var(--color-text-muted)] hover:underline">
        ← Back to reports
      </Link>
      <Card className="mt-4">
        <CardHeader>
          <CardTitle>Upload a report</CardTitle>
        </CardHeader>
        <CardContent>
          <UploadDropzone />
        </CardContent>
      </Card>
    </div>
  );
}
