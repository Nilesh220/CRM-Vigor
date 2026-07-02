import { useState } from 'react';
import Modal from './Modal';
import { useToast, useSession } from '../../contexts/AppContext';
import { genId, logActivity, CollegeDB, InfluencerDB, VendorDB, ZONES } from '../../lib/data';
import { parseWithGeminiAI } from '../../lib/gemini';
import { Sparkles, Loader2, Check, AlertCircle } from 'lucide-react';

const CITY_TO_ZONE = {
  // South
  chennai: 'south', bangalore: 'south', bengaluru: 'south', hyderabad: 'south', cochin: 'south', kochi: 'south', trivandrum: 'south', coimbatore: 'south', vizag: 'south', madurai: 'south', mysore: 'south',
  // North
  delhi: 'north', noida: 'north', gurgaon: 'north', gurugram: 'north', faridabad: 'north', ghaziabad: 'north', lucknow: 'north', kanpur: 'north', jaipur: 'north', chandigarh: 'north', mohali: 'north', ludhiana: 'north', amritsar: 'north', dehradun: 'north', jammu: 'north', srinagar: 'north', agra: 'north', varanasi: 'north',
  // West
  mumbai: 'west', pune: 'west', ahmedabad: 'west', surat: 'west', vadodara: 'west', rajkot: 'west', nagpur: 'west', nashik: 'west', panaji: 'west', goa: 'west', udaipur: 'west', jodhpur: 'west',
  // East
  kolkata: 'east', patna: 'east', ranchi: 'east', bhubaneswar: 'east', guwahati: 'east', shillong: 'east', imphal: 'east', siliguri: 'east', cuttack: 'east',
  // Central
  bhopal: 'central', indore: 'central', raipur: 'central', bilaspur: 'central', jabalpur: 'central', gwalior: 'central'
};

const PROMPTS = {
  influencer: `You are a data extraction assistant for a marketing agency CRM.
Extract influencer data from the following raw text. Return ONLY a valid JSON array.
Each object must have these exact fields:
name, instagramLink, gender, followers (number), genre, collegeName, city, avgViews (number), erPercent (number), contactNumber, contentLanguage, tier.
For tier: Nano (<10K followers), Micro (10K-100K), Macro (100K-1M), Mega (>1M).
For missing fields, use empty string or 0.
Raw data:
`,
  vendor: `You are a data extraction assistant for a marketing agency CRM.
Extract vendor/supplier data from the following raw text. Return ONLY a valid JSON array.
Each object must have these exact fields:
name, contactNumber, region, companyName, linkedinProfile, email, website, city, schoolPermission (boolean), collegePermission (boolean), manPower (number), promoterCost, fabrication, comment, status, category.
For missing fields, use empty string, false, or 0.
Raw data:
`,
  college: `You are a data extraction assistant for a marketing agency CRM.
Extract college/institution data from the following raw text. Return ONLY a valid JSON array.
Each object must have these exact fields:
name, city, state, location, naacGrade, affiliation, totalStudents (number), type, festName, festMonth, nccUnit (boolean), eCell (boolean), placementCell (boolean), status.
For missing fields, use empty string, false, or 0.
Raw data:
`,
};

