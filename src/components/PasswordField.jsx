import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

/**
 * A password input with an eye button to show or hide what's typed.
 * `style` is the input's own style (its marginBottom moves to the wrapper so the
 * button stays centred on the field); every other prop goes to the <input>.
 */
export default function PasswordField({ style = {}, iconColor = "currentColor", ...props }) {
  const [show, setShow] = useState(false);
  const { marginBottom, ...inputStyle } = style;
  return (
    <div style={{ position: "relative", marginBottom }}>
      <input {...props} type={show ? "text" : "password"} style={{ ...inputStyle, paddingRight: 46 }} />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        aria-label={show ? "Hide password" : "Show password"}
        style={{
          position: "absolute", top: 0, bottom: 0, right: 4, width: 40,
          display: "flex", alignItems: "center", justifyContent: "center",
          background: "none", border: "none", cursor: "pointer", color: iconColor, opacity: 0.75,
        }}
      >
        {show ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
      </button>
    </div>
  );
}
