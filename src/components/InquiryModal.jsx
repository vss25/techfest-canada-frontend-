import { useState } from "react";
import { X, Send, CheckCircle, Loader } from "lucide-react";
import { submitForm, useFormGuard, FORMS_FALLBACK_EMAIL } from "../lib/forms";


export default function InquiryModal({ isOpen, onClose }) {
  const [form, setForm] = useState({ firstName: "", lastName: "", email: "", enquiry: "" });
  const [status, setStatus] = useState("idle"); // idle | sending | success | error
  const guard = useFormGuard(isOpen);

  if (!isOpen) return null;

  const handleChange = (e) => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = async () => {
    const { firstName, lastName, email, enquiry } = form;
    if (!firstName || !lastName || !email || !enquiry) return;
    setStatus("sending");

    try {
      await submitForm("inquiry", { firstName, lastName, email, message: enquiry }, guard.meta());
      setStatus("success");
    } catch {
      setStatus("error");
    }
  };

  const handleClose = () => { setStatus("idle"); setForm({ firstName: "", lastName: "", email: "", enquiry: "" }); onClose(); };

  const isValid = form.firstName && form.lastName && form.email && form.enquiry;

  return (
    <>
      <style>{`
        .inq-overlay {
          position: fixed; inset: 0; z-index: 9999;
          background: rgba(5,2,15,0.75);
          backdrop-filter: blur(6px);
          display: flex; align-items: center; justify-content: center;
          padding: 1rem;
          animation: inqFadeIn 0.2s ease;
        }
        @keyframes inqFadeIn { from { opacity:0 } to { opacity:1 } }

        .inq-modal {
          position: relative;
          width: 100%; max-width: 520px;
          background: rgba(16,8,36,0.97);
          border: 1px solid rgba(122,63,209,0.35);
          border-radius: 24px;
          padding: 40px;
          box-shadow: 0 30px 80px rgba(0,0,0,0.6), 0 0 60px rgba(122,63,209,0.12);
          animation: inqSlideUp 0.3s ease;
          overflow: hidden;
        }
        body:not(.dark-mode) .inq-modal {
          background: rgba(255,255,255,0.98);
          border-color: rgba(122,63,209,0.20);
          box-shadow: 0 30px 80px rgba(0,0,0,0.15);
        }
        @keyframes inqSlideUp { from { opacity:0; transform:translateY(24px) } to { opacity:1; transform:translateY(0) } }

        .inq-modal::before {
          content: '';
          position: absolute; top: -80px; right: -80px;
          width: 240px; height: 240px; border-radius: 50%;
          background: radial-gradient(circle, rgba(122,63,209,0.18) 0%, transparent 70%);
          pointer-events: none;
        }

        .inq-close {
          position: absolute; top: 16px; right: 16px;
          width: 36px; height: 36px; border-radius: 50%;
          background: rgba(122,63,209,0.12); border: 1px solid rgba(122,63,209,0.25);
          display: flex; align-items: center; justify-content: center;
          cursor: pointer; color: #b99eff; transition: background 0.2s;
        }
        .inq-close:hover { background: rgba(122,63,209,0.28); }
        body:not(.dark-mode) .inq-close { color: #7a3fd1; }

        .inq-eyebrow {
          display: inline-flex; align-items: center; gap: 6px;
          background: rgba(122,63,209,0.12); border: 1px solid rgba(122,63,209,0.28);
          border-radius: 999px; padding: 4px 12px;
          font-size: 0.68rem; font-weight: 700; letter-spacing: 1.2px;
          text-transform: uppercase; color: #b99eff; margin-bottom: 14px;
        }
        body:not(.dark-mode) .inq-eyebrow { color: #7a3fd1; }
        .inq-eyebrow-dot {
          width: 5px; height: 5px; border-radius: 50%;
          background: #f5a623; box-shadow: 0 0 5px #f5a623;
        }

        .inq-title {
          font-size: 1.6rem; font-weight: 900;
          font-family: 'Orbitron', sans-serif;
          color: #fff; margin-bottom: 4px; line-height: 1.1;
        }
        body:not(.dark-mode) .inq-title { color: #2d1060; }
        .inq-title span { color: #f5a623; }

        .inq-subtitle {
          font-size: 0.82rem; color: rgba(180,155,230,0.75);
          margin-bottom: 28px; line-height: 1.5;
        }
        body:not(.dark-mode) .inq-subtitle { color: #7a6a9a; }

        .inq-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 12px; }
        .inq-field { display: flex; flex-direction: column; gap: 5px; margin-bottom: 12px; }
        .inq-label {
          font-size: 0.72rem; font-weight: 700;
          text-transform: uppercase; letter-spacing: 0.8px;
          color: rgba(180,155,230,0.8);
        }
        body:not(.dark-mode) .inq-label { color: #6a5a8a; }

        .inq-input, .inq-textarea {
          background: rgba(122,63,209,0.07);
          border: 1px solid rgba(122,63,209,0.22);
          border-radius: 10px; padding: 11px 14px;
          color: #fff; font-size: 0.88rem;
          outline: none; transition: border-color 0.2s, background 0.2s;
          font-family: inherit; resize: none;
          width: 100%; box-sizing: border-box;
        }
        body:not(.dark-mode) .inq-input,
        body:not(.dark-mode) .inq-textarea {
          background: rgba(122,63,209,0.04);
          border-color: rgba(122,63,209,0.18);
          color: #2d1060;
        }
        .inq-input::placeholder, .inq-textarea::placeholder { color: rgba(160,140,200,0.45); }
        .inq-input:focus, .inq-textarea:focus {
          border-color: rgba(122,63,209,0.55);
          background: rgba(122,63,209,0.12);
        }
        .inq-textarea { min-height: 100px; }

        .inq-btn {
          width: 100%; padding: 14px;
          background: linear-gradient(135deg, #7a3fd1, #f5a623);
          border: none; border-radius: 12px;
          color: white; font-weight: 800; font-size: 0.88rem;
          letter-spacing: 0.5px; cursor: pointer;
          display: flex; align-items: center; justify-content: center; gap: 8px;
          transition: opacity 0.2s, transform 0.2s;
          font-family: 'Orbitron', sans-serif;
          margin-top: 8px;
        }
        .inq-btn:hover:not(:disabled) { opacity: 0.88; transform: translateY(-1px); }
        .inq-btn:disabled { opacity: 0.45; cursor: not-allowed; }

        .inq-error {
          text-align: center; padding: 10px 14px; margin-top: 8px;
          background: rgba(255,107,107,0.10); border: 1px solid rgba(255,107,107,0.25);
          border-radius: 8px; font-size: 0.78rem; color: #ff6b6b;
        }

        .inq-success {
          display: flex; flex-direction: column;
          align-items: center; justify-content: center;
          gap: 16px; padding: 20px 0; text-align: center;
        }
        .inq-success-icon { color: #4ade80; }
        .inq-success h3 {
          font-size: 1.3rem; font-weight: 900;
          font-family: 'Orbitron', sans-serif;
          color: #fff;
        }
        body:not(.dark-mode) .inq-success h3 { color: #2d1060; }
        .inq-success p { font-size: 0.85rem; color: rgba(180,155,230,0.75); line-height: 1.6; max-width: 320px; }
        body:not(.dark-mode) .inq-success p { color: #7a6a9a; }

        @media (max-width: 480px) {
          .inq-modal { padding: 28px 24px; }
          .inq-row { grid-template-columns: 1fr; }
        }
      `}</style>

      <div className="inq-overlay" onClick={(e) => e.target === e.currentTarget && handleClose()}>
        <div className="inq-modal">

          <button className="inq-close" onClick={handleClose}><X size={16} /></button>

          {status === "success" ? (
            <div className="inq-success">
              <CheckCircle size={52} className="inq-success-icon" />
              <h3>Message <span style={{ color:"#f5a623" }}>Sent!</span></h3>
              <p>Thanks for reaching out. We'll get back to you shortly.</p>
              <button className="inq-btn" onClick={handleClose} style={{ marginTop: 8 }}>
                Close
              </button>
            </div>
          ) : (
            <>
              {/* honeypot — hidden from people, catches bots */}
              <input {...guard.honeypotProps} />
              <div className="inq-eyebrow">
                <span className="inq-eyebrow-dot" />
                Get Involved
              </div>
              <h2 className="inq-title">Write to <span>Us</span></h2>
              <p className="inq-subtitle">
                Volunteer · Collaborate · Become a Community Partner
              </p>

              <div className="inq-row">
                <div className="inq-field">
                  <label className="inq-label">First Name</label>
                  <input className="inq-input" name="firstName" value={form.firstName} onChange={handleChange} placeholder="Jane" />
                </div>
                <div className="inq-field">
                  <label className="inq-label">Last Name</label>
                  <input className="inq-input" name="lastName" value={form.lastName} onChange={handleChange} placeholder="Doe" />
                </div>
              </div>

              <div className="inq-field">
                <label className="inq-label">Email Address</label>
                <input className="inq-input" type="email" name="email" value={form.email} onChange={handleChange} placeholder="jane@example.com" />
              </div>

              <div className="inq-field">
                <label className="inq-label">What are you enquiring about?</label>
                <textarea className="inq-textarea" name="enquiry" value={form.enquiry} onChange={handleChange} placeholder="Tell us how you'd like to get involved — volunteer, partner, collaborate..." />
              </div>

              {status === "error" && (
                <div className="inq-error">Something went wrong. Please try again, or email <a href={"mailto:" + FORMS_FALLBACK_EMAIL} style={{ color: "inherit", textDecoration: "underline" }}>{FORMS_FALLBACK_EMAIL}</a>.</div>
              )}

              <button className="inq-btn" onClick={handleSubmit} disabled={!isValid || status === "sending"}>
                {status === "sending"
                  ? <><Loader size={16} style={{ animation:"spin 1s linear infinite" }} /> Sending…</>
                  : <><Send size={16} /> Send Enquiry</>
                }
              </button>
            </>
          )}
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </>
  );
}
