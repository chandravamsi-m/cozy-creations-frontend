// src/utils/constants.js
import ellipse172 from '../assets/images/ellipse-172.png';
import ellipse173 from '../assets/images/ellipse-173.png';
import ellipse174 from '../assets/images/ellipse-174.png';
import ellipse175 from '../assets/images/ellipse-175.png';

import flowerImg from '../assets/images/collections/flower.png';
import animalImg from '../assets/images/collections/animal.png';
import festiveImg from '../assets/images/collections/festive.png';
import glassjarImg from '../assets/images/collections/glassjar.png';
import specialImg from '../assets/images/collections/special.png';

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
