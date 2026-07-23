'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

export default function ReceiptUploader({
  poId,
  existingUrl,
  canUpload
}: {
  poId: string;
  existingUrl: string | null;
  canUpload: boolean;
}) {
  const supabase = createClient();
  const router = useRouter();
  
  const [url, setUrl] = useState<string | null>(existingUrl);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate type (images or pdf)
    if (!file.type.match(/(image.*|application\/pdf)/)) {
      setError('Only images and PDFs are allowed.');
      return;
    }

    setUploading(true);
    setError(null);

    const ext = file.name.split('.').pop();
    const filePath = `${poId}/${Date.now()}.${ext}`;

    try {
      const { error: uploadError } = await supabase.storage
        .from('receipts')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from('receipts').getPublicUrl(filePath);
      
      const { error: dbError } = await supabase
        .from('purchase_orders')
        .update({ receipt_url: data.publicUrl })
        .eq('id', poId);

      if (dbError) throw dbError;

      setUrl(data.publicUrl);
      router.refresh(); // Refresh the page to reflect any server state changes if needed
    } catch (err: any) {
      setError(err.message || 'Failed to upload receipt');
    } finally {
      setUploading(false);
      // Reset input
      e.target.value = '';
    }
  };

  return (
    <div className="card" style={{ marginTop: '20px' }}>
      <h3 style={{ marginTop: 0, marginBottom: '16px', fontSize: '16px' }}>Purchase Receipt</h3>
      
      {error && <p className="error">{error}</p>}
      
      <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
        {url ? (
          <a 
            href={url} 
            target="_blank" 
            rel="noreferrer" 
            className="btn-secondary"
            style={{ textDecoration: 'none' }}
          >
            View Receipt
          </a>
        ) : (
          <p className="muted" style={{ margin: 0 }}>No receipt uploaded yet.</p>
        )}

        {canUpload && (
          <div>
            <label 
              htmlFor="receipt-upload" 
              className="btn-primary" 
              style={{ cursor: uploading ? 'not-allowed' : 'pointer', opacity: uploading ? 0.7 : 1 }}
            >
              {uploading ? 'Uploading...' : url ? 'Replace Receipt' : 'Upload Receipt'}
            </label>
            <input 
              id="receipt-upload" 
              type="file" 
              accept="image/*,application/pdf"
              style={{ display: 'none' }}
              onChange={handleUpload}
              disabled={uploading}
            />
          </div>
        )}
      </div>
    </div>
  );
}
