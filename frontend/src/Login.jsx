import React, { useState } from 'react'
import axios from 'axios'
const API = import.meta.env.VITE_API_URL || 'http://localhost:10000'
export default function Login({ onLogin }){
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  async function signup(){
    try{
      await axios.post(`${API}/signup`, { username, password })
      alert('Signed up. Please login.')
    }catch(e){ alert(e.response?.data?.error || e.message) }
  }
  async function login(){
    try{
      await axios.post(`${API}/login`, { username, password })
      onLogin(username, password)
    }catch(e){ alert(e.response?.data?.error || e.message) }
  }
  return (
    <div style={{maxWidth:420, margin:'40px auto', padding:20, fontFamily:'sans-serif'}}>
      <h2>AnonChat — Secure Login</h2>
      <input placeholder='username' value={username} onChange={e=>setUsername(e.target.value)} style={{width:'100%',padding:8,margin:'8px 0'}} />
      <input placeholder='password' type='password' value={password} onChange={e=>setPassword(e.target.value)} style={{width:'100%',padding:8,margin:'8px 0'}} />
      <div style={{display:'flex',gap:8}}>
        <button onClick={signup} style={{flex:1}}>Sign up</button>
        <button onClick={login} style={{flex:1}}>Login</button>
      </div>
      <p style={{fontSize:12, color:'#666'}}>Your username is your unique ID. Your password is used to encrypt signaling data locally (never sent to server).</p>
    </div>
  )
}
