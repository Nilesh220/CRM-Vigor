import { useState } from 'react';
import { supabase } from '../lib/supabase';
import {
  CheckCircle2, Send, Zap, ArrowRight, Phone, Mail, Building2,
  MapPin, MessageSquare, Star, Handshake, Users, GraduationCap, User
} from 'lucide-react';

const CAMPAIGN_TYPES = [
  'Brand Activation', 'Influencer Marketing', 'Digital Campaign',
  'College Activation', 'Event Marketing', 'BTL Campaign',
  'Performance Marketing', 'Content Creation', 'Other'
];

const VENDOR_CATS = [
  'Fabrication', 'Event Management', 'Printing', 'On-Ground Activation',
  'Photography/Video', 'Logistics', 'Catering', 'AV Equipment', 'Other'
];

const CONTACT_TYPES = [
  'Student Committee', 'Student Council', 'HOD', 'Principal', 'Vice Principal',
  'NCC Officer', 'E-Cell', 'Placement Cell', 'Cultural Committee', 'Technical Committee',
  'Fest Coordinator', 'Other',
];

const LEAD_TYPES = [
  { value: 'brand',     label: '🏢 Brand',          desc: 'Looking to activate',         color: '#6366f1' },
  { value: 'vendor',   label: '🏪 Vendor',          desc: 'Offer services',              color: '#f59e0b' },
  { value: 'creator',  label: '⭐ Creator',         desc: 'College influencer',          color: '#ec4899' },
  { value: 'college',  label: '🎓 College',         desc: 'Host activations',            color: '#10b981' },
  { value: 'poc',      label: '🤝 College POC',     desc: 'Point of contact',            color: '#3b82f6' },
];

function genId(p) {
  return p + '_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);
}

function emptyForm() {
  return {
    name: '', phone: '', email: '', city: '', zone: '', message: '',
    // Brand
    brandName: '', campaignType: '',
    // Vendor
    companyName: '', vendorCategory: '', manPower: '',
    // Creator / Influencer
    instagramLink: '', youtubeLink: '', followers: '', genre: '', collegeName: '', contentLanguage: '',
    // College POC
    pocCollegeName: '', designation: '', studentCount: '', festName: '',
  };
}

