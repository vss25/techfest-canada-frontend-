import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Camera, Trash2 } from "lucide-react";
import { useStore } from "../lib/store";
import { auth, loadAccount } from "../lib/auth";
import { patch, put } from "../lib/api";
import { APPLIED_SECTORS, CONSENT_VERSION, TECH_PILLARS, fileURL } from "../lib/config";
import { blobToDataURL, compressImage } from "../lib/media";
import { refreshPeople } from "../lib/social";
import { showAlert } from "../lib/ui";
import { Avatar, Button, Chip, Spinner, TopBar } from "../components/ui";

/* Edit profile (iOS EditProfileView): saved with PATCH /api/profile, photo with PUT /api/profile/avatar. */

export default function EditProfile() {
  const a = useStore(auth);
  // Opened straight from a link: wait for the account so the form starts filled in.
  if (!a.me) return <div className="page"><TopBar title="Edit profile" /><Spinner label="Loading your profile" /></div>;
  return <EditForm key={a.me.id || "me"} />;
}

function EditForm() {
  const a = useStore(auth);
  const navigate = useNavigate();
  const me = a.me || {};
  const u = a.user || {};
  const [first, ...restName] = String(me.name || u.name || "").split(" ");
  const [f, setF] = useState(() => ({
    firstName: first || "", lastName: restName.join(" "),
    jobTitle: me.jobTitle || u.jobTitle || "", organization: me.organization || u.organization || "",
    linkedinUrl: me.linkedinUrl || u.linkedinUrl || "", tagline: me.tagline || u.tagline || "", country: me.country || u.country || "",
    topics: me.topics || u.topics || [],
  }));
  const [saving, setSaving] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef(null);
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value }));
  const toggleTopic = (t) => setF((x) => ({ ...x, topics: x.topics.includes(t) ? x.topics.filter((y) => y !== t) : [...x.topics, t].slice(0, 20) }));

  const save = async (e) => {
    e.preventDefault();
    setSaving(true); setError("");
    try {
      const name = [f.firstName.trim(), f.lastName.trim()].filter(Boolean).join(" ");
      await patch("profile", {
        ...(name ? { name } : {}),
        jobTitle: f.jobTitle.trim(), organization: f.organization.trim(), linkedinUrl: f.linkedinUrl.trim(),
        tagline: f.tagline.trim().slice(0, 140), country: f.country.trim(), topics: f.topics,
        appOnboarded: true, ageConfirmed: true, termsVersion: CONSENT_VERSION,
      });
      await loadAccount();
      refreshPeople("");
      showAlert("Profile saved");
      navigate(-1);
    } catch (err) { setError(err.message); } finally { setSaving(false); }
  };

  const pickPhoto = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setPhotoBusy(true);
    try {
      const { blob } = await compressImage(file, { maxEdge: 480, maxBytes: 140000, square: true });
      await put("profile/avatar", { avatarData: await blobToDataURL(blob) });
      await loadAccount();
    } catch (err) { showAlert("Couldn't use that photo", err.message); } finally { setPhotoBusy(false); }
  };
  const removePhoto = async () => {
    setPhotoBusy(true);
    try { await put("profile/avatar", { avatarData: "" }); await loadAccount(); } catch (err) { showAlert("Couldn't remove it", err.message); } finally { setPhotoBusy(false); }
  };

  const field = (label, k, props = {}) => (
    <label className="field">
      <span className="field-label">{label}</span>
      <input className="input" value={f[k]} onChange={set(k)} {...props} />
    </label>
  );

  return (
    <div className="page">
      <TopBar title="Edit profile" />
      <form id="main" className="pad mt-16 stack-lg" onSubmit={save}>
        <div className="row" style={{ gap: 16 }}>
          <Avatar name={`${f.firstName} ${f.lastName}`} src={fileURL(me.avatarUrl)} size={80} />
          <div className="stack-sm" style={{ flex: 1 }}>
            <input ref={fileRef} type="file" accept="image/*" hidden onChange={pickPhoto} />
            <Button size="sm" icon={Camera} loading={photoBusy} onClick={() => fileRef.current?.click()}>{me.avatarUrl ? "Change photo" : "Add a photo"}</Button>
            {me.avatarUrl && <Button size="sm" icon={Trash2} className="btn-ghost" onClick={removePhoto}>Remove photo</Button>}
            <span className="tiny muted">Square, well lit. Shown on your badge QR card and to connections.</span>
          </div>
        </div>
        <div className="row" style={{ gap: 10 }}>
          <div style={{ flex: 1 }}>{field("First name", "firstName", { autoComplete: "given-name" })}</div>
          <div style={{ flex: 1 }}>{field("Last name", "lastName", { autoComplete: "family-name" })}</div>
        </div>
        {field("Job title", "jobTitle", { autoComplete: "organization-title" })}
        {field("Organization", "organization", { autoComplete: "organization" })}
        {field("LinkedIn URL", "linkedinUrl", { type: "url", inputMode: "url", placeholder: "linkedin.com/in/…", autoCapitalize: "none" })}
        <label className="field">
          <span className="field-label">Tagline <span className="muted" style={{ fontWeight: 400 }}>· {f.tagline.length}/140 · a short line shown under your name</span></span>
          <input className="input" value={f.tagline} maxLength={140} onChange={set("tagline")} placeholder="Building AI for supply chains" />
        </label>
        {field("Country", "country", { autoComplete: "country-name" })}
        <fieldset className="stack-sm" style={{ border: 0, padding: 0, margin: 0 }}>
          <legend className="eyebrow" style={{ marginBottom: 8 }}>Topics</legend>
          <div className="chips chips--wrap">
            {[...TECH_PILLARS, ...APPLIED_SECTORS].map((t) => <Chip key={t} on={f.topics.includes(t)} onClick={() => toggleTopic(t)}>{t}</Chip>)}
          </div>
        </fieldset>
        {error && <p className="error-text" role="alert" style={{ margin: 0 }}>{error}</p>}
        <Button type="submit" variant="primary" size="lg" block loading={saving}>Save</Button>
      </form>
    </div>
  );
}
