// ═══════════════════════════════════════════════════════════════
// Upload PYQ questions for the 6 empty NEET_UG chapters
// ═══════════════════════════════════════════════════════════════
// Usage:  node scripts/upload_missing_pyqs.js
// Requires MONGO_URI in .env (run from project root)

require('dotenv').config();
const mongoose = require('mongoose');
const Question = require('../models/Question');
const Chapter  = require('../models/Chapter');
const Subject  = require('../models/Subject');

const EXAM_GROUP = 'NEET_UG';

// ── Questions keyed by "SubjectName::ChapterTitle" ─────────────
const CHAPTER_QUESTIONS = {

// ════════════════════════════════════════════════════════════════
// PHYSICS — Physical World
// ════════════════════════════════════════════════════════════════
'Physics::Physical World': [
  {
    text: 'Which of the following is a fundamental force of nature?',
    options: [
      { key: 'A', text: 'Tension' },
      { key: 'B', text: 'Gravitational force' },
      { key: 'C', text: 'Friction' },
      { key: 'D', text: 'Spring force' },
    ],
    correctKey: 'B',
    explanation: 'There are four fundamental forces: gravitational, electromagnetic, strong nuclear and weak nuclear. Tension, friction and spring force are non-fundamental (contact) forces.',
    difficulty: 'easy',
  },
  {
    text: 'The branch of physics that deals with the motion of objects at speeds comparable to that of light is called:',
    options: [
      { key: 'A', text: 'Classical mechanics' },
      { key: 'B', text: 'Quantum mechanics' },
      { key: 'C', text: 'Special relativity' },
      { key: 'D', text: 'Optics' },
    ],
    correctKey: 'C',
    explanation: 'Special relativity, developed by Einstein, deals with objects moving at speeds close to the speed of light.',
    difficulty: 'easy',
  },
  {
    text: 'Which of the following is a dimensionless quantity?',
    options: [
      { key: 'A', text: 'Strain' },
      { key: 'B', text: 'Stress' },
      { key: 'C', text: 'Pressure' },
      { key: 'D', text: 'Force' },
    ],
    correctKey: 'A',
    explanation: 'Strain = ΔL/L. Since it is a ratio of two lengths, it has no dimensions.',
    difficulty: 'easy',
  },
  {
    text: 'Which of the following statements about the scope of physics is correct?',
    options: [
      { key: 'A', text: 'Physics deals only with macroscopic phenomena' },
      { key: 'B', text: 'Physics deals with phenomena at all scales — from subatomic to cosmological' },
      { key: 'C', text: 'Physics is limited to the study of natural phenomena only on Earth' },
      { key: 'D', text: 'Physics cannot explain biological processes' },
    ],
    correctKey: 'B',
    explanation: 'Physics covers phenomena from subatomic particles (10⁻¹⁵ m) to the entire universe (10²⁶ m).',
    difficulty: 'easy',
  },
  {
    text: 'The weakest fundamental force in nature is:',
    options: [
      { key: 'A', text: 'Electromagnetic force' },
      { key: 'B', text: 'Gravitational force' },
      { key: 'C', text: 'Strong nuclear force' },
      { key: 'D', text: 'Weak nuclear force' },
    ],
    correctKey: 'B',
    explanation: 'Gravitational force is the weakest of the four fundamental forces (relative strength ~10⁻³⁹ compared to strong force).',
    difficulty: 'easy',
  },
  {
    text: 'The strong nuclear force acts between:',
    options: [
      { key: 'A', text: 'Electrons and protons' },
      { key: 'B', text: 'Neutrons and electrons' },
      { key: 'C', text: 'Protons and neutrons (nucleons)' },
      { key: 'D', text: 'All charged particles' },
    ],
    correctKey: 'C',
    explanation: 'The strong nuclear force acts between nucleons (protons and neutrons) and holds the nucleus together. It is charge-independent.',
    difficulty: 'medium',
  },
  {
    text: 'Which of the following phenomena is related to the weak nuclear force?',
    options: [
      { key: 'A', text: 'Binding of nucleons in the nucleus' },
      { key: 'B', text: 'Beta decay of a neutron' },
      { key: 'C', text: 'Attraction between the Earth and the Moon' },
      { key: 'D', text: 'Binding of electrons to the nucleus' },
    ],
    correctKey: 'B',
    explanation: 'Beta decay, where a neutron transforms into a proton emitting an electron and an antineutrino, is mediated by the weak nuclear force.',
    difficulty: 'medium',
  },
  {
    text: 'Unification of which two forces was achieved by Maxwell?',
    options: [
      { key: 'A', text: 'Gravitational and electromagnetic' },
      { key: 'B', text: 'Electric and magnetic' },
      { key: 'C', text: 'Strong and weak nuclear' },
      { key: 'D', text: 'Gravitational and weak nuclear' },
    ],
    correctKey: 'B',
    explanation: 'James Clerk Maxwell unified electricity and magnetism into the electromagnetic theory in the 19th century.',
    difficulty: 'medium',
  },
  {
    text: 'The hypothesis that nature has an underlying unity has been a motivating factor in physics. Electroweak unification unifies:',
    options: [
      { key: 'A', text: 'Electromagnetic and gravitational forces' },
      { key: 'B', text: 'Electromagnetic and weak nuclear forces' },
      { key: 'C', text: 'Strong nuclear and gravitational forces' },
      { key: 'D', text: 'All four fundamental forces' },
    ],
    correctKey: 'B',
    explanation: 'The electroweak theory (by Glashow, Salam and Weinberg) unifies the electromagnetic and weak nuclear forces into a single electroweak interaction.',
    difficulty: 'medium',
  },
  {
    text: 'Science is exploring the possibility of unifying all four fundamental forces. Such a theory is called:',
    options: [
      { key: 'A', text: 'Theory of relativity' },
      { key: 'B', text: 'Grand Unified Theory' },
      { key: 'C', text: 'Theory of Everything' },
      { key: 'D', text: 'Quantum field theory' },
    ],
    correctKey: 'C',
    explanation: 'A Theory of Everything (ToE) would unify all four fundamental forces into a single theoretical framework. Grand Unified Theory (GUT) unifies only three (excluding gravity).',
    difficulty: 'medium',
  },
  {
    text: 'Which of the following is NOT a conservation law in physics?',
    options: [
      { key: 'A', text: 'Conservation of energy' },
      { key: 'B', text: 'Conservation of linear momentum' },
      { key: 'C', text: 'Conservation of temperature' },
      { key: 'D', text: 'Conservation of angular momentum' },
    ],
    correctKey: 'C',
    explanation: 'Temperature is not a conserved quantity. Energy, linear momentum and angular momentum are fundamental conservation laws.',
    difficulty: 'easy',
  },
  {
    text: 'The range of the strong nuclear force is approximately:',
    options: [
      { key: 'A', text: 'Infinite' },
      { key: 'B', text: '10⁻¹⁵ m' },
      { key: 'C', text: '10⁻¹⁰ m' },
      { key: 'D', text: '10⁻² m' },
    ],
    correctKey: 'B',
    explanation: 'The strong nuclear force has a very short range of about 10⁻¹⁵ m (of the order of nuclear dimensions).',
    difficulty: 'medium',
  },
  {
    text: 'Who among the following unified terrestrial and celestial mechanics by showing that the same gravitational force governs both?',
    options: [
      { key: 'A', text: 'Galileo' },
      { key: 'B', text: 'Newton' },
      { key: 'C', text: 'Kepler' },
      { key: 'D', text: 'Copernicus' },
    ],
    correctKey: 'B',
    explanation: 'Newton showed that the same gravitational law applies to the falling apple on Earth and the motion of the Moon around the Earth, unifying terrestrial and celestial mechanics.',
    difficulty: 'easy',
  },
  {
    text: 'Physics, technology and society are closely related. The invention of the steam engine gave rise to the:',
    options: [
      { key: 'A', text: 'Theory of relativity' },
      { key: 'B', text: 'Laws of thermodynamics' },
      { key: 'C', text: 'Quantum mechanics' },
      { key: 'D', text: 'Electromagnetic theory' },
    ],
    correctKey: 'B',
    explanation: 'The working of steam engines and the need to improve their efficiency led to the development of thermodynamics.',
    difficulty: 'easy',
  },
  {
    text: 'Which of the following correctly describes the scientific method?',
    options: [
      { key: 'A', text: 'Observation → Hypothesis → Experimentation → Theory' },
      { key: 'B', text: 'Theory → Hypothesis → Observation → Experimentation' },
      { key: 'C', text: 'Experimentation → Theory → Observation → Hypothesis' },
      { key: 'D', text: 'Hypothesis → Theory → Observation → Experimentation' },
    ],
    correctKey: 'A',
    explanation: 'The scientific method follows: systematic observations → hypothesis → controlled experiments → verification → theory/law.',
    difficulty: 'easy',
  },
  {
    text: 'Albert Einstein was awarded the Nobel Prize in Physics for:',
    options: [
      { key: 'A', text: 'Theory of special relativity' },
      { key: 'B', text: 'Theory of general relativity' },
      { key: 'C', text: 'Explanation of the photoelectric effect' },
      { key: 'D', text: 'Mass-energy equivalence' },
    ],
    correctKey: 'C',
    explanation: 'Einstein received the 1921 Nobel Prize in Physics for his explanation of the photoelectric effect, not for relativity.',
    difficulty: 'medium',
  },
  {
    text: 'Which of the following quantities does NOT have a unit named after a scientist?',
    options: [
      { key: 'A', text: 'Force' },
      { key: 'B', text: 'Work' },
      { key: 'C', text: 'Momentum' },
      { key: 'D', text: 'Pressure' },
    ],
    correctKey: 'C',
    explanation: 'Force is measured in Newton, work in Joule, pressure in Pascal — all named after scientists. Momentum is measured in kg·m/s and has no scientist-named unit.',
    difficulty: 'medium',
  },
  {
    text: 'The electromagnetic force between two protons is approximately how many times stronger than the gravitational force between them?',
    options: [
      { key: 'A', text: '10¹⁰ times' },
      { key: 'B', text: '10²⁰ times' },
      { key: 'C', text: '10³⁶ times' },
      { key: 'D', text: '10⁴⁰ times' },
    ],
    correctKey: 'C',
    explanation: 'The ratio of electrostatic to gravitational force between two protons is approximately 10³⁶, making the electromagnetic force vastly stronger.',
    difficulty: 'hard',
  },
  {
    text: 'The reductionist approach in physics refers to:',
    options: [
      { key: 'A', text: 'Reducing the number of experiments' },
      { key: 'B', text: 'Deriving the properties of complex systems from simpler constituents' },
      { key: 'C', text: 'Reducing the scope of physics' },
      { key: 'D', text: 'Simplifying mathematical equations' },
    ],
    correctKey: 'B',
    explanation: 'Reductionism is the idea that complex systems can be understood by studying their simpler, smaller constituents and their interactions.',
    difficulty: 'medium',
  },
  {
    text: 'Which technological development was a direct application of Faraday\'s law of electromagnetic induction?',
    options: [
      { key: 'A', text: 'Electric generator' },
      { key: 'B', text: 'Nuclear reactor' },
      { key: 'C', text: 'Telescope' },
      { key: 'D', text: 'Steam engine' },
    ],
    correctKey: 'A',
    explanation: 'The electric generator works on the principle of electromagnetic induction discovered by Faraday.',
    difficulty: 'easy',
  },
  {
    text: 'Classical physics includes which of the following?',
    options: [
      { key: 'A', text: 'Quantum mechanics and relativity' },
      { key: 'B', text: 'Mechanics, thermodynamics, electrodynamics and optics' },
      { key: 'C', text: 'Only Newtonian mechanics' },
      { key: 'D', text: 'Only electromagnetism' },
    ],
    correctKey: 'B',
    explanation: 'Classical physics encompasses mechanics, thermodynamics, electrodynamics and optics — everything before the 20th century revolutions of quantum mechanics and relativity.',
    difficulty: 'easy',
  },
  {
    text: 'The gravitational force is always:',
    options: [
      { key: 'A', text: 'Repulsive' },
      { key: 'B', text: 'Attractive' },
      { key: 'C', text: 'Both attractive and repulsive' },
      { key: 'D', text: 'Neither attractive nor repulsive' },
    ],
    correctKey: 'B',
    explanation: 'Gravitational force is always attractive. Unlike electromagnetic force, which can be both attractive and repulsive, gravity only attracts.',
    difficulty: 'easy',
  },
  {
    text: 'Which of the following is an example of electromagnetic force in daily life?',
    options: [
      { key: 'A', text: 'Revolution of Earth around the Sun' },
      { key: 'B', text: 'Friction between surfaces' },
      { key: 'C', text: 'Radioactive decay' },
      { key: 'D', text: 'Nuclear fission' },
    ],
    correctKey: 'B',
    explanation: 'Friction is fundamentally an electromagnetic force arising from the interaction of atoms/molecules at the surfaces in contact.',
    difficulty: 'medium',
  },
  {
    text: 'The concept of symmetry in physics implies:',
    options: [
      { key: 'A', text: 'Physical laws change with time' },
      { key: 'B', text: 'Physical laws are invariant under certain transformations' },
      { key: 'C', text: 'All forces are equal' },
      { key: 'D', text: 'Every action has an unequal reaction' },
    ],
    correctKey: 'B',
    explanation: 'Symmetry in physics means the laws of physics remain unchanged (invariant) under certain transformations such as translation, rotation, or reflection.',
    difficulty: 'medium',
  },
  {
    text: 'The Chandrasekhar limit is associated with:',
    options: [
      { key: 'A', text: 'Maximum speed of a rocket' },
      { key: 'B', text: 'Maximum mass of a stable white dwarf star' },
      { key: 'C', text: 'Minimum energy for nuclear fusion' },
      { key: 'D', text: 'Maximum temperature of the Sun' },
    ],
    correctKey: 'B',
    explanation: 'The Chandrasekhar limit (~1.4 solar masses) is the maximum mass of a stable white dwarf star, discovered by S. Chandrasekhar.',
    difficulty: 'hard',
  },
  {
    text: 'S.N. Bose is known for:',
    options: [
      { key: 'A', text: 'Discovery of the neutron' },
      { key: 'B', text: 'Bose-Einstein statistics for photons and other bosons' },
      { key: 'C', text: 'Discovery of the Raman effect' },
      { key: 'D', text: 'Formulation of quantum electrodynamics' },
    ],
    correctKey: 'B',
    explanation: 'S.N. Bose provided the quantum statistics for photons (later generalized by Einstein to all integer-spin particles called bosons).',
    difficulty: 'medium',
  },
  {
    text: 'C.V. Raman was awarded the Nobel Prize for his work on:',
    options: [
      { key: 'A', text: 'Superconductivity' },
      { key: 'B', text: 'Scattering of light by molecules' },
      { key: 'C', text: 'Nuclear physics' },
      { key: 'D', text: 'Quantum theory' },
    ],
    correctKey: 'B',
    explanation: 'C.V. Raman won the Nobel Prize in Physics (1930) for the discovery of the Raman effect — inelastic scattering of light by molecules.',
    difficulty: 'easy',
  },
  {
    text: 'The phenomenon of radioactivity was discovered by:',
    options: [
      { key: 'A', text: 'Marie Curie' },
      { key: 'B', text: 'Henri Becquerel' },
      { key: 'C', text: 'Rutherford' },
      { key: 'D', text: 'Roentgen' },
    ],
    correctKey: 'B',
    explanation: 'Henri Becquerel accidentally discovered radioactivity in 1896 while studying phosphorescent materials. Marie Curie later did extensive research on it.',
    difficulty: 'easy',
  },
  {
    text: 'Which of the following is NOT a macroscopic domain of physics?',
    options: [
      { key: 'A', text: 'Mechanics' },
      { key: 'B', text: 'Thermodynamics' },
      { key: 'C', text: 'Quantum mechanics' },
      { key: 'D', text: 'Electrodynamics' },
    ],
    correctKey: 'C',
    explanation: 'Quantum mechanics deals with microscopic phenomena at the atomic and subatomic level. Mechanics, thermodynamics and electrodynamics are macroscopic domains.',
    difficulty: 'easy',
  },
  {
    text: 'The principle of correspondence states that:',
    options: [
      { key: 'A', text: 'Every theory must correspond to experimental data' },
      { key: 'B', text: 'A new theory must reduce to the old theory in the domain where the old theory is valid' },
      { key: 'C', text: 'All measurements must correspond to SI units' },
      { key: 'D', text: 'Theoretical predictions must correspond to computer simulations' },
    ],
    correctKey: 'B',
    explanation: 'The correspondence principle (Bohr) states that a new, more general theory must give the same results as the older theory in the domain where the older theory works well.',
    difficulty: 'hard',
  },
],

// ════════════════════════════════════════════════════════════════
// PHYSICS — Laws of Motion
// ════════════════════════════════════════════════════════════════
'Physics::Laws of Motion': [
  {
    text: 'A body of mass 5 kg is acted upon by two perpendicular forces 8 N and 6 N. The magnitude and direction of the acceleration are:',
    options: [
      { key: 'A', text: '2 m/s² at an angle of 37° with 8 N force' },
      { key: 'B', text: '10 m/s² at an angle of 37° with 8 N force' },
      { key: 'C', text: '2 m/s² at an angle of 53° with 8 N force' },
      { key: 'D', text: '1.4 m/s² at an angle of 45°' },
    ],
    correctKey: 'A',
    explanation: 'Resultant F = √(8² + 6²) = √(100) = 10 N. a = F/m = 10/5 = 2 m/s². tan θ = 6/8 = 0.75, so θ = 37° with the 8 N force.',
    difficulty: 'medium',
  },
  {
    text: 'Newton\'s first law of motion defines:',
    options: [
      { key: 'A', text: 'Energy' },
      { key: 'B', text: 'Work' },
      { key: 'C', text: 'Inertia and force' },
      { key: 'D', text: 'Momentum' },
    ],
    correctKey: 'C',
    explanation: 'Newton\'s first law (law of inertia) qualitatively defines both inertia (tendency of a body to resist change in motion) and force (that which changes the state of motion).',
    difficulty: 'easy',
  },
  {
    text: 'A cricket ball of mass 150 g moving at 36 km/h is brought to rest by a player in 0.05 s. The force exerted by the player is:',
    options: [
      { key: 'A', text: '30 N' },
      { key: 'B', text: '25 N' },
      { key: 'C', text: '15 N' },
      { key: 'D', text: '45 N' },
    ],
    correctKey: 'A',
    explanation: 'v = 36 km/h = 10 m/s, m = 0.15 kg. F = m×Δv/Δt = 0.15 × 10 / 0.05 = 30 N.',
    difficulty: 'medium',
  },
  {
    text: 'A body of mass 10 kg is placed on a smooth horizontal surface. A horizontal force of 30 N is applied. The acceleration of the body is:',
    options: [
      { key: 'A', text: '3 m/s²' },
      { key: 'B', text: '10 m/s²' },
      { key: 'C', text: '0.3 m/s²' },
      { key: 'D', text: '300 m/s²' },
    ],
    correctKey: 'A',
    explanation: 'F = ma, so a = F/m = 30/10 = 3 m/s².',
    difficulty: 'easy',
  },
  {
    text: 'A horse has to pull harder during the start of motion of a cart than later because:',
    options: [
      { key: 'A', text: 'The cart is heavier at the start' },
      { key: 'B', text: 'Static friction is greater than kinetic friction' },
      { key: 'C', text: 'The horse is stronger at the start' },
      { key: 'D', text: 'There is no friction once motion starts' },
    ],
    correctKey: 'B',
    explanation: 'Static friction (limiting friction) is always greater than kinetic (sliding) friction. Once the cart starts moving, less force is needed to maintain motion.',
    difficulty: 'easy',
  },
  {
    text: 'The coefficient of static friction between a block and an inclined plane is 1/√3. The angle of the incline at which the block just starts sliding is:',
    options: [
      { key: 'A', text: '60°' },
      { key: 'B', text: '45°' },
      { key: 'C', text: '30°' },
      { key: 'D', text: '15°' },
    ],
    correctKey: 'C',
    explanation: 'At the angle of repose, μₛ = tan θ. So tan θ = 1/√3, giving θ = 30°.',
    difficulty: 'medium',
  },
  {
    text: 'A lift is accelerating upward with acceleration a. A person of mass m inside the lift will have an apparent weight of:',
    options: [
      { key: 'A', text: 'mg' },
      { key: 'B', text: 'm(g − a)' },
      { key: 'C', text: 'm(g + a)' },
      { key: 'D', text: 'ma' },
    ],
    correctKey: 'C',
    explanation: 'When the lift accelerates upward, the apparent weight (normal reaction) = m(g + a). The person feels heavier.',
    difficulty: 'medium',
  },
  {
    text: 'Two bodies of masses m₁ and m₂ are connected by a light inextensible string passing over a smooth pulley. If m₁ > m₂, the acceleration of the system is:',
    options: [
      { key: 'A', text: '(m₁ − m₂)g / (m₁ + m₂)' },
      { key: 'B', text: '(m₁ + m₂)g / (m₁ − m₂)' },
      { key: 'C', text: '(m₁ × m₂)g / (m₁ + m₂)' },
      { key: 'D', text: 'g' },
    ],
    correctKey: 'A',
    explanation: 'For an Atwood machine: net force = (m₁ − m₂)g, total mass = m₁ + m₂. So a = (m₁ − m₂)g / (m₁ + m₂).',
    difficulty: 'medium',
  },
  {
    text: 'According to Newton\'s third law, action and reaction forces:',
    options: [
      { key: 'A', text: 'Act on the same body and cancel each other' },
      { key: 'B', text: 'Act on different bodies and are equal and opposite' },
      { key: 'C', text: 'Need not be equal' },
      { key: 'D', text: 'Always act in the same direction' },
    ],
    correctKey: 'B',
    explanation: 'Action and reaction forces are always equal in magnitude, opposite in direction, and act on DIFFERENT bodies. They never cancel each other.',
    difficulty: 'easy',
  },
  {
    text: 'A body of mass 2 kg is moving with a velocity of 10 m/s. The force required to stop it in 5 seconds is:',
    options: [
      { key: 'A', text: '2 N' },
      { key: 'B', text: '4 N' },
      { key: 'C', text: '10 N' },
      { key: 'D', text: '20 N' },
    ],
    correctKey: 'B',
    explanation: 'Deceleration a = v/t = 10/5 = 2 m/s². Force F = ma = 2 × 2 = 4 N.',
    difficulty: 'easy',
  },
  {
    text: 'A block of mass 2 kg is placed on a rough horizontal surface with coefficient of friction 0.4. The minimum force required to just move the block is: (g = 10 m/s²)',
    options: [
      { key: 'A', text: '4 N' },
      { key: 'B', text: '8 N' },
      { key: 'C', text: '20 N' },
      { key: 'D', text: '2 N' },
    ],
    correctKey: 'B',
    explanation: 'F = μₛ × mg = 0.4 × 2 × 10 = 8 N. This is the limiting static friction that must be overcome.',
    difficulty: 'easy',
  },
  {
    text: 'A bullet of mass 10 g is fired from a gun of mass 5 kg with a velocity of 400 m/s. The recoil velocity of the gun is:',
    options: [
      { key: 'A', text: '0.8 m/s' },
      { key: 'B', text: '8 m/s' },
      { key: 'C', text: '0.08 m/s' },
      { key: 'D', text: '80 m/s' },
    ],
    correctKey: 'A',
    explanation: 'By conservation of momentum: m₁v₁ = m₂v₂. 0.01 × 400 = 5 × v₂. v₂ = 4/5 = 0.8 m/s.',
    difficulty: 'medium',
  },
  {
    text: 'The impulse experienced by a body is equal to:',
    options: [
      { key: 'A', text: 'Rate of change of momentum' },
      { key: 'B', text: 'Change in kinetic energy' },
      { key: 'C', text: 'Change in momentum' },
      { key: 'D', text: 'Change in velocity' },
    ],
    correctKey: 'C',
    explanation: 'Impulse = F × Δt = Δp (change in momentum). This is the impulse-momentum theorem.',
    difficulty: 'easy',
  },
  {
    text: 'A car of mass 1000 kg is moving at 20 m/s. On applying brakes, it comes to rest in 10 s. The retarding force applied by the brakes is:',
    options: [
      { key: 'A', text: '1000 N' },
      { key: 'B', text: '2000 N' },
      { key: 'C', text: '500 N' },
      { key: 'D', text: '200 N' },
    ],
    correctKey: 'B',
    explanation: 'a = Δv/Δt = 20/10 = 2 m/s². F = ma = 1000 × 2 = 2000 N.',
    difficulty: 'easy',
  },
  {
    text: 'A body is moving in a circular path of radius r with constant speed v. The centripetal acceleration is:',
    options: [
      { key: 'A', text: 'v/r' },
      { key: 'B', text: 'v²/r' },
      { key: 'C', text: 'vr' },
      { key: 'D', text: 'v²r' },
    ],
    correctKey: 'B',
    explanation: 'Centripetal acceleration a = v²/r, directed toward the center of the circular path.',
    difficulty: 'easy',
  },
  {
    text: 'A cyclist leans inward while turning. The angle of inclination θ with the vertical is given by:',
    options: [
      { key: 'A', text: 'tan θ = rg/v²' },
      { key: 'B', text: 'tan θ = v²/rg' },
      { key: 'C', text: 'tan θ = v/rg' },
      { key: 'D', text: 'tan θ = rg/v' },
    ],
    correctKey: 'B',
    explanation: 'For a cyclist taking a turn, the horizontal component of the normal force provides centripetal force: tan θ = v²/(rg).',
    difficulty: 'medium',
  },
  {
    text: 'A body is resting on a rough horizontal plane. If the plane is gradually inclined, the body will start sliding when the inclination angle equals:',
    options: [
      { key: 'A', text: 'Angle of friction' },
      { key: 'B', text: 'Angle of repose' },
      { key: 'C', text: '90°' },
      { key: 'D', text: '45°' },
    ],
    correctKey: 'B',
    explanation: 'The angle of repose is the maximum angle at which a body remains stationary on an incline. It equals the angle of friction (tan⁻¹ μₛ).',
    difficulty: 'easy',
  },
  {
    text: 'A ball of mass 0.2 kg strikes a wall perpendicularly at 10 m/s and rebounds with the same speed. The magnitude of impulse imparted by the wall is:',
    options: [
      { key: 'A', text: '0 N·s' },
      { key: 'B', text: '2 N·s' },
      { key: 'C', text: '4 N·s' },
      { key: 'D', text: '1 N·s' },
    ],
    correctKey: 'C',
    explanation: 'Impulse = Δp = m(v − (−v)) = 2mv = 2 × 0.2 × 10 = 4 N·s.',
    difficulty: 'medium',
  },
  {
    text: 'A 0.5 kg ball is thrown vertically upward with 20 m/s. The net force on the ball at the highest point is: (g = 10 m/s²)',
    options: [
      { key: 'A', text: '0 N' },
      { key: 'B', text: '5 N downward' },
      { key: 'C', text: '10 N downward' },
      { key: 'D', text: '5 N upward' },
    ],
    correctKey: 'B',
    explanation: 'At the highest point, velocity is zero but acceleration due to gravity still acts. F = mg = 0.5 × 10 = 5 N downward.',
    difficulty: 'medium',
  },
  {
    text: 'The inertia of a body depends on:',
    options: [
      { key: 'A', text: 'Volume of the body' },
      { key: 'B', text: 'Mass of the body' },
      { key: 'C', text: 'Velocity of the body' },
      { key: 'D', text: 'Acceleration of the body' },
    ],
    correctKey: 'B',
    explanation: 'Inertia is the property of a body to resist changes in its state of motion. It depends solely on the mass of the body — greater mass means greater inertia.',
    difficulty: 'easy',
  },
  {
    text: 'If a body of mass m is moving with velocity v, its momentum is p = mv. If the velocity is doubled, the kinetic energy becomes:',
    options: [
      { key: 'A', text: 'Double' },
      { key: 'B', text: 'Four times' },
      { key: 'C', text: 'Half' },
      { key: 'D', text: 'Same' },
    ],
    correctKey: 'B',
    explanation: 'KE = ½mv². If v → 2v, KE = ½m(2v)² = 4 × ½mv². The kinetic energy becomes four times.',
    difficulty: 'easy',
  },
  {
    text: 'A rocket works on the principle of:',
    options: [
      { key: 'A', text: 'Conservation of energy' },
      { key: 'B', text: 'Conservation of momentum' },
      { key: 'C', text: 'Conservation of mass' },
      { key: 'D', text: 'Bernoulli\'s principle' },
    ],
    correctKey: 'B',
    explanation: 'A rocket propels itself by ejecting mass (exhaust gases) backward at high speed. By Newton\'s third law / conservation of momentum, the rocket moves forward.',
    difficulty: 'easy',
  },
  {
    text: 'On a smooth inclined plane, a body of mass m slides down. The acceleration of the body is:',
    options: [
      { key: 'A', text: 'g sin θ' },
      { key: 'B', text: 'g cos θ' },
      { key: 'C', text: 'g tan θ' },
      { key: 'D', text: 'g' },
    ],
    correctKey: 'A',
    explanation: 'On a smooth (frictionless) incline at angle θ, the component of gravity along the plane is mg sin θ, so a = g sin θ.',
    difficulty: 'easy',
  },
  {
    text: 'A force of 10 N acts on a body of mass 5 kg for 3 seconds. The change in momentum of the body is:',
    options: [
      { key: 'A', text: '30 kg·m/s' },
      { key: 'B', text: '15 kg·m/s' },
      { key: 'C', text: '50 kg·m/s' },
      { key: 'D', text: '6 kg·m/s' },
    ],
    correctKey: 'A',
    explanation: 'Change in momentum = Impulse = F × t = 10 × 3 = 30 kg·m/s.',
    difficulty: 'easy',
  },
  {
    text: 'A man weighing 80 kg stands on a weighing scale in a lift accelerating downward at 5 m/s². The reading on the scale is: (g = 10 m/s²)',
    options: [
      { key: 'A', text: '80 kg' },
      { key: 'B', text: '40 kg' },
      { key: 'C', text: '120 kg' },
      { key: 'D', text: '0 kg' },
    ],
    correctKey: 'B',
    explanation: 'Apparent weight = m(g − a) = 80(10 − 5) = 400 N. Scale reading = 400/10 = 40 kg.',
    difficulty: 'medium',
  },
  {
    text: 'The maximum speed with which a vehicle can negotiate a curved road of radius r banked at angle θ without friction is:',
    options: [
      { key: 'A', text: '√(rg tan θ)' },
      { key: 'B', text: '√(rg sin θ)' },
      { key: 'C', text: '√(rg cos θ)' },
      { key: 'D', text: '√(rg / tan θ)' },
    ],
    correctKey: 'A',
    explanation: 'On a banked road without friction: tan θ = v²/(rg), so v = √(rg tan θ).',
    difficulty: 'medium',
  },
  {
    text: 'A body of mass m is placed on a rough inclined plane of inclination θ. The frictional force acting on it is: (μ = coefficient of friction)',
    options: [
      { key: 'A', text: 'μ mg' },
      { key: 'B', text: 'μ mg cos θ' },
      { key: 'C', text: 'μ mg sin θ' },
      { key: 'D', text: 'mg cos θ' },
    ],
    correctKey: 'B',
    explanation: 'Normal force on an incline N = mg cos θ. Friction f = μN = μ mg cos θ.',
    difficulty: 'medium',
  },
  {
    text: 'If the net force acting on a body is zero, then the body:',
    options: [
      { key: 'A', text: 'Must be at rest' },
      { key: 'B', text: 'Must be moving with uniform velocity' },
      { key: 'C', text: 'May be at rest or moving with uniform velocity' },
      { key: 'D', text: 'Must be accelerating' },
    ],
    correctKey: 'C',
    explanation: 'If net force = 0, by Newton\'s first law the body is in equilibrium — it can be at rest OR moving with constant (uniform) velocity.',
    difficulty: 'easy',
  },
  {
    text: 'Two blocks of masses 3 kg and 2 kg are connected by a string placed on a smooth horizontal surface. A force of 25 N is applied on the 3 kg block. The tension in the string is:',
    options: [
      { key: 'A', text: '10 N' },
      { key: 'B', text: '15 N' },
      { key: 'C', text: '25 N' },
      { key: 'D', text: '5 N' },
    ],
    correctKey: 'A',
    explanation: 'Acceleration a = F/(m₁+m₂) = 25/5 = 5 m/s². Tension T = m₂ × a = 2 × 5 = 10 N.',
    difficulty: 'medium',
  },
  {
    text: 'Rolling friction is:',
    options: [
      { key: 'A', text: 'Greater than sliding friction' },
      { key: 'B', text: 'Less than sliding friction' },
      { key: 'C', text: 'Equal to sliding friction' },
      { key: 'D', text: 'Independent of the nature of surfaces' },
    ],
    correctKey: 'B',
    explanation: 'Rolling friction is much less than sliding (kinetic) friction, which is why wheels and ball bearings are used to reduce friction.',
    difficulty: 'easy',
  },
  {
    text: 'A body is in equilibrium under the action of three forces. The forces must be:',
    options: [
      { key: 'A', text: 'Parallel' },
      { key: 'B', text: 'Coplanar' },
      { key: 'C', text: 'Mutually perpendicular' },
      { key: 'D', text: 'Equal in magnitude' },
    ],
    correctKey: 'B',
    explanation: 'Three forces in equilibrium (net force = 0) must be coplanar and concurrent (or parallel). They need not be equal or perpendicular.',
    difficulty: 'medium',
  },
  {
    text: 'A particle moves in a circle of radius 20 cm with a constant speed of 10 m/s. The centripetal force acting on a 2 kg particle is:',
    options: [
      { key: 'A', text: '100 N' },
      { key: 'B', text: '1000 N' },
      { key: 'C', text: '10 N' },
      { key: 'D', text: '200 N' },
    ],
    correctKey: 'B',
    explanation: 'F = mv²/r = 2 × 10² / 0.2 = 2 × 100 / 0.2 = 1000 N.',
    difficulty: 'medium',
  },
],

// ════════════════════════════════════════════════════════════════
// PHYSICS — Mechanical Properties of Fluids
// ════════════════════════════════════════════════════════════════
'Physics::Mechanical Properties of Fluids': [
  {
    text: 'The pressure at the bottom of a lake of depth h and density ρ is: (atmospheric pressure = P₀)',
    options: [
      { key: 'A', text: 'P₀' },
      { key: 'B', text: 'hρg' },
      { key: 'C', text: 'P₀ + hρg' },
      { key: 'D', text: 'P₀ − hρg' },
    ],
    correctKey: 'C',
    explanation: 'Total pressure at depth h = atmospheric pressure + gauge pressure = P₀ + hρg.',
    difficulty: 'easy',
  },
  {
    text: 'Pascal\'s law states that:',
    options: [
      { key: 'A', text: 'Pressure in a fluid decreases with depth' },
      { key: 'B', text: 'Pressure applied to an enclosed fluid is transmitted undiminished to every point' },
      { key: 'C', text: 'The velocity of a fluid increases with pressure' },
      { key: 'D', text: 'Density of a fluid changes with pressure' },
    ],
    correctKey: 'B',
    explanation: 'Pascal\'s law: a change in pressure applied to an enclosed, incompressible fluid is transmitted undiminished to every portion of the fluid and the walls of its container.',
    difficulty: 'easy',
  },
  {
    text: 'A hydraulic lift has two pistons of cross-sectional areas 10 cm² and 100 cm². A force of 50 N applied on the smaller piston will produce a force on the larger piston of:',
    options: [
      { key: 'A', text: '5 N' },
      { key: 'B', text: '50 N' },
      { key: 'C', text: '500 N' },
      { key: 'D', text: '5000 N' },
    ],
    correctKey: 'C',
    explanation: 'By Pascal\'s law: F₂/F₁ = A₂/A₁. F₂ = 50 × 100/10 = 500 N.',
    difficulty: 'easy',
  },
  {
    text: 'Bernoulli\'s theorem is based on the conservation of:',
    options: [
      { key: 'A', text: 'Momentum' },
      { key: 'B', text: 'Mass' },
      { key: 'C', text: 'Energy' },
      { key: 'D', text: 'Angular momentum' },
    ],
    correctKey: 'C',
    explanation: 'Bernoulli\'s theorem is essentially a statement of conservation of energy applied to fluid flow: P + ½ρv² + ρgh = constant.',
    difficulty: 'easy',
  },
  {
    text: 'According to the equation of continuity, for a fluid flowing through a pipe of varying cross-section:',
    options: [
      { key: 'A', text: 'Av = constant' },
      { key: 'B', text: 'A/v = constant' },
      { key: 'C', text: 'A + v = constant' },
      { key: 'D', text: 'A − v = constant' },
    ],
    correctKey: 'A',
    explanation: 'The equation of continuity (mass conservation for incompressible fluid): A₁v₁ = A₂v₂, so Av = constant.',
    difficulty: 'easy',
  },
  {
    text: 'The velocity of efflux of a liquid through an orifice at a depth h below the surface of the liquid is:',
    options: [
      { key: 'A', text: '√(gh)' },
      { key: 'B', text: '√(2gh)' },
      { key: 'C', text: '2gh' },
      { key: 'D', text: 'gh' },
    ],
    correctKey: 'B',
    explanation: 'By Torricelli\'s theorem (derived from Bernoulli\'s equation), the speed of efflux v = √(2gh).',
    difficulty: 'medium',
  },
  {
    text: 'Stokes\' law gives the viscous drag force on a sphere of radius r moving with velocity v through a fluid of viscosity η as:',
    options: [
      { key: 'A', text: '6πηrv' },
      { key: 'B', text: '4πηrv' },
      { key: 'C', text: '6πηr²v' },
      { key: 'D', text: '2πηrv' },
    ],
    correctKey: 'A',
    explanation: 'Stokes\' law: F = 6πηrv, where η is viscosity, r is radius and v is velocity of the sphere.',
    difficulty: 'easy',
  },
  {
    text: 'The terminal velocity of a sphere falling through a viscous liquid is proportional to:',
    options: [
      { key: 'A', text: 'r' },
      { key: 'B', text: 'r²' },
      { key: 'C', text: '1/r' },
      { key: 'D', text: '1/r²' },
    ],
    correctKey: 'B',
    explanation: 'Terminal velocity vₜ = 2r²(ρ − σ)g / 9η. So vₜ ∝ r².',
    difficulty: 'medium',
  },
  {
    text: 'The Reynolds number that marks the onset of turbulent flow is approximately:',
    options: [
      { key: 'A', text: '100' },
      { key: 'B', text: '1000' },
      { key: 'C', text: '2000' },
      { key: 'D', text: '10000' },
    ],
    correctKey: 'C',
    explanation: 'Flow transitions from laminar to turbulent at Reynolds number ≈ 2000 (critical Reynolds number for pipe flow is ~2000–3000).',
    difficulty: 'medium',
  },
  {
    text: 'Surface tension of a liquid is due to:',
    options: [
      { key: 'A', text: 'Gravitational force' },
      { key: 'B', text: 'Cohesive force between molecules at the surface' },
      { key: 'C', text: 'Viscous force' },
      { key: 'D', text: 'Pressure difference' },
    ],
    correctKey: 'B',
    explanation: 'Surface tension arises because molecules at the liquid surface experience a net inward cohesive force, making the surface behave like a stretched membrane.',
    difficulty: 'easy',
  },
  {
    text: 'The excess pressure inside a soap bubble of radius R is:',
    options: [
      { key: 'A', text: '2T/R' },
      { key: 'B', text: '4T/R' },
      { key: 'C', text: 'T/R' },
      { key: 'D', text: 'T/2R' },
    ],
    correctKey: 'B',
    explanation: 'A soap bubble has two surfaces (inner and outer). Excess pressure = 2 × (2T/R) = 4T/R, where T is the surface tension.',
    difficulty: 'medium',
  },
  {
    text: 'The height to which water rises in a capillary tube of radius r is: (T = surface tension, θ = contact angle)',
    options: [
      { key: 'A', text: '2T cos θ / (rρg)' },
      { key: 'B', text: '2T sin θ / (rρg)' },
      { key: 'C', text: 'T cos θ / (rρg)' },
      { key: 'D', text: '2T / (rρg)' },
    ],
    correctKey: 'A',
    explanation: 'Capillary rise h = 2T cos θ / (rρg). For water, θ is nearly 0° so cos θ ≈ 1.',
    difficulty: 'medium',
  },
  {
    text: 'Water does not wet a glass surface coated with wax because:',
    options: [
      { key: 'A', text: 'Cohesive forces are less than adhesive forces' },
      { key: 'B', text: 'Adhesive forces are less than cohesive forces' },
      { key: 'C', text: 'Angle of contact is zero' },
      { key: 'D', text: 'Surface tension of water becomes zero' },
    ],
    correctKey: 'B',
    explanation: 'When adhesive forces (liquid-solid) < cohesive forces (liquid-liquid), the liquid does not wet the surface and the contact angle is obtuse (>90°).',
    difficulty: 'medium',
  },
  {
    text: 'A liquid drop of diameter D breaks into 27 identical small drops. The resulting change in surface energy is: (T = surface tension)',
    options: [
      { key: 'A', text: '2πD²T' },
      { key: 'B', text: 'πD²T' },
      { key: 'C', text: '3πD²T' },
      { key: 'D', text: '½πD²T' },
    ],
    correctKey: 'A',
    explanation: 'Volume is conserved: (4/3)π(D/2)³ = 27 × (4/3)πr³, so r = D/6. Initial surface area = πD². Final = 27 × 4π(D/6)² = 3πD². Change in area = 2πD². Energy change = T × 2πD².',
    difficulty: 'hard',
  },
  {
    text: 'Archimedes\' principle states that the buoyant force on a body immersed in a fluid equals:',
    options: [
      { key: 'A', text: 'Weight of the body' },
      { key: 'B', text: 'Weight of the fluid displaced by the body' },
      { key: 'C', text: 'Volume of the fluid displaced' },
      { key: 'D', text: 'Density of the fluid' },
    ],
    correctKey: 'B',
    explanation: 'Archimedes\' principle: the buoyant force equals the weight of the fluid displaced by the immersed body.',
    difficulty: 'easy',
  },
  {
    text: 'A body floats in a liquid with 3/4 of its volume submerged. The ratio of the density of the body to the density of the liquid is:',
    options: [
      { key: 'A', text: '4/3' },
      { key: 'B', text: '3/4' },
      { key: 'C', text: '1/3' },
      { key: 'D', text: '2/3' },
    ],
    correctKey: 'B',
    explanation: 'For a floating body: fraction submerged = ρ_body / ρ_liquid. So ρ_body/ρ_liquid = 3/4.',
    difficulty: 'easy',
  },
  {
    text: 'The coefficient of viscosity has the SI unit:',
    options: [
      { key: 'A', text: 'Pa' },
      { key: 'B', text: 'Pa·s' },
      { key: 'C', text: 'N/m' },
      { key: 'D', text: 'kg/m' },
    ],
    correctKey: 'B',
    explanation: 'η = F·d/(A·v), so [η] = N·m/(m²·m/s) = N·s/m² = Pa·s.',
    difficulty: 'easy',
  },
  {
    text: 'A venturi meter works on the principle of:',
    options: [
      { key: 'A', text: 'Archimedes\' principle' },
      { key: 'B', text: 'Pascal\'s law' },
      { key: 'C', text: 'Bernoulli\'s theorem' },
      { key: 'D', text: 'Stokes\' law' },
    ],
    correctKey: 'C',
    explanation: 'A venturi meter measures flow rate using Bernoulli\'s principle: where velocity increases (narrower section), pressure decreases.',
    difficulty: 'easy',
  },
  {
    text: 'Water flows through a pipe of varying cross-section. At a point where the cross-section is 4 cm², the velocity is 5 m/s. At another point where the cross-section is 2 cm², the velocity is:',
    options: [
      { key: 'A', text: '2.5 m/s' },
      { key: 'B', text: '5 m/s' },
      { key: 'C', text: '10 m/s' },
      { key: 'D', text: '20 m/s' },
    ],
    correctKey: 'C',
    explanation: 'By equation of continuity: A₁v₁ = A₂v₂. 4 × 5 = 2 × v₂. v₂ = 10 m/s.',
    difficulty: 'easy',
  },
  {
    text: 'If two soap bubbles of radii r₁ and r₂ (r₁ > r₂) are connected by a tube, then:',
    options: [
      { key: 'A', text: 'Air flows from the larger to the smaller bubble' },
      { key: 'B', text: 'Air flows from the smaller to the larger bubble' },
      { key: 'C', text: 'No air flows' },
      { key: 'D', text: 'Both bubbles shrink' },
    ],
    correctKey: 'B',
    explanation: 'Excess pressure inside a bubble ∝ 1/R. The smaller bubble has higher internal pressure, so air flows from the smaller to the larger bubble.',
    difficulty: 'medium',
  },
  {
    text: 'The angle of contact for mercury and glass is:',
    options: [
      { key: 'A', text: '0°' },
      { key: 'B', text: '90°' },
      { key: 'C', text: 'Acute (< 90°)' },
      { key: 'D', text: 'Obtuse (> 90°)' },
    ],
    correctKey: 'D',
    explanation: 'Mercury has stronger cohesive forces than adhesive forces with glass, so the meniscus is convex and the contact angle is obtuse (~140°).',
    difficulty: 'easy',
  },
  {
    text: 'The dimensions of surface tension are:',
    options: [
      { key: 'A', text: '[MLT⁻²]' },
      { key: 'B', text: '[ML⁰T⁻²]' },
      { key: 'C', text: '[MT⁻²]' },
      { key: 'D', text: '[ML⁻¹T⁻²]' },
    ],
    correctKey: 'C',
    explanation: 'Surface tension T = Force/Length = [MLT⁻²]/[L] = [MT⁻²].',
    difficulty: 'medium',
  },
  {
    text: 'In streamline flow, the velocity of flow at a given point:',
    options: [
      { key: 'A', text: 'Changes randomly' },
      { key: 'B', text: 'Remains constant with time' },
      { key: 'C', text: 'Increases continuously' },
      { key: 'D', text: 'Decreases continuously' },
    ],
    correctKey: 'B',
    explanation: 'In streamline (laminar) flow, the velocity at every point in the fluid remains constant in time (though it may differ from point to point).',
    difficulty: 'easy',
  },
  {
    text: 'A manometer connected to a closed vessel shows a reading of 30 cm of mercury. The gauge pressure in the vessel is: (density of mercury = 13600 kg/m³, g = 10 m/s²)',
    options: [
      { key: 'A', text: '40800 Pa' },
      { key: 'B', text: '4080 Pa' },
      { key: 'C', text: '408000 Pa' },
      { key: 'D', text: '4.08 Pa' },
    ],
    correctKey: 'A',
    explanation: 'Gauge pressure P = hρg = 0.30 × 13600 × 10 = 40800 Pa.',
    difficulty: 'medium',
  },
  {
    text: 'The lift on an airplane wing is produced by:',
    options: [
      { key: 'A', text: 'Thrust of the engine' },
      { key: 'B', text: 'Difference in air pressure above and below the wing' },
      { key: 'C', text: 'Reaction force of exhaust gases' },
      { key: 'D', text: 'Gravitational force' },
    ],
    correctKey: 'B',
    explanation: 'The wing\'s shape causes air to move faster over the top than the bottom. By Bernoulli\'s theorem, faster flow → lower pressure, creating an upward lift force.',
    difficulty: 'easy',
  },
  {
    text: 'The viscous force between two layers of a fluid of area A, separated by distance dx, having velocity difference dv, is: (η = coefficient of viscosity)',
    options: [
      { key: 'A', text: 'ηA(dv/dx)' },
      { key: 'B', text: 'η(dv/dx)/A' },
      { key: 'C', text: 'ηA(dx/dv)' },
      { key: 'D', text: 'ηAdv' },
    ],
    correctKey: 'A',
    explanation: 'Newton\'s law of viscosity: F = ηA(dv/dx), where dv/dx is the velocity gradient.',
    difficulty: 'medium',
  },
  {
    text: 'Detergents reduce the surface tension of water. This helps in cleaning because:',
    options: [
      { key: 'A', text: 'Water becomes denser' },
      { key: 'B', text: 'Water molecules move faster' },
      { key: 'C', text: 'Water can spread and penetrate into fabric better' },
      { key: 'D', text: 'Water evaporates faster' },
    ],
    correctKey: 'C',
    explanation: 'Reducing surface tension allows water to wet surfaces more easily, spreading into crevices and fabric fibers to dislodge dirt.',
    difficulty: 'easy',
  },
  {
    text: 'A tank is filled with water to a height of 5 m. A hole is made at the bottom. The velocity of efflux is: (g = 10 m/s²)',
    options: [
      { key: 'A', text: '5 m/s' },
      { key: 'B', text: '10 m/s' },
      { key: 'C', text: '50 m/s' },
      { key: 'D', text: '√50 m/s' },
    ],
    correctKey: 'B',
    explanation: 'By Torricelli\'s theorem: v = √(2gh) = √(2 × 10 × 5) = √100 = 10 m/s.',
    difficulty: 'easy',
  },
  {
    text: 'An ice cube floats in water. When it melts completely, the water level:',
    options: [
      { key: 'A', text: 'Rises' },
      { key: 'B', text: 'Falls' },
      { key: 'C', text: 'Remains the same' },
      { key: 'D', text: 'First rises then falls' },
    ],
    correctKey: 'C',
    explanation: 'A floating body displaces water equal to its own weight. When ice melts, the volume of water formed exactly equals the displaced volume, so the level stays the same.',
    difficulty: 'medium',
  },
],

// ════════════════════════════════════════════════════════════════
// PHYSICS — Kinetic Theory
// ════════════════════════════════════════════════════════════════
'Physics::Kinetic Theory': [
  {
    text: 'The average kinetic energy of a molecule of an ideal gas at temperature T is:',
    options: [
      { key: 'A', text: '½ kT' },
      { key: 'B', text: 'kT' },
      { key: 'C', text: '3/2 kT' },
      { key: 'D', text: '5/2 kT' },
    ],
    correctKey: 'C',
    explanation: 'The average translational kinetic energy of a gas molecule = (3/2)kT, where k is Boltzmann\'s constant.',
    difficulty: 'easy',
  },
  {
    text: 'The root mean square (rms) speed of gas molecules is given by:',
    options: [
      { key: 'A', text: '√(3kT/m)' },
      { key: 'B', text: '√(2kT/m)' },
      { key: 'C', text: '√(kT/m)' },
      { key: 'D', text: '√(5kT/m)' },
    ],
    correctKey: 'A',
    explanation: 'v_rms = √(3kT/m) = √(3RT/M), where m is the mass of one molecule and M is molar mass.',
    difficulty: 'easy',
  },
  {
    text: 'According to the kinetic theory, the pressure exerted by an ideal gas is:',
    options: [
      { key: 'A', text: 'P = ⅓ ρv²_rms' },
      { key: 'B', text: 'P = ρv²_rms' },
      { key: 'C', text: 'P = ½ ρv²_rms' },
      { key: 'D', text: 'P = 2ρv²_rms' },
    ],
    correctKey: 'A',
    explanation: 'From kinetic theory: P = (1/3)ρv²_rms = (1/3)(nm⟨v²⟩), where n is number density.',
    difficulty: 'medium',
  },
  {
    text: 'At what temperature does the rms speed of hydrogen molecules equal the rms speed of oxygen molecules at 300 K?',
    options: [
      { key: 'A', text: '37.5 K' },
      { key: 'B', text: '18.75 K' },
      { key: 'C', text: '75 K' },
      { key: 'D', text: '150 K' },
    ],
    correctKey: 'B',
    explanation: 'v_rms = √(3RT/M). For equal speeds: T_H₂/M_H₂ = T_O₂/M_O₂. T_H₂ = 300 × 2/32 = 18.75 K.',
    difficulty: 'medium',
  },
  {
    text: 'The degrees of freedom of a diatomic gas molecule at moderate temperature are:',
    options: [
      { key: 'A', text: '3' },
      { key: 'B', text: '5' },
      { key: 'C', text: '6' },
      { key: 'D', text: '7' },
    ],
    correctKey: 'B',
    explanation: 'At moderate temperatures, a diatomic molecule has 3 translational + 2 rotational = 5 degrees of freedom. Vibrational modes are frozen out at moderate temperatures.',
    difficulty: 'easy',
  },
  {
    text: 'The ratio of specific heats (γ = Cₚ/Cᵥ) for a monatomic ideal gas is:',
    options: [
      { key: 'A', text: '7/5' },
      { key: 'B', text: '5/3' },
      { key: 'C', text: '4/3' },
      { key: 'D', text: '3/2' },
    ],
    correctKey: 'B',
    explanation: 'For monatomic gas: f = 3, Cᵥ = (3/2)R, Cₚ = (5/2)R, γ = Cₚ/Cᵥ = 5/3.',
    difficulty: 'easy',
  },
  {
    text: 'The mean free path of a gas molecule depends on:',
    options: [
      { key: 'A', text: 'Temperature only' },
      { key: 'B', text: 'Pressure only' },
      { key: 'C', text: 'Diameter of molecule and number density' },
      { key: 'D', text: 'Mass of the molecule' },
    ],
    correctKey: 'C',
    explanation: 'Mean free path λ = 1/(√2 πd²n), where d is molecular diameter and n is number density. It depends on both.',
    difficulty: 'medium',
  },
  {
    text: 'The ideal gas equation is PV = nRT. Here R is:',
    options: [
      { key: 'A', text: 'Boltzmann constant' },
      { key: 'B', text: 'Universal gas constant' },
      { key: 'C', text: 'Specific heat at constant pressure' },
      { key: 'D', text: 'Rydberg constant' },
    ],
    correctKey: 'B',
    explanation: 'R = 8.314 J/(mol·K) is the universal gas constant. Boltzmann constant k = R/Nₐ relates to individual molecules.',
    difficulty: 'easy',
  },
  {
    text: 'The total kinetic energy of one mole of an ideal gas at temperature T is:',
    options: [
      { key: 'A', text: '(3/2)kT' },
      { key: 'B', text: '(3/2)RT' },
      { key: 'C', text: '(f/2)RT' },
      { key: 'D', text: 'RT' },
    ],
    correctKey: 'B',
    explanation: 'For one mole: total KE = Nₐ × (3/2)kT = (3/2)RT, since Nₐk = R. (For monatomic gas; in general (f/2)RT.)',
    difficulty: 'medium',
  },
  {
    text: 'The ratio v_rms : v_avg : v_mp for an ideal gas is:',
    options: [
      { key: 'A', text: '1 : 1.128 : 1.224' },
      { key: 'B', text: '1.224 : 1.128 : 1' },
      { key: 'C', text: '1 : 1 : 1' },
      { key: 'D', text: '1.128 : 1 : 1.224' },
    ],
    correctKey: 'B',
    explanation: 'v_mp = √(2kT/m), v_avg = √(8kT/πm), v_rms = √(3kT/m). Ratio = √3 : √(8/π) : √2 ≈ 1.224 : 1.128 : 1.',
    difficulty: 'hard',
  },
  {
    text: 'Boyle\'s law is valid for an ideal gas undergoing:',
    options: [
      { key: 'A', text: 'Adiabatic process' },
      { key: 'B', text: 'Isothermal process' },
      { key: 'C', text: 'Isobaric process' },
      { key: 'D', text: 'Isochoric process' },
    ],
    correctKey: 'B',
    explanation: 'Boyle\'s law (PV = constant) holds at constant temperature, i.e., during an isothermal process.',
    difficulty: 'easy',
  },
  {
    text: 'According to the law of equipartition of energy, the energy associated with each degree of freedom per molecule is:',
    options: [
      { key: 'A', text: 'kT' },
      { key: 'B', text: '½ kT' },
      { key: 'C', text: '3/2 kT' },
      { key: 'D', text: '2kT' },
    ],
    correctKey: 'B',
    explanation: 'The law of equipartition of energy states that each degree of freedom contributes (1/2)kT to the average energy per molecule.',
    difficulty: 'easy',
  },
  {
    text: 'At absolute zero temperature:',
    options: [
      { key: 'A', text: 'Molecules move with maximum speed' },
      { key: 'B', text: 'The volume of an ideal gas becomes zero' },
      { key: 'C', text: 'The kinetic energy of gas molecules becomes zero' },
      { key: 'D', text: 'Both B and C' },
    ],
    correctKey: 'D',
    explanation: 'At T = 0 K, KE = (3/2)kT = 0 and from ideal gas law PV = nRT, volume → 0 (idealised). In reality, gases liquefy before reaching 0 K.',
    difficulty: 'medium',
  },
  {
    text: 'The Cₚ − Cᵥ for one mole of an ideal gas is:',
    options: [
      { key: 'A', text: 'kT' },
      { key: 'B', text: 'R' },
      { key: 'C', text: '2R' },
      { key: 'D', text: 'R/2' },
    ],
    correctKey: 'B',
    explanation: 'Mayer\'s relation: Cₚ − Cᵥ = R for one mole of an ideal gas.',
    difficulty: 'easy',
  },
  {
    text: 'If the temperature of a gas is doubled, the rms speed of its molecules:',
    options: [
      { key: 'A', text: 'Doubles' },
      { key: 'B', text: 'Becomes √2 times' },
      { key: 'C', text: 'Becomes 4 times' },
      { key: 'D', text: 'Remains the same' },
    ],
    correctKey: 'B',
    explanation: 'v_rms = √(3kT/m) ∝ √T. If T → 2T, v_rms → √2 × v_rms.',
    difficulty: 'easy',
  },
  {
    text: 'The pressure of a gas in a container is due to:',
    options: [
      { key: 'A', text: 'Attraction between gas molecules' },
      { key: 'B', text: 'Collisions of gas molecules with the container walls' },
      { key: 'C', text: 'Gravitational force on gas molecules' },
      { key: 'D', text: 'Repulsion between gas molecules' },
    ],
    correctKey: 'B',
    explanation: 'Gas pressure arises from the momentum transfer during collisions of gas molecules with the walls of the container.',
    difficulty: 'easy',
  },
  {
    text: 'An ideal gas at 27°C is heated at constant pressure to 327°C. The ratio of final volume to initial volume is:',
    options: [
      { key: 'A', text: '2' },
      { key: 'B', text: '11' },
      { key: 'C', text: '1/2' },
      { key: 'D', text: '327/27' },
    ],
    correctKey: 'A',
    explanation: 'At constant pressure, V ∝ T (Charles\' law). V₂/V₁ = T₂/T₁ = 600/300 = 2. (Temperatures must be in Kelvin.)',
    difficulty: 'easy',
  },
  {
    text: 'The value of γ for a diatomic gas at moderate temperature is:',
    options: [
      { key: 'A', text: '5/3' },
      { key: 'B', text: '7/5' },
      { key: 'C', text: '4/3' },
      { key: 'D', text: '9/7' },
    ],
    correctKey: 'B',
    explanation: 'For diatomic gas (f = 5): Cᵥ = (5/2)R, Cₚ = (7/2)R, γ = 7/5 = 1.4.',
    difficulty: 'easy',
  },
  {
    text: 'Dalton\'s law of partial pressures states that the total pressure of a mixture of non-reacting gases equals:',
    options: [
      { key: 'A', text: 'The pressure of the gas with the highest molecular weight' },
      { key: 'B', text: 'The average of the pressures of all the gases' },
      { key: 'C', text: 'The sum of partial pressures of all the individual gases' },
      { key: 'D', text: 'The product of partial pressures of all gases' },
    ],
    correctKey: 'C',
    explanation: 'Dalton\'s law: P_total = P₁ + P₂ + P₃ + ... where each Pᵢ is the partial pressure of gas i.',
    difficulty: 'easy',
  },
  {
    text: 'Two gases at the same temperature have molecular masses M₁ and M₂. The ratio of their rms speeds is:',
    options: [
      { key: 'A', text: 'M₁/M₂' },
      { key: 'B', text: 'M₂/M₁' },
      { key: 'C', text: '√(M₂/M₁)' },
      { key: 'D', text: '√(M₁/M₂)' },
    ],
    correctKey: 'C',
    explanation: 'v_rms = √(3RT/M). At the same T: v₁/v₂ = √(M₂/M₁).',
    difficulty: 'medium',
  },
  {
    text: 'A real gas behaves most like an ideal gas at:',
    options: [
      { key: 'A', text: 'Low temperature and high pressure' },
      { key: 'B', text: 'High temperature and low pressure' },
      { key: 'C', text: 'Low temperature and low pressure' },
      { key: 'D', text: 'High temperature and high pressure' },
    ],
    correctKey: 'B',
    explanation: 'At high temperature and low pressure, intermolecular forces become negligible and molecular volume is small compared to container volume — ideal gas assumptions are valid.',
    difficulty: 'easy',
  },
  {
    text: 'The mean free path of a molecule increases with:',
    options: [
      { key: 'A', text: 'Increase in pressure' },
      { key: 'B', text: 'Decrease in temperature' },
      { key: 'C', text: 'Increase in temperature at constant pressure' },
      { key: 'D', text: 'Increase in molecular size' },
    ],
    correctKey: 'C',
    explanation: 'λ = kT/(√2 πd²P). At constant P, increasing T increases the mean free path as molecules are farther apart on average.',
    difficulty: 'medium',
  },
  {
    text: 'Avogadro\'s number is:',
    options: [
      { key: 'A', text: '6.022 × 10²³ mol⁻¹' },
      { key: 'B', text: '6.022 × 10²⁶ mol⁻¹' },
      { key: 'C', text: '1.38 × 10⁻²³ J/K' },
      { key: 'D', text: '8.314 J/(mol·K)' },
    ],
    correctKey: 'A',
    explanation: 'Avogadro\'s number Nₐ = 6.022 × 10²³ mol⁻¹. Option C is Boltzmann\'s constant and D is the gas constant R.',
    difficulty: 'easy',
  },
  {
    text: 'The specific heat of a gas at constant volume Cᵥ for a monatomic gas is:',
    options: [
      { key: 'A', text: '(3/2)R' },
      { key: 'B', text: '(5/2)R' },
      { key: 'C', text: 'R' },
      { key: 'D', text: '(7/2)R' },
    ],
    correctKey: 'A',
    explanation: 'For a monatomic gas (f = 3): Cᵥ = (f/2)R = (3/2)R.',
    difficulty: 'easy',
  },
  {
    text: 'If the pressure of an ideal gas is doubled and its temperature is tripled, the volume becomes:',
    options: [
      { key: 'A', text: '2/3 of original' },
      { key: 'B', text: '3/2 of original' },
      { key: 'C', text: '6 times original' },
      { key: 'D', text: '1/6 of original' },
    ],
    correctKey: 'B',
    explanation: 'PV = nRT → V = nRT/P. V₂/V₁ = (T₂/T₁) × (P₁/P₂) = 3 × (1/2) = 3/2.',
    difficulty: 'medium',
  },
  {
    text: 'The kinetic energy of one mole of a gas at 300 K is: (R = 8.314 J/(mol·K))',
    options: [
      { key: 'A', text: '3741.3 J' },
      { key: 'B', text: '2494.2 J' },
      { key: 'C', text: '4988.4 J' },
      { key: 'D', text: '1247.1 J' },
    ],
    correctKey: 'A',
    explanation: 'KE = (3/2)RT = (3/2) × 8.314 × 300 = 3741.3 J (for one mole of monatomic ideal gas).',
    difficulty: 'medium',
  },
  {
    text: 'Which of the following assumptions is NOT made in kinetic theory of ideal gases?',
    options: [
      { key: 'A', text: 'Molecules are in random motion' },
      { key: 'B', text: 'Collisions are perfectly elastic' },
      { key: 'C', text: 'Intermolecular forces are significant' },
      { key: 'D', text: 'Volume of molecules is negligible' },
    ],
    correctKey: 'C',
    explanation: 'The kinetic theory of ideal gases assumes intermolecular forces are negligible (except during collisions). In a real gas, these forces ARE significant.',
    difficulty: 'easy',
  },
  {
    text: 'The most probable speed of gas molecules at temperature T is:',
    options: [
      { key: 'A', text: '√(3kT/m)' },
      { key: 'B', text: '√(8kT/πm)' },
      { key: 'C', text: '√(2kT/m)' },
      { key: 'D', text: '√(kT/m)' },
    ],
    correctKey: 'C',
    explanation: 'The most probable speed v_mp = √(2kT/m) = √(2RT/M). It is the speed at which the Maxwell speed distribution has its maximum.',
    difficulty: 'medium',
  },
],

// ════════════════════════════════════════════════════════════════
// CHEMISTRY — Chemical Bonding and Molecular Structure
// ════════════════════════════════════════════════════════════════
'Chemistry::Chemical Bonding and Molecular Structure': [
  {
    text: 'The number of lone pairs on the central atom in H₂O is:',
    options: [
      { key: 'A', text: '0' },
      { key: 'B', text: '1' },
      { key: 'C', text: '2' },
      { key: 'D', text: '3' },
    ],
    correctKey: 'C',
    explanation: 'Oxygen in H₂O has 6 valence electrons. Two are shared with H atoms, leaving 4 electrons = 2 lone pairs.',
    difficulty: 'easy',
  },
  {
    text: 'According to VSEPR theory, the shape of BF₃ molecule is:',
    options: [
      { key: 'A', text: 'Tetrahedral' },
      { key: 'B', text: 'Trigonal planar' },
      { key: 'C', text: 'Pyramidal' },
      { key: 'D', text: 'Linear' },
    ],
    correctKey: 'B',
    explanation: 'BF₃ has 3 bond pairs and no lone pairs around B (sp² hybridized). VSEPR predicts a trigonal planar geometry with 120° bond angles.',
    difficulty: 'easy',
  },
  {
    text: 'The hybridization of carbon in ethylene (C₂H₄) is:',
    options: [
      { key: 'A', text: 'sp' },
      { key: 'B', text: 'sp²' },
      { key: 'C', text: 'sp³' },
      { key: 'D', text: 'sp³d' },
    ],
    correctKey: 'B',
    explanation: 'In ethylene, each carbon forms a double bond (one σ + one π). The carbon is sp² hybridized with trigonal planar geometry.',
    difficulty: 'easy',
  },
  {
    text: 'Which of the following molecules has zero dipole moment?',
    options: [
      { key: 'A', text: 'H₂O' },
      { key: 'B', text: 'NH₃' },
      { key: 'C', text: 'CO₂' },
      { key: 'D', text: 'HCl' },
    ],
    correctKey: 'C',
    explanation: 'CO₂ is linear and symmetric (O=C=O). The two C=O dipoles are equal and opposite, so they cancel out, giving zero net dipole moment.',
    difficulty: 'easy',
  },
  {
    text: 'The bond order of O₂ according to molecular orbital theory is:',
    options: [
      { key: 'A', text: '1' },
      { key: 'B', text: '2' },
      { key: 'C', text: '3' },
      { key: 'D', text: '1.5' },
    ],
    correctKey: 'B',
    explanation: 'O₂ has 16 electrons. Bond order = (bonding − antibonding)/2 = (10 − 6)/2 = 2.',
    difficulty: 'medium',
  },
  {
    text: 'According to molecular orbital theory, O₂ is:',
    options: [
      { key: 'A', text: 'Diamagnetic' },
      { key: 'B', text: 'Paramagnetic' },
      { key: 'C', text: 'Ferromagnetic' },
      { key: 'D', text: 'Non-magnetic' },
    ],
    correctKey: 'B',
    explanation: 'O₂ has two unpaired electrons in the π* antibonding orbitals (π*2pₓ and π*2pᵧ), making it paramagnetic. This was a triumph of MOT.',
    difficulty: 'medium',
  },
  {
    text: 'The bond angle in NH₃ is approximately:',
    options: [
      { key: 'A', text: '180°' },
      { key: 'B', text: '120°' },
      { key: 'C', text: '109.5°' },
      { key: 'D', text: '107°' },
    ],
    correctKey: 'D',
    explanation: 'NH₃ has 3 bond pairs and 1 lone pair (sp³ hybridized). The lone pair compresses the bond angles from 109.5° to about 107°.',
    difficulty: 'easy',
  },
  {
    text: 'The correct order of bond angles is:',
    options: [
      { key: 'A', text: 'H₂O > NH₃ > CH₄' },
      { key: 'B', text: 'CH₄ > NH₃ > H₂O' },
      { key: 'C', text: 'NH₃ > H₂O > CH₄' },
      { key: 'D', text: 'CH₄ > H₂O > NH₃' },
    ],
    correctKey: 'B',
    explanation: 'Bond angles: CH₄ (109.5°) > NH₃ (~107°) > H₂O (~104.5°). More lone pairs compress bond angles further.',
    difficulty: 'medium',
  },
  {
    text: 'Sigma (σ) bonds are formed by:',
    options: [
      { key: 'A', text: 'Lateral overlap of orbitals' },
      { key: 'B', text: 'Head-on (axial) overlap of orbitals' },
      { key: 'C', text: 'No overlap of orbitals' },
      { key: 'D', text: 'Overlap of d-orbitals only' },
    ],
    correctKey: 'B',
    explanation: 'Sigma bonds are formed by head-on (end-to-end or axial) overlap of orbitals along the internuclear axis. Pi bonds form by lateral (side-by-side) overlap.',
    difficulty: 'easy',
  },
  {
    text: 'The hybridization of sulfur in SF₆ is:',
    options: [
      { key: 'A', text: 'sp³' },
      { key: 'B', text: 'sp³d' },
      { key: 'C', text: 'sp³d²' },
      { key: 'D', text: 'sp²' },
    ],
    correctKey: 'C',
    explanation: 'SF₆ has 6 bond pairs and no lone pairs. Sulfur is sp³d² hybridized with octahedral geometry.',
    difficulty: 'medium',
  },
  {
    text: 'An ionic bond is formed between:',
    options: [
      { key: 'A', text: 'Two metals' },
      { key: 'B', text: 'Two non-metals' },
      { key: 'C', text: 'A metal and a non-metal' },
      { key: 'D', text: 'Two noble gases' },
    ],
    correctKey: 'C',
    explanation: 'Ionic bonds form by transfer of electrons from a metal (low IE, low EN) to a non-metal (high EA, high EN).',
    difficulty: 'easy',
  },
  {
    text: 'The lattice energy of an ionic compound depends on:',
    options: [
      { key: 'A', text: 'Only the charges of ions' },
      { key: 'B', text: 'Only the size of ions' },
      { key: 'C', text: 'Both the charges and sizes of ions' },
      { key: 'D', text: 'The number of electrons in the ions' },
    ],
    correctKey: 'C',
    explanation: 'Lattice energy ∝ (q₊ × q₋) / (r₊ + r₋). It increases with higher charges and smaller ionic sizes.',
    difficulty: 'medium',
  },
  {
    text: 'Hydrogen bonding is strongest in:',
    options: [
      { key: 'A', text: 'HCl' },
      { key: 'B', text: 'HBr' },
      { key: 'C', text: 'HF' },
      { key: 'D', text: 'HI' },
    ],
    correctKey: 'C',
    explanation: 'HF forms the strongest hydrogen bonds because fluorine is the most electronegative element and has a small size, leading to very polar H–F bonds.',
    difficulty: 'easy',
  },
  {
    text: 'The shape of XeF₄ is:',
    options: [
      { key: 'A', text: 'Tetrahedral' },
      { key: 'B', text: 'Square planar' },
      { key: 'C', text: 'See-saw' },
      { key: 'D', text: 'Square pyramidal' },
    ],
    correctKey: 'B',
    explanation: 'XeF₄ has 4 bond pairs and 2 lone pairs (sp³d² hybridized). The lone pairs occupy axial positions, giving a square planar geometry.',
    difficulty: 'medium',
  },
  {
    text: 'Which of the following has the highest bond order?',
    options: [
      { key: 'A', text: 'N₂' },
      { key: 'B', text: 'O₂' },
      { key: 'C', text: 'F₂' },
      { key: 'D', text: 'Ne₂' },
    ],
    correctKey: 'A',
    explanation: 'Bond orders: N₂ = 3 (triple bond), O₂ = 2, F₂ = 1, Ne₂ = 0 (does not exist). N₂ has the highest.',
    difficulty: 'easy',
  },
  {
    text: 'The Fajans\' rules predict greater covalent character when:',
    options: [
      { key: 'A', text: 'Cation is large and anion is small' },
      { key: 'B', text: 'Cation is small and highly charged, anion is large' },
      { key: 'C', text: 'Both ions are large' },
      { key: 'D', text: 'Both ions have unit charge' },
    ],
    correctKey: 'B',
    explanation: 'Fajans\' rules: covalent character increases with smaller, more highly charged cation and larger anion (greater polarization of anion\'s electron cloud).',
    difficulty: 'medium',
  },
  {
    text: 'The bond dissociation energy of N₂ is very high because:',
    options: [
      { key: 'A', text: 'It has a single bond' },
      { key: 'B', text: 'It has a triple bond (one σ + two π)' },
      { key: 'C', text: 'Nitrogen is a large atom' },
      { key: 'D', text: 'N₂ has lone pair electrons' },
    ],
    correctKey: 'B',
    explanation: 'N₂ has a triple bond (1σ + 2π), giving it a bond order of 3. This very strong bond results in a high bond dissociation energy of 941 kJ/mol.',
    difficulty: 'easy',
  },
  {
    text: 'Which of the following species is linear?',
    options: [
      { key: 'A', text: 'H₂O' },
      { key: 'B', text: 'BeCl₂' },
      { key: 'C', text: 'NH₃' },
      { key: 'D', text: 'SO₂' },
    ],
    correctKey: 'B',
    explanation: 'BeCl₂ has 2 bond pairs and no lone pairs (sp hybridized). It is linear with a 180° bond angle.',
    difficulty: 'easy',
  },
  {
    text: 'The type of hybridization in PCl₅ is:',
    options: [
      { key: 'A', text: 'sp³' },
      { key: 'B', text: 'sp²' },
      { key: 'C', text: 'sp³d' },
      { key: 'D', text: 'sp³d²' },
    ],
    correctKey: 'C',
    explanation: 'PCl₅ has 5 bond pairs and no lone pairs. Phosphorus is sp³d hybridized with trigonal bipyramidal geometry.',
    difficulty: 'easy',
  },
  {
    text: 'London dispersion forces are present in:',
    options: [
      { key: 'A', text: 'Only polar molecules' },
      { key: 'B', text: 'Only non-polar molecules' },
      { key: 'C', text: 'All molecules' },
      { key: 'D', text: 'Only ionic compounds' },
    ],
    correctKey: 'C',
    explanation: 'London dispersion forces (instantaneous dipole-induced dipole) are present in ALL molecules, polar and non-polar alike. They are the only intermolecular force in non-polar molecules.',
    difficulty: 'easy',
  },
  {
    text: 'The formal charge on nitrogen in the nitrate ion (NO₃⁻) is:',
    options: [
      { key: 'A', text: '−1' },
      { key: 'B', text: '0' },
      { key: 'C', text: '+1' },
      { key: 'D', text: '+2' },
    ],
    correctKey: 'C',
    explanation: 'Formal charge on N = 5 − 0 − ½(8) = 5 − 4 = +1. (N has 5 valence e⁻, 0 lone pair e⁻, and 4 bonding pairs.)',
    difficulty: 'medium',
  },
  {
    text: 'Which of the following molecules does NOT obey the octet rule?',
    options: [
      { key: 'A', text: 'CCl₄' },
      { key: 'B', text: 'BF₃' },
      { key: 'C', text: 'NF₃' },
      { key: 'D', text: 'H₂O' },
    ],
    correctKey: 'B',
    explanation: 'In BF₃, boron has only 6 electrons around it (3 bond pairs), making it electron-deficient and an exception to the octet rule.',
    difficulty: 'easy',
  },
  {
    text: 'Resonance structures are:',
    options: [
      { key: 'A', text: 'Different isomers of a molecule' },
      { key: 'B', text: 'Different electron arrangements for the same skeleton' },
      { key: 'C', text: 'Different geometries of a molecule' },
      { key: 'D', text: 'Different conformations of a molecule' },
    ],
    correctKey: 'B',
    explanation: 'Resonance structures have the same atomic positions but differ in the arrangement of electrons (bonds and lone pairs). The actual structure is a hybrid.',
    difficulty: 'easy',
  },
  {
    text: 'The bond length order in carbon-carbon bonds is:',
    options: [
      { key: 'A', text: 'C−C < C=C < C≡C' },
      { key: 'B', text: 'C≡C < C=C < C−C' },
      { key: 'C', text: 'C=C < C−C < C≡C' },
      { key: 'D', text: 'All are equal' },
    ],
    correctKey: 'B',
    explanation: 'Higher bond order → shorter and stronger bonds. So C≡C (1.20 Å) < C=C (1.34 Å) < C−C (1.54 Å).',
    difficulty: 'easy',
  },
  {
    text: 'The electronegativity of elements increases:',
    options: [
      { key: 'A', text: 'Down a group and across a period' },
      { key: 'B', text: 'Down a group and decreases across a period' },
      { key: 'C', text: 'Across a period (left to right) and decreases down a group' },
      { key: 'D', text: 'Neither across a period nor down a group' },
    ],
    correctKey: 'C',
    explanation: 'Electronegativity increases from left to right across a period (increasing nuclear charge) and decreases down a group (increasing atomic size).',
    difficulty: 'easy',
  },
  {
    text: 'The geometry of CH₄ is:',
    options: [
      { key: 'A', text: 'Square planar' },
      { key: 'B', text: 'Trigonal planar' },
      { key: 'C', text: 'Tetrahedral' },
      { key: 'D', text: 'Pyramidal' },
    ],
    correctKey: 'C',
    explanation: 'CH₄ has 4 bond pairs and no lone pairs around carbon (sp³ hybridized), giving a tetrahedral geometry with 109.5° bond angles.',
    difficulty: 'easy',
  },
  {
    text: 'Coordinate (dative) bond involves:',
    options: [
      { key: 'A', text: 'Equal sharing of electrons by both atoms' },
      { key: 'B', text: 'Transfer of electrons from one atom to another' },
      { key: 'C', text: 'Both electrons of the shared pair coming from one atom' },
      { key: 'D', text: 'Sharing of electrons between two non-metals only' },
    ],
    correctKey: 'C',
    explanation: 'In a coordinate (dative) bond, both electrons of the shared pair are donated by one atom (the donor) to another (the acceptor). Example: NH₃ → BF₃.',
    difficulty: 'easy',
  },
  {
    text: 'The dipole moment of CHCl₃ is non-zero while that of CCl₄ is zero because:',
    options: [
      { key: 'A', text: 'CHCl₃ has higher molecular weight' },
      { key: 'B', text: 'CCl₄ is symmetric (bond dipoles cancel) while CHCl₃ is not' },
      { key: 'C', text: 'C−H bond is ionic' },
      { key: 'D', text: 'Chlorine is not electronegative' },
    ],
    correctKey: 'B',
    explanation: 'CCl₄ has four identical C−Cl bond dipoles arranged tetrahedrally — they cancel perfectly. In CHCl₃, one Cl is replaced by H, destroying the symmetry.',
    difficulty: 'medium',
  },
  {
    text: 'The shape of IF₇ is:',
    options: [
      { key: 'A', text: 'Octahedral' },
      { key: 'B', text: 'Pentagonal bipyramidal' },
      { key: 'C', text: 'Trigonal bipyramidal' },
      { key: 'D', text: 'Square antiprismatic' },
    ],
    correctKey: 'B',
    explanation: 'IF₇ has 7 bond pairs and no lone pairs. Iodine is sp³d³ hybridized with pentagonal bipyramidal geometry.',
    difficulty: 'hard',
  },
  {
    text: 'Which of the following species is isoelectronic with CO?',
    options: [
      { key: 'A', text: 'NO' },
      { key: 'B', text: 'CN⁻' },
      { key: 'C', text: 'O₂' },
      { key: 'D', text: 'CO₂' },
    ],
    correctKey: 'B',
    explanation: 'CO has 14 electrons (6 + 8). CN⁻ also has 14 electrons (6 + 7 + 1). They are isoelectronic.',
    difficulty: 'medium',
  },
  {
    text: 'The correct order of increasing bond energy is:',
    options: [
      { key: 'A', text: 'F₂ < Cl₂ < Br₂ < I₂' },
      { key: 'B', text: 'I₂ < F₂ < Br₂ < Cl₂' },
      { key: 'C', text: 'I₂ < Br₂ < Cl₂ < F₂' },
      { key: 'D', text: 'F₂ < I₂ < Br₂ < Cl₂' },
    ],
    correctKey: 'B',
    explanation: 'Bond energies: I₂ (151) < F₂ (159) < Br₂ (193) < Cl₂ (242) kJ/mol. F₂ has an anomalously low bond energy due to repulsion between lone pairs on the small F atoms.',
    difficulty: 'hard',
  },
  {
    text: 'The shape of ClF₃ is:',
    options: [
      { key: 'A', text: 'Trigonal planar' },
      { key: 'B', text: 'T-shaped' },
      { key: 'C', text: 'Pyramidal' },
      { key: 'D', text: 'Trigonal bipyramidal' },
    ],
    correctKey: 'B',
    explanation: 'ClF₃ has 3 bond pairs and 2 lone pairs (sp³d hybridized). The lone pairs occupy equatorial positions, giving a T-shaped geometry.',
    difficulty: 'medium',
  },
],

// ════════════════════════════════════════════════════════════════
// BIOLOGY — Biomolecules
// ════════════════════════════════════════════════════════════════
'Biology::Biomolecules': [
  {
    text: 'Which of the following is a reducing sugar?',
    options: [
      { key: 'A', text: 'Sucrose' },
      { key: 'B', text: 'Glucose' },
      { key: 'C', text: 'Starch' },
      { key: 'D', text: 'Cellulose' },
    ],
    correctKey: 'B',
    explanation: 'Glucose is a reducing sugar because it has a free aldehyde group that can reduce Tollen\'s or Benedict\'s reagent. Sucrose is a non-reducing sugar.',
    difficulty: 'easy',
  },
  {
    text: 'The primary structure of a protein refers to:',
    options: [
      { key: 'A', text: 'The three-dimensional folding of the polypeptide' },
      { key: 'B', text: 'The linear sequence of amino acids' },
      { key: 'C', text: 'The alpha-helix or beta-sheet pattern' },
      { key: 'D', text: 'The association of multiple polypeptide subunits' },
    ],
    correctKey: 'B',
    explanation: 'Primary structure is the linear sequence of amino acids in a polypeptide chain, linked by peptide bonds.',
    difficulty: 'easy',
  },
  {
    text: 'Enzymes are:',
    options: [
      { key: 'A', text: 'Lipids' },
      { key: 'B', text: 'Carbohydrates' },
      { key: 'C', text: 'Proteins' },
      { key: 'D', text: 'Nucleic acids' },
    ],
    correctKey: 'C',
    explanation: 'Almost all enzymes are proteins (some are RNA molecules called ribozymes). They act as biological catalysts.',
    difficulty: 'easy',
  },
  {
    text: 'The monomer of nucleic acids is:',
    options: [
      { key: 'A', text: 'Amino acid' },
      { key: 'B', text: 'Nucleotide' },
      { key: 'C', text: 'Monosaccharide' },
      { key: 'D', text: 'Fatty acid' },
    ],
    correctKey: 'B',
    explanation: 'Nucleic acids (DNA and RNA) are polymers of nucleotides. Each nucleotide consists of a nitrogenous base, a pentose sugar, and a phosphate group.',
    difficulty: 'easy',
  },
  {
    text: 'Cellulose is a polymer of:',
    options: [
      { key: 'A', text: 'α-D-glucose' },
      { key: 'B', text: 'β-D-glucose' },
      { key: 'C', text: 'Fructose' },
      { key: 'D', text: 'Galactose' },
    ],
    correctKey: 'B',
    explanation: 'Cellulose is a structural polysaccharide made of β-D-glucose units linked by β-1,4 glycosidic bonds. Starch uses α-D-glucose.',
    difficulty: 'easy',
  },
  {
    text: 'The secondary structure of a protein is stabilized by:',
    options: [
      { key: 'A', text: 'Peptide bonds' },
      { key: 'B', text: 'Hydrogen bonds between backbone atoms' },
      { key: 'C', text: 'Disulfide bonds' },
      { key: 'D', text: 'Ionic bonds between side chains' },
    ],
    correctKey: 'B',
    explanation: 'The α-helix and β-pleated sheet (secondary structures) are stabilized by hydrogen bonds between the C=O and N–H groups of the polypeptide backbone.',
    difficulty: 'medium',
  },
  {
    text: 'Which of the following is a purine base found in DNA?',
    options: [
      { key: 'A', text: 'Cytosine' },
      { key: 'B', text: 'Thymine' },
      { key: 'C', text: 'Uracil' },
      { key: 'D', text: 'Adenine' },
    ],
    correctKey: 'D',
    explanation: 'Purines (double-ring) in DNA: Adenine (A) and Guanine (G). Pyrimidines (single-ring) in DNA: Cytosine (C) and Thymine (T). Uracil replaces Thymine in RNA.',
    difficulty: 'easy',
  },
  {
    text: 'The bond that links amino acids in a protein is:',
    options: [
      { key: 'A', text: 'Glycosidic bond' },
      { key: 'B', text: 'Ester bond' },
      { key: 'C', text: 'Peptide bond' },
      { key: 'D', text: 'Phosphodiester bond' },
    ],
    correctKey: 'C',
    explanation: 'Amino acids are linked by peptide bonds (−CO−NH−) formed by a condensation reaction between the −COOH of one amino acid and the −NH₂ of the next.',
    difficulty: 'easy',
  },
  {
    text: 'Which of the following lipids acts as an energy store in animals?',
    options: [
      { key: 'A', text: 'Phospholipids' },
      { key: 'B', text: 'Triglycerides (fats)' },
      { key: 'C', text: 'Cholesterol' },
      { key: 'D', text: 'Waxes' },
    ],
    correctKey: 'B',
    explanation: 'Triglycerides (fats and oils) are the main energy storage lipids in animals. They yield more energy per gram than carbohydrates.',
    difficulty: 'easy',
  },
  {
    text: 'Lock and key model of enzyme action was proposed by:',
    options: [
      { key: 'A', text: 'Koshland' },
      { key: 'B', text: 'Fischer' },
      { key: 'C', text: 'Michaelis and Menten' },
      { key: 'D', text: 'Watson and Crick' },
    ],
    correctKey: 'B',
    explanation: 'Emil Fischer proposed the lock and key model (1894), where the enzyme\'s active site (lock) has a rigid shape exactly complementary to the substrate (key).',
    difficulty: 'easy',
  },
  {
    text: 'Which of the following is NOT an amino acid?',
    options: [
      { key: 'A', text: 'Glycine' },
      { key: 'B', text: 'Alanine' },
      { key: 'C', text: 'Adenine' },
      { key: 'D', text: 'Valine' },
    ],
    correctKey: 'C',
    explanation: 'Adenine is a nitrogenous base (purine) found in nucleic acids, not an amino acid. Glycine, alanine, and valine are amino acids.',
    difficulty: 'easy',
  },
  {
    text: 'Starch is composed of:',
    options: [
      { key: 'A', text: 'Amylose only' },
      { key: 'B', text: 'Amylopectin only' },
      { key: 'C', text: 'Both amylose and amylopectin' },
      { key: 'D', text: 'Cellulose and amylose' },
    ],
    correctKey: 'C',
    explanation: 'Starch consists of two components: amylose (unbranched, α-1,4 linkages, ~20%) and amylopectin (branched, α-1,4 and α-1,6 linkages, ~80%).',
    difficulty: 'easy',
  },
  {
    text: 'The sugar present in DNA is:',
    options: [
      { key: 'A', text: 'Ribose' },
      { key: 'B', text: 'Deoxyribose' },
      { key: 'C', text: 'Glucose' },
      { key: 'D', text: 'Fructose' },
    ],
    correctKey: 'B',
    explanation: 'DNA contains 2-deoxyribose sugar (lacks an −OH group at the 2\' carbon). RNA contains ribose sugar.',
    difficulty: 'easy',
  },
  {
    text: 'Competitive inhibitors of enzymes:',
    options: [
      { key: 'A', text: 'Bind to the allosteric site' },
      { key: 'B', text: 'Bind to the active site and compete with the substrate' },
      { key: 'C', text: 'Permanently denature the enzyme' },
      { key: 'D', text: 'Increase the rate of reaction' },
    ],
    correctKey: 'B',
    explanation: 'Competitive inhibitors have a structure similar to the substrate and compete with it for binding to the enzyme\'s active site. The inhibition can be overcome by increasing substrate concentration.',
    difficulty: 'medium',
  },
  {
    text: 'Which of the following vitamins acts as a coenzyme?',
    options: [
      { key: 'A', text: 'Vitamin A' },
      { key: 'B', text: 'Vitamin D' },
      { key: 'C', text: 'Vitamin B complex' },
      { key: 'D', text: 'Vitamin K' },
    ],
    correctKey: 'C',
    explanation: 'B-complex vitamins (B₁, B₂, B₃, B₆, B₁₂ etc.) act as coenzymes or precursors to coenzymes that assist enzyme function. NAD⁺ is derived from niacin (B₃).',
    difficulty: 'easy',
  },
  {
    text: 'The quaternary structure of a protein involves:',
    options: [
      { key: 'A', text: 'The sequence of amino acids' },
      { key: 'B', text: 'Local folding into α-helices and β-sheets' },
      { key: 'C', text: 'The overall 3D shape of a single polypeptide' },
      { key: 'D', text: 'Assembly of two or more polypeptide subunits' },
    ],
    correctKey: 'D',
    explanation: 'Quaternary structure describes the arrangement and interaction of two or more polypeptide subunits. Example: hemoglobin has four subunits (2α + 2β).',
    difficulty: 'easy',
  },
  {
    text: 'Glycogen is the storage form of glucose in:',
    options: [
      { key: 'A', text: 'Plants' },
      { key: 'B', text: 'Animals' },
      { key: 'C', text: 'Bacteria' },
      { key: 'D', text: 'Fungi only' },
    ],
    correctKey: 'B',
    explanation: 'Glycogen is the storage polysaccharide in animals, stored mainly in liver and muscles. Plants store glucose as starch.',
    difficulty: 'easy',
  },
  {
    text: 'Denaturation of a protein leads to loss of:',
    options: [
      { key: 'A', text: 'Primary structure' },
      { key: 'B', text: 'Peptide bonds' },
      { key: 'C', text: 'Biological activity and higher-order structure' },
      { key: 'D', text: 'Amino acid sequence' },
    ],
    correctKey: 'C',
    explanation: 'Denaturation disrupts the secondary, tertiary, and quaternary structures (hydrogen bonds, hydrophobic interactions, disulfide bonds) but the primary structure (peptide bonds) remains intact.',
    difficulty: 'medium',
  },
  {
    text: 'Which of the following is a disaccharide?',
    options: [
      { key: 'A', text: 'Glucose' },
      { key: 'B', text: 'Fructose' },
      { key: 'C', text: 'Lactose' },
      { key: 'D', text: 'Ribose' },
    ],
    correctKey: 'C',
    explanation: 'Lactose (milk sugar) is a disaccharide made of glucose + galactose. Glucose, fructose, and ribose are monosaccharides.',
    difficulty: 'easy',
  },
  {
    text: 'The enzyme that breaks down starch into maltose is:',
    options: [
      { key: 'A', text: 'Lipase' },
      { key: 'B', text: 'Amylase' },
      { key: 'C', text: 'Protease' },
      { key: 'D', text: 'Nuclease' },
    ],
    correctKey: 'B',
    explanation: 'Amylase (found in saliva and pancreatic juice) hydrolyzes starch into maltose by breaking α-1,4 glycosidic bonds.',
    difficulty: 'easy',
  },
  {
    text: 'Phospholipids are important because they:',
    options: [
      { key: 'A', text: 'Store energy' },
      { key: 'B', text: 'Form the basic structure of cell membranes' },
      { key: 'C', text: 'Act as enzymes' },
      { key: 'D', text: 'Carry genetic information' },
    ],
    correctKey: 'B',
    explanation: 'Phospholipids are amphipathic molecules that form the lipid bilayer of cell membranes, with hydrophilic heads facing water and hydrophobic tails facing inward.',
    difficulty: 'easy',
  },
  {
    text: 'Which of the following is an essential amino acid?',
    options: [
      { key: 'A', text: 'Alanine' },
      { key: 'B', text: 'Glycine' },
      { key: 'C', text: 'Leucine' },
      { key: 'D', text: 'Glutamic acid' },
    ],
    correctKey: 'C',
    explanation: 'Leucine is an essential amino acid that cannot be synthesized by the human body and must be obtained from the diet. Alanine, glycine, and glutamic acid are non-essential.',
    difficulty: 'medium',
  },
  {
    text: 'The isoelectric point of an amino acid is the pH at which:',
    options: [
      { key: 'A', text: 'The amino acid is fully protonated' },
      { key: 'B', text: 'The amino acid carries no net charge' },
      { key: 'C', text: 'The amino acid is fully deprotonated' },
      { key: 'D', text: 'The amino acid is denatured' },
    ],
    correctKey: 'B',
    explanation: 'At the isoelectric point (pI), the amino acid exists as a zwitterion with equal positive and negative charges, resulting in zero net charge.',
    difficulty: 'medium',
  },
  {
    text: 'Chitin is a structural polysaccharide found in:',
    options: [
      { key: 'A', text: 'Plant cell walls' },
      { key: 'B', text: 'Exoskeleton of arthropods and fungal cell walls' },
      { key: 'C', text: 'Animal bones' },
      { key: 'D', text: 'Bacterial cell walls' },
    ],
    correctKey: 'B',
    explanation: 'Chitin is a polymer of N-acetylglucosamine that forms the exoskeleton of arthropods (insects, crabs) and the cell walls of fungi.',
    difficulty: 'easy',
  },
  {
    text: 'The Michaelis-Menten constant (Km) represents:',
    options: [
      { key: 'A', text: 'Maximum rate of reaction' },
      { key: 'B', text: 'Substrate concentration at half of Vmax' },
      { key: 'C', text: 'The number of substrate molecules' },
      { key: 'D', text: 'The enzyme concentration' },
    ],
    correctKey: 'B',
    explanation: 'Km is the substrate concentration at which the reaction rate is half of Vmax. A low Km indicates high enzyme-substrate affinity.',
    difficulty: 'medium',
  },
  {
    text: 'Which of the following is a saturated fatty acid?',
    options: [
      { key: 'A', text: 'Oleic acid' },
      { key: 'B', text: 'Linoleic acid' },
      { key: 'C', text: 'Palmitic acid' },
      { key: 'D', text: 'Arachidonic acid' },
    ],
    correctKey: 'C',
    explanation: 'Palmitic acid (C16:0) has no double bonds (saturated). Oleic (1 double bond), linoleic (2), and arachidonic (4) are unsaturated.',
    difficulty: 'medium',
  },
  {
    text: 'Inulin is a polymer of:',
    options: [
      { key: 'A', text: 'Glucose' },
      { key: 'B', text: 'Galactose' },
      { key: 'C', text: 'Fructose' },
      { key: 'D', text: 'Mannose' },
    ],
    correctKey: 'C',
    explanation: 'Inulin is a polysaccharide composed of fructose units, found in plants like dahlia and chicory. It is used to measure GFR (glomerular filtration rate).',
    difficulty: 'medium',
  },
  {
    text: 'Which type of RNA carries amino acids to the ribosome during translation?',
    options: [
      { key: 'A', text: 'mRNA' },
      { key: 'B', text: 'rRNA' },
      { key: 'C', text: 'tRNA' },
      { key: 'D', text: 'snRNA' },
    ],
    correctKey: 'C',
    explanation: 'Transfer RNA (tRNA) carries specific amino acids to the ribosome, matching its anticodon with the mRNA codon during translation.',
    difficulty: 'easy',
  },
  {
    text: 'Cholesterol is:',
    options: [
      { key: 'A', text: 'A carbohydrate' },
      { key: 'B', text: 'A protein' },
      { key: 'C', text: 'A steroid lipid' },
      { key: 'D', text: 'A nucleic acid' },
    ],
    correctKey: 'C',
    explanation: 'Cholesterol is a steroid lipid with a four-ring structure. It is a component of animal cell membranes and a precursor for steroid hormones, bile salts, and vitamin D.',
    difficulty: 'easy',
  },
  {
    text: 'Enzymes lower the activation energy of a reaction by:',
    options: [
      { key: 'A', text: 'Increasing the temperature' },
      { key: 'B', text: 'Changing the equilibrium of the reaction' },
      { key: 'C', text: 'Providing an alternative reaction pathway' },
      { key: 'D', text: 'Increasing the concentration of reactants' },
    ],
    correctKey: 'C',
    explanation: 'Enzymes provide an alternative reaction pathway with a lower activation energy. They do NOT change the equilibrium or thermodynamics of the reaction.',
    difficulty: 'easy',
  },
  {
    text: 'The optimum temperature for most human enzymes is approximately:',
    options: [
      { key: 'A', text: '25°C' },
      { key: 'B', text: '37°C' },
      { key: 'C', text: '50°C' },
      { key: 'D', text: '100°C' },
    ],
    correctKey: 'B',
    explanation: 'Most human enzymes work optimally at normal body temperature (~37°C). Above this, enzymes begin to denature.',
    difficulty: 'easy',
  },
  {
    text: 'Which of the following is a non-reducing sugar?',
    options: [
      { key: 'A', text: 'Glucose' },
      { key: 'B', text: 'Fructose' },
      { key: 'C', text: 'Maltose' },
      { key: 'D', text: 'Sucrose' },
    ],
    correctKey: 'D',
    explanation: 'Sucrose is a non-reducing sugar because the glycosidic bond between glucose and fructose involves both anomeric carbons, leaving no free reducing group.',
    difficulty: 'easy',
  },
  {
    text: 'Cofactors that are tightly bound to enzymes are called:',
    options: [
      { key: 'A', text: 'Coenzymes' },
      { key: 'B', text: 'Prosthetic groups' },
      { key: 'C', text: 'Activators' },
      { key: 'D', text: 'Inhibitors' },
    ],
    correctKey: 'B',
    explanation: 'Prosthetic groups are cofactors (non-protein parts) that are tightly and permanently bound to the enzyme. Example: heme in cytochrome c. Coenzymes are loosely bound.',
    difficulty: 'medium',
  },
],

}; // end CHAPTER_QUESTIONS


