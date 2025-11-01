import React, { useEffect, useRef, useState } from 'react';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { MapPin, Phone, Mail, Home as HomeIcon, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import './Home.css';

gsap.registerPlugin(ScrollTrigger);

const Home = () => {
  const [programsOpen, setProgramsOpen] = useState(false);
  const [companyOpen, setCompanyOpen] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '', school: '', phone: '', message: '' });

  useEffect(() => {
    // Scroll Progress Bar
    const progressBar = document.querySelector('.scroll-progress');
    const updateProgress = () => {
      const h = document.documentElement.scrollHeight - window.innerHeight;
      const s = window.pageYOffset;
      progressBar.style.width = (s / h * 100) + '%';
    };
    window.addEventListener('scroll', updateProgress);

    // Bottom navbar show on load
    setTimeout(() => {
      document.querySelector('.bottom-nav').classList.add('visible');
    }, 800);

    // Hero animations with stagger
    gsap.to('.hero-label', {
      opacity: 1, y: 0, duration: 0.8, delay: 0.6, ease: 'power3.out'
    });
    gsap.to('.hero-title', {
      opacity: 1, y: 0, duration: 1.2, delay: 0.9, ease: 'power3.out'
    });
    gsap.to('.hero-subtitle', {
      opacity: 1, y: 0, duration: 1, delay: 1.2, ease: 'power3.out'
    });
    gsap.to('.hero-buttons', {
      opacity: 1, y: 0, duration: 1, delay: 1.5, ease: 'power3.out'
    });

    // Logo animation
    gsap.fromTo('.logo',
      { opacity: 0, scale: 0.8 },
      { opacity: 1, scale: 1, duration: 0.6, ease: 'back.out(1.7)', delay: 0.3 }
    );

    // Parallax on hero
    gsap.to('.hero-content', {
      y: 250,
      opacity: 0.2,
      scale: 0.95,
      ease: 'none',
      scrollTrigger: {
        trigger: '.hero-section',
        start: 'top top',
        end: 'bottom top',
        scrub: true
      }
    });

    // Stats counter animation
    gsap.utils.toArray('.stat-card').forEach((card, i) => {
      ScrollTrigger.create({
        trigger: card,
        start: 'top 80%',
        onEnter: () => {
          gsap.from(card, {
            opacity: 0, y: 50, duration: 0.8, delay: i * 0.1, ease: 'power3.out'
          });
        }
      });
    });

    // Section headers animation
    gsap.utils.toArray('.section-header').forEach(header => {
      gsap.from(header.children, {
        opacity: 0,
        y: 60,
        duration: 1,
        stagger: 0.2,
        scrollTrigger: {
          trigger: header,
          start: 'top 75%'
        }
      });
    });

    // Program cards - stacked with scroll
    const programCards = gsap.utils.toArray('.program-card');
    programCards.forEach((card, i) => {
      ScrollTrigger.create({
        trigger: card,
        start: 'top 160px',
        end: 'bottom 160px',
        scrub: 1,
        onUpdate: self => {
          const progress = self.progress;
          gsap.to(card, {
            scale: 1 - progress * 0.08,
            opacity: 1 - progress * 0.4,
            y: progress * -40,
            filter: `blur(${progress * 3}px)`,
            duration: 0
          });
        }
      });

      // Initial entrance
      gsap.from(card, {
        opacity: 0,
        y: 100,
        scale: 0.9,
        duration: 1,
        delay: i * 0.15,
        scrollTrigger: {
          trigger: card,
          start: 'top 90%'
        }
      });
    });

    // Founders animation
    gsap.utils.toArray('.founder-card').forEach((card, i) => {
      gsap.from(card, {
        opacity: 0,
        y: 80,
        scale: 0.9,
        duration: 1,
        delay: i * 0.2,
        scrollTrigger: {
          trigger: card,
          start: 'top 80%'
        }
      });
    });

    // Plans cards
    gsap.utils.toArray('.plan-card').forEach((card, i) => {
      gsap.from(card, {
        opacity: 0,
        y: 80,
        duration: 1,
        delay: i * 0.15,
        scrollTrigger: {
          trigger: card,
          start: 'top 80%'
        }
      });
    });

    // Contact section
    gsap.from('.contact-info', {
      x: -120,
      opacity: 0,
      duration: 1.2,
      scrollTrigger: {
        trigger: '.contact-wrapper',
        start: 'top 70%'
      }
    });

    gsap.from('.contact-form-card', {
      x: 120,
      opacity: 0,
      duration: 1.2,
      scrollTrigger: {
        trigger: '.contact-wrapper',
        start: 'top 70%'
      }
    });

    // Close dropdowns when clicking outside
    const handleClickOutside = (e) => {
      if (!e.target.closest('.nav-dropdown')) {
        setProgramsOpen(false);
        setCompanyOpen(false);
      }
    };
    document.addEventListener('click', handleClickOutside);

    return () => {
      ScrollTrigger.getAll().forEach(trigger => trigger.kill());
      window.removeEventListener('scroll', updateProgress);
      document.removeEventListener('click', handleClickOutside);
    };
  }, []);

  const scrollToSection = (id) => {
    const element = document.getElementById(id);
    if (element) {
      const offset = 120;
      const targetPosition = element.offsetTop - offset;
      window.scrollTo({
        top: targetPosition,
        behavior: 'smooth'
      });
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.message) {
      toast.error('Please fill all required fields');
      return;
    }
    toast.success('Message sent successfully! We\'ll get back to you soon.');
    setFormData({ name: '', email: '', school: '', phone: '', message: '' });
  };

  return (
    <div className="home">
      {/* Scroll Progress */}
      <div className="scroll-progress"></div>

      {/* Fixed Logo */}
      <div className="logo">
        <img src="https://i.postimg.cc/RJJFxfGs/edutrip-logo.png" alt="Edutrip" />
      </div>

      {/* Bottom Floating Navbar */}
      <nav className="bottom-nav">
        <div className="bottom-nav-content">
          <button className="nav-home" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <HomeIcon size={20} />
          </button>

          {/* Programs Dropdown */}
          <div className="nav-dropdown">
            <button 
              className="nav-link"
              onClick={(e) => {
                e.stopPropagation();
                setProgramsOpen(!programsOpen);
                setCompanyOpen(false);
              }}
            >
              Programs
              <ChevronDown size={16} className={`dropdown-arrow ${programsOpen ? 'open' : ''}`} />
            </button>
            {programsOpen && (
              <div className="dropdown-menu">
                <button onClick={() => { scrollToSection('programs'); setProgramsOpen(false); }}>
                  SimpLearn Sessions
                </button>
                <button onClick={() => { scrollToSection('workshops'); setProgramsOpen(false); }}>
                  Workshops
                </button>
                <button onClick={() => { scrollToSection('programs'); setProgramsOpen(false); }}>
                  Trips
                </button>
              </div>
            )}
          </div>

          {/* Company Dropdown */}
          <div className="nav-dropdown">
            <button 
              className="nav-link"
              onClick={(e) => {
                e.stopPropagation();
                setCompanyOpen(!companyOpen);
                setProgramsOpen(false);
              }}
            >
              Company
              <ChevronDown size={16} className={`dropdown-arrow ${companyOpen ? 'open' : ''}`} />
            </button>
            {companyOpen && (
              <div className="dropdown-menu">
                <button onClick={() => { scrollToSection('founders'); setCompanyOpen(false); }}>
                  Founders
                </button>
                <button onClick={() => { scrollToSection('about'); setCompanyOpen(false); }}>
                  About Us
                </button>
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-bg"></div>
        <div className="hero-content">
          <span className="hero-label">Experiential Learning Platform</span>
          <h1 className="hero-title">
            Transform Classrooms into
            <span className="gradient-text"> Real-World Adventures</span>
          </h1>
          <p className="hero-subtitle">
            Curriculum-aligned educational trips, expert-led SimpLearn sessions, and immersive
            workshops that bring learning to life for the next generation of innovators and leaders.
          </p>
          <div className="hero-buttons">
            <Button size="lg" className="btn-primary" onClick={() => scrollToSection('contact')}>
              Get Your Proposal
            </Button>
            <Button size="lg" variant="outline" className="btn-secondary" onClick={() => scrollToSection('programs')}>
              Explore Programs
            </Button>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="stats-section">
        <div className="stats-grid">
          <Card className="stat-card">
            <div className="stat-number">500+</div>
            <div className="stat-label">Schools Transformed</div>
          </Card>
          <Card className="stat-card">
            <div className="stat-number">50K+</div>
            <div className="stat-label">Students Impacted</div>
          </Card>
          <Card className="stat-card">
            <div className="stat-number">200+</div>
            <div className="stat-label">Expert Mentors</div>
          </Card>
          <Card className="stat-card">
            <div className="stat-number">95%</div>
            <div className="stat-label">Satisfaction Rate</div>
          </Card>
        </div>
      </section>

      {/* Programs Section */}
      <section id="programs" className="section programs-section">
        <div className="section-header">
          <span className="section-label">What We Offer</span>
          <h2 className="section-title">Our Programs</h2>
          <p className="section-desc">Transformative experiences designed to connect classroom learning with real-world discovery</p>
        </div>
        
        <div className="programs-wrapper">
          <Card className="program-card">
            <div className="program-header">
              <div className="program-number">01</div>
              <div className="program-icon-box">
                <span className="program-icon">🗺️</span>
              </div>
            </div>
            <div className="program-content">
              <h3>Curriculum-Linked Trips</h3>
              <p>Co-designed experiential trips connecting classroom topics to real-world places. Students explore museums, historical sites, science centers, and natural environments while learning alongside expert guides.</p>
            </div>
          </Card>

          <Card className="program-card">
            <div className="program-header">
              <div className="program-number">02</div>
              <div className="program-icon-box">
                <span className="program-icon">💡</span>
              </div>
            </div>
            <div className="program-content">
              <h3>SimpLearn Sessions</h3>
              <p>Interactive sessions led by industry experts focusing on STEM and design thinking. Hands-on learning experiences that simplify complex concepts through engaging demonstrations and activities.</p>
            </div>
          </Card>

          <Card className="program-card">
            <div className="program-header">
              <div className="program-number">03</div>
              <div className="program-icon-box">
                <span className="program-icon">🔬</span>
              </div>
            </div>
            <div className="program-content">
              <h3>Workshops & Maker Labs</h3>
              <p>Hands-on maker labs developing design and prototyping skills. Students work with professional tools, materials, and technologies to create innovative solutions to real-world problems.</p>
            </div>
          </Card>

          <Card className="program-card">
            <div className="program-header">
              <div className="program-number">04</div>
              <div className="program-icon-box">
                <span className="program-icon">📈</span>
              </div>
            </div>
            <div className="program-content">
              <h3>Impact & StuCom</h3>
              <p>Student communication and progress-tracking systems with measurable impact. Comprehensive reporting and analytics help schools understand learning outcomes achieved.</p>
            </div>
          </Card>
        </div>
      </section>

      {/* Workshops Section */}
      <section id="workshops" className="section workshops-section">
        <div className="section-header">
          <span className="section-label">Interactive Learning</span>
          <h2 className="section-title">Workshops & Labs</h2>
          <p className="section-desc">Engaging hands-on experiences that spark creativity and innovation</p>
        </div>
        <div className="workshops-grid">
          <Card className="workshop-card">
            <div className="workshop-icon">♻️</div>
            <h3>Maker Lab: Sustainable Design</h3>
            <p>Prototyping with recycled materials and design thinking. Students learn to create innovative solutions while understanding environmental responsibility.</p>
          </Card>
          <Card className="workshop-card">
            <div className="workshop-icon">✍️</div>
            <h3>Creative Writing & Journalism</h3>
            <p>Storytelling, interviews, and publishing in student magazines. Develop communication skills through real-world writing projects.</p>
          </Card>
          <Card className="workshop-card">
            <div className="workshop-icon">🤖</div>
            <h3>Robotics Bootcamp</h3>
            <p>Building robots, sensors, and computational challenges. Hands-on experience with programming, electronics, and mechanical engineering.</p>
          </Card>
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="section about-section">
        <div className="section-header">
          <span className="section-label">Who We Are</span>
          <h2 className="section-title">About Edutrip</h2>
          <p className="section-desc">Redefining education through real-world experiences</p>
        </div>
        <div className="about-wrapper">
          <div className="about-content">
            <h3>Transforming Education Since 2015</h3>
            <p><strong>Edutrip</strong> is a Hyderabad-based experiential learning organization redefining education through real-world experiences. We bridge the gap between classroom theory and practical application.</p>
            <p>From field explorations to innovation bootcamps and heritage residencies, every Edutrip experience is guided by experienced educators and industry mentors passionate about transforming education.</p>
            <p>Our mission is to inspire curiosity, foster creativity, and develop critical thinking skills in students through immersive, hands-on learning experiences.</p>
          </div>
          <div className="about-image"></div>
        </div>
      </section>

      {/* Founders Section */}
      <section id="founders" className="section founders-section">
        <div className="section-header">
          <span className="section-label">Leadership</span>
          <h2 className="section-title">Meet Our Founders</h2>
          <p className="section-desc">Visionaries committed to transforming education</p>
        </div>
        <div className="founders-grid">
          <Card className="founder-card">
            <div className="founder-photo"></div>
            <h4>Raghavendra Prasad</h4>
            <p className="role">Founder & CEO</p>
            <p>Passionate educator with 15+ years of experience in experiential learning and curriculum design.</p>
          </Card>
          <Card className="founder-card">
            <div className="founder-photo"></div>
            <h4>Koteswara Rao</h4>
            <p className="role">Co-Founder & COO</p>
            <p>Operations expert dedicated to scaling impactful educational experiences across India.</p>
          </Card>
        </div>
      </section>

      {/* Plans Section */}
      <section id="plans" className="section plans-section">
        <div className="section-header">
          <span className="section-label">Pricing</span>
          <h2 className="section-title">Choose Your Plan</h2>
          <p className="section-desc">Flexible packages designed to fit your school's needs and budget</p>
        </div>
        <div className="plans-grid">
          <Card className="plan-card">
            <h3 className="plan-name">Gold Plan</h3>
            <p className="plan-price">Essential Package</p>
            <ul className="plan-features">
              <li><span className="check">✓</span> 3 Educational Trips</li>
              <li><span className="check">✓</span> 3 SimpLearn Sessions</li>
              <li><span className="check">✓</span> 2 Workshops</li>
              <li><span className="check">✓</span> Basic Progress Reports</li>
              <li><span className="check">✓</span> Email Support</li>
            </ul>
            <Button variant="outline" onClick={() => scrollToSection('contact')}>
              Request Pricing
            </Button>
          </Card>

          <Card className="plan-card plan-featured">
            <span className="plan-badge">Recommended</span>
            <h3 className="plan-name">Platinum Plan</h3>
            <p className="plan-price">Most Popular</p>
            <ul className="plan-features">
              <li><span className="check">✓</span> Everything in Gold</li>
              <li><span className="check">✓</span> +1 Educational Trip</li>
              <li><span className="check">✓</span> Annual Smart Fest</li>
              <li><span className="check">✓</span> Enhanced Analytics</li>
              <li><span className="check">✓</span> Priority Support</li>
            </ul>
            <Button onClick={() => scrollToSection('contact')}>
              Request Pricing
            </Button>
          </Card>

          <Card className="plan-card">
            <h3 className="plan-name">Diamond Plan</h3>
            <p className="plan-price">Premium Package</p>
            <ul className="plan-features">
              <li><span className="check">✓</span> Everything in Platinum</li>
              <li><span className="check">✓</span> Real-World Skill Courses</li>
              <li><span className="check">✓</span> Career Guidance Sessions</li>
              <li><span className="check">✓</span> Custom Curriculum Design</li>
              <li><span className="check">✓</span> Dedicated Account Manager</li>
            </ul>
            <Button variant="outline" onClick={() => scrollToSection('contact')}>
              Request Pricing
            </Button>
          </Card>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="section contact-section">
        <div className="section-header">
          <span className="section-label">Get In Touch</span>
          <h2 className="section-title">Contact Us</h2>
          <p className="section-desc">Ready to transform your school's learning experience?</p>
        </div>
        <div className="contact-wrapper">
          <Card className="contact-info">
            <h3>Let's Connect</h3>
            <div className="contact-list">
              <div className="contact-item">
                <div className="contact-icon">
                  <MapPin size={20} />
                </div>
                <div className="contact-details">
                  <strong>Our Location</strong>
                  <span>Hyderabad, Telangana, India</span>
                </div>
              </div>
              <div className="contact-item">
                <div className="contact-icon">
                  <Phone size={20} />
                </div>
                <div className="contact-details">
                  <strong>Call Us</strong>
                  <span>+91 81792 88678</span>
                </div>
              </div>
              <div className="contact-item">
                <div className="contact-icon">
                  <Mail size={20} />
                </div>
                <div className="contact-details">
                  <strong>Email Us</strong>
                  <span>founders@edutripindia.com</span>
                </div>
              </div>
            </div>
          </Card>

          <Card className="contact-form-card">
            <h3>Send Message</h3>
            <form onSubmit={handleSubmit}>
              <div className="form-row">
                <Input
                  placeholder="Your Name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
                <Input
                  type="email"
                  placeholder="Your Email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                />
              </div>
              <div className="form-row">
                <Input
                  placeholder="School Name"
                  value={formData.school}
                  onChange={(e) => setFormData({ ...formData, school: e.target.value })}
                />
                <Input
                  type="tel"
                  placeholder="Phone Number"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>
              <Textarea
                placeholder="Tell us about your requirements..."
                rows={5}
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                required
              />
              <Button type="submit" className="submit-btn">
                Send Message
              </Button>
            </form>
          </Card>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer">
        <div className="footer-content">
          <div className="footer-main">
            <div className="footer-brand">
              <h3>Edutrip</h3>
              <p>Transforming education through experiential learning experiences. Empowering the next generation of innovators and leaders.</p>
            </div>
            <div className="footer-links">
              <h4>Programs</h4>
              <button onClick={() => scrollToSection('programs')}>Educational Trips</button>
              <button onClick={() => scrollToSection('programs')}>SimpLearn Sessions</button>
              <button onClick={() => scrollToSection('workshops')}>Workshops</button>
            </div>
            <div className="footer-links">
              <h4>Company</h4>
              <button onClick={() => scrollToSection('about')}>About Us</button>
              <button onClick={() => scrollToSection('founders')}>Our Team</button>
              <button onClick={() => scrollToSection('contact')}>Contact</button>
            </div>
          </div>
          <div className="footer-bottom">
            <p>© 2025 Edutrip Private Limited. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Home;

