'use strict';
const cfg=window.RAFA_CONFIG;
let labels={roupas:'Roupas',calcados:'Calçados',casa:'Casa',eletronicos:'Eletrônicos'};
let categoryLoad=null;
const money=n=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(n/100);
const $=id=>document.getElementById(id);
const configured=()=>/^https:\/\/[a-z0-9.-]+\.supabase\.co\/?$/i.test(cfg.supabaseUrl)&&Boolean(cfg.supabaseKey);
const https=(value)=>{try{const u=new URL(value);return u.protocol==='https:'?u.href:null}catch{return null}};
const tiktok=value=>{const u=https(value);if(!u)return null;const host=new URL(u).hostname;return host==='tiktok.com'||host.endsWith('.tiktok.com')?u:null};
const initialProduct={id:'f0ab0990-7560-4cab-90bd-48c6d0166bb0',name:'Sandália clog com apliques country',category:'calcados',price_cents:3999,affiliate_url:'https://vt.tiktok.com/ZS9AuoVP35WbD-ji52e/',image_url:'https://rafaelaladvig.github.io/achadinhosdarafa/assets/sandalia-country.jpeg'};
let session=null,products=[],loaded=false,loading=false,deleteId=null;
const message=(text,error=false)=>{const el=$('admin-status');if(!el)return;el.textContent=text;el.hidden=!text;el.classList.toggle('error',error)};
function node(tag,cls,text){const el=document.createElement(tag);if(cls)el.className=cls;if(text!==undefined)el.textContent=text;return el}
async function api(path,options={}){
 if(!configured())throw Error('A conexão com a loja ainda está sendo configurada.');
 const response=await fetch(cfg.supabaseUrl.replace(/\/$/,'')+path,{...options,headers:{apikey:cfg.supabaseKey,...(session?{Authorization:'Bearer '+session.access_token}:{}),...(options.body&&!(options.body instanceof File)?{'Content-Type':'application/json'}:{}),...options.headers}});
 if(!response.ok){
  const detail=await response.json().catch(()=>({}));
  const code=String(detail.error_code||detail.code||detail.error||'');
  const errors={
   invalid_credentials:'E-mail ou senha incorretos. Use a senha da conta cadastrada neste projeto Supabase; ela pode ser diferente da senha do seu e-mail ou do painel do Supabase.',
   email_not_confirmed:'O e-mail desta conta ainda não foi confirmado no Supabase.',
   user_banned:'Esta conta está bloqueada no Supabase. Confira o cadastro em Authentication → Users.',
   over_request_rate_limit:'Muitas tentativas em pouco tempo. Aguarde alguns minutos antes de tentar novamente.',
   request_rate_limit:'Muitas tentativas em pouco tempo. Aguarde alguns minutos antes de tentar novamente.',
   captcha_failed:'A verificação de segurança do login não foi concluída. Informe este erro para ajustarmos o painel.',
   signup_disabled:'O cadastro de novas contas está desativado. Entre com uma conta existente.',
   PGRST202:'A função de autorização do painel não foi encontrada no banco. Confira a configuração SQL.',
   PGRST205:'A tabela de produtos não foi encontrada no banco. Confira a configuração SQL.',
   '23505':'Já existe uma categoria com esse nome. Use a categoria existente ou escolha outro nome.',
   '23503':'A categoria não está disponível. Atualize a página e selecione novamente.',
   '42501':'O banco negou acesso a esta operação. Confira as permissões da administradora.'
  };
  if(errors[code])throw Error(errors[code]);
  if(response.status===429)throw Error('Muitas tentativas. Aguarde alguns minutos antes de tentar novamente.');
  if(response.status===401)throw Error('Sua sessão expirou ou o acesso não foi autorizado. Entre novamente.');
  if(response.status===403)throw Error('Esta conta não tem permissão para alterar a loja.');
  const stage=path.startsWith('/auth/')?'login':path.includes('/rpc/')?'autorização':'dados da loja';
  throw Error('Não foi possível concluir a etapa de '+stage+' (HTTP '+response.status+( /^[a-zA-Z0-9_]+$/.test(code)?'; '+code:'')+'). Envie esta mensagem para verificarmos.');
 }
 if(response.status===204)return null;const text=await response.text();return text?JSON.parse(text):null;
}

