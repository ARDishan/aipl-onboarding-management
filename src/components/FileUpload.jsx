import { useState } from 'react'
import { supabase } from '../lib/supabase'

// ─── File Upload Component ───────────────────────────────────
// Usage:
//   <FileUpload
//     bucket="onboarding-documents"
//     folder="jd-cv/case-id"
//     accept=".pdf,.doc,.docx"
//     label="Upload JD Document"
//     onUploaded={(url, path, name) => ...}
//     onRemoved={() => ...}
//   />

export function FileUpload({
  bucket     = 'onboarding-documents',
  folder     = 'uploads',
  accept     = '.pdf,.doc,.docx,.png,.jpg',
  label      = 'Upload File',
  maxSizeMB  = 10,
  onUploaded,
  onRemoved,
  existingUrl,
  existingName,
}) {
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress]   = useState(0)
  const [error, setError]         = useState('')
  const [fileInfo, setFileInfo]   = useState(
    existingUrl ? { url: existingUrl, name: existingName ?? 'Uploaded file' } : null
  )
  const [dragging, setDragging] = useState(false)

  const handleFile = async (file) => {
    if (!file) return
    setError('')

    // Validate size
    if (file.size > maxSizeMB * 1024 * 1024) {
      setError(`File too large. Maximum size is ${maxSizeMB}MB.`)
      return
    }

    // Validate type
    const allowedTypes = accept.split(',').map(a => a.trim())
    const ext = '.' + file.name.split('.').pop().toLowerCase()
    if (!allowedTypes.includes(ext)) {
      setError(`Invalid file type. Allowed: ${accept}`)
      return
    }

    setUploading(true)
    setProgress(10)

    try {
      // Build unique file path
      const timestamp = Date.now()
      const safeName  = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
      const path      = `${folder}/${timestamp}_${safeName}`

      setProgress(30)

      const { data, error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(path, file, { upsert: false })

      if (uploadError) throw uploadError
      setProgress(80)

      // Get signed URL (valid 1 hour — refresh on view)
      const { data: signed } = await supabase.storage
        .from(bucket)
        .createSignedUrl(path, 3600)

      setProgress(100)
      const info = { url: signed.signedUrl, path, name: file.name, size: file.size }
      setFileInfo(info)
      onUploaded?.(info)
    } catch (e) {
      setError(e.message ?? 'Upload failed')
    } finally {
      setUploading(false)
      setTimeout(() => setProgress(0), 800)
    }
  }

  const handleRemove = async () => {
    if (!fileInfo?.path) { setFileInfo(null); onRemoved?.(); return }
    try {
      await supabase.storage.from(bucket).remove([fileInfo.path])
    } catch (_) {}
    setFileInfo(null)
    onRemoved?.()
  }

  const onInputChange = (e) => handleFile(e.target.files?.[0])

  const onDrop = (e) => {
    e.preventDefault()
    setDragging(false)
    handleFile(e.dataTransfer.files?.[0])
  }

  const formatSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const getFileIcon = (name) => {
    const ext = name?.split('.').pop()?.toLowerCase()
    if (ext === 'pdf') return '📄'
    if (['doc', 'docx'].includes(ext)) return '📝'
    if (['png', 'jpg', 'jpeg'].includes(ext)) return '🖼️'
    return '📎'
  }

  // ── Uploaded state ──────────────────────────────────────────
  if (fileInfo) {
    return (
      <div style={{
        border: '2px solid #bbf7d0', background: '#f0fdf4',
        borderRadius: 10, padding: '14px 16px',
        display: 'flex', alignItems: 'center', gap: 12,
      }}>
        <span style={{ fontSize: 28 }}>{getFileIcon(fileInfo.name)}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: '#15803d', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {fileInfo.name}
          </div>
          {fileInfo.size && (
            <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
              {formatSize(fileInfo.size)} · Uploaded ✓
            </div>
          )}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <a
            href={fileInfo.url}
            target="_blank"
            rel="noreferrer"
            style={{ padding: '6px 12px', borderRadius: 6, background: '#dcfce7', color: '#15803d', fontSize: 12, fontWeight: 700, textDecoration: 'none' }}
          >
            View
          </a>
          <button
            onClick={handleRemove}
            style={{ padding: '6px 12px', borderRadius: 6, background: '#fee2e2', color: '#dc2626', fontSize: 12, fontWeight: 700, border: 'none', cursor: 'pointer' }}
          >
            Remove
          </button>
        </div>
      </div>
    )
  }

  // ── Upload dropzone ─────────────────────────────────────────
  return (
    <div>
      <label
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          border: `2px dashed ${dragging ? '#6366f1' : error ? '#ef4444' : '#cbd5e1'}`,
          background: dragging ? '#eef2ff' : '#fafafa',
          borderRadius: 10, padding: '28px 20px', cursor: uploading ? 'wait' : 'pointer',
          textAlign: 'center', transition: 'all 0.15s',
          minHeight: 110,
        }}
      >
        <input
          type="file"
          accept={accept}
          onChange={onInputChange}
          disabled={uploading}
          style={{ display: 'none' }}
        />

        {uploading ? (
          <>
            <div style={{ fontSize: 32, marginBottom: 8 }}>⟳</div>
            <div style={{ fontWeight: 700, fontSize: 14, color: '#6366f1', marginBottom: 8 }}>Uploading...</div>
            {/* Progress bar */}
            <div style={{ width: '80%', height: 6, background: '#e2e8f0', borderRadius: 3, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${progress}%`, background: '#6366f1', borderRadius: 3, transition: 'width 0.3s ease' }} />
            </div>
          </>
        ) : (
          <>
            <div style={{ fontSize: 36, marginBottom: 8 }}>📁</div>
            <div style={{ fontWeight: 700, fontSize: 14, color: '#475569', marginBottom: 4 }}>{label}</div>
            <div style={{ fontSize: 12, color: '#94a3b8' }}>
              Drag & drop or click to browse · {accept.toUpperCase().replace(/\./g, '')} · Max {maxSizeMB}MB
            </div>
          </>
        )}
      </label>

      {error && (
        <div style={{ marginTop: 6, fontSize: 12, color: '#ef4444', display: 'flex', alignItems: 'center', gap: 4 }}>
          ⚠️ {error}
        </div>
      )}
    </div>
  )
}

// ─── Multi-file uploader (e.g. CV + JD together) ─────────────
export function MultiFileUpload({ bucket, folder, label, files, onChange }) {
  const [uploading, setUploading] = useState(false)
  const [error, setError]         = useState('')
  const [dragging, setDragging]   = useState(false)

  const handleFiles = async (newFiles) => {
    if (!newFiles.length) return
    setError('')
    setUploading(true)

    const uploaded = []
    for (const file of Array.from(newFiles)) {
      if (file.size > 10 * 1024 * 1024) { setError(`${file.name} exceeds 10MB limit`); continue }
      try {
        const path = `${folder}/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`
        const { error: uploadError } = await supabase.storage.from(bucket).upload(path, file)
        if (uploadError) throw uploadError
        const { data: signed } = await supabase.storage.from(bucket).createSignedUrl(path, 3600)
        uploaded.push({ url: signed.signedUrl, path, name: file.name, size: file.size })
      } catch (e) {
        setError(`Failed to upload ${file.name}: ${e.message}`)
      }
    }

    setUploading(false)
    onChange?.([...files, ...uploaded])
  }

  const removeFile = async (index) => {
    const file = files[index]
    if (file.path) {
      try { await supabase.storage.from(bucket).remove([file.path]) } catch (_) {}
    }
    onChange?.(files.filter((_, i) => i !== index))
  }

  return (
    <div>
      <label
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => { e.preventDefault(); setDragging(false); handleFiles(e.dataTransfer.files) }}
        style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          border: `2px dashed ${dragging ? '#6366f1' : '#cbd5e1'}`,
          background: dragging ? '#eef2ff' : '#fafafa',
          borderRadius: 10, padding: '20px', cursor: uploading ? 'wait' : 'pointer',
          textAlign: 'center', transition: 'all 0.15s',
        }}
      >
        <input type="file" accept=".pdf,.doc,.docx" multiple onChange={(e) => handleFiles(e.target.files)} disabled={uploading} style={{ display: 'none' }} />
        <div style={{ fontSize: 32, marginBottom: 6 }}>📎</div>
        <div style={{ fontWeight: 700, fontSize: 14, color: '#475569', marginBottom: 4 }}>
          {uploading ? 'Uploading...' : label}
        </div>
        <div style={{ fontSize: 12, color: '#94a3b8' }}>PDF, DOC, DOCX · Max 10MB each · Multiple files allowed</div>
      </label>

      {error && <div style={{ marginTop: 6, fontSize: 12, color: '#ef4444' }}>⚠️ {error}</div>}

      {files?.length > 0 && (
        <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {files.map((f, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: '#f0fdf4', borderRadius: 8, border: '1px solid #bbf7d0' }}>
              <span style={{ fontSize: 20 }}>📄</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 13, color: '#15803d', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.name}</div>
                <div style={{ fontSize: 11, color: '#64748b' }}>{f.size ? `${(f.size / 1024).toFixed(1)} KB` : ''}</div>
              </div>
              <a href={f.url} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: '#6366f1', fontWeight: 700, textDecoration: 'none' }}>View</a>
              <button onClick={() => removeFile(i)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: 16, lineHeight: 1 }}>✕</button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}