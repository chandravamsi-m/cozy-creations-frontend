// src/utils/constants.js
import ellipse172 from '../assets/images/ellipse-172.webp';
import ellipse173 from '../assets/images/ellipse-173.webp';
import ellipse174 from '../assets/images/ellipse-174.webp';
import ellipse175 from '../assets/images/ellipse-175.webp';

import flowerImg from '../assets/images/flower.webp';
import animalImg from '../assets/images/animal.webp';
import festiveImg from '../assets/images/festive.webp';
import glassjarImg from '../assets/images/glassjar.webp';
import specialImg from '../assets/images/special.webp';

export const INITIAL_FEATURES = [
  {
    id: 1,
    title: 'Handmade With Love',
    desc: 'Small-batch poured with warmth, care & personal detail.',
    image: 'ellipse-172',
  },
  {
    id: 2,
    title: 'Natural Wax Only',
    desc: 'Soft, clean-burning wax free from toxins and chemicals.',
    image: 'ellipse-173',
  },
  {
    id: 3,
    title: 'Aroma Rich Scents',
    desc: 'Fragrance that lingers, calms and transforms your space.',
    image: 'ellipse-174',
  },
  {
    id: 4,
    title: 'Perfect for Gifting',
    desc: 'Thoughtfully crafted candles ready to spark joy.',
    image: 'ellipse-175',
  },
];

export const IMAGE_MAP = {
  'ellipse-172': ellipse172,
  'ellipse-173': ellipse173,
  'ellipse-174': ellipse174,
  'ellipse-175': ellipse175,
};

export const COLLECTIONS = [
  { id: 'flower', title: 'Flower', image: flowerImg },
  { id: 'animal', title: 'Animal', image: animalImg },
  { id: 'festive', title: 'Festive', image: festiveImg },
  { id: 'glassjar', title: 'Glass Jar', image: glassjarImg },
  { id: 'special', title: 'Special', image: specialImg },
];

export const INDIAN_STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh",
  "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand",
  "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur",
  "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab", "Rajasthan",
  "Sikkim", "Tamil Nadu", "Telangana", "Tripura", "Uttar Pradesh",
  "Uttarakhand", "West Bengal"
];
