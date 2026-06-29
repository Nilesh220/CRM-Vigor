import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { CheckCircle2, Send, Zap, ArrowRight, Phone, Mail, Building2, MapPin, MessageSquare } from 'lucide-react';

const CAMPAIGN_TYPES = [
  'Brand Activation', 'Influencer Marketing', 'Digital Campaign',
  'College Activation', 'Event Marketing', 'BTL Campaign',
  'Performance Marketing', 'Content Creation', 'Other'
];

const LEAD_TYPES = [
  { value: 'brand', label: '🏢 Brand / Client' },
  { value: 'college', label: '🎓 College / Institution' },
];

function genId(p) {
  return p + '_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);
}

export default function CaptureForm() {
  const params = new URLSearchParams(window.location.search);
  const sourceParam = params.get('source') || 'WhatsApp Form';

  const [leadType, setLeadType] = useState('brand');
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    name: '',
    brandName: '',
    collegeName: '',
    phone: '',
    email: '',
    city: '',
    campaignType: '',
    message: '',
    studentCount: '',
  });

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.name.trim() || !form.phone.trim()) {
      setError('Name and phone number are required.');
      return;
    }
    setError('');
    setSubmitting(true);

    try {
      const isBrand = leadType === 'brand';
      const payload = {
        id: genId('lead'),
        brand_name: isBrand ? (form.brandName || form.name) : (form.collegeName || form.name),
        poc_name: form.name,
        poc_phone: form.phone,
        poc_email: form.email || null,
        city: form.city || null,
        status: 'new',
        priority: 'medium',
        source: sourceParam,
        category: isBrand ? 'Brand' : 'College',
        campaign_type: form.campaignType || null,
        notes: [
          form.message ? `Message: ${form.message}` : '',
          !isBrand && form.studentCount ? `Student Count: ${form.studentCount}` : '',
          `Submitted via: ${sourceParam}`,
        ].filter(Boolean).join('\n'),
        created_at: new Date().toISOString(),
      };

      const { error: dbErr } = await supabase.from('vlcrm_leads').insert(payload);
      if (dbErr) throw dbErr;
      setSubmitted(true);
    } catch (err) {
      console.error('[CaptureForm] submit error', err);
      setError('Something went wrong. Please try again or call us directly.');
    }
    setSubmitting(false);
  }

  if (submitted) {
    return (
      <div className="capture-page">
        <div className="capture-success">
          <div className="capture-success-icon">
            <CheckCircle2 size={48} strokeWidth={1.5} />
          </div>
          <h2>Thank You! 🎉</h2>
          <p>Your inquiry has been received. Our team will reach out to you within <strong>24 hours</strong>.</p>
          <div className="capture-contact-row">
            <a href="tel:+919999999999" className="capture-contact-btn">
              <Phone size={15} /> Call Us
            </a>
            <a href="https://wa.me/919999999999" target="_blank" rel="noreferrer" className="capture-contact-btn capture-wa">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
              WhatsApp
            </a>
          </div>
          <p className="capture-powered">Powered by <strong>VigorLaunchpad</strong></p>
        </div>
      </div>
    );
  }

  return (
    <div className="capture-page">
      <div className="capture-card">
        {/* Header */}
        <div className="capture-header">
          <div className="capture-logo">
            <Zap size={22} />
            <span>VigorLaunchpad</span>
          </div>
          <h1 className="capture-title">Let's Work Together</h1>
          <p className="capture-subtitle">
            Tell us about your brand or event — our team will connect with you shortly 🚀
          </p>
        </div>

        <form onSubmit={handleSubmit} className="capture-form">
          {/* Type toggle */}
          <div className="capture-type-toggle">
            {LEAD_TYPES.map(t => (
              <button
                key={t.value}
                type="button"
                className={`capture-type-btn ${leadType === t.value ? 'active' : ''}`}
                onClick={() => setLeadType(t.value)}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Name */}
          <div className="capture-field">
            <label>Your Name <span>*</span></label>
            <input
              type="text"
              placeholder="Rahul Sharma"
              value={form.name}
              onChange={set('name')}
              required
            />
          </div>

          {/* Brand/College Name */}
          {leadType === 'brand' ? (
            <div className="capture-field">
              <label>Brand / Company Name</label>
              <div className="capture-input-icon">
                <Building2 size={14} />
                <input type="text" placeholder="Your brand name" value={form.brandName} onChange={set('brandName')} />
              </div>
            </div>
          ) : (
            <div className="capture-field">
              <label>College / Institution Name</label>
              <div className="capture-input-icon">
                <Building2 size={14} />
                <input type="text" placeholder="Your college name" value={form.collegeName} onChange={set('collegeName')} />
              </div>
            </div>
          )}

          {/* Phone + Email */}
          <div className="capture-row">
            <div className="capture-field">
              <label>Phone <span>*</span></label>
              <div className="capture-input-icon">
                <Phone size={14} />
                <input type="tel" placeholder="9876543210" value={form.phone} onChange={set('phone')} required />
              </div>
            </div>
            <div className="capture-field">
              <label>Email</label>
              <div className="capture-input-icon">
                <Mail size={14} />
                <input type="email" placeholder="you@email.com" value={form.email} onChange={set('email')} />
              </div>
            </div>
          </div>

          {/* City */}
          <div className="capture-field">
            <label>City</label>
            <div className="capture-input-icon">
              <MapPin size={14} />
              <input type="text" placeholder="Mumbai, Pune, Delhi…" value={form.city} onChange={set('city')} />
            </div>
          </div>

          {/* College-specific: student count */}
          {leadType === 'college' && (
            <div className="capture-field">
              <label>Approximate Student Count</label>
              <input type="number" placeholder="e.g. 5000" value={form.studentCount} onChange={set('studentCount')} />
            </div>
          )}

          {/* Campaign type */}
          <div className="capture-field">
            <label>What are you looking for?</label>
            <select value={form.campaignType} onChange={set('campaignType')}>
              <option value="">Select a service…</option>
              {CAMPAIGN_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          {/* Message */}
          <div className="capture-field">
            <label>Tell us more</label>
            <div className="capture-input-icon capture-textarea-wrap">
              <MessageSquare size={14} style={{ marginTop: 3 }} />
              <textarea
                placeholder="Budget, timeline, specific goals…"
                value={form.message}
                onChange={set('message')}
                rows={3}
              />
            </div>
          </div>

          {error && <div className="capture-error">{error}</div>}

          <button type="submit" className="capture-submit" disabled={submitting}>
            {submitting ? (
              <><div className="capture-spinner" /> Submitting…</>
            ) : (
              <>Send Inquiry <ArrowRight size={16} /></>
            )}
          </button>

          <p className="capture-footer">
            By submitting, you agree to be contacted by VigorLaunchpad team.
          </p>
        </form>
      </div>
    </div>
  );
}
