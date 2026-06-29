import { useState, useRef } from 'react';
import { Upload, X, Check, AlertCircle, FileText, ChevronRight } from 'lucide-react';

/**
 * Generic CSV / Excel import modal.
 * Props:
 *  - open: bool
 *  - onClose: fn
 *  - title: string
 *  - columns: [{ key, label, required? }]
 *  - onImport: async fn(rows[])
 */
export default function ImportCSVModal({ open, onClose, title = 'Import CSV / Excel', columns = [], onImport }) {
  const fileRef = useRef();
  const [step, setStep] = useState('pick'); // pick | map | preview | done
  const [rawRows, setRawRows] = useState([]);
  const [headers, setHeaders] = useState([]);
  const [mapping, setMapping] = useState({});
  const [fileName, setFileName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [importedCount, setImportedCount] = useState(0);

  if (!open) return null;

  function reset() {
    setStep('pick'); setRawRows([]); setHeaders([]); setMapping({});
    setFileName(''); setError(''); setLoading(false); setImportedCount(0);
  }
  function handleClose() { reset(); onClose(); }

  function handleFile(e) {
    const file = e.target.files[0];
    if (!file) return;
    setFileName(file.name);
    setError('');
    const ext = file.name.split('.').pop().toLowerCase();
    if (ext === 'csv') {
      const reader = new FileReader();
      reader.onload = ev => parseCSV(ev.target.result);
      reader.readAsText(file);
    } else if (ext === 'xlsx' || ext === 'xls') {
      if (!window.XLSX) { setError('Excel parser not loaded. Try a CSV instead.'); return; }
      const reader = new FileReader();
      reader.onload = ev => {
        try {
          const wb = window.XLSX.read(ev.target.result, { type: 'binary' });
          const ws = wb.Sheets[wb.SheetNames[0]];
          const arr = window.XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
          processRows(arr);
        } catch (err) { setError('Could not read Excel file: ' + err.message); }
      };
      reader.readAsBinaryString(file);
    } else {
      setError('Please upload a .csv, .xlsx or .xls file.');
    }
  }

  function parseCSV(text) {
    const lines = text.split(/\r?\n/).filter(l => l.trim());
    const rows = lines.map(line => {
      const result = []; let cur = '', inQ = false;
      for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (ch === '"') { inQ = !inQ; }
        else if (ch === ',' && !inQ) { result.push(cur.trim()); cur = ''; }
        else { cur += ch; }
      }
      result.push(cur.trim()); return result;
    });
    processRows(rows);
  }

  function processRows(rows) {
    if (!rows.length) { setError('File appears to be empty.'); return; }
    const hdr = rows[0].map(h => String(h).trim());
    setHeaders(hdr);
    setRawRows(rows.slice(1).filter(r => r.some(v => String(v).trim())));
    const autoMap = {};
    columns.forEach(col => {
      const idx = hdr.findIndex(h =>
        h.toLowerCase().replace(/[\s_-]/g, '') === col.label.toLowerCase().replace(/[\s_-]/g, '') ||
        h.toLowerCase().replace(/[\s_-]/g, '') === col.key.toLowerCase().replace(/[\s_-]/g, '')
      );
      if (idx >= 0) autoMap[col.key] = idx;
    });
    setMapping(autoMap); setStep('map');
  }

  const previewRows = rawRows.slice(0, 5).map(row => {
    const obj = {};
    columns.forEach(col => { const idx = mapping[col.key]; obj[col.key] = idx !== undefined ? String(row[idx] ?? '').trim() : ''; });
    return obj;
  });

  async function doImport() {
    const required = columns.filter(c => c.required);
    const mappedRows = rawRows.map(row => {
      const obj = {};
      columns.forEach(col => { const idx = mapping[col.key]; obj[col.key] = idx !== undefined ? String(row[idx] ?? '').trim() : ''; });
      return obj;
    }).filter(obj => required.every(c => obj[c.key]));
    if (!mappedRows.length) { setError('No valid rows to import. Check required fields.'); return; }
    setLoading(true);
    try { await onImport(mappedRows); setImportedCount(mappedRows.length); setStep('done'); }
    catch (err) { setError('Import failed: ' + err.message); }
    finally { setLoading(false); }
  }

  return (
    <div className="overlay" onClick={handleClose}>
      <div className="modal modal-lg" onClick={e => e.stopPropagation()} style={{ maxWidth: 680 }}>
        <div className="modal-header">
          <div>
            <div className="modal-title"><Upload size={16} style={{ marginRight: 8 }} />{title}</div>
            {step !== 'pick' && <div className="text-xs text-muted" style={{ marginTop: 2 }}>{fileName} • {rawRows.length} rows</div>}
          </div>
          <button className="modal-close" onClick={handleClose}><X size={16} /></button>
        </div>

        <div className="modal-body">
          {step === 'pick' && (
            <div style={{ textAlign: 'center', padding: '24px 8px' }}>
              <div style={{ border: '2px dashed var(--border-2)', borderRadius: 12, padding: 36, cursor: 'pointer', background: 'var(--bg)' }}
                onClick={() => fileRef.current.click()}
                onDragOver={e => e.preventDefault()}
                onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFile({ target: { files: [f] } }); }}>
                <FileText size={36} color="var(--text-3)" style={{ margin: '0 auto 12px' }} />
                <div style={{ fontWeight: 700, marginBottom: 6 }}>Drop CSV or Excel file here</div>
                <div className="text-sm text-muted">or click to browse • .csv, .xlsx, .xls</div>
              </div>
              <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls" style={{ display: 'none' }} onChange={handleFile} />
              {error && <div style={{ marginTop: 14, padding: '10px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, color: '#dc2626', fontSize: '.83rem', display: 'flex', gap: 8, alignItems: 'center' }}><AlertCircle size={14} />{error}</div>}
              <div style={{ marginTop: 18, textAlign: 'left' }}>
                <div style={{ fontSize: '.73rem', fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 8 }}>Expected columns</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {columns.map(c => <span key={c.key} style={{ fontSize: '.75rem', padding: '2px 10px', borderRadius: 99, background: c.required ? '#eff6ff' : 'var(--bg)', border: '1px solid var(--border-2)', color: c.required ? 'var(--primary)' : 'var(--text-2)', fontWeight: c.required ? 700 : 400 }}>{c.label}{c.required ? ' *' : ''}</span>)}
                </div>
              </div>
            </div>
          )}

          {step === 'map' && (
            <div>
              <div style={{ marginBottom: 14, fontSize: '.85rem', color: 'var(--text-2)' }}>Map your file columns. Auto-matched where possible.</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {columns.map(col => (
                  <div key={col.key} className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" style={{ marginBottom: 4 }}>{col.label}{col.required && <span className="req"> *</span>}</label>
                    <select className="select" value={mapping[col.key] ?? ''} onChange={e => setMapping(m => ({ ...m, [col.key]: e.target.value === '' ? undefined : parseInt(e.target.value) }))}>
                      <option value="">— Skip —</option>
                      {headers.map((h, i) => <option key={i} value={i}>{h || `Column ${i + 1}`}</option>)}
                    </select>
                  </div>
                ))}
              </div>
              {error && <div style={{ marginTop: 12, padding: '8px 12px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, color: '#dc2626', fontSize: '.83rem' }}>{error}</div>}
            </div>
          )}

          {step === 'preview' && (
            <div>
              <div style={{ marginBottom: 10, fontSize: '.85rem', color: 'var(--text-2)' }}>Preview (first {previewRows.length} of {rawRows.length} rows)</div>
              <div className="table-wrap" style={{ maxHeight: 260, overflow: 'auto' }}>
                <table className="data-table" style={{ fontSize: '.78rem' }}>
                  <thead><tr>{columns.map(c => <th key={c.key}>{c.label}</th>)}</tr></thead>
                  <tbody>{previewRows.map((row, i) => <tr key={i}>{columns.map(c => <td key={c.key}>{row[c.key] || '—'}</td>)}</tr>)}</tbody>
                </table>
              </div>
              <div style={{ marginTop: 10, fontSize: '.83rem', color: 'var(--text-3)' }}>Total rows to import: <strong>{rawRows.length}</strong></div>
            </div>
          )}

          {step === 'done' && (
            <div style={{ textAlign: 'center', padding: '40px 16px' }}>
              <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}><Check size={28} color="#16a34a" /></div>
              <div style={{ fontWeight: 700, fontSize: '1.1rem', marginBottom: 6 }}>Import Complete!</div>
              <div className="text-muted">{importedCount} records successfully imported.</div>
            </div>
          )}
        </div>

        <div className="modal-footer">
          {step === 'pick' && <button className="btn btn-secondary" onClick={handleClose}>Cancel</button>}
          {step === 'map' && <><button className="btn btn-secondary" onClick={() => setStep('pick')}>← Back</button><button className="btn btn-primary" onClick={() => { setError(''); setStep('preview'); }}>Preview <ChevronRight size={14} /></button></>}
          {step === 'preview' && <><button className="btn btn-secondary" onClick={() => setStep('map')}>← Back</button><button className="btn btn-primary" onClick={doImport} disabled={loading}>{loading ? 'Importing…' : `Import ${rawRows.length} Rows`}</button></>}
          {step === 'done' && <button className="btn btn-primary" onClick={handleClose}>Done</button>}
        </div>
      </div>
    </div>
  );
}
