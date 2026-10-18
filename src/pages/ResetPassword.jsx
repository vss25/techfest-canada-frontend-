import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import PasswordField from "../components/PasswordField";

const API = "https://techfest-canada-backend.onrender.com/api/auth";

export default function ResetPassword() {

  const { token } = useParams();
  const navigate = useNavigate();

  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleReset = async (e) => {

    e.preventDefault();
    setLoading(true);

    try {

      const res = await fetch(`${API}/reset-password/${token}`,{
        method:"POST",
        headers:{
          "Content-Type":"application/json"
        },
        body:JSON.stringify({ password })
      });

      const data = await res.json();

      if(!res.ok) throw new Error(data.error);

      alert("Password successfully reset!");

      navigate("/");

    } catch(err){

      alert(err.message);

    } finally{

      setLoading(false);

    }
  };

  return (

<div
style={{
minHeight:"100vh",
display:"flex",
alignItems:"center",
justifyContent:"center",
background:"linear-gradient(180deg,#0b0417,#120726)",
padding:"20px"
}}
>

<div
style={{
width:"100%",
maxWidth:"420px",
padding:"40px",
borderRadius:"18px",
background:"linear-gradient(180deg,#160c2c,#1b0f35)",
border:"1px solid rgba(255,255,255,0.08)",
boxShadow:"0 25px 60px rgba(0,0,0,0.6)",
color:"#fff"
}}
>

<h2
style={{
textAlign:"center",
marginBottom:"24px",
fontFamily:"Orbitron",
fontSize:"24px"
}}
>
Reset Password
</h2>

<form onSubmit={handleReset}>

<PasswordField
iconColor="#fff"
placeholder="Enter new password"
value={password}
onChange={(e)=>setPassword(e.target.value)}
required
style={{
width:"100%",
padding:"14px",
marginBottom:"16px",
borderRadius:"10px",
border:"1px solid rgba(255,255,255,0.15)",
background:"rgba(255,255,255,0.05)",
color:"#fff"
}}
/>

<button
type="submit"
disabled={loading}
style={{
width:"100%",
padding:"14px",
borderRadius:"999px",
border:"none",
fontWeight:"bold",
background:"linear-gradient(90deg,#8b5cf6,#f97316)",
color:"#fff",
cursor:"pointer"
}}
>
{loading ? "Resetting..." : "Reset Password"}
</button>

</form>

</div>
</div>

  );
}
