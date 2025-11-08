import React, { useEffect, useRef, useState } from 'react'
import { io } from 'socket.io-client'
import CryptoJS from 'crypto-js'
const SIGNAL = import.meta.env.VITE_SIGNALING_URL || 'http://localhost:10000'
export default function VideoChat({ user, pass }){
  const localV = useRef(), remoteV = useRef()
  const pcRef = useRef(null)
  const socketRef = useRef(null)
  const [partner, setPartner] = useState('')
  const [status, setStatus] = useState('idle')

  function encrypt(obj){
    const s = JSON.stringify(obj)
    return CryptoJS.AES.encrypt(s, pass).toString()
  }
  function decrypt(blob){
    try{
      const bytes = CryptoJS.AES.decrypt(blob, pass)
      return JSON.parse(bytes.toString(CryptoJS.enc.Utf8))
    }catch(e){
      console.error('decrypt failed', e); return null
    }
  }

  useEffect(()=>{
    socketRef.current = io(SIGNAL, { transports:['websocket','polling'] })
    socketRef.current.on('connect', ()=>{ socketRef.current.emit('register', user) })
    socketRef.current.on('registered', ()=>console.log('registered'))
    socketRef.current.on('enc-offer', async ({ from, blob })=>{
      const sdp = decrypt(blob)
      if(!sdp) return alert('Failed to decrypt offer - wrong password?')
      await startPeer(false, from)
      await pcRef.current.setRemoteDescription(sdp)
      const answer = await pcRef.current.createAnswer()
      await pcRef.current.setLocalDescription(answer)
      const enc = encrypt(pcRef.current.localDescription)
      socketRef.current.emit('enc-answer', { to: from, blob: enc })
      setStatus('incall')
    })
    socketRef.current.on('enc-answer', async ({ from, blob })=>{
      const sdp = decrypt(blob)
      if(sdp) await pcRef.current.setRemoteDescription(sdp)
      setStatus('incall')
    })
    socketRef.current.on('enc-candidate', async ({ from, blob })=>{
      const cand = decrypt(blob)
      if(cand) try{ await pcRef.current.addIceCandidate(cand) }catch(e){ console.warn(e) }
    })
    socketRef.current.on('user-not-found', ()=> alert('User not found'))
    return ()=> socketRef.current.disconnect()
  },[])

  async function startPeer(isOffer, target){
    pcRef.current = new RTCPeerConnection({ iceServers:[{ urls:'stun:stun.l.google.com:19302' }] })
    pcRef.current.onicecandidate = e=>{ if(e.candidate){ const enc = encrypt(e.candidate); socketRef.current.emit('enc-candidate', { to: target, blob: enc }) } }
    pcRef.current.ontrack = e=>{ remoteV.current.srcObject = e.streams[0] }
    const stream = await navigator.mediaDevices.getUserMedia({ video:true, audio:true })
    localV.current.srcObject = stream
    stream.getTracks().forEach(track=> pcRef.current.addTrack(track, stream))
    if(isOffer){
      const offer = await pcRef.current.createOffer()
      await pcRef.current.setLocalDescription(offer)
      const enc = encrypt(pcRef.current.localDescription)
      socketRef.current.emit('enc-offer', { to: target, blob: enc })
    }
  }

  async function callUser(){
    if(!partner) return alert('enter partner username')
    setStatus('calling')
    await startPeer(true, partner)
  }
  function hangup(){
    if(pcRef.current){ pcRef.current.close(); pcRef.current = null }
    setStatus('idle')
  }

  return (
    <div style={{fontFamily:'sans-serif', maxWidth:720, margin:'20px auto'}}>
      <h3>AnonChat — logged in as <b>{user}</b></h3>
      <div style={{display:'flex', gap:8}}>
        <div style={{flex:1}}>
          <video ref={localV} autoPlay muted playsInline style={{width:'100%', background:'#000'}} />
        </div>
        <div style={{flex:1}}>
          <video ref={remoteV} autoPlay playsInline style={{width:'100%', background:'#000'}} />
        </div>
      </div>
      <div style={{marginTop:12, display:'flex', gap:8}}>
        <input value={partner} onChange={e=>setPartner(e.target.value)} placeholder='partner username' style={{flex:1,padding:8}} />
        <button onClick={callUser}>Call</button>
        <button onClick={hangup}>Hang up</button>
      </div>
      <div style={{marginTop:8,color:'#666'}}>Status: {status}</div>
    </div>
  )
}
