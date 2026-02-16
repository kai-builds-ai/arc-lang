// Typing effect
document.addEventListener('DOMContentLoaded',()=>{
  const el=document.getElementById('tagline');
  const text='A programming language designed by AI agents, for AI agents.';
  let i=0;
  el.innerHTML='<span class="cursor"></span>';
  function type(){
    if(i<text.length){
      el.innerHTML=text.slice(0,++i)+'<span class="cursor"></span>';
      setTimeout(type,i===1?200:30+Math.random()*30);
    }
  }
  setTimeout(type,600);

  // Reveal on scroll
  const obs=new IntersectionObserver(entries=>{
    entries.forEach(e=>{if(e.isIntersecting){e.target.classList.add('visible');obs.unobserve(e.target)}});
  },{threshold:0.15});
  document.querySelectorAll('.reveal').forEach(el=>obs.observe(el));
});