function categoryId(name){const base=name.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,42)||'categoria';return base+'-'+crypto.randomUUID().slice(0,8)}
function drawCategories(){
 const filters=$('filters');if(filters){filters.replaceChildren();const all=node('a','','Todos');all.href='#vitrine';all.dataset.category='todos';filters.append(all);for(const [id,name] of Object.entries(labels)){const a=node('a','',name);a.href='#vitrine/'+id;a.dataset.category=id;filters.append(a)}}
 const select=$('product-form')?.elements.category;if(select){const value=select.value;select.replaceChildren();const placeholder=node('option','','Selecione');placeholder.value='';select.append(placeholder);for(const [id,name] of Object.entries(labels)){const option=node('option','',name);option.value=id;select.append(option)}select.value=value;}
 const list=$('category-list');if(list){list.replaceChildren();for(const name of Object.values(labels))list.append(node('span','secondary',name))}
 const current=location.hash.split('/')[1]||'todos';document.querySelectorAll('[data-category]').forEach(el=>el.setAttribute('aria-current',String(el.dataset.category===current)));
}
async function loadCategories(){
 if(!configured()){drawCategories();return;}
 if(!categoryLoad)categoryLoad=api('/rest/v1/rafa_categories?select=id,name&order=created_at.asc,id.asc').then(rows=>{labels=Object.fromEntries(rows.map(row=>[row.id,row.name]));drawCategories()}).finally(()=>{categoryLoad=null});
 return categoryLoad;
}

document.querySelectorAll('[data-whatsapp]').forEach(el=>{el.href=cfg.whatsapp});
document.querySelectorAll('[data-social]').forEach(el=>{const url=https(cfg[el.dataset.social]);if(!url)return;const host=new URL(url).hostname;const domain=el.dataset.social==='instagram'?'instagram.com':'tiktok.com';if(host!==domain&&!host.endsWith('.'+domain))return;el.href=url;el.hidden=false;});
function productImage(p){const img=node('img');img.src=p.image_url===initialProduct.image_url?'assets/sandalia-country.jpeg':https(p.image_url)||'favicon.svg';img.alt=p.name;img.loading='lazy';img.referrerPolicy='no-referrer';img.addEventListener('error',()=>{img.src='favicon.svg'},{once:true});return img}
function drawCatalog(){
 const category=location.hash.split('/')[1]||'todos';
 document.querySelectorAll('[data-category]').forEach(el=>el.setAttribute('aria-current',String(el.dataset.category===category)));
 const visible=products.filter(p=>category==='todos'||p.category===category);const grid=$('products');grid.replaceChildren();
 if(!visible.length){const empty=node('div','empty');empty.append(node('span','emptyicon','✦'),node('h2','', 'Novos achadinhos a caminho'),node('p','', 'Assim que eu postar novos produtos, os links vão aparecer por aqui.'));const a=node('a','secondary','Enquanto isso, entre no grupo ↗');a.href=cfg.whatsapp;a.target='_blank';a.rel='noopener noreferrer';empty.append(a);grid.append(empty);return;}
 for(const p of visible){const card=node('article','product');card.append(productImage(p));const body=node('div','productbody');body.append(node('span','eyebrow',labels[p.category]||''),node('h2','',p.name),node('strong','',money(p.price_cents)));const link=node('a','buy','Ver no TikTok Shop ↗');link.href=tiktok(p.affiliate_url)||'#';link.target='_blank';link.rel='sponsored noopener noreferrer';body.append(link);card.append(body);grid.append(card)}
}
async function loadCatalog(){
 if(loading)return;loading=true;$('catalog-status').textContent='Carregando os achadinhos…';$('retry').hidden=true;
 try{if(!configured()){products=[initialProduct];loaded=true;$('catalog-status').textContent='';}else{await loadCategories();products=await api('/rest/v1/rafa_products?select=*&order=created_at.desc');loaded=true;$('catalog-status').textContent='';}drawCatalog();}
 catch{$('products').replaceChildren();$('catalog-status').textContent='Não foi possível carregar os produtos. Tente novamente em instantes.';$('retry').hidden=false;}
 finally{loading=false;}
}
function route(){const catalog=location.hash.startsWith('#vitrine');$('home').hidden=catalog;$('catalog').hidden=!catalog;if(catalog){if(loaded)drawCatalog();else loadCatalog();}window.scrollTo(0,0)}
if($('home')){window.addEventListener('hashchange',route);$('retry').onclick=loadCatalog;route();if(!location.hash.startsWith('#vitrine'))loadCategories().catch(()=>{});}

