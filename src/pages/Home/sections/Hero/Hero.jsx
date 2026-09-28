import Button from '../../../../components/ui/Button/Button';
import heroImage from '../../../../assets/images/naslovna.png';
import './Hero.css';
export default function Hero(){return <section id="top" className="hero"><div className="hero__copy"><p className="kicker">PROSTOR ZA TEBE</p><h1>Dođi sebi.</h1><h2>Tvoj život ne treba<br/>da bude na čekanju.</h2><p className="hero__lead">Možda je došlo vreme da prestaneš da napuštaš sebe. Prostor za razumevanje, granice i promenu koja ostaje.</p><Button href="#zastani">Započni svoj proces</Button></div><figure className="hero__visual"><img src={heroImage} alt="" /></figure><div className="scroll-cue"><span/>SKROLOVANJEM OTKRIJ VIŠE</div></section>}
