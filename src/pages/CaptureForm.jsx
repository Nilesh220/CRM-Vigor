import { useState } from 'react';
import { supabase } from '../lib/supabase';
import {
  CheckCircle2, Zap, ArrowRight, Phone, Mail, Building2,
  MapPin, MessageSquare, Star, GraduationCap, User, Handshake, Users
} from 'lucide-react';

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
  { value: 'vendor',   icon: Handshake,     label: 'Vendor',        desc: 'Offer services for events',   color: '#f59e0b' },
  { value: 'creator',  icon: Star,          label: 'Creator',       desc: 'College influencer',           color: '#ec4899' },
  { value: 'college',  icon: GraduationCap, label: 'College',       desc: 'Host activations',             color: '#10b981' },
  { value: 'poc',      icon: Users,         label: 'College POC',   desc: 'Faculty / Committee contact',  color: '#3b82f6' },
];

const YES_NO = ['Yes', 'No'];
const YES_NO_REQ = ['Yes', 'No', 'On Request'];

function genId(p) {
  return p + '_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);
}

function emptyForm() {
  return {
    name: '', phone: '', email: '', city: '', message: '',
    // Vendor
    companyName: '', vendorCategory: '', zone: '',
    manPower: '', promoterCost: '', fabrication: '',
    schoolPermission: '', collegePermission: '',
    // Creator
    instagramLink: '', youtubeLink: '', followers: '', genre: '', collegeName: '', contentLanguage: '',
    // College / POC
    pocCollegeName: '', designation: '', studentCount: '', festName: '',
  };
}