function resetForm(){const f=$('product-form');f.reset();f.elements.id.value='';$('form-title').textContent='Novo achadinho';$('cancel-edit').hidden=true;}
function drawAdmin(){const list=$('admin-products');list.replaceChildren();$('product-count').textContent=products.length+' produto(s) na vitrine';for(const p of products){const row=node('div','adminrow');row.append(productImage(p));const info=node('div','iteminfo',p.name);info.append(node('small','',labels[p.category]+' · '+money(p.price_cents)));const edit=node('button','secondary','Editar');edit.onclick=()=>{const f=$('product-form');f.elements.id.value=p.id;f.elements.name.value=p.name;f.elements.category.value=p.category;f.elements.price.value=(p.price_cents/100).toFixed(2);f.elements.url.value=p.affiliate_url;f.elements.image_url.value=p.image_url;f.elements.photo.value='';$('form-title').textContent='Editar achadinho';$('cancel-edit').hidden=false;f.scrollIntoView({behavior:'smooth',block:'start'});f.elements.name.focus();};const del=node('button','secondary','Excluir');del.onclick=()=>{deleteId=p.id;$('delete-name').textContent=p.name;$('delete-dialog').showModal()};row.append(info,edit,del);list.append(row)}}
async function loadAdmin(){await loadCategories();products=await api('/rest/v1/rafa_products?select=*&order=created_at.desc');drawAdmin();}
async function refreshSession(){if(!session)return;try{session=await api('/auth/v1/token?grant_type=refresh_token',{method:'POST',body:JSON.stringify({refresh_token:session.refresh_token})});}catch{session=null;$('admin-panel').hidden=true;$('login-form').hidden=false;message('Sua sessão terminou. Entre novamente para continuar.',true);}}
if($('login-form')){
 if(!configured())message('O painel está pronto para conectar. Falta preencher a URL e a chave pública do Supabase no arquivo config.js e executar a configuração do banco.',true);
 $('login-form').onsubmit=async e=>{e.preventDefault();const f=e.currentTarget,b=f.querySelector('button');b.disabled=true;message('Entrando…');try{session=await api('/auth/v1/token?grant_type=password',{method:'POST',body:JSON.stringify({email:f.elements.email.value.trim(),password:f.elements.password.value})});const allowed=await api('/rest/v1/rpc/rafa_is_admin',{method:'POST',body:'{}'});if(!allowed){session=null;throw Error('Esta conta não é a administradora da loja.');}f.elements.password.value='';await loadAdmin();f.hidden=true;$('admin-panel').hidden=false;message('');if(!products.length){$('product-form').elements.name.value=initialProduct.name;$('product-form').elements.category.value=initialProduct.category;$('product-form').elements.image_url.value=initialProduct.image_url;$('product-form').elements.price.value='39.99';$('product-form').elements.url.value='https://vt.tiktok.com/ZS9AuoVP35WbD-ji52e/';}}catch(error){session=null;message(error.message,true)}finally{b.disabled=false}};
 setInterval(refreshSession,15*60*1000);
 $('logout').onclick=async()=>{try{await api('/auth/v1/logout',{method:'POST'})}catch{}session=null;products=[];resetForm();$('admin-products').replaceChildren();$('admin-panel').hidden=true;$('login-form').hidden=false;message('Você saiu da conta.');};
 $('category-form').onsubmit=async e=>{e.preventDefault();const form=e.currentTarget,input=form.elements.category_name,button=form.querySelector('button'),notice=$('category-status');const name=input.value.trim().replace(/\s+/g,' ');notice.hidden=false;if(!name||name.length>60){notice.textContent='Informe um nome de até 60 caracteres.';return;}if(Object.values(labels).some(value=>value.localeCompare(name,'pt-BR',{sensitivity:'base'})===0)){notice.textContent='Essa categoria já existe.';return;}button.disabled=true;notice.textContent='Salvando categoria…';try{const rows=await api('/rest/v1/rafa_categories',{method:'POST',headers:{Prefer:'return=representation'},body:JSON.stringify({id:categoryId(name),name})});if(!rows?.length)throw Error('A categoria não foi salva. Confira sua permissão.');labels[rows[0].id]=rows[0].name;drawCategories();form.reset();notice.textContent='Categoria criada! Ela já pode ser selecionada nos produtos e aparece na vitrine.';}catch(error){notice.textContent=error.message}finally{button.disabled=false}};
 $('cancel-edit').onclick=resetForm;
 $('product-form').onsubmit=async e=>{e.preventDefault();const f=e.currentTarget,b=f.querySelector('[type=submit]');b.disabled=true;message('Salvando…');try{
  const name=f.elements.name.value.trim(),category=f.elements.category.value,price_cents=Math.round(Number(f.elements.price.value)*100),affiliate_url=tiktok(f.elements.url.value.trim());
  if(!name||!labels[category]||!affiliate_url||!Number.isSafeInteger(price_cents)||price_cents<1||price_cents>99999999)throw Error('Confira o nome, categoria, preço e o link do TikTok.');
  let image_url=https(f.elements.image_url.value.trim());const file=f.elements.photo.files[0];
  if(file){const types={'image/jpeg':'jpg','image/png':'png','image/webp':'webp'};if(!types[file.type]||file.size>5*1024*1024)throw Error('Envie uma foto JPG, PNG ou WebP de até 5 MB.');const key=crypto.randomUUID()+'.'+types[file.type];await api('/storage/v1/object/rafa-products/'+key,{method:'POST',headers:{'Content-Type':file.type},body:file});image_url=cfg.supabaseUrl.replace(/\/$/,'')+'/storage/v1/object/public/rafa-products/'+key;f.elements.image_url.value=image_url;f.elements.photo.value='';}
  if(!image_url)throw Error('Envie uma foto ou preencha um link HTTPS válido para a imagem.');
  const id=f.elements.id.value;const result=await api('/rest/v1/rafa_products'+(id?'?id=eq.'+encodeURIComponent(id):''),{method:id?'PATCH':'POST',headers:{Prefer:'return=representation'},body:JSON.stringify({name,category,price_cents,affiliate_url,image_url})});
  if(!result?.length)throw Error('O produto não foi salvo. Confira se sua conta tem permissão.');
  const saved=result[0];products=id?products.map(p=>p.id===id?saved:p):[saved,...products];drawAdmin();resetForm();message('Produto salvo! Ele já está disponível na vitrine.');
 }catch(error){message(error.message,true)}finally{b.disabled=false}};
 $('cancel-delete').onclick=()=>{$('delete-dialog').close();deleteId=null};
 $('confirm-delete').onclick=async()=>{const b=$('confirm-delete');b.disabled=true;try{const result=await api('/rest/v1/rafa_products?id=eq.'+encodeURIComponent(deleteId),{method:'DELETE',headers:{Prefer:'return=representation'}});if(!result?.length)throw Error('O produto não foi excluído. Atualize a página e tente novamente.');products=products.filter(p=>p.id!==deleteId);drawAdmin();if($('product-form').elements.id.value===deleteId)resetForm();$('delete-dialog').close();deleteId=null;message('Produto excluído da vitrine.');}catch(error){$('delete-dialog').close();message(error.message,true)}finally{b.disabled=false}};
}
