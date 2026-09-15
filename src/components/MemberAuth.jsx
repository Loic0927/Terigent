import { useEffect, useState } from 'react';
import Logo from './Logo';

async function request(url, options) { const response=await fetch(url,options); const payload=await response.json().catch(()=>({})); if(!response.ok){const error=new Error(payload.error||'Request failed.');error.fields=payload.errors||{};error.status=response.status;throw error;} return payload; }
const safeReturnTo=value=>typeof value==='string'&&value.startsWith('/')&&!value.startsWith('//')&&!value.includes('\\')?value:'/account';

export function AuthPage({mode}) {
  const registering=mode==='register';
  const [form,setForm]=useState(registering?{name:'',email:'',password:'',confirmPassword:''}:{email:'',password:''});
  const [state,setState]=useState({sending:false,error:'',errors:{}});
  const submit=async event=>{event.preventDefault();if(state.sending)return;setState({sending:true,error:'',errors:{}});try{await request(`/api/auth/${mode}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(form)});if(registering)window.location.assign('/login?registered=1');else{const requested=new URLSearchParams(window.location.search).get('returnTo');window.location.assign(safeReturnTo(requested));}}catch(error){setState({sending:false,error:error.message,errors:error.fields});}};
  const field=(name,label,type='text',autoComplete)=> <label htmlFor={name}>{label}<input id={name} name={name} type={type} autoComplete={autoComplete} value={form[name]} onChange={event=>setForm({...form,[name]:event.target.value})} aria-invalid={Boolean(state.errors[name])} aria-describedby={state.errors[name]?`${name}-error`:undefined} required />{state.errors[name]&&<small id={`${name}-error`} className="auth-field-error">{state.errors[name]}</small>}</label>;
  return <main className="auth-shell"><section className="auth-card"><Logo/><a href="/" className="auth-home">Back to home</a><h1>{registering?'Create your account':'Welcome back'}</h1><p>{registering?'Start using your private Terigent account.':'Sign in to view your account.'}</p>{!registering&&new URLSearchParams(window.location.search).get('registered')==='1'&&<p className="auth-notice success" role="status">Account created successfully. Please sign in.</p>}<form onSubmit={submit} noValidate>{registering&&field('name','Name','text','name')}{field('email','Email','email','email')}{field('password','Password','password',registering?'new-password':'current-password')}{registering&&field('confirmPassword','Confirm password','password','new-password')}{state.error&&<p className="auth-notice error" role="alert">{state.error}</p>}<button className="button" disabled={state.sending}>{state.sending?(registering?'Creating account...':'Signing in...'):(registering?'Create account':'Sign in')}</button></form><p className="auth-switch">{registering?'Already registered?':'Need an account?'} <a href={registering?'/login':'/register'}>{registering?'Sign in':'Register'}</a></p></section></main>;
}

export function Account() {
  const [state,setState]=useState({loading:true,user:null,error:''});
  useEffect(()=>{request('/api/auth/me').then(({user})=>setState({loading:false,user,error:''})).catch(error=>{if(error.status===401){const path=encodeURIComponent('/account');window.location.replace(`/login?returnTo=${path}`);}else setState({loading:false,user:null,error:error.message});});},[]);
  const logout=async()=>{try{await request('/api/auth/logout',{method:'POST'});window.location.replace('/login');}catch(error){setState({...state,error:error.message});}};
  if(state.loading)return <main className="auth-shell"><p role="status">Checking your session...</p></main>;
  if(!state.user)return <main className="auth-shell"><p className="auth-notice error" role="alert">{state.error}</p></main>;
  return <main className="auth-shell"><section className="auth-card account-card"><Logo/><a href="/" className="auth-home">Back to home</a><h1>My account</h1><dl><div><dt>Name</dt><dd>{state.user.name}</dd></div><div><dt>Email</dt><dd>{state.user.email}</dd></div><div><dt>Account created</dt><dd>{new Date(state.user.createdAt).toLocaleString()}</dd></div></dl>{state.error&&<p className="auth-notice error">{state.error}</p>}<button className="button" onClick={logout}>Log out</button></section></main>;
}