export default function CaptureForm() {
  const params = new URLSearchParams(window.location.search);
  const sourceParam = params.get('source') || 'Capture Form';

  const [leadType, setLeadType] = useState('vendor');
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState(emptyForm());

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));
  const setVal = (k, v) => setForm(f => ({ ...f, [k]: v }));
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
      if (leadType === 'vendor') {
        const { error: insertErr } = await supabase.from('vlcrm_vendors').insert({
          id: genId('ven'),
          name: form.name,
          company_name: form.companyName || form.name,
          contact_number: form.phone,
          email: form.email || null,
          city: form.city || null,
          zone: form.zone || null,
          category: form.vendorCategory || null,
          man_power: (form.manPower === 'Yes' || form.manPower === 'On Request') ? 1 : 0,
          promoter_cost: form.promoterCost || null,
          fabrication: form.fabrication || null,
          school_permission: form.schoolPermission === 'Yes',
          college_permission: form.collegePermission === 'Yes',
          status: 'Pending',
          comment: [
            form.message || '',
            `Submitted via: ${sourceParam}`,
            `Services: ${form.vendorCategory || 'None'}`,
            `Zone Selection: ${form.zone || 'None'}`,
            `Fabrication: ${form.fabrication || 'No'}`,
            `Manpower Option Selected: ${form.manPower || 'No'}`,
            `School Permission: ${form.schoolPermission || 'No'}`,
            `College Permission: ${form.collegePermission || 'No'}`,
          ].filter(Boolean).join('\n'),
          created_at: new Date().toISOString(),
        });
        if (insertErr) throw insertErr;

      } else if (leadType === 'creator') {
        const { error: insertErr } = await supabase.from('vlcrm_influencers').insert({
          id: genId('inf'),
          name: form.name,
          instagram_link: form.instagramLink || null,
          youtube_link: form.youtubeLink || null,
          contact_number: form.phone,
          followers: parseInt(form.followers) || 0,
          genre: form.genre || 'Campus Ambassador',
          college_name: form.collegeName || null,
          city: form.city || null,
          content_language: form.contentLanguage || null,
          status: 'Pending Outreach',
          type: 'college',
          notes: [form.message || '', `Submitted via: ${sourceParam}`].filter(Boolean).join('\n'),
          created_at: new Date().toISOString(),
        });
        if (insertErr) throw insertErr;

      } else {
        // College & POC → leads table
        const { error: insertErr } = await supabase.from('vlcrm_leads').insert({
          id: genId('lead'),
          brand_name: form.pocCollegeName || form.name,
          poc_name: form.name,
          poc_phone: form.phone,
          poc_email: form.email || null,
          city: form.city || null,
          status: 'new',
          priority: 'medium',
          source: sourceParam,
          category: leadType === 'poc' ? 'College POC' : 'College',
          notes: [
            form.designation ? `Role: ${form.designation}` : '',
            form.studentCount ? `Students: ${form.studentCount}` : '',
            form.festName ? `Fest: ${form.festName}` : '',
            form.message || '',
            `Submitted via: ${sourceParam}`,
          ].filter(Boolean).join('\n'),
          created_at: new Date().toISOString(),
        });
        if (insertErr) throw insertErr;
      }
      setSubmitted(true);
    } catch (err) {
      console.error('[CaptureForm] submit error', err);
      setError('Something went wrong. Please try again or call us directly.');
    }
    setSubmitting(false);
  }

  // ── Success screen ───────────────────────────────────────────────
  if (submitted) {
    return (
      <div className="capture-page">
        <div className="capture-success">
          <div className="capture-success-icon">
            <CheckCircle2 size={52} strokeWidth={1.5} />
          </div>
          <h2>Submitted!</h2>
          <p>We've received your details. Our team will reach out within <strong>24 hours</strong>.</p>
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

  // ── Main Form ────────────────────────────────────────────────────
  return (
    <div className="capture-page">
      <div className="capture-card" style={{ maxWidth: 560 }}>

        {/* Header */}
        <div className="capture-header">
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 18 }}>
            <div style={{
              background: '#ffffff', borderRadius: '10px', padding: '10px 18px',
              display: 'inline-flex', alignItems: 'center', boxShadow: '0 8px 24px rgba(0,0,0,.2)'
            }}>
              <img
                src="/vigor-logo-new-01.png"
                alt="VigorLaunchpad"
                style={{ height: '28px', width: 'auto', display: 'block' }}
              />
            </div>
          </div>
          <h1 className="capture-title">Partner With Us</h1>
          <p className="capture-subtitle">
            Select who you are and fill in your details — we'll connect shortly
          </p>
        </div>

        <form onSubmit={handleSubmit} className="capture-form">

          {/* Type tiles */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 24 }}>
            {LEAD_TYPES.map(t => {
              const Icon = t.icon;
              return (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setLeadType(t.value)}
                  style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                    padding: '14px 6px 10px',
                    borderRadius: 14,
                    border: `2.5px solid ${leadType === t.value ? t.color : '#e2e8f0'}`,
                    background: leadType === t.value ? t.color + '14' : '#fff',
                    cursor: 'pointer', transition: 'all .18s', textAlign: 'center',
                    boxShadow: leadType === t.value ? `0 4px 14px ${t.color}33` : 'none',
                  }}
                >
                  <Icon size={22} color={leadType === t.value ? t.color : '#64748b'} strokeWidth={1.8} />
                  <span style={{
                    fontSize: '.72rem', fontWeight: 800, lineHeight: 1.2,
                    color: leadType === t.value ? t.color : '#334155',
                  }}>{t.label}</span>
                  <span style={{ fontSize: '.6rem', color: '#94a3b8', lineHeight: 1.2 }}>{t.desc}</span>
                </button>
              );
            })}
          </div>

          {/* Section divider */}
          <div style={{
            fontSize: '.68rem', fontWeight: 800, textTransform: 'uppercase',
            letterSpacing: '.1em', color: current?.color,
            borderBottom: `2px solid ${current?.color}`, paddingBottom: 6, marginBottom: 18,
          }}>
            {current?.emoji} {current?.label} Details
          </div>

          {/* ── Common fields ──────────────────────────────────── */}
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

          {/* ── VENDOR ─────────────────────────────────────────── */}
          {leadType === 'vendor' && (<>
            <div className="capture-field">
              <label>Company / Business Name</label>
              <div className="capture-input-icon">
                <Handshake size={14} />
                <input type="text" placeholder="ABC Fabricators Pvt Ltd" value={form.companyName} onChange={set('companyName')} />
              </div>
            </div>

            <div className="capture-field">
              <label>Service Category</label>
              <select value={form.vendorCategory} onChange={set('vendorCategory')}>
                <option value="">Select category…</option>
                {VENDOR_CATS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            <div className="capture-field">
              <label>Zone / Coverage Area</label>
              <select value={form.zone} onChange={set('zone')}>
                <option value="">Select zone…</option>
                <option value="north">North Zone</option>
                <option value="south">South Zone</option>
                <option value="east">East Zone</option>
                <option value="west">West Zone</option>
                <option value="central">Central Zone</option>
                <option value="pan_india">Pan India</option>
              </select>
            </div>

            {/* Permission & Fabrication row */}
            <div style={{ background: '#f8fafc', borderRadius: 12, padding: '14px 16px', marginBottom: 14 }}>
              <div style={{ fontSize: '.72rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 12 }}>
                Capabilities
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>

                <div className="capture-field" style={{ marginBottom: 0 }}>
                  <label>In-house Fabrication?</label>
                  <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                    {['Yes - in house', 'Yes - outsourced', 'No'].map(opt => (
                      <button key={opt} type="button"
                        onClick={() => setVal('fabrication', opt)}
                        style={{
                          flex: 1, padding: '5px 4px', borderRadius: 8, fontSize: '.67rem', fontWeight: 600,
                          border: `1.5px solid ${form.fabrication === opt ? '#f59e0b' : '#e2e8f0'}`,
                          background: form.fabrication === opt ? '#fef3c7' : '#fff',
                          color: form.fabrication === opt ? '#92400e' : '#64748b',
                          cursor: 'pointer', transition: 'all .12s',
                        }}>{opt.replace('Yes - ', '')}</button>
                    ))}
                  </div>
                </div>

                <div className="capture-field" style={{ marginBottom: 0 }}>
                  <label>Manpower (Promoters/Hosts)?</label>
                  <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                    {YES_NO_REQ.map(opt => (
                      <button key={opt} type="button"
                        onClick={() => setVal('manPower', opt)}
                        style={{
                          flex: 1, padding: '5px 4px', borderRadius: 8, fontSize: '.67rem', fontWeight: 600,
                          border: `1.5px solid ${form.manPower === opt ? '#f59e0b' : '#e2e8f0'}`,
                          background: form.manPower === opt ? '#fef3c7' : '#fff',
                          color: form.manPower === opt ? '#92400e' : '#64748b',
                          cursor: 'pointer', transition: 'all .12s',
                        }}>{opt}</button>
                    ))}
                  </div>
                </div>

                <div className="capture-field" style={{ marginBottom: 0 }}>
                  <label>School Permission Access?</label>
                  <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                    {YES_NO.map(opt => (
                      <button key={opt} type="button"
                        onClick={() => setVal('schoolPermission', opt)}
                        style={{
                          flex: 1, padding: '6px 4px', borderRadius: 8, fontSize: '.72rem', fontWeight: 700,
                          border: `1.5px solid ${form.schoolPermission === opt ? (opt === 'Yes' ? '#10b981' : '#ef4444') : '#e2e8f0'}`,
                          background: form.schoolPermission === opt ? (opt === 'Yes' ? '#d1fae5' : '#fee2e2') : '#fff',
                          color: form.schoolPermission === opt ? (opt === 'Yes' ? '#065f46' : '#991b1b') : '#64748b',
                          cursor: 'pointer', transition: 'all .12s',
                        }}>{opt}</button>
                    ))}
                  </div>
                </div>

                <div className="capture-field" style={{ marginBottom: 0 }}>
                  <label>College Permission Access?</label>
                  <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                    {YES_NO.map(opt => (
                      <button key={opt} type="button"
                        onClick={() => setVal('collegePermission', opt)}
                        style={{
                          flex: 1, padding: '6px 4px', borderRadius: 8, fontSize: '.72rem', fontWeight: 700,
                          border: `1.5px solid ${form.collegePermission === opt ? (opt === 'Yes' ? '#10b981' : '#ef4444') : '#e2e8f0'}`,
                          background: form.collegePermission === opt ? (opt === 'Yes' ? '#d1fae5' : '#fee2e2') : '#fff',
                          color: form.collegePermission === opt ? (opt === 'Yes' ? '#065f46' : '#991b1b') : '#64748b',
                          cursor: 'pointer', transition: 'all .12s',
                        }}>{opt}</button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {form.manPower && form.manPower !== 'No' && (
              <div className="capture-field">
                <label>Promoter / Host Cost per Day (₹)</label>
                <div className="capture-input-icon">
                  <span style={{ fontSize: '.85rem', fontWeight: 700, color: '#64748b' }}>₹</span>
                  <input type="number" placeholder="e.g. 1500" value={form.promoterCost} onChange={set('promoterCost')} />
                </div>
              </div>
            )}
          </>)}

          {/* ── CREATOR ────────────────────────────────────────── */}
          {leadType === 'creator' && (<>
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
                <input type="url" placeholder="instagram.com/yourhandle" value={form.instagramLink} onChange={set('instagramLink')} />
              </div>
              <div className="capture-field">
                <label>YouTube Channel Link</label>
                <input type="url" placeholder="youtube.com/c/..." value={form.youtubeLink} onChange={set('youtubeLink')} />
              </div>
            </div>
            <div className="capture-row">
              <div className="capture-field">
                <label>Total Followers (Instagram)</label>
                <input type="number" placeholder="e.g. 25000" value={form.followers} onChange={set('followers')} />
              </div>
              <div className="capture-field">
                <label>Content Language</label>
                <input type="text" placeholder="Hindi, English…" value={form.contentLanguage} onChange={set('contentLanguage')} />
              </div>
            </div>
            <div className="capture-field">
              <label>Content Niche / Genre</label>
              <input type="text" placeholder="Lifestyle, Comedy, Education…" value={form.genre} onChange={set('genre')} />
            </div>
          </>)}

          {/* ── COLLEGE ────────────────────────────────────────── */}
          {leadType === 'college' && (<>
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
          </>)}

          {/* ── COLLEGE POC ─────────────────────────────────────── */}
          {leadType === 'poc' && (<>
            <div className="capture-field">
              <label>College Name</label>
              <div className="capture-input-icon">
                <Building2 size={14} />
                <input type="text" placeholder="Your college name" value={form.pocCollegeName} onChange={set('pocCollegeName')} />
              </div>
            </div>
            <div className="capture-row">
              <div className="capture-field">
                <label>Your Role / Designation</label>
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
          </>)}

          {/* ── Message (all types) ─────────────────────────────── */}
          <div className="capture-field">
            <label>Anything else to share?</label>
            <div className="capture-input-icon capture-textarea-wrap">
              <MessageSquare size={14} style={{ marginTop: 3 }} />
              <textarea
                placeholder={
                  leadType === 'vendor' ? 'Regions you operate in, past event experience…' :
                  leadType === 'creator' ? 'Past brand collaborations, best performing content…' :
                  'Any specific requirements, timeline, opportunities you can offer…'
                }
                value={form.message}
                onChange={set('message')}
                rows={3}
              />
            </div>
          </div>

          {error && <div className="capture-error">{error}</div>}

          <button
            type="submit"
            className="capture-submit"
            style={{ background: `linear-gradient(135deg, ${current?.color}, ${current?.color}cc)` }}
            disabled={submitting}
          >
            {submitting
              ? <><div className="capture-spinner" /> Submitting…</>
              : <>{current?.emoji} Submit as {current?.label} <ArrowRight size={16} /></>
            }
          </button>

          <p className="capture-footer">By submitting, you agree to be contacted by VigorLaunchpad team.</p>
        </form>
      </div>
    </div>
  );
}
