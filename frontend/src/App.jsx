import React, { useState } from 'react'
import Login from './Login.jsx'
import VideoChat from './VideoChat.jsx'
export default function App(){
  const [user, setUser] = useState(null)
  const [pass, setPass] = useState(null)
  return user ? <VideoChat user={user} pass={pass} /> : <Login onLogin={(u,p)=>{ setUser(u); setPass(p); }} />
}