export default function AIImportModal({ open, onClose, entityType, onImported }) {
  const toast = useToast();
  const session = useSession();
  const [rawText, setRawText] = useState('');
  const [loading, setLoading] = useState(false);
  const [parsedData, setParsedData] = useState([]);
  const [statusMsg, setStatusMsg] = useState('');

  const labels = { college: 'College', influencer: 'Influencer', vendor: 'Vendor' };

  async function handleParse() {
    if (!rawText.trim()) {
      toast('Please paste some text first.', 'warning');
      return;
    }
    setLoading(true);
    setStatusMsg('Preparing parser...');
    setParsedData([]);

    try {
      const lines = rawText.split('\n').map(l => l.trim()).filter(Boolean);
      if (lines.length === 0) {
        toast('No data lines detected.', 'warning');
        setLoading(false);
        return;
      }

      // Automatically strip header row if present
      let dataLines = [...lines];
      const firstLineLower = lines[0].toLowerCase();
      if (firstLineLower.includes('name') || firstLineLower.includes('contact') || firstLineLower.includes('email') || firstLineLower.includes('company')) {
        dataLines = lines.slice(1);
      }

      if (dataLines.length === 0) {
        toast('No data rows found below headers.', 'warning');
        setLoading(false);
        return;
      }

      const BATCH_SIZE = 15;
      const batches = [];
      for (let i = 0; i < dataLines.length; i += BATCH_SIZE) {
        batches.push(dataLines.slice(i, i + BATCH_SIZE));
      }

      let aggregatedResults = [];
      const promptBase = PROMPTS[entityType];

      for (let index = 0; index < batches.length; index++) {
        const batch = batches[index];
        setStatusMsg(`Parsing batch ${index + 1} of ${batches.length} (${batch.length} rows)...`);
        
        const chunkText = batch.join('\n');
        try {
          const parsedChunk = await parseWithGeminiAI(chunkText, promptBase);
          if (Array.isArray(parsedChunk)) {
            aggregatedResults.push(...parsedChunk);
          }
        } catch (chunkErr) {
          console.error(`Error parsing batch ${index + 1}:`, chunkErr);
          // Continue to next batch if one fails, to save partial results
        }
      }

      if (aggregatedResults.length === 0) {
        throw new Error('AI could not extract any records. Ensure format is correct.');
      }

      setParsedData(aggregatedResults);
      setStatusMsg(`Successfully extracted ${aggregatedResults.length} records! Review below.`);
      toast(`Extracted ${aggregatedResults.length} records.`, 'success');
    } catch (err) {
      console.error(err);
      setStatusMsg(`Extraction error: ${err.message}`);
      toast('Failed to analyze data with AI.', 'error');
    } finally {
      setLoading(false);
    }
  }

  async function handleImport() {
    if (!parsedData.length) return;
    setLoading(true);
    setStatusMsg('Importing records into database...');
    try {
      const store = entityType === 'influencer' ? InfluencerDB : entityType === 'vendor' ? VendorDB : CollegeDB;
      const shortPrefix = entityType.slice(0, 3);

      const records = parsedData.map((item, index) => {
        // Find zone based on state/city mapping
        let zone = item.zone || '';
        if (zone) {
          zone = zone.toLowerCase().replace(/[^a-z_]/g, '');
          if (zone.includes('north')) zone = 'north';
          else if (zone.includes('south')) zone = 'south';
          else if (zone.includes('east')) zone = 'east';
          else if (zone.includes('west')) zone = 'west';
          else if (zone.includes('central')) zone = 'central';
          else if (zone.includes('pan')) zone = 'pan_india';
        }
        if (!zone && item.city) {
          const cityLower = item.city.toLowerCase().trim();
          zone = CITY_TO_ZONE[cityLower] || '';
        }
        if (!zone && item.state) {
          const stateLower = item.state.toLowerCase().trim();
          Object.keys(CITY_TO_ZONE).forEach(c => {
            if (stateLower.includes(c)) zone = CITY_TO_ZONE[c];
          });
          if (!zone) {
            Object.entries(ZONES).forEach(([key, val]) => {
              if (val.states.some(s => s.toLowerCase().includes(stateLower) || stateLower.includes(s.toLowerCase()))) {
                zone = key;
              }
            });
          }
        }
        if (!zone) zone = 'west'; // fallback

        // Append index to guarantee absolute uniqueness in database
        const record = {
          ...item,
          id: genId(shortPrefix) + '_' + index,
          zone,
          status: item.status || 'Active',
          createdBy: session?.id || 'system',
          createdAt: new Date().toISOString(),
        };

        if (entityType === 'influencer') {
          const f = parseInt(item.followers) || 0;
          record.followers = f;
          record.avgViews = parseInt(item.avgViews) || 0;
          record.erPercent = parseFloat(item.erPercent) || 0;
          record.tier = f >= 1000000 ? 'Mega' : f >= 100000 ? 'Macro' : f >= 10000 ? 'Micro' : 'Nano';
          record.srNo = InfluencerDB.all().length + 1 + index;
        } else if (entityType === 'vendor') {
          record.manPower = parseInt(item.manPower) || 0;
        } else if (entityType === 'college') {
          record.totalStudents = parseInt(item.totalStudents) || 0;
          record.contacts = record.contacts || [];
        }
        return record;
      });

      await store.bulkAdd(records);

      logActivity('AI Imported', labels[entityType], `${parsedData.length} records`, 'via AI');
      toast(`✓ Imported ${parsedData.length} ${labels[entityType]}s successfully!`, 'success');
      setRawText('');
      setParsedData([]);
      if (typeof onImported === 'function') onImported();
      onClose();
    } catch (err) {
      console.error(err);
      setStatusMsg(`Import error: ${err.message}`);
      toast('Failed to import records to Supabase.', 'error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`AI Bulk Import — ${labels[entityType]}s`}
      size="modal-lg"
      footer={
        <>
          <button className="btn btn-secondary" onClick={onClose} disabled={loading}>Cancel</button>
          <button className="btn btn-secondary" onClick={handleParse} disabled={loading || !rawText.trim()}>
            {loading ? <Loader2 size={13} className="spinner" /> : <Sparkles size={13} />}
            Analyze with AI
          </button>
          {parsedData.length > 0 && (
            <button className="btn btn-primary" onClick={handleImport}>
              <Check size={13} />
              Import {parsedData.length} Records
            </button>
          )}
        </>
      }
    >
      <div className="ai-hint-box" style={{ margin: 0, padding: 14, marginBottom: 14, textAlign: 'left' }}>
        <div className="ai-label" style={{ background: 'var(--purple-light)', color: 'var(--purple)' }}><Sparkles size={11} /> AI Powered Importer</div>
        <p style={{ fontSize: '.8rem', color: 'var(--text-2)', lineHeight: 1.5 }}>
          Paste raw data of any format below (e.g. spreadsheet copy, email text, CSV lines, WhatsApp text, messy logs).
          The AI will intelligently extract clean, structured records for this CRM database instantly.
        </p>
      </div>

      <div className="form-group">
        <textarea
          className="textarea"
          style={{ minHeight: 140, fontSize: '.78rem', fontFamily: 'monospace' }}
          value={rawText}
          onChange={e => setRawText(e.target.value)}
          placeholder={`Paste raw data here...\n\nExample:\nSymbiosis Pune, NAAC A++, 8000 students, private college, they host TECHSYM in February.\nHindu College Delhi, Gov college, MECCA fest in March, NAAC A+`}
          disabled={loading}
        />
      </div>

      {statusMsg && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '8px 12px', borderRadius: 'var(--r-sm)', fontSize: '.82rem',
          background: parsedData.length ? 'var(--success-bg)' : 'var(--danger-bg)',
          color: parsedData.length ? 'var(--success)' : 'var(--danger)',
          marginBottom: 12
        }}>
          {parsedData.length ? <Check size={14} /> : <AlertCircle size={14} />}
          {statusMsg}
        </div>
      )}

      {parsedData.length > 0 && (
        <div>
          <div style={{ fontSize: '.82rem', fontWeight: 700, marginBottom: 8 }}>AI Extracted Preview:</div>
          <div className="table-wrap" style={{ maxHeight: 200, overflowY: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  {Object.keys(parsedData[0]).slice(0, 6).map(h => <th key={h}>{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {parsedData.slice(0, 5).map((row, i) => (
                  <tr key={i}>
                    {Object.values(row).slice(0, 6).map((val, idx) => (
                      <td key={idx} style={{ fontSize: '.78rem' }}>{String(val ?? '—')}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {parsedData.length > 5 && (
            <div style={{ fontSize: '.74rem', color: 'var(--text-3)', marginTop: 6, fontStyle: 'italic' }}>
              Showing first 5 of {parsedData.length} records.
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}
