Otvorite index.html u browseru.

Sve velike slike su trenutno krem placeholderi. Kada budete dodavali svoje slike, najlakše je da u styles.css zamenite background vrednosti na klasama:
- .hero-photo
- .change-photo
- .card-photo
- .approach-image

Primer:
.hero-photo { background: url('assets/hero.jpg') center/cover no-repeat; }

Ako postavite stvarnu sliku, možete sakriti placeholder natpis tako što ćete ukloniti <span> unutar tog elementa ili dodati:
.hero-photo span { display:none; }