// ── Main upload logic ──────────────────────────────────────────
async function main() {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    console.error('❌ MONGO_URI not set. Run from project root (where .env lives).');
    process.exit(1);
  }

  await mongoose.connect(uri);
  console.log('✅ Connected to MongoDB\n');

  let totalInserted = 0;

  for (const [key, questions] of Object.entries(CHAPTER_QUESTIONS)) {
    const [subjectName, chapterTitle] = key.split('::');

    // Find the subject
    const subject = await Subject.findOne({ examGroup: EXAM_GROUP, name: subjectName }).lean();
    if (!subject) {
      console.error(`❌ Subject not found: ${subjectName}`);
      continue;
    }

    // Find the chapter
    const chapter = await Chapter.findOne({ subject: subject._id, title: chapterTitle }).lean();
    if (!chapter) {
      console.error(`❌ Chapter not found: ${chapterTitle} in ${subjectName}`);
      continue;
    }

    // Check if already populated
    const existing = await Question.countDocuments({ chapter: chapter._id });
    if (existing > 0) {
      console.log(`⏭  ${subjectName} → ${chapterTitle}: already has ${existing} questions, skipping`);
      continue;
    }

    // Insert questions
    const docs = questions.map(q => ({
      subject: subject._id,
      chapter: chapter._id,
      examGroup: EXAM_GROUP,
      ...q,
    }));

    const result = await Question.insertMany(docs);
    console.log(`✅ ${subjectName} → ${chapterTitle}: inserted ${result.length} questions`);
    totalInserted += result.length;
  }

  console.log(`\n🎉 Done! Total new questions inserted: ${totalInserted}`);
  await mongoose.disconnect();
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
