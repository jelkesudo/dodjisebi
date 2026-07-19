const menuButton = document.querySelector('.menu-toggle');
const nav = document.querySelector('.nav');

menuButton?.addEventListener('click', () => {
  const isOpen = nav.classList.toggle('open');
  menuButton.setAttribute('aria-expanded', String(isOpen));
  const icon = menuButton.querySelector('span');
  if (icon) icon.textContent = isOpen ? '✕' : '☰';
  menuButton.setAttribute('aria-label', isOpen ? 'Zatvori meni' : 'Otvori meni');
  document.body.classList.toggle('menu-open', isOpen);
});

nav?.querySelectorAll('a').forEach((link) => {
  link.addEventListener('click', () => {
    nav.classList.remove('open');
    menuButton?.setAttribute('aria-expanded', 'false');
    const icon = menuButton?.querySelector('span');
    if (icon) icon.textContent = '☰';
    menuButton?.setAttribute('aria-label', 'Otvori meni');
    document.body.classList.remove('menu-open');
  });
});

const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (!entry.isIntersecting) return;
    entry.target.classList.add('visible');
    observer.unobserve(entry.target);
  });
}, { threshold: 0.12 });

document.querySelectorAll('.reveal').forEach((element) => observer.observe(element));

const form = document.querySelector('#signup-form');
form?.addEventListener('submit', (event) => {
  event.preventDefault();
  const message = form.querySelector('.form-message');
  message.textContent = 'Hvala! Tvoja prijava je uspešno poslata.';
  form.reset();
});