export default function CaptureForm() {
  const params = new URLSearchParams(window.location.search);
  const sourceParam = params.get('source') || 'Capture Form';

  const [leadType, setLeadType] = useState('brand');
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState(emptyForm());

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));
  const current = LEAD_TYPES.find(t => t.value === leadType);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.name.trim() || !form.phone.trim()) {
      setError('Name and phone number are required.');
      return;
    }
    setError('');
    setSubmitting(true);

    try {
      if (leadType === 'brand') {
        // Save to leads table
        await supabase.from('vlcrm_leads').insert({
          id: genId('lead'),
          brand_name: form.brandName || form.name,
          poc_name: form.name,
          poc_phone: form.phone,
          poc_email: form.email || null,
          city: form.city || null,
          status: 'new',
          priority: 'medium',
          source: sourceParam,
          category: 'Brand',
          campaign_type: form.campaignType || null,
          notes: [
            form.message ? `Message: ${form.message}` : '',
            `Submitted via: ${sourceParam}`,
          ].filter(Boolean).join('\n'),
          created_at: new Date().toISOString(),
        });

      } else if (leadType === 'vendor') {
        // Save to vlcrm_vendors table
        await supabase.from('vlcrm_vendors').insert({
          id: genId('ven'),
          name: form.name,
          company_name: form.companyName || form.name,
          contact_number: form.phone,
          email: form.email || null,
          city: form.city || null,
          category: form.vendorCategory || null,
          man_power: form.manPower || null,
          status: 'Pending',
          comment: [
            form.message ? form.message : '',
            `Submitted via: ${sourceParam}`,
          ].filter(Boolean).join('\n'),
          created_at: new Date().toISOString(),
        });

      } else if (leadType === 'creator') {
        // Save to vlcrm_influencers table
        await supabase.from('vlcrm_influencers').insert({
          id: genId('inf'),
          name: form.name,
          instagram_link: form.instagramLink || null,
          youtube_link: form.youtubeLink || null,
          contact_number: form.phone,
          gender: null,
          followers: parseInt(form.followers) || 0,
          genre: form.genre || 'Campus Ambassador',
          college_name: form.collegeName || null,
          city: form.city || null,
          content_language: form.contentLanguage || null,
          status: 'Pending Outreach',
          type: 'college',
          notes: [
            form.message ? form.message : '',
            `Submitted via: ${sourceParam}`,
          ].filter(Boolean).join('\n'),
          created_at: new Date().toISOString(),
        });

      } else if (leadType === 'college') {
        // Save to leads table as College category
        await supabase.from('vlcrm_leads').insert({
          id: genId('lead'),
          brand_name: form.pocCollegeName || form.name,
          poc_name: form.name,
          poc_phone: form.phone,
          poc_email: form.email || null,
          city: form.city || null,
          status: 'new',
          priority: 'medium',
          source: sourceParam,
          category: 'College',
          campaign_type: form.campaignType || null,
          notes: [
            form.studentCount ? `Student Count: ${form.studentCount}` : '',
            form.festName ? `Fest: ${form.festName}` : '',
            form.message ? `Message: ${form.message}` : '',
            `Submitted via: ${sourceParam}`,
          ].filter(Boolean).join('\n'),
          created_at: new Date().toISOString(),
        });

      } else if (leadType === 'poc') {
        // Save to vlcrm_colleges as a contact/lead
        await supabase.from('vlcrm_leads').insert({
          id: genId('lead'),
          brand_name: form.pocCollegeName || form.name,
          poc_name: form.name,
          poc_phone: form.phone,
          poc_email: form.email || null,
          city: form.city || null,
          status: 'new',
          priority: 'medium',
          source: sourceParam,
          category: 'College POC',
          notes: [
            form.designation ? `Designation: ${form.designation}` : '',
            form.studentCount ? `Student Count: ${form.studentCount}` : '',
            form.festName ? `Fest: ${form.festName}` : '',
            form.message ? `Message: ${form.message}` : '',
            `Submitted via: ${sourceParam}`,
          ].filter(Boolean).join('\n'),
          created_at: new Date().toISOString(),
        });
      }

      setSubmitted(true);
    } catch (err) {
      console.error('[CaptureForm] submit error', err);
      setError('Something went wrong. Please try again or call us directly.');
    }
    setSubmitting(false);
  }

  // ── Success screen ──────────────────────────────────────────
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

  // ── Main Form ───────────────────────────────────────────────
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
            Who are you? Pick your category and fill in the details 🚀
          </p>
        </div>

        <form onSubmit={handleSubmit} className="capture-form">

          {/* Type toggle — 5 options */}
          <div className="capture-type-grid">
            {LEAD_TYPES.map(t => (
              <button
                key={t.value}
                type="button"
                className={`capture-type-tile ${leadType === t.value ? 'active' : ''}`}
                style={{ '--tile-color': t.color }}
                onClick={() => setLeadType(t.value)}
              >
                <span className="capture-type-icon">{t.label.split(' ')[0]}</span>
                <span className="capture-type-name">{t.label.split(' ').slice(1).join(' ')}</span>
                <span className="capture-type-desc">{t.desc}</span>
              </button>
            ))}
          </div>

          {/* ── Common Fields ─────────────────────────────── */}
          <div className="capture-section-label" style={{ color: current?.color }}>
            {current?.label} Details
          </div>

          <div className="capture-field">
            <label>Your Name <span>*</span></label>
            <div className="capture-input-icon">
              <User size={14} />
              <input type="text" placeholder="Rahul Sharma" value={form.name} onChange={set('name')} required />
            </div>
          </div>

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

          <div className="capture-field">
            <label>City</label>
            <div className="capture-input-icon">
              <MapPin size={14} />
              <input type="text" placeholder="Mumbai, Pune, Delhi…" value={form.city} onChange={set('city')} />
            </div>
          </div>

          {/* ── Brand specific ─────────────────────────── */}
          {leadType === 'brand' && (
            <>
              <div className="capture-field">
                <label>Brand / Company Name</label>
                <div className="capture-input-icon">
                  <Building2 size={14} />
                  <input type="text" placeholder="Your brand name" value={form.brandName} onChange={set('brandName')} />
                </div>
              </div>
              <div className="capture-field">
                <label>What are you looking for?</label>
                <select value={form.campaignType} onChange={set('campaignType')}>
                  <option value="">Select a service…</option>
                  {CAMPAIGN_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </>
          )}

          {/* ── Vendor specific ────────────────────────── */}
          {leadType === 'vendor' && (
            <>
              <div className="capture-field">
                <label>Company / Business Name</label>
                <div className="capture-input-icon">
                  <Handshake size={14} />
                  <input type="text" placeholder="Your company name" value={form.companyName} onChange={set('companyName')} />
                </div>
              </div>
              <div className="capture-row">
                <div className="capture-field">
                  <label>Service Category</label>
                  <select value={form.vendorCategory} onChange={set('vendorCategory')}>
                    <option value="">Select category…</option>
                    {VENDOR_CATS.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="capture-field">
                  <label>Team Size (approx.)</label>
                  <input type="number" placeholder="e.g. 20" value={form.manPower} onChange={set('manPower')} />
                </div>
              </div>
            </>
          )}

          {/* ── Creator / Influencer specific ──────────── */}
          {leadType === 'creator' && (
            <>
              <div className="capture-field">
                <label>College Name</label>
                <div className="capture-input-icon">
                  <GraduationCap size={14} />
                  <input type="text" placeholder="Your college name" value={form.collegeName} onChange={set('collegeName')} />
                </div>
              </div>
              <div className="capture-row">
                <div className="capture-field">
                  <label>Instagram Profile Link</label>
                  <div className="capture-input-icon">
                    <Star size={14} />
                    <input type="url" placeholder="instagram.com/yourhandle" value={form.instagramLink} onChange={set('instagramLink')} />
                  </div>
                </div>
                <div className="capture-field">
                  <label>YouTube Channel Link</label>
                  <div className="capture-input-icon">
                    <Star size={14} />
                    <input type="url" placeholder="youtube.com/c/..." value={form.youtubeLink} onChange={set('youtubeLink')} />
                  </div>
                </div>
              </div>
              <div className="capture-row">
                <div className="capture-field">
                  <label>Total Followers</label>
                  <input type="number" placeholder="e.g. 25000" value={form.followers} onChange={set('followers')} />
                </div>
                <div className="capture-field">
                  <label>Content Niche / Genre</label>
                  <input type="text" placeholder="e.g. Lifestyle, Comedy, Edu" value={form.genre} onChange={set('genre')} />
                </div>
              </div>
              <div className="capture-field">
                <label>Content Language</label>
                <input type="text" placeholder="e.g. Hindi, English, Marathi" value={form.contentLanguage} onChange={set('contentLanguage')} />
              </div>
            </>
          )}

          {/* ── College specific ───────────────────────── */}
          {leadType === 'college' && (
            <>
              <div className="capture-field">
                <label>College / Institution Name</label>
                <div className="capture-input-icon">
                  <Building2 size={14} />
                  <input type="text" placeholder="Your college name" value={form.pocCollegeName} onChange={set('pocCollegeName')} />
                </div>
              </div>
              <div className="capture-row">
                <div className="capture-field">
                  <label>Approx. Student Count</label>
                  <input type="number" placeholder="e.g. 5000" value={form.studentCount} onChange={set('studentCount')} />
                </div>
                <div className="capture-field">
                  <label>Annual Fest Name</label>
                  <input type="text" placeholder="e.g. Techfest 2026" value={form.festName} onChange={set('festName')} />
                </div>
              </div>
              <div className="capture-field">
                <label>What are you looking for?</label>
                <select value={form.campaignType} onChange={set('campaignType')}>
                  <option value="">Select a service…</option>
                  {CAMPAIGN_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </>
          )}

          {/* ── College POC specific ───────────────────── */}
          {leadType === 'poc' && (
            <>
              <div className="capture-field">
                <label>College Name</label>
                <div className="capture-input-icon">
                  <Building2 size={14} />
                  <input type="text" placeholder="Your college name" value={form.pocCollegeName} onChange={set('pocCollegeName')} />
                </div>
              </div>
              <div className="capture-row">
                <div className="capture-field">
                  <label>Your Designation / Role</label>
                  <select value={form.designation} onChange={set('designation')}>
                    <option value="">Select role…</option>
                    {CONTACT_TYPES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="capture-field">
                  <label>Annual Fest Name</label>
                  <input type="text" placeholder="e.g. Techfest 2026" value={form.festName} onChange={set('festName')} />
                </div>
              </div>
              <div className="capture-field">
                <label>Approx. Student Count</label>
                <input type="number" placeholder="e.g. 5000" value={form.studentCount} onChange={set('studentCount')} />
              </div>
            </>
          )}

          {/* ── Message (all types) ─────────────────────── */}
          <div className="capture-field">
            <label>Tell us more</label>
            <div className="capture-input-icon capture-textarea-wrap">
              <MessageSquare size={14} style={{ marginTop: 3 }} />
              <textarea
                placeholder={
                  leadType === 'vendor' ? 'Services you offer, regions you operate in…' :
                  leadType === 'creator' ? 'Past collaborations, your best performing content…' :
                  leadType === 'poc' ? 'Opportunities you can offer — sponsorships, stalls, etc…' :
                  'Budget, timeline, specific goals…'
                }
                value={form.message}
                onChange={set('message')}
                rows={3}
              />
            </div>
          </div>

          {error && <div className="capture-error">{error}</div>}

          <button type="submit" className="capture-submit" style={{ background: current?.color }} disabled={submitting}>
            {submitting ? (
              <><div className="capture-spinner" /> Submitting…</>
            ) : (
              <>Submit {current?.label.split(' ').slice(1).join(' ') || 'Inquiry'} <ArrowRight size={16} /></>
            )}
          </button>

          <p className="capture-footer">
            By submitting, you agree to be contacted by VigorLaunchpad team.
          </p>
        </form>
      </div>

      {/* Inline styles for the new type grid */}
      <style>{`
        .capture-type-grid {
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          gap: 8px;
          margin-bottom: 20px;
        }
        @media (max-width: 600px) {
          .capture-type-grid {
            grid-template-columns: repeat(3, 1fr);
          }
        }
        @media (max-width: 380px) {
          .capture-type-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }
        .capture-type-tile {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 3px;
          padding: 10px 6px;
          border-radius: 12px;
          border: 2px solid #e5e7eb;
          background: #fff;
          cursor: pointer;
          transition: all .18s;
          text-align: center;
        }
        .capture-type-tile:hover {
          border-color: var(--tile-color, #6366f1);
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0,0,0,.08);
        }
        .capture-type-tile.active {
          border-color: var(--tile-color, #6366f1);
          background: color-mix(in srgb, var(--tile-color, #6366f1) 10%, white);
          box-shadow: 0 2px 12px color-mix(in srgb, var(--tile-color, #6366f1) 25%, transparent);
        }
        .capture-type-icon {
          font-size: 1.4rem;
          line-height: 1;
        }
        .capture-type-name {
          font-size: .73rem;
          font-weight: 700;
          color: #1e293b;
          line-height: 1.2;
        }
        .capture-type-tile.active .capture-type-name {
          color: var(--tile-color, #6366f1);
        }
        .capture-type-desc {
          font-size: .62rem;
          color: #94a3b8;
          line-height: 1.2;
        }
        .capture-section-label {
          font-size: .7rem;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: .08em;
          margin-bottom: 12px;
          padding-bottom: 6px;
          border-bottom: 2px solid currentColor;
          opacity: .8;
        }
      `}</style>
    </div>
  );
}
